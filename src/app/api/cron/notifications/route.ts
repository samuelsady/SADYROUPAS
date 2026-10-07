import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handler } from "@/lib/http";
import { assertBearer } from "@/lib/token-auth";
import { NotificationService } from "@/services/notification/notification.service";

/**
 * Executado pelo agendador (Vercel Cron envia "Authorization: Bearer CRON_SECRET").
 * 1) Enfileira lembretes de atendimentos próximos (AppointmentReminder).
 * 2) Envia/reenvia mensagens pendentes.
 */
export const GET = handler(async (req: Request) => {
  assertBearer(req, env.cronSecret, "CRON_SECRET");
  const reminders = await NotificationService.queueReminders();
  const sent = await NotificationService.processPending({ limit: 100 });
  return NextResponse.json({ reminders: reminders.queued, processed: sent.processed });
});
