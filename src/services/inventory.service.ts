import "server-only";
import type { InventoryStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/database/client";
import { isUniqueViolation } from "@/database/errors";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { inventoryItemSchema, inventoryStatusSchema } from "@/lib/schemas";
import { buildInventoryCode } from "@/utils/codes";
import { AuditService, type Actor } from "./audit.service";

/**
 * Estoque por PEÇA FÍSICA (não por quantidade).
 * Toda mudança relevante gera uma linha em InventoryHistory.
 *
 * Na V1 o status é alterado manualmente pela equipe. Na V2 o RentalService
 * passa a movimentar as peças (reserva → alugado → conferência → lavanderia).
 */

const statusChangeSchema = z.object({
  status: inventoryStatusSchema,
  note: z.string().trim().max(500).optional().nullable(),
  customerName: z.string().trim().max(120).optional().nullable(),
  location: z.string().trim().max(80).optional().nullable(),
});

const itemUpdateSchema = z.object({
  size: z.string().trim().min(1).max(10),
  color: z.string().trim().min(1).max(40),
  location: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const InventoryService = {
  async list(params: { q?: string; status?: InventoryStatus; productId?: string; size?: string; page?: number; pageSize?: number }) {
    const pageSize = params.pageSize ?? 50;
    const page = Math.max(1, params.page ?? 1);
    const where: Prisma.InventoryItemWhereInput = {
      active: true,
      ...(params.status ? { status: params.status } : {}),
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.size ? { size: params.size } : {}),
      ...(params.q
        ? { OR: [{ code: { contains: params.q, mode: "insensitive" } }, { product: { name: { contains: params.q, mode: "insensitive" } } }, { location: { contains: params.q, mode: "insensitive" } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        orderBy: [{ code: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { product: { select: { id: true, name: true, slug: true, category: { select: { name: true } } } } },
      }),
      db.inventoryItem.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async stats() {
    const grouped = await db.inventoryItem.groupBy({ by: ["status"], where: { active: true }, _count: true });
    const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count])) as Partial<Record<InventoryStatus, number>>;
    return { counts, total: grouped.reduce((s, g) => s + g._count, 0) };
  },

  async getByCode(code: string) {
    const item = await db.inventoryItem.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        product: { include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
        history: { orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true } } } },
      },
    });
    if (!item) throw notFound("Peça");
    return item;
  },

  /** Cadastra 1..N peças físicas de um produto, gerando os códigos em sequência. */
  async create(raw: unknown, actor: Actor) {
    const input = inventoryItemSchema.parse(raw);
    if (input.code && input.quantity > 1) throw badRequest("Código manual só pode ser usado para uma peça por vez.");
    const product = await db.product.findUnique({ where: { id: input.productId }, include: { category: true } });
    if (!product) throw notFound("Produto");

    try {
      return await db.$transaction(async (tx) => {
        const created = [];
        const base = buildInventoryCode(product.category.name, input.color, input.size, 0).slice(0, -3);
        // Próximo número livre para o prefixo (ex.: TER-PRE-042-)
        const last = await tx.inventoryItem.findFirst({ where: { code: { startsWith: base } }, orderBy: { code: "desc" }, select: { code: true } });
        let seq = last ? Number(last.code.slice(base.length)) || 0 : 0;
        for (let i = 0; i < input.quantity; i++) {
          const code = input.code ? input.code.toUpperCase() : `${base}${String(++seq).padStart(3, "0")}`;
          const item = await tx.inventoryItem.create({
            data: { code, productId: product.id, size: input.size, color: input.color, location: input.location, notes: input.notes, acquiredAt: new Date() },
          });
          await tx.inventoryHistory.create({ data: { itemId: item.id, toStatus: "AVAILABLE", action: "CREATED", note: "Peça cadastrada", userId: actor.userId } });
          created.push(item);
        }
        // Mantém os tamanhos/cores do produto em sincronia com as peças físicas
        await tx.product.update({
          where: { id: product.id },
          data: {
            sizes: product.sizes.includes(input.size) ? undefined : { push: input.size },
            colors: product.colors.includes(input.color) ? undefined : { push: input.color },
          },
        });
        await AuditService.log(actor, { action: "inventory.created", entity: "Product", entityId: product.id, summary: `${created.length} peça(s) cadastrada(s): ${created.map((c) => c.code).join(", ")}` }, tx);
        return created;
      });
    } catch (err) {
      if (isUniqueViolation(err, "code")) throw conflict("Já existe uma peça com este código.");
      throw err;
    }
  },

  async update(code: string, raw: unknown, actor: Actor) {
    const input = itemUpdateSchema.parse(raw);
    return db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { code } });
      if (!item) throw notFound("Peça");
      const updated = await tx.inventoryItem.update({ where: { code }, data: input });
      await tx.inventoryHistory.create({ data: { itemId: item.id, action: "UPDATED", note: "Dados da peça alterados", userId: actor.userId } });
      await AuditService.log(actor, { action: "inventory.updated", entity: "InventoryItem", entityId: item.id, summary: `Peça ${code} alterada`, data: { before: { size: item.size, color: item.color, location: item.location } } }, tx);
      return updated;
    });
  },

  async changeStatus(code: string, raw: unknown, actor: Actor) {
    const input = statusChangeSchema.parse(raw);
    return db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { code } });
      if (!item) throw notFound("Peça");
      if (item.status === input.status && !input.location) return item;
      const becameRented = input.status === "RENTED" && item.status !== "RENTED";
      const updated = await tx.inventoryItem.update({
        where: { code },
        data: {
          status: input.status,
          ...(input.location !== undefined && input.location !== null ? { location: input.location } : {}),
          ...(becameRented ? { rentalCount: { increment: 1 } } : {}),
        },
      });
      await tx.inventoryHistory.create({
        data: { itemId: item.id, fromStatus: item.status, toStatus: input.status, action: "STATUS_CHANGED", note: input.note, customerName: input.customerName, userId: actor.userId },
      });
      await AuditService.log(actor, { action: "inventory.status_changed", entity: "InventoryItem", entityId: item.id, summary: `Peça ${code}: ${item.status} → ${input.status}` }, tx);
      return updated;
    });
  },

  async deactivate(code: string, actor: Actor) {
    return db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { code } });
      if (!item) throw notFound("Peça");
      if (item.status === "RENTED" || item.status === "RESERVED") throw badRequest("Peça reservada ou alugada não pode ser removida.");
      await tx.inventoryItem.update({ where: { code }, data: { active: false, status: "UNAVAILABLE" } });
      await tx.inventoryHistory.create({ data: { itemId: item.id, fromStatus: item.status, toStatus: "UNAVAILABLE", action: "DEACTIVATED", note: "Peça baixada do estoque", userId: actor.userId } });
      await AuditService.log(actor, { action: "inventory.deactivated", entity: "InventoryItem", entityId: item.id, summary: `Peça ${code} baixada do estoque` }, tx);
    });
  },
};
