import { minutesToTime, timeToMinutes, weekdayOfKey, zonedToUtc } from "@/utils/datetime";

/**
 * Geração de horários disponíveis — função PURA (sem banco), usada pelo site,
 * pelo painel e pela validação do backend. A garantia final contra conflito
 * fica na restrição de exclusão do PostgreSQL.
 */

export type DayHours = {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
};

export type BusyRange = { start: Date; end: Date; lane?: number };

export type SlotRules = {
  durationMin: number; // duração do serviço escolhido
  slotDurationMin: number; // duração padrão (passo da grade)
  bufferMin: number; // intervalo entre atendimentos
  lanes: number; // atendimentos simultâneos
  minLeadMinutes: number; // antecedência mínima (0 no painel)
};

export type Slot = {
  time: string; // HH:mm local
  startsAt: Date;
  endsAt: Date;
  blockedUntil: Date;
  available: boolean;
  freeLanes: number[];
  reason?: "PAST" | "BOOKED" | "BLOCKED";
};

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

export function generateSlots(input: {
  dateKey: string;
  tz: string;
  hours: DayHours | undefined;
  rules: SlotRules;
  appointments: BusyRange[]; // [startsAt, blockedUntil) com lane
  blocked: BusyRange[]; // períodos bloqueados
  now: Date;
}): Slot[] {
  const { dateKey, tz, hours, rules, appointments, blocked, now } = input;
  if (!hours || !hours.isOpen) return [];

  const open = timeToMinutes(hours.openTime);
  const close = timeToMinutes(hours.closeTime);
  const step = Math.max(5, rules.slotDurationMin + rules.bufferMin);
  const duration = Math.max(5, rules.durationMin);
  const breakStart = hours.breakStart ? timeToMinutes(hours.breakStart) : null;
  const breakEnd = hours.breakEnd ? timeToMinutes(hours.breakEnd) : null;
  const earliest = new Date(now.getTime() + rules.minLeadMinutes * 60_000);
  const lanes = Math.max(1, rules.lanes);

  const slots: Slot[] = [];
  for (let start = open; start + duration <= close; start += step) {
    // O atendimento não pode invadir a pausa (ex.: almoço)
    if (breakStart !== null && breakEnd !== null && start < breakEnd && breakStart < start + duration) continue;

    const time = minutesToTime(start);
    const startsAt = zonedToUtc(dateKey, time, tz);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    const blockedUntil = new Date(endsAt.getTime() + rules.bufferMin * 60_000);

    let reason: Slot["reason"];
    if (startsAt < earliest) reason = "PAST";
    else if (blocked.some((b) => overlaps(startsAt, endsAt, b.start, b.end))) reason = "BLOCKED";

    const freeLanes: number[] = [];
    if (!reason) {
      for (let lane = 0; lane < lanes; lane++) {
        const busy = appointments.some((a) => (a.lane ?? 0) === lane && overlaps(startsAt, blockedUntil, a.start, a.end));
        if (!busy) freeLanes.push(lane);
      }
      if (freeLanes.length === 0) reason = "BOOKED";
    }

    slots.push({ time, startsAt, endsAt, blockedUntil, available: !reason, freeLanes, reason });
  }
  return slots;
}

export function weekdayHours(dateKey: string, all: (DayHours & { weekday: number })[]) {
  return all.find((h) => h.weekday === weekdayOfKey(dateKey));
}
