import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/origin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { AppointmentService } from "@/services/appointment.service";
import { websiteActor } from "@/services/audit.service";

/** Cliente cancela pelo link da confirmação. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  assertSameOrigin(req);
  const { token } = await params;
  const ip = await clientIp();
  await enforceRateLimit(`self-service:ip:${ip}`, 10, 10 * 60);
  await AppointmentService.cancelByCustomer(token, await readJson(req), websiteActor(ip));
  return NextResponse.json({ ok: true });
});
