import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleForm } from "@/components/admin/simple-form";
import { Table, Td, Th } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { requirePageUser } from "@/lib/auth/session";
import { CatalogService } from "@/services/catalog.service";
import { createCategoryAction } from "../_actions/catalog";

export const metadata: Metadata = { title: "Catálogo" };

export default async function AdminCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string }> }) {
  await requirePageUser("catalog.manage");
  const sp = await searchParams;
  const [products, categories] = await Promise.all([CatalogService.adminList({ q: sp.q, categoryId: sp.categoria }), CatalogService.categories()]);
  return (
    <>
      <PageHeader title="Catálogo" description="Produtos exibidos no site. Cada produto pode ter várias peças físicas no estoque." actions={<LinkButton href="/admin/catalogo/novo"><Plus className="h-4 w-4" /> Novo produto</LinkButton>} />
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
        <Card>
          <form className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row">
            <Input name="q" defaultValue={sp.q} placeholder="Buscar produto" aria-label="Buscar" />
            <Select name="categoria" defaultValue={sp.categoria ?? ""} aria-label="Categoria" className="sm:w-52">
              <option value="">Todas as categorias</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-ivory">Filtrar</button>
          </form>
          {products.length === 0 ? <EmptyState title="Nenhum produto" /> : (
            <Table>
              <thead><tr><Th className="w-14" /><Th>Produto</Th><Th>Categoria</Th><Th>Cores</Th><Th>Tamanhos</Th><Th>Peças</Th><Th>Status</Th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-ivory/50">
                    <Td>
                      <div className="relative h-12 w-9 overflow-hidden rounded bg-ink">
                        {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="36px" className="object-cover" />}
                      </div>
                    </Td>
                    <Td><Link href={`/admin/catalogo/${p.id}`} className="flex items-center gap-1.5 font-semibold hover:text-gold-dark">{p.featured && <Star className="h-3.5 w-3.5 fill-gold text-gold" />}{p.name}</Link><span className="text-xs text-muted">{p.model ?? ""}</span></Td>
                    <Td className="text-xs">{p.category.name}</Td>
                    <Td className="text-xs">{p.colors.join(", ")}</Td>
                    <Td className="max-w-40 text-xs">{p.sizes.join(", ")}</Td>
                    <Td><Link href={`/admin/estoque?produto=${p.id}`} className="tabular-nums hover:text-gold-dark">{p._count.items}</Link></Td>
                    <Td>{p.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Inativo</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="h-fit">
          <CardHeader title="Categorias" />
          <ul className="divide-y divide-line text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex justify-between px-5 py-2.5"><span>{c.name}</span><span className="text-muted">{c._count.products}</span></li>
            ))}
          </ul>
          <div className="border-t border-line p-5">
            <SimpleForm action={createCategoryAction} submitLabel="Adicionar categoria">
              <Field label="Nova categoria"><Input name="name" required maxLength={60} /></Field>
              <Checkbox name="isAccessory" label="É acessório (usado em kits)" />
            </SimpleForm>
          </div>
        </Card>
      </div>
    </>
  );
}
