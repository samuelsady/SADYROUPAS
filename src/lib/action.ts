import "server-only";
import { ZodError } from "zod";
import { AppError } from "./errors";

/** Resultado padronizado das Server Actions (consumido por useActionState). */
export type ActionState<T = unknown> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

/**
 * Converte erros conhecidos em mensagem amigável. Erros inesperados são
 * registrados no log e NUNCA vazam detalhes internos para o navegador.
 */
export function toActionError(err: unknown): Extract<ActionState, { ok: false }> {
  if (err instanceof AppError) return { ok: false, error: err.message };
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: Object.values(fieldErrors)[0] ?? "Dados inválidos.", fieldErrors };
  }
  // redirect()/notFound() do Next precisam continuar propagando
  if (err && typeof err === "object" && "digest" in err && typeof (err as { digest: unknown }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_")) {
    throw err;
  }
  console.error("[action]", err);
  return { ok: false, error: "Não foi possível concluir a operação. Tente novamente." };
}

export function formBool(fd: FormData, name: string) {
  const v = fd.get(name);
  return v === "on" || v === "true" || v === "1";
}

export function formStr(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v : undefined;
}
