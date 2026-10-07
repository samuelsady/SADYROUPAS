import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { handler } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { AvailabilityService } from "@/services/availability/availability.service";
import { isDateKey } from "@/utils/datetime";

/** Horários de um dia para um serviço. A disponibilidade é calculada no servidor. */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId") ?? "";
  const date = url.searchParams.get("date") ?? "";
  if (!isDateKey(date)) throw badRequest("Data inválida.");
  const service = await db.service.findFirst({ where: { id: serviceId, active: true, publicBooking: true } });
  if (!service) throw badRequest("Serviço indisponível.");
  const slots = await AvailabilityService.slotsForDay(date, service);
  return NextResponse.json(
    { date, slots: slots.map((s) => ({ time: s.time, available: s.available })) },
    { headers: { "Cache-Control": "no-store" } },
  );
});
