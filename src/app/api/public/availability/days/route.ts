import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { handler } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { AvailabilityService } from "@/services/availability/availability.service";
import { SettingsService } from "@/services/settings.service";
import { todayKey } from "@/utils/datetime";

/** Próximos dias com quantidade de horários livres. */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const service = await db.service.findFirst({ where: { id: url.searchParams.get("serviceId") ?? "", active: true, publicBooking: true } });
  if (!service) throw badRequest("Serviço indisponível.");
  const settings = await SettingsService.get();
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 21, 1), Math.min(settings.maxAdvanceDays + 1, 90));
  const result = await AvailabilityService.openDays(service, todayKey(settings.timezone), days);
  return NextResponse.json({ days: result }, { headers: { "Cache-Control": "no-store" } });
});
