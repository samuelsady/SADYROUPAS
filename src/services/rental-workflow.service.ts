import "server-only";
import type { DeliveryMethod, Prisma, RentalStatus, ReturnCondition } from "@prisma/client";
import { z } from "zod";
import { db, type Tx } from "@/database/client";
import { isExclusionViolation } from "@/database/errors";
import { runAfterResponse } from "@/lib/background";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { addDaysKey, diffDaysKey, formatDateKey, isDateKey, todayKey } from "@/utils/datetime";
import { formatRentalNumber } from "@/utils/codes";
import { AuditService, type Actor } from "./audit.service";
import { NotificationService } from "./notification/notification.service";
import { calculateLateFee, parseRentalPolicy, paymentStatus } from "./rental.service";
import { SettingsService } from "./settings.service";

/**
 * LOCAÇÕES — fluxo do dia a dia da loja:
 *
 *   criar (RESERVADO) → confirmar retirada (RETIRADO) → registrar devolução (DEVOLVIDO)
 *
 * Baixa automática no estoque:
 *   - criar: peças ficam RESERVADAS para o cliente;
 *   - retirada: peças viram ALUGADAS (+1 no contador de locações), localização "Com cliente";
 *   - devolução: cada peça volta conforme a conferência (disponível, lavanderia,
 *     manutenção ou perdida).
 * O banco impede a mesma peça em duas locações com datas sobrepostas.
 */

const ACTIVE: RentalStatus[] = ["RESERVED", "CONFIRMED", "PICKED_UP", "OVERDUE"];

const money = z.coerce.number().min(0).max(100000);
const optText = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const rentalCreateSchema = z
  .object({
    customerId: z.string().trim().min(1, "Escolha o cliente."),
    appointmentId: optText(64),
    eventName: optText(120),
    eventDate: z.string().optional().nullable().transform((v) => (v ? v : null)).refine((v) => v === null || isDateKey(v), "Data do evento inválida."),
    pickupDate: z.string().refine(isDateKey, "Data de retirada inválida."),
    returnDueDate: z.string().refine(isDateKey, "Data de devolução inválida."),
    deliveryMethod: z.enum(["STORE_PICKUP", "DELIVERY"]).default("STORE_PICKUP"),
    deliveryAddress: optText(300),
    deliveryNotes: optText(300),
    itemCodes: z.array(z.string().trim().toUpperCase().min(3).max(40)).min(1, "Adicione ao menos uma peça.").max(30),
    total: money.default(0),
    discount: money.default(0),
    paidNow: money.default(0),
    paymentMethod: z.enum(["PIX", "CARD", "CASH", "TRANSFER"]).default("PIX"),
    notes: optText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.returnDueDate < v.pickupDate) ctx.addIssue({ code: "custom", path: ["returnDueDate"], message: "A devolução deve ser depois da retirada." });
    if (v.deliveryMethod === "DELIVERY" && !v.deliveryAddress) ctx.addIssue({ code: "custom", path: ["deliveryAddress"], message: "Informe o endereço de entrega." });
    if (new Set(v.itemCodes).size !== v.itemCodes.length) ctx.addIssue({ code: "custom", path: ["itemCodes"], message: "Há peças repetidas." });
  });

export const PAYMENT_METHOD_LABEL: Record<string, string> = { PIX: "PIX", CARD: "Cartão", CASH: "Dinheiro", TRANSFER: "Transferência" };
export const DELIVERY_LABEL: Record<DeliveryMethod, string> = { STORE_PICKUP: "Retirada na loja", DELIVERY: "Entrega" };

const dateOnly = (key: string) => new Date(`${key}T12:00:00Z`);
const keyOf = (d: Date) => d.toISOString().slice(0, 10);

const fullInclude = {
  customer: true,
  appointment: { select: { id: true, code: true } },
  items: { include: { inventoryItem: { include: { product: { select: { name: true, slug: true } } } } }, orderBy: { inventoryItem: { code: "asc" } } },
  payments: { orderBy: { paidAt: "asc" } },
  lateFees: true,
  pickup: true,
  return: { include: { items: true } },
} satisfies Prisma.RentalInclude;

export type RentalFull = Prisma.RentalGetPayload<{ include: typeof fullInclude }>;

