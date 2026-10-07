/**
 * Datas e horários no fuso da loja.
 *
 * O banco guarda instantes em UTC. A loja pensa em "data local + HH:mm"
 * (America/Fortaleza — Teresina). Estas funções fazem a ponte sem depender
 * de bibliotecas externas, usando apenas Intl.
 */

export const DEFAULT_TZ = "America/Fortaleza";

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = domingo
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string) {
  let f = partsFormatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsFormatterCache.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function zonedParts(date: Date, tz = DEFAULT_TZ): ZonedParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter(tz).formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAYS.indexOf(map.weekday),
  };
}

/** Diferença (ms) entre o horário local do fuso e UTC naquele instante. */
function tzOffsetMs(date: Date, tz: string) {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/** "2026-10-18" + "14:30" no fuso da loja → instante UTC. */
export function zonedToUtc(dateStr: string, timeStr: string, tz = DEFAULT_TZ): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = tzOffsetMs(guess, tz);
  const result = new Date(guess.getTime() - offset);
  // Ajuste para transições de horário de verão (não ocorre em Fortaleza, mas mantém correto)
  const offset2 = tzOffsetMs(result, tz);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Data local (YYYY-MM-DD) de um instante. */
export function toDateKey(date: Date, tz = DEFAULT_TZ) {
  const p = zonedParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Hora local (HH:mm) de um instante. */
export function toTimeKey(date: Date, tz = DEFAULT_TZ) {
  const p = zonedParts(date, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function todayKey(tz = DEFAULT_TZ, now = new Date()) {
  return toDateKey(now, tz);
}

export function isDateKey(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isTimeKey(s: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Soma dias a uma data local (YYYY-MM-DD). */
export function addDaysKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Dia da semana (0 = domingo) de uma data local. */
export function weekdayOfKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function diffDaysKey(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** Início (inclusive) e fim (exclusivo) de um dia local, em UTC. */
export function dayRangeUtc(dateKey: string, tz = DEFAULT_TZ) {
  return { start: zonedToUtc(dateKey, "00:00", tz), end: zonedToUtc(addDaysKey(dateKey, 1), "00:00", tz) };
}

/** "18/10/2026" a partir de YYYY-MM-DD. */
export function formatDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDate(date: Date, tz = DEFAULT_TZ) {
  return formatDateKey(toDateKey(date, tz));
}

export function formatDateTime(date: Date, tz = DEFAULT_TZ) {
  return `${formatDate(date, tz)} ${toTimeKey(date, tz)}`;
}

const LONG_WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const SHORT_WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function weekdayName(weekday: number, short = false) {
  return (short ? SHORT_WEEKDAYS : LONG_WEEKDAYS)[weekday];
}

export function monthName(month: number) {
  return MONTHS[month - 1];
}

/** "sábado, 18 de outubro" */
export function formatLongDateKey(dateKey: string) {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${weekdayName(weekdayOfKey(dateKey))}, ${d} de ${monthName(m)}`;
}

/** Segunda-feira da semana de uma data (semana começando na segunda). */
export function startOfWeekKey(dateKey: string) {
  const wd = weekdayOfKey(dateKey);
  return addDaysKey(dateKey, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonthKey(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`;
}

export function addMonthsKey(dateKey: string, months: number) {
  const [y, m] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-01`;
}
