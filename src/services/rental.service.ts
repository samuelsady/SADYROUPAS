import { diffDaysKey } from "@/utils/datetime";

/**
 * V2 — Locações. Nesta versão ficam prontas as REGRAS PURAS (testadas),
 * usadas quando os módulos de locação/retirada/devolução forem ativados.
 * A garantia de "mesma peça em duas locações sobrepostas" já existe no banco
 * (restrição RentalItem_no_overlap).
 */

export type RentalPolicy = {
  defaultRentalDays: number;
  /** Dias reservados após a devolução para conferência/lavanderia */
  turnaroundDays: number;
  lateFee: {
    enabled: boolean;
    graceDays: number; // tolerância
    fixedPerDay: number; // R$ por dia
    percentPerDay: number; // % do total da locação por dia
    maxAmount: number | null; // teto
  };
};

export const DEFAULT_RENTAL_POLICY: RentalPolicy = {
  defaultRentalDays: 4,
  turnaroundDays: 1,
  lateFee: { enabled: true, graceDays: 0, fixedPerDay: 20, percentPerDay: 0, maxAmount: null },
};

export function parseRentalPolicy(json: unknown): RentalPolicy {
  if (!json || typeof json !== "object") return DEFAULT_RENTAL_POLICY;
  const j = json as Partial<RentalPolicy>;
  return {
    ...DEFAULT_RENTAL_POLICY,
    ...j,
    lateFee: { ...DEFAULT_RENTAL_POLICY.lateFee, ...(j.lateFee ?? {}) },
  };
}

/** Dois períodos [a, b] (datas inclusivas, YYYY-MM-DD) se sobrepõem? */
export function periodsOverlap(a: { from: string; until: string }, b: { from: string; until: string }) {
  return a.from <= b.until && b.from <= a.until;
}

/** Dias de atraso considerando a tolerância. */
export function daysLate(returnDueKey: string, returnedKey: string, graceDays = 0) {
  return Math.max(0, diffDaysKey(returnDueKey, returnedKey) - graceDays);
}

/**
 * Multa por atraso (termo contratual da loja — não é cobrança de juros).
 * Ex.: prevista 20/10, devolvida 23/10, R$ 20/dia → R$ 60.
 */
export function calculateLateFee(input: { returnDueKey: string; returnedKey: string; rentalTotal: number; policy: RentalPolicy["lateFee"] }) {
  const { policy } = input;
  if (!policy.enabled) return { days: 0, amount: 0 };
  const days = daysLate(input.returnDueKey, input.returnedKey, policy.graceDays);
  if (days === 0) return { days, amount: 0 };
  const perDay = policy.fixedPerDay + (input.rentalTotal * policy.percentPerDay) / 100;
  let amount = Math.round(perDay * days * 100) / 100;
  if (policy.maxAmount !== null && policy.maxAmount >= 0) amount = Math.min(amount, policy.maxAmount);
  return { days, amount };
}

export type PaymentSummary = { total: number; discount: number; paid: number; lateFees: number };

export function paymentStatus(s: PaymentSummary): { remaining: number; status: "PENDING" | "PARTIAL" | "PAID" } {
  const due = Math.max(0, s.total - s.discount + s.lateFees);
  const remaining = Math.max(0, Math.round((due - s.paid) * 100) / 100);
  if (remaining === 0) return { remaining, status: "PAID" };
  return { remaining, status: s.paid > 0 ? "PARTIAL" : "PENDING" };
}