async function nextNumber(tx: Tx) {
  const c = await tx.counter.upsert({ where: { key: "rental" }, create: { key: "rental", value: 1 }, update: { value: { increment: 1 } } });
  return c.value;
}

/** Recalcula o pago/saldo a partir dos pagamentos e multas. */
async function refreshPayment(tx: Tx, rentalId: string) {
  const r = await tx.rental.findUniqueOrThrow({ where: { id: rentalId }, include: { payments: true, lateFees: true } });
  const paid = r.payments.reduce((s, p) => s + Number(p.amount), 0);
  const lateFees = r.lateFees.filter((f) => !f.waived).reduce((s, f) => s + Number(f.amount), 0);
  const st = paymentStatus({ total: Number(r.total), discount: Number(r.discount), paid, lateFees });
  await tx.rental.update({ where: { id: rentalId }, data: { paid, paymentStatus: st.status } });
}

function itemsText(r: { items: { inventoryItem: { code: string; size: string; product: { name: string } } }[] }) {
  return r.items.map((i) => `${i.inventoryItem.product.name} (tam. ${i.inventoryItem.size})`).join(", ");
}

/** Comprovante de locação (texto para impressora térmica). */
function rentalReceipt(r: RentalFull, companyName: string, width = 48) {
  const rule = "-".repeat(width);
  const lines = [
    rule,
    companyName.toUpperCase().padStart(Math.floor((width + companyName.length) / 2)),
    "COMPROVANTE DE LOCACAO".padStart(Math.floor((width + 22) / 2)),
    rule,
    "",
    `Locacao: ${formatRentalNumber(r.number)}`,
    `Cliente: ${r.customer.name}`,
    r.eventName ? `Evento: ${r.eventName}${r.eventDate ? ` - ${formatDateKey(keyOf(r.eventDate))}` : ""}` : null,
    `Retirada: ${formatDateKey(keyOf(r.pickupDate))}`,
    `Devolucao: ${formatDateKey(keyOf(r.returnDueDate))}`,
    `${DELIVERY_LABEL[r.deliveryMethod]}${r.deliveryAddress ? `: ${r.deliveryAddress}` : ""}`,
    "",
    "Pecas:",
    ...r.items.map((i) => `- ${i.inventoryItem.code} ${i.inventoryItem.product.name} T${i.inventoryItem.size}`),
    "",
    `Total: R$ ${(Number(r.total) - Number(r.discount)).toFixed(2)}`,
    `Pago: R$ ${Number(r.paid).toFixed(2)}`,
    `Restante: R$ ${Math.max(0, Number(r.total) - Number(r.discount) - Number(r.paid)).toFixed(2)}`,
    "",
    rule,
  ];
  return lines
    .filter((l): l is string => l !== null)
    .map((l) => l.normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, width))
    .join("\n");
}

async function enqueueRentalMessage(tx: Tx, event: "RENTAL_CONFIRMED" | "RETURN_OVERDUE", r: RentalFull) {
  const settings = await SettingsService.getInTx(tx);
  const template = await tx.notificationTemplate.findUnique({ where: { event } });
  const vars: Record<string, string> = {
    nome: r.customer.name.split(" ")[0] ?? r.customer.name,
    numero: formatRentalNumber(r.number),
    data: formatDateKey(keyOf(event === "RETURN_OVERDUE" ? r.returnDueDate : r.pickupDate)),
    retirada: formatDateKey(keyOf(r.pickupDate)),
    devolucao: formatDateKey(keyOf(r.returnDueDate)),
    pecas: itemsText(r),
    entrega: r.deliveryMethod === "DELIVERY" ? `Entrega: ${r.deliveryAddress ?? ""}` : "Retirada na loja",
    loja: settings.companyName,
  };
  const body = (template?.body ?? "").replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
  if (!body) return null;
  const skipped = !settings.whatsappEnabled || template?.active === false;
  return tx.notification.create({
    data: {
      channel: "WHATSAPP",
      event,
      status: skipped ? "SKIPPED" : "PENDING",
      error: skipped ? "WhatsApp desabilitado ou modelo inativo." : null,
      recipient: r.customer.whatsapp,
      body,
      customerId: r.customerId,
      rentalId: r.id,
    },
  });
}

