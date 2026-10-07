import { Prisma } from "@prisma/client";

/**
 * Violação de restrição de exclusão (23P01) — dois agendamentos ou duas
 * reservas de peça no mesmo intervalo. O Prisma não mapeia esse código,
 * então inspecionamos a mensagem do driver.
 */
export function isExclusionViolation(err: unknown) {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return msg.includes("23P01") || msg.includes("exclusion constraint") || msg.includes("_no_overlap");
}

export function isUniqueViolation(err: unknown, field?: string) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  if (!field) return true;
  const target = (err.meta?.target ?? []) as string[] | string;
  return Array.isArray(target) ? target.includes(field) : String(target).includes(field);
}

/** Conflito de serialização / deadlock — vale tentar de novo. */
export function isRetryableTxError(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2034" || err.code === "P2028");
}
