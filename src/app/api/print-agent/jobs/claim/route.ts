import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { handler, readJson } from "@/lib/http";
import { assertBearer } from "@/lib/token-auth";
import { PrintService } from "@/services/print/print.service";

/** O agente pede o próximo comprovante pendente. 204 = fila vazia. */
export const POST = handler(async (req: Request) => {
  assertBearer(req, env.printAgentToken, "PRINT_AGENT_TOKEN");
  const { agentId } = z.object({ agentId: z.string().trim().min(1).max(64) }).parse(await readJson(req));
  const job = await PrintService.claimNext(agentId);
  if (!job) return new Response(null, { status: 204 });
  return NextResponse.json({ id: job.id, kind: job.kind, format: job.format, content: job.content, attempts: job.attempts });
});
