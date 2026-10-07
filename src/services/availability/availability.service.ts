import "server-only";
import type { BusinessHours, Service, StoreSettings } from "@prisma/client";
import { db, type Tx } from "@/database/client";
import { addDaysKey, dayRangeUtc, diffDaysKey, isDateKey, todayKey } from "@/utils/datetime";
import { SettingsService } from "../settings.service";
import { generateSlots, weekdayHours, type BusyRange, type Slot } from "./slots";

/** Status que ocupam a agenda (devem bater com a restrição de exclusão no banco). */
export const ACTIVE_APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED"] as const;

export type AvailabilityOptions = {
  /** Painel: ignora antecedência mínima e limite de dias futuros. */
  staff?: boolean;
  /** Ao reagendar, o próprio agendamento não conta como ocupado. */
  ignoreAppointmentId?: string;
  now?: Date;
};

type Context = {
  settings: StoreSettings;
  hours: BusinessHours[];
  appointments: (BusyRange & { id: string })[];
  blocked: BusyRange[];
};

/** Carrega de uma vez tudo que ocupa a agenda entre duas datas locais. */
async function loadContext(fromKey: string, toKey: string, tx: Tx): Promise<Context> {
  const settings = await SettingsService.getInTx(tx);
  const start = dayRangeUtc(fromKey, settings.timezone).start;
  const end = dayRangeUtc(toKey, settings.timezone).end;
  const [hours, appointments, blocked] = await Promise.all([
    SettingsService.hoursInTx(tx),
    tx.appointment.findMany({
      where: { status: { in: [...ACTIVE_APPOINTMENT_STATUSES] }, startsAt: { lt: end }, blockedUntil: { gt: start } },
      select: { id: true, startsAt: true, blockedUntil: true, lane: true },
    }),
    tx.blockedPeriod.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: start } }, select: { startsAt: true, endsAt: true } }),
  ]);
  return {
    settings,
    hours,
    appointments: appointments.map((a) => ({ id: a.id, start: a.startsAt, end: a.blockedUntil, lane: a.lane })),
    blocked: blocked.map((b) => ({ start: b.startsAt, end: b.endsAt })),
  };
}

function computeDay(ctx: Context, dateKey: string, service: Pick<Service, "durationMin">, opts: AvailabilityOptions): Slot[] {
  const { settings } = ctx;
  const tz = settings.timezone;
  const now = opts.now ?? new Date();
  if (!opts.staff) {
    const ahead = diffDaysKey(todayKey(tz, now), dateKey);
    if (ahead < 0 || ahead > settings.maxAdvanceDays) return [];
  }
  return generateSlots({
    dateKey,
    tz,
    hours: weekdayHours(dateKey, ctx.hours),
    rules: {
      durationMin: service.durationMin ?? settings.slotDurationMin,
      slotDurationMin: settings.slotDurationMin,
      bufferMin: settings.slotBufferMin,
      lanes: settings.simultaneousSlots,
      minLeadMinutes: opts.staff ? 0 : settings.minLeadMinutes,
    },
    appointments: ctx.appointments.filter((a) => a.id !== opts.ignoreAppointmentId),
    blocked: ctx.blocked,
    now,
  });
}

export const AvailabilityService = {
  async slotsForDay(dateKey: string, service: Pick<Service, "durationMin">, opts: AvailabilityOptions = {}, tx: Tx = db): Promise<Slot[]> {
    if (!isDateKey(dateKey)) return [];
    const ctx = await loadContext(dateKey, dateKey, tx);
    return computeDay(ctx, dateKey, service, opts);
  },

  /** Próximos dias e quantos horários livres cada um tem (calendário do site). */
  async openDays(service: Pick<Service, "durationMin">, fromKey: string, days: number, opts: AvailabilityOptions = {}) {
    const toKey = addDaysKey(fromKey, days - 1);
    const ctx = await loadContext(fromKey, toKey, db);
    return Array.from({ length: days }, (_, i) => {
      const date = addDaysKey(fromKey, i);
      return { date, available: computeDay(ctx, date, service, opts).filter((s) => s.available).length };
    });
  },
};
