import { NextResponse } from "next/server";
import { handler, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/origin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { websiteActor } from "@/services/audit.service";
import { InterestService } from "@/services/interest.service";
import { normalizePhone } from "@/utils/phone";

/** "Quero que a loja me chame": contato + lista de provas, sem agendar (sem login). */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const ip = await clientIp();
  await enforceRateLimit(`interest:ip:${ip}`, 6, 10 * 60);
  const body = await readJson(req);
  const phone = typeof body?.whatsapp === "string" ? normalizePhone(body.whatsapp) : null;
  if (phone) await enforceRateLimit(`interest:phone:${phone}`, 4, 60 * 60);
  await InterestService.createFromWebsite(body, websiteActor(ip));
  return NextResponse.json({ ok: true }, { status: 201 });
});
