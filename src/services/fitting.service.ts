import "server-only";
import { db, type Tx } from "@/database/client";
import { isUniqueViolation } from "@/database/errors";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { AuditService, type Actor } from "./audit.service";

/**
 * Lista de provas → separação de peças.
 *
 * O cliente escolhe produtos e tamanhos no site; a equipe vê "peças para
 * separar", escolhe a peça física e ela fica RESERVADA (com histórico).
 * Se o atendimento for cancelado ou o cliente não comparecer, as peças
 * separadas voltam automaticamente para DISPONÍVEL.
 */

const ACTIVE = ["SCHEDULED", "CONFIRMED"] as const;

/** Devolve a peça para DISPONÍVEL se ela ainda estiver reservada (dentro da transação). */
async function releaseItemInTx(tx: Tx, appointmentItemId: string, actor: Actor, note: string) {
  const ai = await tx.appointmentItem.findUnique({ where: { id: appointmentItemId }, include: { inventoryItem: true, appointment: { select: { code: true } } } });
  if (!ai?.inventoryItem) return false;
  const piece = ai.inventoryItem;
  await tx.appointmentItem.update({ where: { id: ai.id }, data: { inventoryItemId: null } });
  if (piece.status !== "RESERVED") return false;
  await tx.inventoryItem.update({ where: { id: piece.id }, data: { status: "AVAILABLE" } });
  await tx.inventoryHistory.create({
    data: { itemId: piece.id, fromStatus: "RESERVED", toStatus: "AVAILABLE", action: "RELEASED", note, userId: actor.userId },
  });
  return true;
}

export const FittingService = {
  /** Adiciona uma peça à lista de provas (painel). */
  async addItem(appointmentId: string, productId: string, size: string | null, actor: Actor) {
    const product = await db.product.findUnique({ where: { id: productId }, select: { name: true, sizes: true } });
    if (!product) throw notFound("Produto");
    const cleanSize = size?.trim() || null;
    try {
      await db.$transaction(async (tx) => {
        const a = await tx.appointment.findUnique({ where: { id: appointmentId }, select: { code: true } });
        if (!a) throw notFound("Agendamento");
        await tx.appointmentItem.create({ data: { appointmentId, productId, size: cleanSize } });
        await AuditService.log(actor, { action: "fitting.item_added", entity: "Appointment", entityId: appointmentId, summary: `${product.name}${cleanSize ? ` (tam. ${cleanSize})` : ""} adicionado à lista de provas de ${a.code}` }, tx);
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("Esta peça já está na lista.");
      throw err;
    }
  },

  async removeItem(appointmentItemId: string, actor: Actor) {
    await db.$transaction(async (tx) => {
      const ai = await tx.appointmentItem.findUnique({ where: { id: appointmentItemId }, include: { product: { select: { name: true } } } });
      if (!ai) throw notFound("Item");
      await releaseItemInTx(tx, ai.id, actor, "Removida da lista de provas");
      await tx.appointmentItem.delete({ where: { id: ai.id } });
      await AuditService.log(actor, { action: "fitting.item_removed", entity: "Appointment", entityId: ai.appointmentId, summary: `${ai.product.name} removido da lista de provas` }, tx);
    });
  },

  /**
   * Separa (reserva) uma peça física para o item da lista. A atualização é
   * condicional (status = DISPONÍVEL): duas pessoas nunca separam a mesma peça.
   */
  async reserve(appointmentItemId: string, inventoryCode: string, actor: Actor) {
    const code = inventoryCode.trim().toUpperCase();
    return db.$transaction(async (tx) => {
      const ai = await tx.appointmentItem.findUnique({
        where: { id: appointmentItemId },
        include: { appointment: { select: { id: true, code: true, status: true, customer: { select: { name: true } } } }, product: { select: { name: true } } },
      });
      if (!ai) throw notFound("Item da lista");
      if (!(ACTIVE as readonly string[]).includes(ai.appointment.status)) throw badRequest("Só é possível separar peças para agendamentos ativos.");
      const piece = await tx.inventoryItem.findUnique({ where: { code } });
      if (!piece || !piece.active) throw notFound("Peça");
      if (piece.productId !== ai.productId) throw badRequest(`A peça ${code} não é do produto ${ai.product.name}.`);

      if (ai.inventoryItemId && ai.inventoryItemId !== piece.id) await releaseItemInTx(tx, ai.id, actor, "Troca de peça separada");

      const claimed = await tx.inventoryItem.updateMany({ where: { id: piece.id, status: "AVAILABLE" }, data: { status: "RESERVED" } });
      if (claimed.count !== 1) throw conflict(`A peça ${code} não está disponível no momento.`);

      await tx.appointmentItem.update({ where: { id: ai.id }, data: { inventoryItemId: piece.id, size: ai.size ?? piece.size } });
      await tx.inventoryHistory.create({
        data: {
          itemId: piece.id,
          fromStatus: "AVAILABLE",
          toStatus: "RESERVED",
          action: "RESERVED_FOR_APPOINTMENT",
          customerName: ai.appointment.customer.name,
          note: `Separada para o atendimento ${ai.appointment.code}`,
          userId: actor.userId,
        },
      });
      await AuditService.log(actor, { action: "fitting.reserved", entity: "InventoryItem", entityId: piece.id, summary: `Peça ${code} separada para ${ai.appointment.code}` }, tx);
      return piece;
    });
  },

  async release(appointmentItemId: string, actor: Actor) {
    await db.$transaction(async (tx) => {
      const ai = await tx.appointmentItem.findUnique({ where: { id: appointmentItemId }, include: { appointment: { select: { code: true } }, inventoryItem: { select: { code: true } } } });
      if (!ai) throw notFound("Item da lista");
      const released = await releaseItemInTx(tx, ai.id, actor, `Liberada do atendimento ${ai.appointment.code}`);
      if (released) await AuditService.log(actor, { action: "fitting.released", entity: "Appointment", entityId: ai.appointmentId, summary: `Peça ${ai.inventoryItem?.code} liberada` }, tx);
    });
  },

  /** Usado ao cancelar / marcar não comparecimento. */
  async releaseAllInTx(tx: Tx, appointmentId: string, actor: Actor, note: string) {
    const items = await tx.appointmentItem.findMany({ where: { appointmentId, inventoryItemId: { not: null } }, select: { id: true } });
    for (const i of items) await releaseItemInTx(tx, i.id, actor, note);
  },

  /** Peças disponíveis que podem ser separadas para cada item da lista. */
  async candidates(items: { productId: string; size: string | null }[]) {
    if (items.length === 0) return [];
    return db.inventoryItem.findMany({
      where: { active: true, status: "AVAILABLE", productId: { in: [...new Set(items.map((i) => i.productId))] } },
      orderBy: [{ size: "asc" }, { code: "asc" }],
      select: { id: true, code: true, size: true, productId: true, location: true },
    });
  },

  /** Itens ainda não separados de atendimentos ativos num intervalo (dashboard/agenda). */
  pendingBetween(start: Date, end: Date) {
    return db.appointmentItem.findMany({
      where: { inventoryItemId: null, appointment: { status: { in: [...ACTIVE] }, startsAt: { gte: start, lt: end } } },
      orderBy: { appointment: { startsAt: "asc" } },
      include: { product: { select: { name: true } }, appointment: { select: { id: true, code: true, startsAt: true, customer: { select: { name: true } } } } },
      take: 30,
    });
  },
};
