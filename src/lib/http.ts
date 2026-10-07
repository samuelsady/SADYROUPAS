import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

/** Envolve um Route Handler com respostas de erro padronizadas e seguras. */
export function handler<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AppError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        return NextResponse.json({ error: issues[0]?.message ?? "Dados inválidos.", issues }, { status: 422 });
      }
      console.error("[api]", err);
      return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
    }
  };
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "JSON inválido.");
  }
}
