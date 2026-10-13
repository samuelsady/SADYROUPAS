import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { AppointmentStatusBadge } from "@/components/admin/status-badges";
import { Table, Td, Th } from "@/components/admin/table";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { requirePageUser } from "@/lib/auth/session";
import { CustomerService } from "@/services/customer.service";
import { SettingsService } from "@/services/settings.service";
import { formatDate } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePageUser("customers.manage");
  const sp = await searchParams;
  const [data, settings] = await Promise.all([CustomerService.list({ q: sp.q, page: Number(sp.page) || 1 }), SettingsService.get()]);
  return (
    <>
      <PageHeader title="Clientes" description="Cadastro único por WhatsApp — clientes do site são criados automaticamente." actions={<LinkButton href="/admin/clientes/novo"><UserPlus className="h-4 w-4" /> Novo cliente</LinkButton>} />
      <Card>
        <form className="flex gap-2 border-b border-line p-3">
          <Input name="q" defaultValue={sp.q} placeholder="Nome, e-mail ou WhatsApp" aria-label="Buscar" className="max-w-md" />
          <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-ivory">Buscar</button>
        </form>
        {data.items.length === 0 ? <EmptyState title="Nenhum cliente encontrado" /> : (
          <Table>
            <thead><tr><Th>Nome</Th><Th>WhatsApp</Th><Th>E-mail</Th><Th>Agendamentos</Th><Th>Último</Th><Th>Cadastro</Th></tr></thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-ivory/50">
                  <Td><Link href={`/admin/clientes/${c.id}`} className="font-semibold hover:text-gold-dark">{c.name}</Link></Td>
                  <Td className="text-xs">{formatPhone(c.whatsapp)}</Td>
                  <Td className="text-xs text-muted-foreground">{c.email ?? "—"}</Td>
                  <Td className="tabular-nums">{c._count.appointments}</Td>
                  <Td>{c.appointments[0] ? <span className="flex items-center gap-2 text-xs">{formatDate(c.appointments[0].startsAt, settings.timezone)} <AppointmentStatusBadge status={c.appointments[0].status} /></span> : <span className="text-xs text-muted-foreground">—</span>}</Td>
                  <Td className="text-xs text-muted-foreground">{formatDate(c.createdAt, settings.timezone)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={data.page} pages={data.pages} total={data.total} hrefFor={(p) => `/admin/clientes?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
