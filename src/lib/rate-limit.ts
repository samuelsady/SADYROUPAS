import "server-only";
import { db } from "@/database/client";
import { AppError } from "./errors";

/**
 * Limite de requisições por chave em janela fixa, persistido no PostgreSQL
 * (funciona com várias instâncias serverless). Uma única instrução SQL faz
 * o "upsert + incremento" de forma atômica.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${key}, now(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count"
  `;
  const count = Number(rows[0]?.count ?? 0);
  return { allowed: count <= limit, count };
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const { allowed } = await rateLimit(key, limit, windowSeconds);
  if (!allowed) throw new AppError(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.", "RATE_LIMITED");
}
