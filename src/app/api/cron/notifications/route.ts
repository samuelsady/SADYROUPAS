import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handler } from "@/lib/http";
import { assertBearer } from "@/lib/token-auth";
import { NotificationService } from "@/services/notification/notification.service";
import { RentalService } from "@/services/rental-workflow.service";

/**
 * Executado pelo agendador (Vercel Cron envia "Authorization: Bearer CRON_SECRET").
 * 1) Enfileira lembretes de atendimentos próximos (AppointmentReminder).
 * 2) Marca locações atrasadas e avisa o cliente (ReturnOverdue).
 * 3) Envia/reenvia mensagens pendentes.
 */
export const GET = handler(async (req: Request) => {
  assertBearer(req, env.cronSecret, "CRON_SECRET");
  const reminders = await NotificationService.queueReminders();
  const overdue = await RentalService.flagOverdue();
  const sent = await NotificationService.processPending({ limit: 100 });
  return NextResponse.json({ reminders: reminders.queued, overdue: overdue.flagged, processed: sent.processed });
});
