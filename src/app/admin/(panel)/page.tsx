import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarPlus, CheckCircle2, PackageCheck, PackageX, Printer, Shirt, Undo2, UserPlus, Users, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { AppointmentStatusBadge } from "@/components/admin/status-badges";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { inventoryStatusLabel, inventoryStatusTone, V1_INVENTORY_STATUSES } from "@/lib/labels";
import { DashboardService } from "@/services/dashboard.service";
import { SettingsService } from "@/services/settings.service";
import { formatDate, formatLongDateKey, toTimeKey } from "@/utils/datetime";
import { cn } from "@/utils/cn";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, icon: Icon, tone = "ink", href }: { label: string; value: number; icon: React.ElementType; tone?: "ink" | "gold" | "red" | "green"; href?: string }) {
  const toneClass = { ink: "text-ink", gold: "text-gold-dark", red: "text-red-700", green: "text-emerald-700" }[tone];
  const body = (
    <Card className="p-4 transition hover:border-ink/20 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <Icon className={cn("h-4 w-4", toneClass)} strokeWidth={1.75} />
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tabular-nums", toneClass)}>{value}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ negado?: string }> }) {
  const user = await requirePageUser();
  const [{ negado }, data, settings] = await Promise.all([searchParams, DashboardService.overview(), SettingsService.get()]);
  const tz = settings.timezone;
  const printerTone = { CONECTADA: "green", AGUARDANDO: "amber", DESCONECTADA: "gray", ERRO: "red" } as const;

  return (
    <>
      {negado && <div role="alert" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Você não tem permissão para acessar aquela área.</div>}
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        description={<span className="capitalize">{formatLongDateKey(data.today)}</span>}
        actions={<LinkButton href="/admin/agendamentos/novo" variant="primary"><CalendarPlus className="h-4 w-4" /> Novo agendamento</LinkButton>}
      />

      {data.alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {data.alerts.map((a) => (
            <Link key={a.text} href={a.href}>
              <Badge tone={a.tone} className="px-3 py-1.5 text-xs">{a.tone === "red" || a.tone === "amber" ? <AlertTriangle className="h-3 w-3" /> : null}{a.text}</Badge>
            </Link>
          ))}
        </div>
      )}

      <section aria-labelledby="hoje" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <h2 id="hoje" className="sr-only">Hoje</h2>
        <Stat label="Atendimentos hoje" value={data.counts.today} icon={CalendarClock} href="/admin/agenda" />
        <Stat label="Concluídos hoje" value={data.counts.completed} icon={CheckCircle2} tone="green" />
        <Stat label="Cancelamentos hoje" value={data.counts.cancelled} icon={XCircle} tone="red" />
        <Stat label="Não compareceram" value={data.counts.noShow} icon={AlertTriangle} tone="gold" />
      </section>
      <section aria-label="Locações hoje" className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Retiradas para hoje" value={data.rentals.pickups} icon={PackageCheck} tone="gold" href="/admin/locacoes?aba=retiradas" />
        <Stat label="Devoluções hoje" value={data.rentals.returns} icon={Undo2} href="/admin/locacoes?aba=devolucoes" />
        <Stat label="Devoluções atrasadas" value={data.rentals.overdue} icon={AlertTriangle} tone="red" href="/admin/locacoes?aba=atrasadas" />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 [&>*]:min-w-0 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Agenda de hoje" description={`${data.counts.active} atendimento(s) ativo(s)`} action={<Link href="/admin/agenda" className="text-xs font-semibold text-gold-dark hover:underline">Abrir agenda</Link>} />
          {data.todayAppointments.length === 0 ? (
            <EmptyState title="Nenhum atendimento hoje" description="Os agendamentos feitos pelo site e pela equipe aparecem aqui." />
          ) : (
            <ul className="divide-y divide-line">
              {data.todayAppointments.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/agendamentos/${a.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-ivory/60">
                    <span className="w-12 font-mono text-sm font-semibold tabular-nums">{toTimeKey(a.startsAt, tz)}</span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold", a.status === "CANCELLED" && "text-muted-foreground line-through")}>{a.customer.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.service.name}{a.notes ? ` · ${a.notes}` : ""}</p>
                    </div>
                    <AppointmentStatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {data.toSeparate.length > 0 && (
            <Card className="border-gold/40">
              <CardHeader title={<span className="flex items-center gap-2"><Shirt className="h-4 w-4 text-gold" /> Peças para separar</span>} description="Listas de provas de hoje e amanhã" />
              <ul className="divide-y divide-line">
                {data.toSeparate.slice(0, 6).map((i) => (
                  <li key={i.id}>
                    <Link href={`/admin/agendamentos/${i.appointment.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-ivory/60">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{i.product.name}{i.size ? ` · tam. ${i.size}` : ""}</span>
                        <span className="block truncate text-xs text-muted-foreground">{i.appointment.customer.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDate(i.appointment.startsAt, tz).slice(0, 5)} {toTimeKey(i.appointment.startsAt, tz)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {data.toSeparate.length > 6 && <p className="border-t border-line px-5 py-2 text-xs text-muted-foreground">+{data.toSeparate.length - 6} outras</p>}
            </Card>
          )}

          <Card>
            <CardHeader title="Próximos horários" />
            {data.upcoming.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Sem próximos agendamentos.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.upcoming.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/agendamentos/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-ivory/60">
                      <span className="truncate">{a.customer.name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDate(a.startsAt, tz).slice(0, 5)} {toTimeKey(a.startsAt, tz)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Clientes" value={data.customers.total} icon={Users} href="/admin/clientes" />
            <Stat label="Novos no mês" value={data.customers.newThisMonth} icon={UserPlus} tone="gold" />
          </div>

          <Card>
            <CardHeader title="Estoque" description={`${data.inventory.total} peças físicas ativas`} action={<Link href="/admin/estoque" className="text-xs font-semibold text-gold-dark hover:underline">Ver estoque</Link>} />
            <div className="grid grid-cols-2 gap-px bg-line">
              {V1_INVENTORY_STATUSES.map((s) => (
                <Link key={s} href={`/admin/estoque?status=${s}`} className="flex items-center justify-between bg-white px-5 py-3 hover:bg-ivory/60">
                  <Badge tone={inventoryStatusTone[s]} dot>{inventoryStatusLabel[s]}</Badge>
                  <span className="text-lg font-semibold tabular-nums">{data.inventory.counts[s] ?? 0}</span>
                </Link>
              ))}
            </div>
          </Card>

          {data.soldOut.total > 0 && (
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><PackageX className="h-4 w-4 text-red-700" /> Tamanhos esgotados</span>} description={`${data.soldOut.total} produto/tamanho sem peça disponível agora`} />
              <ul className="divide-y divide-line">
                {data.soldOut.items.map((s) => (
                  <li key={`${s.productId}-${s.size}`}>
                    <Link href={`/admin/estoque?produto=${s.productId}&tamanho=${encodeURIComponent(s.size)}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-ivory/60">
                      <span className="truncate">{s.name}</span>
                      <Badge tone="red">Tam. {s.size}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="flex items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <Printer className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Impressora</p>
                <p className="text-xs text-muted-foreground">{data.print.pending} pendente(s) · {data.print.failed} com falha</p>
              </div>
            </div>
            <Link href="/admin/impressoes"><Badge tone={printerTone[data.print.printer.state]} dot>{data.print.printer.state}</Badge></Link>
          </Card>
        </div>
      </div>
    </>
  );
}
