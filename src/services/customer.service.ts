import "server-only";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/database/client";
import { isUniqueViolation } from "@/database/errors";
import { conflict, notFound } from "@/lib/errors";
import { customerSchema, measurementSchema } from "@/lib/schemas";
import { AuditService, type Actor } from "./audit.service";

type ContactInput = { name: string; whatsapp: string; email?: string | null };

export const CustomerService = {
  /**
   * Localiza o cliente pelo WhatsApp (identificador único) ou cria um novo.
   * - Site público: NÃO sobrescreve dados existentes (só completa o e-mail vazio),
   *   para que ninguém altere o cadastro de outra pessoa digitando o número dela.
   * - Painel: atualiza nome/e-mail com o que o funcionário informou.
   */
  async findOrCreate(tx: Tx, input: ContactInput, opts: { trusted: boolean }) {
    const existing = await tx.customer.findUnique({ where: { whatsapp: input.whatsapp } });
    if (existing) {
      const data: Prisma.CustomerUpdateInput = {};
      if (opts.trusted) {
        if (input.name && input.name !== existing.name) data.name = input.name;
        if (input.email && input.email !== existing.email) data.email = input.email;
      } else if (!existing.email && input.email) {
        data.email = input.email;
      }
      const customer = Object.keys(data).length ? await tx.customer.update({ where: { id: existing.id }, data }) : existing;
      return { customer, created: false };
    }
    const customer = await tx.customer.create({ data: { name: input.name, whatsapp: input.whatsapp, email: input.email ?? null } });
    return { customer, created: true };
  },

  async list(params: { q?: string; page?: number; pageSize?: number }) {
    const pageSize = params.pageSize ?? 25;
    const page = Math.max(1, params.page ?? 1);
    const q = params.q?.trim();
    const digits = q?.replace(/\D/g, "");
    const where: Prisma.CustomerWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            ...(digits && digits.length >= 4 ? [{ whatsapp: { contains: digits } }] : []),
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { appointments: true } },
          appointments: { orderBy: { startsAt: "desc" }, take: 1, select: { startsAt: true, status: true } },
        },
      }),
      db.customer.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async get(id: string) {
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { startsAt: "desc" }, include: { service: true, product: { select: { name: true, slug: true } } } },
        measurements: { orderBy: { createdAt: "desc" }, take: 5 },
        rentals: { orderBy: { createdAt: "desc" }, take: 10 },
        notifications: { where: { channel: "WHATSAPP" }, orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!customer) throw notFound("Cliente");
    return customer;
  },

  async create(raw: unknown, actor: Actor) {
    const input = customerSchema.parse(raw);
    try {
      return await db.$transaction(async (tx) => {
        const customer = await tx.customer.create({ data: input });
        await AuditService.log(actor, { action: "customer.created", entity: "Customer", entityId: customer.id, summary: `Cliente ${customer.name} cadastrado` }, tx);
        return customer;
      });
    } catch (err) {
      if (isUniqueViolation(err, "whatsapp")) throw conflict("Já existe um cliente com este WhatsApp.");
      throw err;
    }
  },

  async update(id: string, raw: unknown, actor: Actor) {
    const input = customerSchema.parse(raw);
    try {
      return await db.$transaction(async (tx) => {
        const before = await tx.customer.findUnique({ where: { id } });
        if (!before) throw notFound("Cliente");
        const customer = await tx.customer.update({ where: { id }, data: input });
        await AuditService.log(
          actor,
          { action: "customer.updated", entity: "Customer", entityId: id, summary: `Cliente ${customer.name} alterado`, data: { before: { name: before.name, whatsapp: before.whatsapp, email: before.email } } },
          tx,
        );
        return customer;
      });
    } catch (err) {
      if (isUniqueViolation(err, "whatsapp")) throw conflict("Já existe um cliente com este WhatsApp.");
      throw err;
    }
  },

  async addMeasurement(customerId: string, raw: unknown, actor: Actor) {
    const input = measurementSchema.parse(raw);
    return db.$transaction(async (tx) => {
      const m = await tx.customerMeasurement.create({ data: { customerId, ...input } });
      await AuditService.log(actor, { action: "customer.measurement_added", entity: "Customer", entityId: customerId, summary: "Medidas registradas" }, tx);
      return m;
    });
  },

  /** Busca rápida para o seletor de cliente do agendamento manual. */
  async search(q: string, take = 8) {
    const term = q.trim();
    if (term.length < 2) return [];
    const digits = term.replace(/\D/g, "");
    return db.customer.findMany({
      where: {
        OR: [{ name: { contains: term, mode: "insensitive" } }, ...(digits.length >= 4 ? [{ whatsapp: { contains: digits } }] : [])],
      },
      orderBy: { name: "asc" },
      take,
      select: { id: true, name: true, whatsapp: true, email: true },
    });
  },
};
