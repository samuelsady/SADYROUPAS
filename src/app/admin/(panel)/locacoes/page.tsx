import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, Plus, Store, Truck } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Table, Td, Th } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { requirePageUser } from "@/lib/auth/session";
import { rentalStatusLabel, rentalStatusTone } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { RentalService } from "@/services/rental-workflow.service";
import { formatRentalNumber } from "@/utils/codes";
import { formatDateKey } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";
import { formatCurrency } from "@/utils/text";

export const metadata: Metadata = { title: "Locações" };

const TABS = [
  ["ativas", "Ativas"],
  ["retiradas", "Retiradas próximas"],
  ["devolucoes", "Devoluções próximas"],
  ["atrasadas", "Atrasadas"],
  ["todas", "Todas"],
] as const;

export default async function RentalsPage({ searchParams }: { searchParams: Promise<{ aba?: string; q?: string }> }) {
  await requirePageUser("inventory.manage");
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.aba) ? sp.aba! : "ativas";
  const rentals = await RentalService.list({ tab, q: sp.q });
  const d = (x: Date) => formatDateKey(x.toISOString().slice(0, 10));

  return (
    <>
      <PageHeader
        title="Locações"
        description="Quem alugou, quais peças, quando retira e quando devolve. A retirada dá baixa automática no estoque."
        actions={<><LinkButton href="/admin/planilha?aba=locacoes" variant="outline"><FileSpreadsheet className="h-4 w-4" /> Planilha</LinkButton><LinkButton href="/admin/locacoes/nova"><Plus className="h-4 w-4" /> Nova locação</LinkButton></>}
      />
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/locacoes?aba=${k}`} className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold", tab === k ? "border-gold text-ink" : "border-transparent text-muted-foreground hover:text-ink")}>{label}</Link>
        ))}
      </div>
      <Card>
        <form className="flex gap-2 border-b border-line p-3">
          <input type="hidden" name="aba" value={tab} />
          <Input name="q" defaultValue={sp.q} placeholder="Cliente, evento, nº da locação ou código da peça" className="max-w-md" />
          <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-ivory">Buscar</button>
        </form>
        {rentals.length === 0 ? (
          <EmptyState title="Nenhuma locação aqui" description="Crie uma locação a partir de um agendamento concluído ou direto pelo botão “Nova locação”." />
        ) : (
          <Table>
            <thead><tr><Th>Nº</Th><Th>Cliente</Th><Th>Evento</Th><Th>Retirada</Th><Th>Devolução</Th><Th>Peças</Th><Th>Status</Th><Th className="text-right">Saldo</Th></tr></thead>
            <tbody>
              {rentals.map((r) => {
                const remaining = Math.max(0, Number(r.total) - Number(r.discount) - Number(r.paid) + r.lateFees.filter((f) => !f.waived).reduce((s, f) => s + Number(f.amount), 0));
                return (
                  <tr key={r.id} className="hover:bg-ivory/50">
                    <Td><Link href={`/admin/locacoes/${r.id}`} className="font-mono text-xs font-semibold hover:text-gold-dark">{formatRentalNumber(r.number)}</Link></Td>
                    <Td><Link href={`/admin/clientes/${r.customerId}`} className="font-medium hover:text-gold-dark">{r.customer.name}</Link><span className="block text-xs text-muted-foreground">{formatPhone(r.customer.whatsapp)}</span></Td>
                    <Td className="text-xs">{r.eventName ?? "—"}{r.eventDate && <span className="block text-muted-foreground">{d(r.eventDate)}</span>}</Td>
                    <Td className="text-xs"><span className="flex items-center gap-1.5">{r.deliveryMethod === "DELIVERY" ? <Truck className="h-3.5 w-3.5 text-gold-dark" /> : <Store className="h-3.5 w-3.5 text-muted-foreground" />}{d(r.pickupDate)}</span></Td>
                    <Td className={cn("text-xs", r.overdueDays > 0 && "font-semibold text-red-700")}>{d(r.returnDueDate)}{r.overdueDays > 0 && <span className="block">{r.overdueDays} dia(s) de atraso</span>}</Td>
                    <Td className="max-w-56 text-xs">{r.items.map((i) => i.inventoryItem.code).join(", ")}</Td>
                    <Td><Badge tone={r.overdueDays > 0 ? "red" : rentalStatusTone[r.status]}>{r.overdueDays > 0 ? "Atrasada" : rentalStatusLabel[r.status]}</Badge></Td>
                    <Td className={cn("text-right tabular-nums", remaining > 0 ? "font-semibold" : "text-muted-foreground")}>{formatCurrency(remaining)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
