import "server-only";
import { randomBytes } from "node:crypto";
import type { AppointmentSource, AppointmentStatus, Prisma } from "@prisma/client";
import { db, type Tx } from "@/database/client";
import { isExclusionViolation, isRetryableTxError, isUniqueViolation } from "@/database/errors";
import { runAfterResponse } from "@/lib/background";
import { AppError, badRequest, conflict, notFound } from "@/lib/errors";
import { customerCancelSchema, customerRescheduleSchema, publicBookingSchema, rescheduleSchema, staffBookingSchema } from "@/lib/schemas";
import { formatDate, toDateKey, toTimeKey, zonedParts } from "@/utils/datetime";
import { normalizePhone } from "@/utils/phone";
import { formatAppointmentCode } from "@/utils/codes";
import { AuditService, type Actor } from "./audit.service";
import { AvailabilityService } from "./availability/availability.service";
import { CustomerService } from "./customer.service";
import { FittingService } from "./fitting.service";
import { NotificationService } from "./notification/notification.service";
import { PrintService } from "./print/print.service";
import { SettingsService } from "./settings.service";

/**
 * Regras de agendamento.
 *
 * Validação em 3 camadas:
 *  1. Frontend: só mostra horários livres.
 *  2. Backend (aqui): recalcula a disponibilidade antes de gravar.
 *  3. Banco: restrição EXCLUDE impede sobreposição mesmo com requisições
 *     simultâneas — apenas uma transação consegue gravar.
 *
 * Efeitos colaterais (WhatsApp, impressão) são gravados como registros
 * pendentes na mesma transação e executados depois da resposta.
 */

const SLOT_TAKEN = "Este horário acabou de ser reservado. Por favor, escolha outro.";
const MAX_TX_ATTEMPTS = 3;

const include = {
  customer: true,
  service: true,
  product: { select: { id: true, name: true, slug: true } },
  items: {
    orderBy: { createdAt: "asc" },
    include: { product: { select: { id: true, name: true, slug: true } }, inventoryItem: { select: { code: true, status: true, location: true } } },
  },
} as const;

type FittingItemInput = { productId: string; size: string | null };

/** Cliente pode remarcar/cancelar pelo link até X horas antes (configurável). */
function assertCustomerCanChange(a: { status: AppointmentStatus; startsAt: Date }, cutoffHours: number, now = new Date()) {
  if (a.status !== "SCHEDULED" && a.status !== "CONFIRMED") throw badRequest("Este agendamento não pode mais ser alterado.");
  if (a.startsAt.getTime() - now.getTime() < cutoffHours * 3_600_000) {
    throw badRequest(`Alterações pelo site são possíveis até ${cutoffHours}h antes do horário. Fale com a loja pelo WhatsApp.`);
  }
}

/** Transições permitidas de status. */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: ["CONFIRMED"],
  CANCELLED: ["SCHEDULED"],
  NO_SHOW: ["SCHEDULED", "COMPLETED"],
};

