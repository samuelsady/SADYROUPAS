import type { Metadata } from "next";
import Link from "next/link";
import type { InventoryStatus } from "@prisma/client";
import { Plus, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { InventoryTable } from "@/components/admin/inventory-table";
import { InventoryStatusBadge } from "@/components/admin/status-badges";
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
      <PageHeader title="Estoque" description="Mude o status direto na lista ou selecione várias peças para alterar em lote." actions={<><LinkButton href="/admin/estoque/leitor" variant="outline"><ScanLine className="h-4 w-4" /> Ler QR Code</LinkButton><LinkButton href="/admin/estoque/novo"><Plus className="h-4 w-4" /> Cadastrar peças</LinkButton></>} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Link href={href({ status: undefined })} className={cn("rounded-xl border bg-white p-4", !status ? "border-ink" : "border-line")}>
          <p className="text-xs font-semibold text-muted-foreground">Todas</p>
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
          <InventoryTable rows={data.items.map((i) => ({ id: i.id, code: i.code, size: i.size, color: i.color, status: i.status, location: i.location, rentalCount: i.rentalCount, product: { id: i.product.id, name: i.product.name, category: i.product.category.name } }))} />
        )}
        <Pagination page={data.page} pages={data.pages} total={data.total} hrefFor={(p) => href({ page: String(p) })} />
      </Card>
    </>
  );
}
