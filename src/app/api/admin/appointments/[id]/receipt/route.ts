import { requireUser } from "@/lib/auth/session";
import { handler } from "@/lib/http";
import { notFound } from "@/lib/errors";
import { db } from "@/database/client";
import { SettingsService } from "@/services/settings.service";
import { appointmentReceiptData } from "@/services/print/print.service";
import { buildAppointmentReceipt, type ReceiptFormat } from "@/services/print/receipt";
import { receiptPdf } from "@/services/print/receipt-pdf";

/** Comprovante em PDF (gerado na hora a partir do banco). */
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser("print.manage");
  const { id } = await params;
  const appointment = await db.appointment.findUnique({ where: { id }, include: { customer: true, service: true, product: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } } });
  if (!appointment) throw notFound("Agendamento");
  const settings = await SettingsService.get();
  const content = buildAppointmentReceipt(appointmentReceiptData(appointment, settings), settings.printFormat as ReceiptFormat);
  const pdf = await receiptPdf(content, settings.printFormat);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${appointment.code}.pdf"`, "Cache-Control": "private, no-store" },
  });
});
