import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { handler, readJson } from "@/lib/http";
import { assertBearer } from "@/lib/token-auth";
import { PrintService } from "@/services/print/print.service";

const schema = z.object({ agentId: z.string().trim().min(1).max(64), ok: z.boolean(), error: z.string().max(500).optional() });

/** Resultado da impressão informado pelo agente local. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertBearer(req, env.printAgentToken, "PRINT_AGENT_TOKEN");
  const { id } = await params;
  const body = schema.parse(await readJson(req));
  await PrintService.complete(id, body.agentId, { ok: body.ok, error: body.error });
  return NextResponse.json({ ok: true });
});
