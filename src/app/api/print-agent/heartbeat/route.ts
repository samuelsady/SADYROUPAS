import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { handler, readJson } from "@/lib/http";
import { assertBearer } from "@/lib/token-auth";
import { PrintService } from "@/services/print/print.service";

const schema = z.object({
  agentId: z.string().trim().min(1).max(64),
  state: z.enum(["READY", "WAITING", "ERROR"]),
  printerName: z.string().max(120).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
  hostname: z.string().max(120).optional().nullable(),
});

/** Sinal de vida do serviço local de impressão (a cada ~20s). */
export const POST = handler(async (req: Request) => {
  assertBearer(req, env.printAgentToken, "PRINT_AGENT_TOKEN");
  await PrintService.heartbeat(schema.parse(await readJson(req)));
  return NextResponse.json({ ok: true });
});
