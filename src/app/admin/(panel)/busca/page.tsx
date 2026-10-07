import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { AppointmentStatusBadge, InventoryStatusBadge } from "@/components/admin/status-badges";
import { Card, CardHeader } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { SearchService } from "@/services/search.service";
import { SettingsService } from "@/services/settings.service";
import { formatDate, toTimeKey } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";

export const metadata: Metadata = { title: "Busca" };

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return <Card><CardHeader title={`${title} (${count})`} /><ul className="divide-y divide-line">{children}</ul></Card>;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePageUser();
  const q = ((await searchParams).q ?? "").slice(0, 80);
  const [r, settings] = await Promise.all([SearchService.global(q), SettingsService.get()]);
  const tz = settings.timezone;
  const total = r.customers.length + r.appointments.length + r.items.length + r.products.length;
  return (
    <>
      <PageHeader title={q ? `Resultados para “${q}”` : "Busca"} description={q.length < 2 ? "Digite ao menos 2 caracteres na busca do topo." : `${total} resultado(s)`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Clientes" count={r.customers.length}>
          {r.customers.map((c) => <li key={c.id}><Link href={`/admin/clientes/${c.id}`} className="flex justify-between px-5 py-3 text-sm hover:bg-ivory/50"><span className="font-semibold">{c.name}</span><span className="text-muted">{formatPhone(c.whatsapp)}</span></Link></li>)}
        </Section>
        <Section title="Agendamentos" count={r.appointments.length}>
          {r.appointments.map((a) => <li key={a.id}><Link href={`/admin/agendamentos/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-ivory/50"><span><span className="font-mono text-xs font-semibold">{a.code}</span> · {a.customer.name}<span className="block text-xs text-muted">{formatDate(a.startsAt, tz)} {toTimeKey(a.startsAt, tz)} · {a.service.name}</span></span><AppointmentStatusBadge status={a.status} /></Link></li>)}
        </Section>
        <Section title="Peças" count={r.items.length}>
          {r.items.map((i) => <li key={i.id}><Link href={`/admin/estoque/${i.code}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-ivory/50"><span><span className="font-mono text-xs font-semibold">{i.code}</span> · {i.product.name}</span><InventoryStatusBadge status={i.status} /></Link></li>)}
        </Section>
        <Section title="Produtos" count={r.products.length}>
          {r.products.map((p) => <li key={p.id}><Link href={`/admin/catalogo/${p.id}`} className="flex justify-between px-5 py-3 text-sm hover:bg-ivory/50"><span className="font-semibold">{p.name}</span><span className="text-muted">{p.category.name}</span></Link></li>)}
        </Section>
      </div>
    </>
  );
}
