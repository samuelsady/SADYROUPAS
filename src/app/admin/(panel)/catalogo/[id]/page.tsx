import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { ProductFields } from "@/components/admin/product-fields";
import { SimpleForm } from "@/components/admin/simple-form";
import { InventoryStatusBadge } from "@/components/admin/status-badges";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { CatalogService } from "@/services/catalog.service";
import { StorageService } from "@/services/storage/storage.service";
import { removeImageAction, saveProductAction, uploadImagesAction } from "../../_actions/catalog";

export const metadata: Metadata = { title: "Produto" };

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser("catalog.manage");
  const { id } = await params;
  const [p, categories] = await Promise.all([CatalogService.adminGet(id), CatalogService.categories()]);
  return (
    <>
      <PageHeader
        back={{ href: "/admin/catalogo", label: "Catálogo" }}
        title={p.name}
        description={`${p.category.name}${p.model ? ` · ${p.model}` : ""}`}
        actions={p.active ? <a href={`/catalogo/${p.slug}`} target="_blank" className={buttonClass("outline")}><ExternalLink className="h-4 w-4" /> Ver no site</a> : undefined}
      />
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Dados do produto" />
          <div className="p-5">
            <SimpleForm action={saveProductAction.bind(null, p.id)}><ProductFields p={p} categories={categories} /></SimpleForm>
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Fotos" description={StorageService.provider === "supabase" ? "Armazenadas no Supabase Storage" : "Modo local (public/uploads) — configure o Supabase em produção"} />
            <div className="p-5">
              {p.images.length > 0 && (
                <ul className="mb-4 grid grid-cols-3 gap-2">
                  {p.images.map((img) => (
                    <li key={img.id} className="group relative aspect-[3/4] overflow-hidden rounded-md bg-ink">
                      <Image src={img.url} alt={img.alt ?? ""} fill sizes="120px" className="object-cover" />
                      <div className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <ActionButton action={removeImageAction} fields={{ id: img.id, productId: p.id }} variant="danger" size="icon" confirm="Remover esta foto?"><Trash2 className="h-3.5 w-3.5" /></ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <SimpleForm action={uploadImagesAction.bind(null, p.id)} submitLabel="Enviar fotos">
                <input type="file" name="images" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ivory" />
                <p className="text-xs text-muted">JPG, PNG, WEBP ou AVIF, até 5 MB cada.</p>
              </SimpleForm>
            </div>
          </Card>
          <Card>
            <CardHeader title="Peças físicas" description={`${p.items.length} peça(s) ativa(s)`} action={<LinkButton href={`/admin/estoque/novo?produto=${p.id}`} size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Peça</LinkButton>} />
            {p.items.length === 0 ? <p className="px-5 py-5 text-sm text-muted">Nenhuma peça cadastrada.</p> : (
              <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                {p.items.map((i) => (
                  <li key={i.id}>
                    <Link href={`/admin/estoque/${i.code}`} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-ivory/50">
                      <span className="font-mono text-xs font-semibold">{i.code}</span>
                      <span className="text-xs text-muted">Tam. {i.size}</span>
                      <InventoryStatusBadge status={i.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
