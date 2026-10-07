import type { Metadata } from "next";
import Link from "next/link";
import type { NotificationStatus, Prisma } from "@prisma/client";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { NotificationStatusBadge } from "@/components/admin/status-badges";
import { Table, Td, Th } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { notificationEventLabel, notificationStatusLabel } from "@/lib/labels";
import { SettingsService } from "@/services/settings.service";
import { formatDateTime } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";
import { cn } from "@/utils/cn";
import { retryNotificationAction } from "../_actions/appointments";
import { markAlertsReadAction } from "../_actions/common";

export const metadata: Metadata = { title: "Notificações" };
const STATUSES = Object.keys(notificationStatusLabel) as NotificationStatus[];

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ status?: string; aba?: string }> }) {
  await requirePageUser("notifications.view");
  const sp = await searchParams;
  const tab = sp.aba === "alertas" ? "alertas" : "whatsapp";
  const status = STATUSES.includes(sp.status as NotificationStatus) ? (sp.status as NotificationStatus) : undefined;
  const where: Prisma.NotificationWhereInput = { channel: tab === "alertas" ? "INTERNAL" : "WHATSAPP", ...(status ? { status } : {}) };
  const [items, settings] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { customer: { select: { id: true, name: true } }, appointment: { select: { id: true, code: true } } } }),
    SettingsService.get(),
  ]);
  const tz = settings.timezone;

  return (
    <>
      <PageHeader title="Notificações" description="Mensagens automáticas de WhatsApp e alertas internos do painel." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-line bg-white p-0.5 text-xs font-semibold">
          <Link href="/admin/notificacoes" className={cn("rounded px-3 py-1.5", tab === "whatsapp" ? "bg-ink text-ivory" : "text-muted")}>WhatsApp</Link>
          <Link href="/admin/notificacoes?aba=alertas" className={cn("rounded px-3 py-1.5", tab === "alertas" ? "bg-ink text-ivory" : "text-muted")}>Alertas internos</Link>
        </div>
        {tab === "whatsapp" && (
          <>
            <Badge tone={settings.whatsappEnabled ? "green" : "gray"}>{settings.whatsappEnabled ? "WhatsApp habilitado" : "WhatsApp desabilitado"}</Badge>
            <Badge tone={settings.whatsappMode === "SIMULATED" ? "purple" : "gold"}>Modo {settings.whatsappMode === "SIMULATED" ? "SIMULADO" : "PRODUÇÃO"}</Badge>
            {settings.whatsappMode === "PRODUCTION" && !env.whatsapp.configured && <Badge tone="red">Credenciais da API ausentes</Badge>}
          </>
        )}
        {tab === "alertas" && <form action={markAlertsReadAction}><button className="text-xs font-semibold text-gold-dark hover:underline">Marcar todos como lidos</button></form>}
      </div>
      <Card>
        {tab === "whatsapp" && (
          <CardHeader title="Mensagens" action={
            <div className="flex flex-wrap gap-1 text-xs font-semibold">
              {[undefined, ...STATUSES].map((s) => <Link key={s ?? "all"} href={s ? `/admin/notificacoes?status=${s}` : "/admin/notificacoes"} className={cn("rounded-md px-2.5 py-1", status === s ? "bg-ink text-ivory" : "text-muted hover:bg-ivory")}>{s ? notificationStatusLabel[s] : "Todas"}</Link>)}
            </div>
          } />
        )}
        {items.length === 0 ? <EmptyState title="Nada por aqui" /> : tab === "alertas" ? (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className={cn("px-5 py-3", !n.readAt && "bg-[#fbf6ec]")}>
                <p className="text-sm font-semibold">🔔 {n.title}</p>
                <p className="text-xs text-muted">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted/70">{formatDateTime(n.createdAt, tz)}{n.appointment && <> · <Link href={`/admin/agendamentos/${n.appointment.id}`} className="font-mono hover:text-ink">{n.appointment.code}</Link></>}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Table>
            <thead><tr><Th>Data</Th><Th>Evento</Th><Th>Destino</Th><Th>Mensagem</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} className="align-top">
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(n.createdAt, tz)}</Td>
                  <Td className="text-xs">{notificationEventLabel[n.event]}{n.appointment && <Link href={`/admin/agendamentos/${n.appointment.id}`} className="block font-mono text-muted hover:text-ink">{n.appointment.code}</Link>}</Td>
                  <Td className="text-xs">{n.customer?.name}<span className="block text-muted">{formatPhone(n.recipient)}</span></Td>
                  <Td className="max-w-sm"><details><summary className="cursor-pointer truncate text-xs">{n.body.split("\n")[0]}</summary><pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-ink/80">{n.body}</pre></details>{n.error && <p className="mt-1 text-xs text-red-700">{n.error}</p>}</Td>
                  <Td><NotificationStatusBadge status={n.status} /></Td>
                  <Td>{(n.status === "FAILED" || n.status === "SKIPPED") && <ActionButton action={retryNotificationAction} fields={{ id: n.id }}>Reenviar</ActionButton>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
