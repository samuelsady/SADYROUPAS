import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireUser } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { handler } from "@/lib/http";
import { AvailabilityService } from "@/services/availability/availability.service";
import { isDateKey } from "@/utils/datetime";

/** Horários para o painel: mesmas regras do site, sem antecedência mínima. */
export const GET = handler(async (req: Request) => {
  await requireUser("appointments.manage");
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  if (!isDateKey(date)) throw badRequest("Data inválida.");
  const service = await db.service.findFirst({ where: { id: url.searchParams.get("serviceId") ?? "", active: true } });
  if (!service) throw badRequest("Serviço inválido.");
  const slots = await AvailabilityService.slotsForDay(date, service, { staff: true, ignoreAppointmentId: url.searchParams.get("ignoreId") ?? undefined });
  return NextResponse.json({ slots: slots.map((s) => ({ time: s.time, available: s.available })) }, { headers: { "Cache-Control": "no-store" } });
});
