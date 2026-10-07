import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/origin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { AppointmentService } from "@/services/appointment.service";
import { websiteActor } from "@/services/audit.service";
import { normalizePhone } from "@/utils/phone";

/**
 * Agendamento público (sem login).
 * Proteções: mesma origem, rate limit por IP e por WhatsApp, honeypot,
 * validação completa no servidor e exclusão no banco contra conflito.
 */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const ip = await clientIp();
  await enforceRateLimit(`booking:ip:${ip}`, 8, 10 * 60);
  const body = await readJson(req);
  const phone = typeof body?.whatsapp === "string" ? normalizePhone(body.whatsapp) : null;
  if (phone) await enforceRateLimit(`booking:phone:${phone}`, 4, 60 * 60);

  const { appointment } = await AppointmentService.createFromWebsite(body, websiteActor(ip));
  return NextResponse.json({ code: appointment.code, token: appointment.publicToken }, { status: 201 });
});
