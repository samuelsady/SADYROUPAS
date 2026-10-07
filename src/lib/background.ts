import "server-only";
import { after } from "next/server";

const pending = new Set<Promise<void>>();

/**
 * Executa trabalho secundário (WhatsApp, impressão) DEPOIS que a resposta foi
 * enviada. Falhas aqui nunca afetam a operação principal, que já foi gravada.
 * Fora de uma requisição (scripts, testes), executa imediatamente sem bloquear
 * e pode ser aguardado com flushBackground().
 */
export function runAfterResponse(label: string, fn: () => Promise<unknown>) {
  const safe = async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[background:${label}]`, err);
    }
  };
  try {
    after(safe);
  } catch {
    const p = safe().finally(() => pending.delete(p));
    pending.add(p);
  }
}

/** Aguarda as tarefas em segundo plano iniciadas fora de requisição. */
export async function flushBackground() {
  while (pending.size) await Promise.all([...pending]);
}
