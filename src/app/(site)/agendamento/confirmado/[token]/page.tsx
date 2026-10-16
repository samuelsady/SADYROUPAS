import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "@/components/ui/sady-image";
import Link from "next/link";
import { CalendarPlus, MessageCircle, Shirt } from "lucide-react";
import { ManageAppointment } from "@/components/site/manage-appointment";
import { AnimatedCheck } from "@/components/ui/animated-check";
import { buttonClass } from "@/components/ui/button";
import { AppointmentService } from "@/services/appointment.service";
import { SettingsService } from "@/services/settings.service";
import { diffDaysKey, formatDate, formatDateKey, toTimeKey, todayKey } from "@/utils/datetime";
import { googleCalendarUrl } from "@/utils/ics";
import { whatsappLink } from "@/utils/phone";
import { selfServiceState } from "@/utils/self-service";
import { WhatsAppAutoOpen } from "@/components/site/whatsapp-auto-open";
import { eventRoleLabel, pieceLabel } from "@/lib/event-roles";
import { appointmentStatusLabel } from "@/lib/labels";
import { bookingRequestMessage } from "@/services/notification/booking-request";

export const metadata: Metadata = { title: "Meu agendamento", robots: { index: false } };

export default async function ConfirmedPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ novo?: string }> }) {
  const [{ token }, { novo }] = await Promise.all([params, searchParams]);
  const appointment = await AppointmentService.getByPublicToken(token);
  if (!appointment) notFound();
  const settings = await SettingsService.get();
  const tz = settings.timezone;
  const date = formatDate(appointment.startsAt, tz);
  const time = toTimeKey(appointment.startsAt, tz);
  const cancelled = appointment.status === "CANCELLED";
  const { active, past, canChange } = selfServiceState(appointment, settings.selfServiceCutoffHours);
  const pending = appointment.status === "SCHEDULED";
  // Contagem regressiva para o evento
  const eventKey = appointment.eventDate ? appointment.eventDate.toISOString().slice(0, 10) : null;
  const daysToEvent = eventKey ? diffDaysKey(todayKey(tz), eventKey) : null;
  const eventName = appointment.eventRole === "formando" ? "a sua formatura" : appointment.eventRole === "noivo" ? "o seu casamento" : ["padrinho", "pai-noivos", "pajem"].includes(appointment.eventRole ?? "") ? "o casamento" : "o seu evento";
  const wa = whatsappLink(settings.whatsapp, `Olá! Tenho um agendamento na Sady Roupas: código ${appointment.code}, ${date} às ${time}.`);
  // Pedido ainda não confirmado: mensagem pronta com tudo o que o cliente informou
  const requestWa = pending ? whatsappLink(settings.whatsapp, bookingRequestMessage(appointment, settings)) : null;
  const gcal = googleCalendarUrl({ uid: appointment.code, start: appointment.startsAt, end: appointment.endsAt, title: `${appointment.service.name} — Sady Roupas`, description: `Código: ${appointment.code}`, location: settings.address ?? "Sady Roupas" });

  const rows = [
    ["Código", appointment.code],
    ["Cliente", appointment.customer.name],
    ["Serviço", appointment.service.name],
    ["Data", date],
    ["Horário", time],
    ...(eventRoleLabel(appointment.eventRole) ? [["Para", eventRoleLabel(appointment.eventRole)!]] : []),
    ...(appointment.eventDate ? [["Data do evento", formatDateKey(appointment.eventDate.toISOString().slice(0, 10))]] : []),
    ...(appointment.piecesNeeded.length ? [["Peças", appointment.piecesNeeded.map(pieceLabel).join(", ")]] : []),
    ["Situação", pending ? "Aguardando confirmação da loja" : appointment.status === "CONFIRMED" ? "Confirmado" : appointmentStatusLabel[appointment.status]],
  ];

  return (
    <div className="bg-ivory py-14 sm:py-20">
      <div className="container-site max-w-xl">
        <div className="stitch rounded-2xl border border-line bg-white p-6 text-center sm:p-10">
          {cancelled ? (
            <>
              <p className="eyebrow text-red-700">Agendamento cancelado</p>
              <h1 className="display mt-3 text-3xl">Este agendamento foi cancelado.</h1>
            </>
          ) : (
            <>
              {novo ? <AnimatedCheck className="mx-auto h-16 w-16 text-gold" /> : <p className="eyebrow">Meu agendamento</p>}
              <h1 className={`display mt-4 text-4xl ${novo ? "pop-in" : ""}`} style={novo ? { animationDelay: "0.5s" } : undefined}>
                {past ? "Atendimento realizado" : pending ? (novo ? "Pedido enviado!" : "Aguardando confirmação") : "Atendimento confirmado"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {pending ? "Agora é só enviar a mensagem no WhatsApp: a Sady confirma se o horário está disponível ou combina outro com você." : "Guarde este link para consultar, remarcar ou cancelar."}
              </p>
              {requestWa && !past && (
                <div className="mt-6">
                  <WhatsAppAutoOpen href={requestWa} auto={Boolean(novo)} onceKey={appointment.code} />
                </div>
              )}
            </>
          )}
          {daysToEvent !== null && daysToEvent >= 0 && !cancelled && (
            <div className="mt-8 flex items-center justify-center gap-4 rounded-xl bg-ink px-5 py-4 text-ivory">
              <span className="font-display text-5xl leading-none text-gold-light tabular-nums">{daysToEvent}</span>
              <span className="text-left text-sm leading-snug text-ivory/80">
                {daysToEvent === 0 ? <>É hoje! Que {eventName} seja inesquecível.</> : <>{daysToEvent === 1 ? "dia falta" : "dias faltam"} para<br /><span className="font-semibold text-ivory">{eventName}</span></>}
              </span>
            </div>
          )}
          <dl className="mt-8 divide-y divide-line rounded-lg border border-line text-left text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={k === "Código" ? "font-mono font-semibold tracking-wide" : "text-right font-medium"}>{v}</dd>
              </div>
            ))}
          </dl>
          {appointment.items.length > 0 && (
            <div className="mt-6 text-left">
              <p className="flex items-center gap-2 text-sm font-semibold"><Shirt className="h-4 w-4 text-gold" /> Peças para provar</p>
              <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {appointment.items.map((i, idx) => (
                  <li key={i.id} className="animate-fade-up" style={{ animationDelay: `${300 + idx * 60}ms` }}>
                    <Link href={`/catalogo/${i.product.slug}`} className="block">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-ink">
                        {i.product.images[0] && <Image src={i.product.images[0].url} alt="" fill sizes="120px" className="object-cover" />}
                      </div>
                      <p className="mt-1 truncate text-[11px] font-semibold">{i.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{i.size ? `Tam. ${i.size}` : "Tam. a definir"}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {active && !past && !pending && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a href={`/api/public/appointments/${token}/ics`} className={buttonClass("primary", "lg")}>
                <CalendarPlus className="h-4 w-4" /> Adicionar ao calendário
              </a>
              {wa && !pending && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "lg")}>
                  <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                </a>
              )}
              <a href={gcal} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-gold-dark hover:underline sm:col-span-2">
                ou adicionar ao Google Agenda
              </a>
            </div>
          )}
          {canChange && <ManageAppointment token={token} serviceId={appointment.serviceId} cutoffHours={settings.selfServiceCutoffHours} />}
          {active && !past && !canChange && (
            <p className="mt-6 text-xs text-muted-foreground">Faltam menos de {settings.selfServiceCutoffHours}h para o atendimento. Para remarcar ou cancelar, fale com a loja pelo WhatsApp.</p>
          )}
        </div>
        {settings.address && <p className="mt-6 text-center text-sm text-muted-foreground">{settings.address}</p>}
      </div>
    </div>
  );
}
