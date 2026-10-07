import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/origin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { AppointmentService } from "@/services/appointment.service";
import { websiteActor } from "@/services/audit.service";

/** Cliente remarca pelo link da confirmação (token aleatório = acesso ao próprio agendamento). */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  assertSameOrigin(req);
  const { token } = await params;
  const ip = await clientIp();
  await enforceRateLimit(`self-service:ip:${ip}`, 10, 10 * 60);
  await enforceRateLimit(`self-service:token:${token}`, 5, 60 * 60);
  const a = await AppointmentService.rescheduleByCustomer(token, await readJson(req), websiteActor(ip));
  return NextResponse.json({ code: a.code, startsAt: a.startsAt.toISOString() });
});
