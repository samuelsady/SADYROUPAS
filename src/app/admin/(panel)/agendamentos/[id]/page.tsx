import type { Metadata } from "next";
import Link from "next/link";
import { FileDown, MessageCircle, Pencil, Printer } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { AppointmentForm } from "@/components/admin/appointment-form";
import { FittingCard } from "@/components/admin/fitting-card";
import { PageHeader } from "@/components/admin/page-header";
import { AppointmentStatusBadge, NotificationStatusBadge, PrintStatusBadge } from "@/components/admin/status-badges";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { formatRentalNumber } from "@/utils/codes";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { appointmentSourceLabel, notificationEventLabel } from "@/lib/labels";
import { AppointmentService } from "@/services/appointment.service";
import { FittingService } from "@/services/fitting.service";
import { SettingsService } from "@/services/settings.service";
import { formatDate, formatDateTime, formatLongDateKey, toDateKey, toTimeKey } from "@/utils/datetime";
import { formatPhone, whatsappLink } from "@/utils/phone";
import { reprintAppointmentAction, retryNotificationAction, updateAppointmentAction } from "../../_actions/appointments";

export const metadata: Metadata = { title: "Agendamento" };

export default async function AppointmentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageUser("appointments.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [a, settings] = await Promise.all([AppointmentService.get(id), SettingsService.get()]);
  const tz = settings.timezone;
  const editable = a.status === "SCHEDULED" || a.status === "CONFIRMED";
  const [services, products, candidates] = await Promise.all([
    editable ? db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, durationMin: true } }) : [],
    editable ? db.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    editable ? FittingService.candidates(a.items) : [],
  ]);
  const wa = whatsappLink(a.customer.whatsapp, `Olá, ${a.customer.name.split(" ")[0]}! Aqui é da Sady Roupas, sobre seu atendimento de ${formatDate(a.startsAt, tz)} às ${toTimeKey(a.startsAt, tz)}.`);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/agendamentos", label: "Agendamentos" }}
        title={<span className="flex flex-wrap items-center gap-3"><span className="font-mono">{a.code}</span><AppointmentStatusBadge status={a.status} /></span>}
        description={`Criado em ${formatDateTime(a.createdAt, tz)} via ${appointmentSourceLabel[a.source]}${a.createdBy ? ` por ${a.createdBy.name}` : ""}`}
        actions={
          <>
            <AppointmentActions id={a.id} status={a.status} size="md" />
            {a.rental ? (
              <LinkButton href={`/admin/locacoes/${a.rental.id}`} variant="gold">Ver locação {formatRentalNumber(a.rental.number)}</LinkButton>
            ) : a.status !== "CANCELLED" && a.status !== "NO_SHOW" ? (
              <LinkButton href={`/admin/locacoes/nova?agendamento=${a.id}`} variant="gold">Criar locação</LinkButton>
            ) : null}
          </>
        }
      />
      {(sp.criado || sp.salvo) && (
        <div role="status" className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {sp.criado ? "Agendamento criado. A confirmação foi para o WhatsApp do cliente e o comprovante para a fila de impressão." : "Alterações salvas."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Atendimento" />
            <dl className="grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Data</dt><dd className="font-semibold capitalize">{formatLongDateKey(toDateKey(a.startsAt, tz))}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Horário</dt><dd className="font-semibold">{toTimeKey(a.startsAt, tz)} – {toTimeKey(a.endsAt, tz)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Serviço</dt><dd className="font-semibold">{a.service.name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Peça de interesse</dt><dd className="font-semibold">{a.product ? <Link href={`/catalogo/${a.product.slug}`} target="_blank" className="hover:text-gold-dark">{a.product.name}</Link> : "—"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Observações</dt><dd className="whitespace-pre-wrap">{a.notes || "—"}</dd></div>
              {a.internalNotes && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Observações internas</dt><dd className="whitespace-pre-wrap rounded-md bg-amber-50 p-2">{a.internalNotes}</dd></div>}
              {a.cancelReason && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Motivo do cancelamento</dt><dd>{a.cancelReason}</dd></div>}
            </dl>
          </Card>

          <FittingCard appointmentId={a.id} items={a.items} candidates={candidates} products={products} editable={editable} />

          {editable && (
            <details className="group rounded-xl border border-line bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold"><Pencil className="h-4 w-4 text-gold" /> Editar / remarcar</summary>
              <div className="border-t border-line p-5">
                <AppointmentForm
                  action={updateAppointmentAction.bind(null, a.id)}
                  services={services}
                  products={products}
                  mode="edit"
                  appointmentId={a.id}
                  initial={{ serviceId: a.serviceId, date: toDateKey(a.startsAt, tz), time: toTimeKey(a.startsAt, tz), notes: a.notes, internalNotes: a.internalNotes, productId: a.productId }}
                />
              </div>
            </details>
          )}

          <Card>
            <CardHeader title="Mensagens de WhatsApp" description={`Modo: ${settings.whatsappMode === "SIMULATED" ? "simulado (nenhuma mensagem real é enviada)" : "produção"}`} />
            {a.notifications.length === 0 ? (
              <p className="px-5 py-5 text-sm text-muted-foreground">Nenhuma mensagem.</p>
            ) : (
              <ul className="divide-y divide-line">
                {a.notifications.map((n) => (
                  <li key={n.id} className="space-y-2 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{notificationEventLabel[n.event]}</p>
                      <div className="flex items-center gap-2">
                        <NotificationStatusBadge status={n.status} />
                        <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt, tz)}</span>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md bg-ivory p-3 font-sans text-xs text-ink/80">{n.body}</pre>
                    {n.error && <p className="text-xs text-red-700">Erro: {n.error}</p>}
                    {(n.status === "FAILED" || n.status === "SKIPPED") && <ActionButton action={retryNotificationAction} fields={{ id: n.id }}>Reenviar</ActionButton>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Cliente" action={<Link href={`/admin/clientes/${a.customer.id}`} className="text-xs font-semibold text-gold-dark hover:underline">Ver ficha</Link>} />
            <div className="space-y-1 p-5 text-sm">
              <p className="text-base font-semibold">{a.customer.name}</p>
              <p className="text-muted-foreground">{formatPhone(a.customer.whatsapp)}</p>
              {a.customer.email && <p className="text-muted-foreground">{a.customer.email}</p>}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm", "mt-3")}><MessageCircle className="h-4 w-4" /> Abrir conversa</a>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Comprovante" action={<a href={`/api/admin/appointments/${a.id}/receipt`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"><FileDown className="h-3.5 w-3.5" /> PDF</a>} />
            <div className="space-y-3 p-5">
              {a.printJobs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma impressão.</p> : (
                <ul className="space-y-2">
                  {a.printJobs.map((j) => (
                    <li key={j.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{formatDateTime(j.createdAt, tz)}</span>
                      <span className="flex items-center gap-2">{j.error && <span className="max-w-40 truncate text-red-700" title={j.error}>{j.error}</span>}<PrintStatusBadge status={j.status} /></span>
                    </li>
                  ))}
                </ul>
              )}
              <ActionButton action={reprintAppointmentAction} fields={{ id: a.id }} variant="primary" size="md"><Printer className="h-4 w-4" /> Reimprimir</ActionButton>
              {a.printJobs[0] && (
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Pré-visualizar</summary>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-ink p-3 font-mono text-[10px] leading-snug text-ivory">{a.printJobs[0].content}</pre>
                </details>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
