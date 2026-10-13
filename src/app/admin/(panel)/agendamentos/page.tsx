import type { Metadata } from "next";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { AppointmentStatusBadge, PrintStatusBadge } from "@/components/admin/status-badges";
import { Table, Td, Th } from "@/components/admin/table";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { requirePageUser } from "@/lib/auth/session";
import { appointmentSourceLabel, appointmentStatusLabel } from "@/lib/labels";
import { AppointmentService } from "@/services/appointment.service";
import { SettingsService } from "@/services/settings.service";
import { dayRangeUtc, formatDate, isDateKey, todayKey, toTimeKey } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";

export const metadata: Metadata = { title: "Agendamentos" };

const STATUSES = Object.keys(appointmentStatusLabel) as AppointmentStatus[];

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageUser("appointments.manage");
  const sp = await searchParams;
  const settings = await SettingsService.get();
  const tz = settings.timezone;
  const status = STATUSES.includes(sp.status as AppointmentStatus) ? (sp.status as AppointmentStatus) : undefined;
  const period = sp.periodo ?? "proximos";
  const from = sp.de && isDateKey(sp.de) ? dayRangeUtc(sp.de, tz).start : period === "proximos" ? dayRangeUtc(todayKey(tz), tz).start : undefined;
  const to = sp.ate && isDateKey(sp.ate) ? dayRangeUtc(sp.ate, tz).end : undefined;
  const page = Number(sp.page) || 1;
  const data = await AppointmentService.list({ q: sp.q, status, from, to, page });

  const qs = (p: number) => {
    const params = new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/admin/agendamentos?${params}`;
  };

  return (
    <>
      <PageHeader title="Agendamentos" description="Todos os atendimentos — site, WhatsApp, telefone e balcão." actions={<LinkButton href="/admin/agendamentos/novo"><Plus className="h-4 w-4" /> Novo agendamento</LinkButton>} />
      <Card>
        <form className="grid gap-2 border-b border-line p-3 sm:grid-cols-[1fr_160px_160px_150px_150px_auto]">
          <Input name="q" defaultValue={sp.q} placeholder="Código, nome ou WhatsApp" aria-label="Buscar" />
          <Select name="status" defaultValue={status ?? ""} aria-label="Status">
            <option value="">Todos os status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{appointmentStatusLabel[s]}</option>)}
          </Select>
          <Select name="periodo" defaultValue={period} aria-label="Período">
            <option value="proximos">A partir de hoje</option>
            <option value="todos">Todo o período</option>
          </Select>
          <Input type="date" name="de" defaultValue={sp.de} aria-label="De" />
          <Input type="date" name="ate" defaultValue={sp.ate} aria-label="Até" />
          <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-ivory">Filtrar</button>
        </form>
        {data.items.length === 0 ? (
          <EmptyState title="Nenhum agendamento encontrado" description="Ajuste os filtros ou crie um novo agendamento." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Data</Th><Th>Cliente</Th><Th>Serviço</Th><Th>Status</Th><Th>Origem</Th><Th>Comprovante</Th><Th>Código</Th></tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id} className="hover:bg-ivory/50">
                  <Td><Link href={`/admin/agendamentos/${a.id}`} className="font-semibold hover:text-gold-dark">{formatDate(a.startsAt, tz)}</Link><span className="block font-mono text-xs text-muted-foreground">{toTimeKey(a.startsAt, tz)}</span></Td>
                  <Td><Link href={`/admin/clientes/${a.customer.id}`} className="font-medium hover:text-gold-dark">{a.customer.name}</Link><span className="block text-xs text-muted-foreground">{formatPhone(a.customer.whatsapp)}</span></Td>
                  <Td className="text-xs">{a.service.name}</Td>
                  <Td><AppointmentStatusBadge status={a.status} /></Td>
                  <Td className="text-xs text-muted-foreground">{appointmentSourceLabel[a.source]}</Td>
                  <Td>{a.printJobs[0] ? <PrintStatusBadge status={a.printJobs[0].status} /> : <span className="text-xs text-muted-foreground">—</span>}</Td>
                  <Td><Link href={`/admin/agendamentos/${a.id}`} className="font-mono text-xs">{a.code}</Link></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={data.page} pages={data.pages} total={data.total} hrefFor={qs} />
      </Card>
    </>
  );
}
