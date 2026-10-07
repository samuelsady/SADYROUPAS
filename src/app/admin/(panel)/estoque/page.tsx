import type { Metadata } from "next";
import Link from "next/link";
import type { InventoryStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { InventoryStatusBadge } from "@/components/admin/status-badges";
import { Table, Td, Th } from "@/components/admin/table";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { inventoryStatusLabel, V1_INVENTORY_STATUSES } from "@/lib/labels";
import { InventoryService } from "@/services/inventory.service";
import { cn } from "@/utils/cn";

export const metadata: Metadata = { title: "Estoque" };
const ALL = Object.keys(inventoryStatusLabel) as InventoryStatus[];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageUser("inventory.manage");
  const sp = await searchParams;
  const status = ALL.includes(sp.status as InventoryStatus) ? (sp.status as InventoryStatus) : undefined;
  const [data, stats, products] = await Promise.all([
    InventoryService.list({ q: sp.q, status, productId: sp.produto, size: sp.tamanho, page: Number(sp.page) || 1 }),
    InventoryService.stats(),
    db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const href = (patch: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { ...sp, page: undefined, ...patch };
    const params = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])));
    return `/admin/estoque?${params}`;
  };

  return (
    <>
      <PageHeader title="Estoque" description="Cada peça física tem código próprio, status, localização e histórico." actions={<LinkButton href="/admin/estoque/novo"><Plus className="h-4 w-4" /> Cadastrar peças</LinkButton>} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Link href={href({ status: undefined })} className={cn("rounded-xl border bg-white p-4", !status ? "border-ink" : "border-line")}>
          <p className="text-xs font-semibold text-muted">Todas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.total}</p>
        </Link>
        {V1_INVENTORY_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s })} className={cn("rounded-xl border bg-white p-4", status === s ? "border-ink" : "border-line")}>
            <InventoryStatusBadge status={s} />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.counts[s] ?? 0}</p>
          </Link>
        ))}
      </div>
      <Card>
        <form className="grid gap-2 border-b border-line p-3 sm:grid-cols-[1fr_220px_120px_160px_auto]">
          {status && <input type="hidden" name="status" value={status} />}
          <Input name="q" defaultValue={sp.q} placeholder="Código, produto ou localização" aria-label="Buscar" />
          <Select name="produto" defaultValue={sp.produto ?? ""} aria-label="Produto">
            <option value="">Todos os produtos</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input name="tamanho" defaultValue={sp.tamanho} placeholder="Tamanho" aria-label="Tamanho" />
          <Select name="status" defaultValue={status ?? ""} aria-label="Status">
            <option value="">Todos os status</option>
            {ALL.map((s) => <option key={s} value={s}>{inventoryStatusLabel[s]}{V1_INVENTORY_STATUSES.includes(s) ? "" : " (V2)"}</option>)}
          </Select>
          <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-ivory">Filtrar</button>
        </form>
        {data.items.length === 0 ? <EmptyState title="Nenhuma peça encontrada" /> : (
          <Table>
            <thead><tr><Th>Código</Th><Th>Produto</Th><Th>Tam.</Th><Th>Cor</Th><Th>Status</Th><Th>Localização</Th><Th className="text-right">Locações</Th></tr></thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id} className="hover:bg-ivory/50">
                  <Td><Link href={`/admin/estoque/${i.code}`} className="font-mono text-xs font-semibold hover:text-gold-dark">{i.code}</Link></Td>
                  <Td><Link href={`/admin/catalogo/${i.product.id}`} className="hover:text-gold-dark">{i.product.name}</Link><span className="block text-[11px] text-muted">{i.product.category.name}</span></Td>
                  <Td className="font-semibold">{i.size}</Td>
                  <Td className="text-xs">{i.color}</Td>
                  <Td><InventoryStatusBadge status={i.status} /></Td>
                  <Td className="text-xs text-muted">{i.location ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{i.rentalCount}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={data.page} pages={data.pages} total={data.total} hrefFor={(p) => href({ page: String(p) })} />
      </Card>
    </>
  );
}