function sendLater(id: string | undefined | null) {
  if (id) runAfterResponse("whatsapp", () => NotificationService.processPending({ ids: [id] }));
}

export const RentalService = {
  async create(raw: unknown, actor: Actor) {
    const input = rentalCreateSchema.parse(raw);
    const settings = await SettingsService.get();
    const policy = parseRentalPolicy(settings.rentalPolicy);
    // A peça fica comprometida até a devolução + dias de conferência/lavanderia
    const reservedUntil = addDaysKey(input.returnDueDate, policy.turnaroundDays);

    try {
      const result = await db.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
        if (!customer) throw notFound("Cliente");
        const pieces = await tx.inventoryItem.findMany({ where: { code: { in: input.itemCodes } } });
        for (const code of input.itemCodes) {
          const p = pieces.find((x) => x.code === code);
          if (!p || !p.active) throw badRequest(`Peça ${code} não encontrada.`);
          if (p.status === "RENTED" || p.status === "LOST" || p.status === "MAINTENANCE") throw conflict(`A peça ${code} não está disponível (${p.status === "RENTED" ? "alugada" : p.status === "LOST" ? "perdida" : "em manutenção"}).`);
        }

        const number = await nextNumber(tx);
        const rental = await tx.rental.create({
          data: {
            number,
            customerId: customer.id,
            appointmentId: input.appointmentId,
            eventName: input.eventName,
            eventDate: input.eventDate ? dateOnly(input.eventDate) : null,
            pickupDate: dateOnly(input.pickupDate),
            returnDueDate: dateOnly(input.returnDueDate),
            deliveryMethod: input.deliveryMethod,
            deliveryAddress: input.deliveryMethod === "DELIVERY" ? input.deliveryAddress : null,
            deliveryNotes: input.deliveryNotes,
            total: input.total,
            discount: input.discount,
            notes: input.notes,
            status: "RESERVED",
            createdById: actor.userId,
            items: {
              create: pieces.map((p) => ({ inventoryItemId: p.id, reservedFrom: dateOnly(input.pickupDate), reservedUntil: dateOnly(reservedUntil) })),
            },
          },
        });

        // Peças reservadas no estoque (com histórico)
        for (const p of pieces) {
          await tx.inventoryItem.update({ where: { id: p.id }, data: { status: "RESERVED" } });
          await tx.inventoryHistory.create({
            data: { itemId: p.id, fromStatus: p.status, toStatus: "RESERVED", action: "RENTAL_RESERVED", customerName: customer.name, rentalId: rental.id, note: `Reservada para a locação ${formatRentalNumber(number)} (retirada ${formatDateKey(input.pickupDate)})`, userId: actor.userId },
          });
        }
        // Peças que estavam "separadas" para a prova passam a pertencer à locação
        if (input.appointmentId) {
          await tx.appointmentItem.updateMany({ where: { appointmentId: input.appointmentId, inventoryItemId: { in: pieces.map((p) => p.id) } }, data: { inventoryItemId: null } });
        }
        if (input.paidNow > 0) {
          await tx.payment.create({ data: { rentalId: rental.id, amount: input.paidNow, method: input.paymentMethod, userId: actor.userId, notes: "Pagamento na reserva" } });
        }
        await refreshPayment(tx, rental.id);

        const full = await tx.rental.findUniqueOrThrow({ where: { id: rental.id }, include: fullInclude });
        const notification = await enqueueRentalMessage(tx, "RENTAL_CONFIRMED", full);
        await tx.printJob.create({ data: { kind: "RENTAL_RECEIPT", content: rentalReceipt(full, settings.companyName), rentalId: rental.id, requestedById: actor.userId, format: settings.printFormat } });
        await AuditService.log(actor, { action: "rental.created", entity: "Rental", entityId: rental.id, summary: `Locação ${formatRentalNumber(number)} criada para ${customer.name} (${pieces.length} peça(s))` }, tx);
        return { rental: full, notificationId: notification?.status === "PENDING" ? notification.id : null };
      });
      sendLater(result.notificationId);
      return result.rental;
    } catch (err) {
      if (isExclusionViolation(err)) throw conflict("Alguma peça já está reservada para outra locação nessas datas.");
      throw err;
    }
  },

  /** Retirada (ou entrega): BAIXA AUTOMÁTICA — as peças passam para ALUGADO. */
  async confirmPickup(id: string, raw: { checklist?: { label: string; checked: boolean }[]; notes?: string | null }, actor: Actor) {
    return db.$transaction(async (tx) => {
      const r = await tx.rental.findUnique({ where: { id }, include: fullInclude });
      if (!r) throw notFound("Locação");
      if (r.status !== "RESERVED" && r.status !== "CONFIRMED") throw badRequest("Esta locação não está aguardando retirada.");
      const now = new Date();
      await tx.pickup.create({ data: { rentalId: id, checklist: (raw.checklist ?? []) as Prisma.InputJsonValue, notes: raw.notes ?? null, userId: actor.userId, pickedUpAt: now } });
      await tx.rental.update({ where: { id }, data: { status: "PICKED_UP", pickedUpAt: now } });
      for (const it of r.items) {
        const piece = it.inventoryItem;
        await tx.inventoryItem.update({ where: { id: piece.id }, data: { status: "RENTED", rentalCount: { increment: 1 }, location: `Com cliente — ${r.customer.name}` } });
        await tx.inventoryHistory.create({
          data: { itemId: piece.id, fromStatus: piece.status, toStatus: "RENTED", action: "RENTED", customerName: r.customer.name, rentalId: id, note: `${r.deliveryMethod === "DELIVERY" ? "Entregue" : "Retirada"} — locação ${formatRentalNumber(r.number)}, devolução ${formatDateKey(keyOf(r.returnDueDate))}`, userId: actor.userId },
        });
      }
      await AuditService.log(actor, { action: "rental.picked_up", entity: "Rental", entityId: id, summary: `Locação ${formatRentalNumber(r.number)} retirada — ${r.items.length} peça(s) baixada(s) como alugadas` }, tx);
    });
  },

  /** Devolução com conferência peça a peça; calcula multa por atraso pela política. */
  async registerReturn(id: string, raw: { items: { rentalItemId: string; condition: ReturnCondition; note?: string | null }[]; notes?: string | null }, actor: Actor) {
    const settings = await SettingsService.get();
    const policy = parseRentalPolicy(settings.rentalPolicy);
    const today = todayKey(settings.timezone);
    return db.$transaction(async (tx) => {
      const r = await tx.rental.findUnique({ where: { id }, include: fullInclude });
      if (!r) throw notFound("Locação");
      if (r.status !== "PICKED_UP" && r.status !== "OVERDUE") throw badRequest("Só é possível registrar devolução de locações retiradas.");
      const now = new Date();
      const ret = await tx.return.create({ data: { rentalId: id, notes: raw.notes ?? null, userId: actor.userId, returnedAt: now } });
      const NEXT: Record<ReturnCondition, "AVAILABLE" | "LAUNDRY" | "MAINTENANCE" | "LOST"> = { RECEIVED: "AVAILABLE", DIRTY: "LAUNDRY", DAMAGED: "MAINTENANCE", NOT_RECEIVED: "LOST", LOST: "LOST" };
      for (const it of r.items) {
        const c = raw.items.find((x) => x.rentalItemId === it.id)?.condition ?? "RECEIVED";
        const note = raw.items.find((x) => x.rentalItemId === it.id)?.note ?? null;
        await tx.returnItem.create({ data: { returnId: ret.id, rentalItemId: it.id, condition: c, note } });
        await tx.rentalItem.update({ where: { id: it.id }, data: { active: false } });
        const next = NEXT[c];
        await tx.inventoryItem.update({ where: { id: it.inventoryItemId }, data: { status: next, location: next === "AVAILABLE" ? "Arara (devolvida)" : next === "LAUNDRY" ? "Lavanderia" : next === "MAINTENANCE" ? "Costura/manutenção" : null } });
        await tx.inventoryHistory.create({
          data: { itemId: it.inventoryItemId, fromStatus: "RENTED", toStatus: next, action: "RETURNED", customerName: r.customer.name, rentalId: id, note: `Devolvida (${c === "RECEIVED" ? "bom estado" : c === "DIRTY" ? "suja" : c === "DAMAGED" ? "danificada" : "não devolvida"}) — locação ${formatRentalNumber(r.number)}${note ? ` · ${note}` : ""}`, userId: actor.userId },
        });
        if (next === "MAINTENANCE") await tx.maintenance.create({ data: { itemId: it.inventoryItemId, problem: note ?? "Avaria na devolução", userId: actor.userId } });
        if (next === "LAUNDRY") await tx.laundry.create({ data: { itemId: it.inventoryItemId, userId: actor.userId, note: `Locação ${formatRentalNumber(r.number)}` } });
      }
      const fee = calculateLateFee({ returnDueKey: keyOf(r.returnDueDate), returnedKey: today, rentalTotal: Number(r.total) - Number(r.discount), policy: policy.lateFee });
      if (fee.amount > 0) await tx.lateFee.create({ data: { rentalId: id, daysLate: fee.days, amount: fee.amount, notes: `${fee.days} dia(s) de atraso` } });
      await tx.rental.update({ where: { id }, data: { status: "RETURNED", returnedAt: now } });
      await refreshPayment(tx, id);
      await AuditService.log(actor, { action: "rental.returned", entity: "Rental", entityId: id, summary: `Locação ${formatRentalNumber(r.number)} devolvida${fee.amount ? ` com multa por atraso de R$ ${fee.amount.toFixed(2)}` : ""}` }, tx);
      return { lateFee: fee };
    });
  },

  async addPayment(id: string, raw: unknown, actor: Actor) {
    const input = z.object({ amount: money.refine((v) => v > 0, "Informe o valor."), method: z.enum(["PIX", "CARD", "CASH", "TRANSFER"]), notes: optText(200) }).parse(raw);
    return db.$transaction(async (tx) => {
      const r = await tx.rental.findUnique({ where: { id } });
      if (!r) throw notFound("Locação");
      await tx.payment.create({ data: { rentalId: id, amount: input.amount, method: input.method, notes: input.notes, userId: actor.userId } });
      await refreshPayment(tx, id);
      await AuditService.log(actor, { action: "rental.payment", entity: "Rental", entityId: id, summary: `Pagamento de R$ ${input.amount.toFixed(2)} (${PAYMENT_METHOD_LABEL[input.method]}) na locação ${formatRentalNumber(r.number)}` }, tx);
    });
  },

  async cancel(id: string, reason: string | null, actor: Actor) {
    return db.$transaction(async (tx) => {
      const r = await tx.rental.findUnique({ where: { id }, include: fullInclude });
      if (!r) throw notFound("Locação");
      if (r.status !== "RESERVED" && r.status !== "CONFIRMED" && r.status !== "QUOTE") throw badRequest("Só é possível cancelar locações ainda não retiradas.");
      await tx.rental.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), notes: [r.notes, reason ? `Cancelada: ${reason}` : "Cancelada"].filter(Boolean).join("\n") } });
      await tx.rentalItem.updateMany({ where: { rentalId: id }, data: { active: false } });
      for (const it of r.items) {
        if (it.inventoryItem.status !== "RESERVED") continue;
        await tx.inventoryItem.update({ where: { id: it.inventoryItemId }, data: { status: "AVAILABLE" } });
        await tx.inventoryHistory.create({ data: { itemId: it.inventoryItemId, fromStatus: "RESERVED", toStatus: "AVAILABLE", action: "RELEASED", rentalId: id, note: `Locação ${formatRentalNumber(r.number)} cancelada`, userId: actor.userId } });
      }
      await AuditService.log(actor, { action: "rental.cancelled", entity: "Rental", entityId: id, summary: `Locação ${formatRentalNumber(r.number)} cancelada` }, tx);
    });
  },

  async reprint(id: string, actor: Actor) {
    const settings = await SettingsService.get();
    const r = await db.rental.findUnique({ where: { id }, include: fullInclude });
    if (!r) throw notFound("Locação");
    await db.printJob.create({ data: { kind: "RENTAL_RECEIPT", content: rentalReceipt(r, settings.companyName), rentalId: id, requestedById: actor.userId, format: settings.printFormat } });
  },

  get(id: string) {
    return db.rental.findUnique({ where: { id }, include: fullInclude });
  },

  /** Lista para o painel e para a planilha. */
  async list(params: { tab?: string; q?: string; from?: string; to?: string; take?: number } = {}) {
    const settings = await SettingsService.get();
    const today = todayKey(settings.timezone);
    const where: Prisma.RentalWhereInput = {};
    if (params.tab === "ativas") where.status = { in: ACTIVE };
    if (params.tab === "retiradas") Object.assign(where, { status: { in: ["RESERVED", "CONFIRMED"] }, pickupDate: { lte: dateOnly(addDaysKey(today, 2)) } });
    if (params.tab === "devolucoes") Object.assign(where, { status: { in: ["PICKED_UP", "OVERDUE"] }, returnDueDate: { lte: dateOnly(addDaysKey(today, 2)) } });
    if (params.tab === "atrasadas") Object.assign(where, { status: { in: ["PICKED_UP", "OVERDUE"] }, returnDueDate: { lt: dateOnly(today) } });
    if (params.from || params.to) where.pickupDate = { ...(params.from ? { gte: dateOnly(params.from) } : {}), ...(params.to ? { lte: dateOnly(params.to) } : {}) };
    if (params.q) {
      const q = params.q.trim();
      const n = Number(q.replace(/\D/g, ""));
      where.OR = [{ customer: { name: { contains: q, mode: "insensitive" } } }, { eventName: { contains: q, mode: "insensitive" } }, ...(n ? [{ number: n }] : []), { items: { some: { inventoryItem: { code: { contains: q.toUpperCase() } } } } }];
    }
    const rows = await db.rental.findMany({ where, orderBy: params.tab === "devolucoes" || params.tab === "atrasadas" ? { returnDueDate: "asc" } : { pickupDate: params.tab === "todas" ? "desc" : "asc" }, take: params.take ?? 200, include: fullInclude });
    return rows.map((r) => ({ ...r, overdueDays: (r.status === "PICKED_UP" || r.status === "OVERDUE") ? Math.max(0, diffDaysKey(keyOf(r.returnDueDate), today)) : 0 }));
  },

  /** Contagens do dia (dashboard). */
  async todayCounts() {
    const settings = await SettingsService.get();
    const today = dateOnly(todayKey(settings.timezone));
    const [pickups, returns, overdue] = await Promise.all([
      db.rental.count({ where: { status: { in: ["RESERVED", "CONFIRMED"] }, pickupDate: { lte: today } } }),
      db.rental.count({ where: { status: { in: ["PICKED_UP", "OVERDUE"] }, returnDueDate: today } }),
      db.rental.count({ where: { status: { in: ["PICKED_UP", "OVERDUE"] }, returnDueDate: { lt: today } } }),
    ]);
    return { pickups, returns, overdue };
  },

  /** Cron: marca atrasadas e avisa o cliente uma única vez. */
  async flagOverdue() {
    const settings = await SettingsService.get();
    const today = dateOnly(todayKey(settings.timezone));
    const late = await db.rental.findMany({ where: { status: "PICKED_UP", returnDueDate: { lt: today } }, include: fullInclude });
    const ids: string[] = [];
    for (const r of late) {
      await db.$transaction(async (tx) => {
        const marked = await tx.rental.updateMany({ where: { id: r.id, status: "PICKED_UP" }, data: { status: "OVERDUE" } });
        if (marked.count !== 1) return;
        const n = await enqueueRentalMessage(tx, "RETURN_OVERDUE", r);
        await NotificationService.alert(tx, { event: "RETURN_OVERDUE", title: "Devolução atrasada", body: `${r.customer.name} — locação ${formatRentalNumber(r.number)} (prevista ${formatDateKey(keyOf(r.returnDueDate))})`, customerId: r.customerId });
        if (n?.status === "PENDING") ids.push(n.id);
      });
    }
    if (ids.length) await NotificationService.processPending({ ids });
    return { flagged: late.length };
  },

  /** Peças disponíveis para adicionar a uma locação (busca no formulário). */
  searchPieces(q: string) {
    const term = q.trim();
    return db.inventoryItem.findMany({
      where: {
        active: true,
        status: { in: ["AVAILABLE", "RESERVED"] },
        ...(term ? { OR: [{ code: { contains: term.toUpperCase() } }, { product: { name: { contains: term, mode: "insensitive" } } }] } : {}),
      },
      orderBy: [{ status: "asc" }, { code: "asc" }],
      take: 20,
      select: { code: true, size: true, color: true, status: true, location: true, product: { select: { name: true } } },
    });
  },

  receiptText: rentalReceipt,
};
