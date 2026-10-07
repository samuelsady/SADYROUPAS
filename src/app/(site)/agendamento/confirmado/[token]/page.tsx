import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarPlus, CheckCircle2, MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { AppointmentService } from "@/services/appointment.service";
import { SettingsService } from "@/services/settings.service";
import { formatDate, toTimeKey } from "@/utils/datetime";
import { googleCalendarUrl } from "@/utils/ics";
import { whatsappLink } from "@/utils/phone";

export const metadata: Metadata = { title: "Agendamento confirmado", robots: { index: false } };

export default async function ConfirmedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await AppointmentService.getByPublicToken(token);
  if (!appointment) notFound();
  const settings = await SettingsService.get();
  const tz = settings.timezone;
  const date = formatDate(appointment.startsAt, tz);
  const time = toTimeKey(appointment.startsAt, tz);
  const cancelled = appointment.status === "CANCELLED";
  const wa = whatsappLink(settings.whatsapp, `Olá! Tenho um agendamento na Sady Roupas: código ${appointment.code}, ${date} às ${time}.`);
  const gcal = googleCalendarUrl({ uid: appointment.code, start: appointment.startsAt, end: appointment.endsAt, title: `${appointment.service.name} — Sady Roupas`, description: `Código: ${appointment.code}`, location: settings.address ?? "Sady Roupas" });

  const rows = [
    ["Código", appointment.code],
    ["Cliente", appointment.customer.name],
    ["Serviço", appointment.service.name],
    ["Data", date],
    ["Horário", time],
  ];

  return (
    <div className="bg-ivory py-14 sm:py-20">
      <div className="container-site max-w-xl">
        <div className="rounded-2xl border border-line bg-white p-6 text-center sm:p-10">
          {cancelled ? (
            <>
              <p className="eyebrow text-red-700">Agendamento cancelado</p>
              <h1 className="display mt-3 text-3xl">Este agendamento foi cancelado.</h1>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-gold" strokeWidth={1.25} />
              <h1 className="display mt-4 text-4xl">Agendamento confirmado!</h1>
              <p className="mt-2 text-sm text-muted">Guarde seu código. Você também receberá a confirmação pelo WhatsApp.</p>
            </>
          )}
          <dl className="mt-8 divide-y divide-line rounded-lg border border-line text-left text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className={k === "Código" ? "font-mono font-semibold tracking-wide" : "text-right font-medium"}>{v}</dd>
              </div>
            ))}
          </dl>
          {!cancelled && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a href={`/api/public/appointments/${token}/ics`} className={buttonClass("primary", "lg")}>
                <CalendarPlus className="h-4 w-4" /> Adicionar ao calendário
              </a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "lg")}>
                  <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                </a>
              )}
              <a href={gcal} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-gold-dark hover:underline sm:col-span-2">
                ou adicionar ao Google Agenda
              </a>
            </div>
          )}
        </div>
        {settings.address && <p className="mt-6 text-center text-sm text-muted">{settings.address}</p>}
      </div>
    </div>
  );
}