async function nextCode(tx: Tx, startsAt: Date, tz: string) {
  const year = zonedParts(startsAt, tz).year;
  const counter = await tx.counter.upsert({
    where: { key: `appointment:${year}` },
    create: { key: `appointment:${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return formatAppointmentCode(year, counter.value);
}

/** Executa a transação repetindo em caso de corrida (lane disputada, contador novo). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_TX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = isExclusionViolation(err) || isRetryableTxError(err) || isUniqueViolation(err, "key");
      if (!retryable || attempt === MAX_TX_ATTEMPTS) break;
    }
  }
  if (isExclusionViolation(lastErr)) throw conflict(SLOT_TAKEN);
  throw lastErr;
}

type CreateParams = {
  customer: { id?: string | null; name?: string | null; whatsapp?: string | null; email?: string | null };
  serviceId: string;
  date: string;
  time: string;
  notes?: string | null;
  internalNotes?: string | null;
  productId?: string | null;
  items?: FittingItemInput[];
  source: AppointmentSource;
  staff: boolean;
  actor: Actor;
};

async function createInternal(p: CreateParams) {
  const service = await db.service.findUnique({ where: { id: p.serviceId } });
  if (!service || !service.active || (!p.staff && !service.publicBooking)) throw badRequest("Serviço indisponível.");

  // Camada 2: o horário pedido precisa existir na grade e estar livre agora.
  const slots = await AvailabilityService.slotsForDay(p.date, service, { staff: p.staff });
  const slot = slots.find((s) => s.time === p.time);
  if (!slot) throw badRequest("Horário fora do expediente ou indisponível para este serviço.");
  if (!slot.available) throw conflict(slot.reason === "PAST" ? "Este horário não está mais disponível para agendamento." : SLOT_TAKEN);

  const result = await withRetry(() =>
    db.$transaction(async (tx) => {
      const settings = await SettingsService.getInTx(tx);

      // Lane livre recalculada DENTRO da transação (camada 3 garante o resto)
      const busy = await tx.appointment.findMany({
        where: { status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] }, startsAt: { lt: slot.blockedUntil }, blockedUntil: { gt: slot.startsAt } },
        select: { lane: true },
      });
      const taken = new Set(busy.map((b) => b.lane));
      const lane = Array.from({ length: Math.max(1, settings.simultaneousSlots) }, (_, i) => i).find((l) => !taken.has(l));
      if (lane === undefined) throw conflict(SLOT_TAKEN);

      let customerId = p.customer.id ?? null;
      let customerCreated = false;
      if (customerId) {
        const exists = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } });
        if (!exists) throw notFound("Cliente");
      } else {
        const whatsapp = normalizePhone(p.customer.whatsapp ?? "");
        if (!whatsapp || !p.customer.name) throw badRequest("Informe nome e WhatsApp do cliente.");
        const r = await CustomerService.findOrCreate(tx, { name: p.customer.name, whatsapp, email: p.customer.email }, { trusted: p.staff });
        customerId = r.customer.id;
        customerCreated = r.created;
      }

      const appointment = await tx.appointment.create({
        data: {
          code: await nextCode(tx, slot.startsAt, settings.timezone),
          publicToken: randomBytes(18).toString("base64url"),
          customerId,
          serviceId: service.id,
          productId: p.productId ?? null,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          blockedUntil: slot.blockedUntil,
          lane,
          source: p.source,
          notes: p.notes ?? null,
          internalNotes: p.staff ? (p.internalNotes ?? null) : null,
          createdById: p.actor.userId,
          ...(p.items?.length ? { items: { create: p.items } } : {}),
        },
        include,
      });

      const notification = await NotificationService.enqueueAppointmentMessage(tx, "APPOINTMENT_CREATED", appointment, settings);
      let ownerAlertId: string | null = null;
      if (p.source === "WEBSITE") {
        ownerAlertId = (await NotificationService.enqueueOwnerAlert(tx, appointment, settings))?.id ?? null;
        await NotificationService.alert(tx, {
          event: "APPOINTMENT_CREATED",
          title: "Novo agendamento pelo site",
          body: `${appointment.customer.name} — ${appointment.service.name} em ${formatDate(appointment.startsAt, settings.timezone)} às ${toTimeKey(appointment.startsAt, settings.timezone)}`,
          appointmentId: appointment.id,
          customerId,
        });
      }
      const printJob = settings.autoPrintOnCreate ? await PrintService.enqueueAppointmentReceipt(tx, appointment, settings, p.actor.userId) : null;

      await AuditService.log(
        p.actor,
        {
          action: "appointment.created",
          entity: "Appointment",
          entityId: appointment.id,
          summary: `Agendamento ${appointment.code} criado (${appointment.service.name})`,
          data: { source: p.source, startsAt: appointment.startsAt.toISOString(), customerCreated },
        },
        tx,
      );
      return { appointment, notificationId: notification?.status === "PENDING" ? notification.id : null, ownerAlertId, printJobId: printJob?.id ?? null };
    }),
  );

  const ids = [result.notificationId, result.ownerAlertId].filter((x): x is string => Boolean(x));
  if (ids.length) runAfterResponse("whatsapp", () => NotificationService.processPending({ ids }));
  return result;
}

export const AppointmentService = {
  /** Agendamento feito pelo cliente no site (sem login). */
  async createFromWebsite(raw: unknown, actor: Actor) {
    const input = publicBookingSchema.parse(raw);
    // Lista de provas: só produtos ativos; tamanho só se existir no produto
    const requested = [...input.items, ...(input.productSlug ? [{ slug: input.productSlug, size: null }] : [])];
    const products = requested.length
      ? await db.product.findMany({ where: { slug: { in: requested.map((r) => r.slug) }, active: true }, select: { id: true, slug: true, sizes: true } })
      : [];
    const items: FittingItemInput[] = [];
    for (const r of requested) {
      const product = products.find((p) => p.slug === r.slug);
      if (!product) continue;
      const size = r.size && product.sizes.includes(r.size) ? r.size : null;
      // Sem duplicar o mesmo produto/tamanho; o produto "de interesse" sem tamanho não repete um já escolhido
      if (items.some((i) => i.productId === product.id && (i.size === size || size === null))) continue;
      items.push({ productId: product.id, size });
    }
    return createInternal({
      customer: { name: input.name, whatsapp: input.whatsapp, email: input.email },
      serviceId: input.serviceId,
      date: input.date,
      time: input.time,
      notes: input.notes,
      productId: items[0]?.productId ?? null,
      items,
      source: "WEBSITE",
      staff: false,
      actor,
    });
  },

  /** Agendamento manual pelo funcionário (WhatsApp, telefone, balcão). Mesmas regras de disponibilidade. */
  async createByStaff(raw: unknown, actor: Actor) {
    const input = staffBookingSchema.parse(raw);
    return createInternal({
      customer: { id: input.customerId, name: input.name, whatsapp: input.whatsapp, email: input.email },
      serviceId: input.serviceId,
      date: input.date,
      time: input.time,
      notes: input.notes,
      internalNotes: input.internalNotes,
      productId: input.productId,
      source: input.source === "WEBSITE" ? "ADMIN" : input.source,
      staff: true,
      actor,
    });
  },

  /** Reagendar / editar. Revalida disponibilidade ignorando o próprio agendamento. */
  async update(id: string, raw: unknown, actor: Actor, opts: { staff?: boolean } = {}) {
    const staff = opts.staff ?? true;
    const input = rescheduleSchema.parse(raw);
    const current = await db.appointment.findUnique({ where: { id } });
    if (!current) throw notFound("Agendamento");
    if (current.status === "CANCELLED" || current.status === "NO_SHOW") throw badRequest("Reabra o agendamento antes de editá-lo.");

    const service = await db.service.findUnique({ where: { id: input.serviceId } });
    if (!service || !service.active || (!staff && !service.publicBooking)) throw badRequest("Serviço indisponível.");

    const settings = await SettingsService.get();
    const timeChanged =
      toDateKey(current.startsAt, settings.timezone) !== input.date ||
      toTimeKey(current.startsAt, settings.timezone) !== input.time ||
      current.serviceId !== input.serviceId;

    let slot: Awaited<ReturnType<typeof AvailabilityService.slotsForDay>>[number] | undefined;
    if (timeChanged) {
      const slots = await AvailabilityService.slotsForDay(input.date, service, { staff, ignoreAppointmentId: id });
      slot = slots.find((s) => s.time === input.time);
      if (!slot) throw badRequest("Horário fora do expediente ou indisponível para este serviço.");
      if (!slot.available) throw conflict(SLOT_TAKEN);
    }

    const result = await withRetry(() =>
      db.$transaction(async (tx) => {
        let lane = current.lane;
        if (slot) {
          const busy = await tx.appointment.findMany({
            where: { id: { not: id }, status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] }, startsAt: { lt: slot.blockedUntil }, blockedUntil: { gt: slot.startsAt } },
            select: { lane: true },
          });
          const taken = new Set(busy.map((b) => b.lane));
          const free = Array.from({ length: Math.max(1, settings.simultaneousSlots) }, (_, i) => i).find((l) => !taken.has(l));
          if (free === undefined) throw conflict(SLOT_TAKEN);
          lane = free;
        }
        const appointment = await tx.appointment.update({
          where: { id },
          data: {
            serviceId: service.id,
            notes: input.notes,
            internalNotes: input.internalNotes,
            productId: input.productId ?? null,
            ...(slot ? { startsAt: slot.startsAt, endsAt: slot.endsAt, blockedUntil: slot.blockedUntil, lane, reminderSentAt: null } : {}),
          },
          include,
        });
        const notification = slot ? await NotificationService.enqueueAppointmentMessage(tx, "APPOINTMENT_UPDATED", appointment, settings) : null;
        await AuditService.log(
          actor,
          {
            action: slot ? "appointment.rescheduled" : "appointment.updated",
            entity: "Appointment",
            entityId: id,
            summary: slot ? `Agendamento ${appointment.code} remarcado` : `Agendamento ${appointment.code} alterado`,
            data: { before: { startsAt: current.startsAt.toISOString(), serviceId: current.serviceId, notes: current.notes } },
          },
          tx,
        );
        return { appointment, notificationId: notification?.status === "PENDING" ? notification.id : null };
      }),
    );
    if (result.notificationId) {
      const nid = result.notificationId;
      runAfterResponse("whatsapp", () => NotificationService.processPending({ ids: [nid] }));
    }
    return result.appointment;
  },

  /** Confirmar, concluir, cancelar, não compareceu, reabrir. */
  async changeStatus(id: string, to: AppointmentStatus, actor: Actor, opts: { reason?: string | null } = {}) {
    const current = await db.appointment.findUnique({ where: { id } });
    if (!current) throw notFound("Agendamento");
    if (current.status === to) return current;
    if (!TRANSITIONS[current.status].includes(to)) throw badRequest("Mudança de status não permitida.");

    const now = new Date();
    const data: Prisma.AppointmentUpdateInput = { status: to };
    if (to === "CONFIRMED") data.confirmedAt = now;
    if (to === "COMPLETED") data.completedAt = now;
    if (to === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelReason = opts.reason ?? null;
    }

    const result = await withRetry(() =>
      db.$transaction(async (tx) => {
        const settings = await SettingsService.getInTx(tx);
        const appointment = await tx.appointment.update({ where: { id }, data, include });
        // Cancelou ou não compareceu: peças separadas voltam a ficar disponíveis
        if (to === "CANCELLED" || to === "NO_SHOW") {
          await FittingService.releaseAllInTx(tx, id, actor, to === "CANCELLED" ? `Agendamento ${appointment.code} cancelado` : `Cliente não compareceu (${appointment.code})`);
        }
        const notification = to === "CANCELLED" ? await NotificationService.enqueueAppointmentMessage(tx, "APPOINTMENT_CANCELLED", appointment, settings) : null;
        await AuditService.log(
          actor,
          {
            action: `appointment.${to.toLowerCase()}`,
            entity: "Appointment",
            entityId: id,
            summary: `Agendamento ${appointment.code}: ${current.status} → ${to}`,
            data: { from: current.status, to, reason: opts.reason ?? null },
          },
          tx,
        );
        return { appointment, notificationId: notification?.status === "PENDING" ? notification.id : null };
      }),
    ).catch((err) => {
      // Reabrir um horário que já foi ocupado por outro cliente
      if (err instanceof AppError && err.status === 409) throw conflict("O horário deste agendamento já foi ocupado. Remarque para outro horário.");
      throw err;
    });

    if (result.notificationId) {
      const nid = result.notificationId;
      runAfterResponse("whatsapp", () => NotificationService.processPending({ ids: [nid] }));
    }
    return result.appointment;
  },

  async get(id: string) {
    const a = await db.appointment.findUnique({
      where: { id },
      include: {
        ...include,
        createdBy: { select: { name: true } },
        rental: { select: { id: true, number: true } },
        printJobs: { orderBy: { createdAt: "desc" } },
        notifications: { where: { channel: "WHATSAPP" }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!a) throw notFound("Agendamento");
    return a;
  },

  async getByPublicToken(token: string) {
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
    return db.appointment.findUnique({
      where: { publicToken: token },
      include: {
        customer: { select: { name: true } },
        service: true,
        items: { orderBy: { createdAt: "asc" }, include: { product: { select: { name: true, slug: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } } } },
      },
    });
  },

  /** Autoatendimento: o cliente remarca pelo link da confirmação (mesmas regras do site). */
  async rescheduleByCustomer(token: string, raw: unknown, actor: Actor) {
    const input = customerRescheduleSchema.parse(raw);
    const a = await this.getByPublicToken(token);
    if (!a) throw notFound("Agendamento");
    const settings = await SettingsService.get();
    assertCustomerCanChange(a, settings.selfServiceCutoffHours);
    const updated = await this.update(
      a.id,
      { serviceId: a.serviceId, date: input.date, time: input.time, notes: a.notes, internalNotes: a.internalNotes, productId: a.productId },
      actor,
      { staff: false },
    );
    await NotificationService.alert(db, {
      event: "APPOINTMENT_UPDATED",
      title: "Cliente remarcou pelo site",
      body: `${updated.customer.name} — ${updated.code}: agora ${formatDate(updated.startsAt, settings.timezone)} às ${toTimeKey(updated.startsAt, settings.timezone)}`,
      appointmentId: a.id,
      customerId: a.customerId,
    });
    return updated;
  },

  /** Autoatendimento: o cliente cancela pelo link. Peças separadas são liberadas. */
  async cancelByCustomer(token: string, raw: unknown, actor: Actor) {
    const { reason } = customerCancelSchema.parse(raw);
    const a = await this.getByPublicToken(token);
    if (!a) throw notFound("Agendamento");
    const settings = await SettingsService.get();
    assertCustomerCanChange(a, settings.selfServiceCutoffHours);
    const cancelled = await this.changeStatus(a.id, "CANCELLED", actor, { reason: `Cancelado pelo cliente${reason ? `: ${reason}` : ""}` });
    await NotificationService.alert(db, {
      event: "APPOINTMENT_CANCELLED",
      title: "Cliente cancelou pelo site",
      body: `${a.customer.name} — ${a.code} (${formatDate(a.startsAt, settings.timezone)} às ${toTimeKey(a.startsAt, settings.timezone)})`,
      appointmentId: a.id,
      customerId: a.customerId,
    });
    return cancelled;
  },

  async listRange(start: Date, end: Date, filter: { status?: AppointmentStatus[] } = {}) {
    return db.appointment.findMany({
      where: { startsAt: { gte: start, lt: end }, ...(filter.status ? { status: { in: filter.status } } : {}) },
      orderBy: [{ startsAt: "asc" }, { lane: "asc" }],
      include: { customer: { select: { id: true, name: true, whatsapp: true } }, service: { select: { name: true } }, items: { select: { inventoryItemId: true } } },
    });
  },

  async list(params: { q?: string; status?: AppointmentStatus; from?: Date; to?: Date; page?: number; pageSize?: number }) {
    const pageSize = params.pageSize ?? 30;
    const page = Math.max(1, params.page ?? 1);
    const q = params.q?.trim();
    const digits = q?.replace(/\D/g, "");
    const where: Prisma.AppointmentWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to ? { startsAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lt: params.to } : {}) } } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
              ...(digits && digits.length >= 4 ? [{ customer: { whatsapp: { contains: digits } } }] : []),
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.appointment.findMany({
        where,
        orderBy: { startsAt: params.from ? "asc" : "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { customer: { select: { id: true, name: true, whatsapp: true } }, service: { select: { name: true } }, printJobs: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      db.appointment.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  },
};
