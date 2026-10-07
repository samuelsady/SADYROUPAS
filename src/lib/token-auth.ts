import "server-only";
import { timingSafeEqual } from "node:crypto";
import { AppError } from "./errors";

/** Compara o Bearer token do cabeçalho com o segredo esperado, em tempo constante. */
export function assertBearer(req: Request, expected: string | undefined, what: string) {
  if (!expected) throw new AppError(503, `${what} não configurado no servidor.`);
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AppError(401, "Token inválido.");
}
