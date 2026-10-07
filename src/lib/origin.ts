import "server-only";
import { AppError } from "./errors";

/**
 * Proteção CSRF para rotas JSON públicas que alteram dados: o navegador sempre
 * envia Origin em POST; exigimos que seja o próprio site.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // clientes não-navegador (testes, integrações) — sem cookie de sessão envolvido
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {
    /* origem malformada */
  }
  throw new AppError(403, "Origem não permitida.");
}
