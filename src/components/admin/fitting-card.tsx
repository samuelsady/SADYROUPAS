import Link from "next/link";
import { PackageCheck, Shirt, Undo2, X } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { InlineForm } from "@/components/admin/inline-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { addFittingItemAction, releaseFittingAction, removeFittingItemAction, reserveFittingAction } from "@/app/admin/(panel)/_actions/fitting";

type Item = {
  id: string;
  size: string | null;
  productId: string;
  product: { name: string; slug: string };
  inventoryItem: { code: string; status: string; location: string | null } | null;
};
type Candidate = { code: string; size: string; productId: string; location: string | null };

/**
 * Lista de provas do agendamento: o que o cliente quer experimentar e qual
 * peça física foi separada (reservada) para cada item.
 */
export function FittingCard({ appointmentId, items, candidates, products, editable }: { appointmentId: string; items: Item[]; candidates: Candidate[]; products: { id: string; name: string }[]; editable: boolean }) {
  const separated = items.filter((i) => i.inventoryItem).length;
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Shirt className="h-4 w-4 text-gold" /> Peças para provar</span>}
        description={items.length ? `${separated} de ${items.length} separada(s)` : "O cliente não escolheu peças pelo site"}
        action={items.length > 0 ? <Badge tone={separated === items.length ? "green" : "amber"}>{separated === items.length ? "Tudo separado" : "Separar"}</Badge> : undefined}
      />
      {items.length > 0 && (
        <ul className="divide-y divide-line">
          {items.map((i) => {
            const options = candidates.filter((c) => c.productId === i.productId).sort((a, b) => Number(b.size === i.size) - Number(a.size === i.size));
            return (
              <li key={i.id} className="space-y-2 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/catalogo/${i.product.slug}`} target="_blank" className="text-sm font-semibold hover:text-gold-dark">{i.product.name}</Link>
                    <p className="text-xs text-muted">{i.size ? `Tamanho pedido: ${i.size}` : "Tamanho a definir na prova"}</p>
                  </div>
                  {editable && !i.inventoryItem && (
                    <ActionButton action={removeFittingItemAction} fields={{ itemId: i.id, appointmentId }} variant="ghost" size="icon" confirm="Remover esta peça da lista?"><X className="h-4 w-4" /></ActionButton>
                  )}
                </div>
                {i.inventoryItem ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-emerald-900">
                      <PackageCheck className="h-4 w-4" />
                      <Link href={`/admin/estoque/${i.inventoryItem.code}`} className="font-mono font-semibold hover:underline">{i.inventoryItem.code}</Link>
                      {i.inventoryItem.location && <span className="text-xs text-emerald-800/70">· {i.inventoryItem.location}</span>}
                    </span>
                    {editable && i.inventoryItem.status === "RESERVED" && (
                      <ActionButton action={releaseFittingAction} fields={{ itemId: i.id, appointmentId }} variant="outline" size="sm"><Undo2 className="h-3.5 w-3.5" /> Liberar</ActionButton>
                    )}
                  </div>
                ) : editable ? (
                  options.length === 0 ? (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Nenhuma peça deste produto disponível agora. Veja outros tamanhos ou modelos no <Link href={`/admin/estoque`} className="font-semibold underline">estoque</Link>.</p>
                  ) : (
                    <InlineForm action={reserveFittingAction} fields={{ itemId: i.id, appointmentId }} submitLabel="Separar">
                      <Select name="code" defaultValue={options[0]?.code} className="h-9 flex-1 text-xs sm:max-w-72" aria-label="Peça a separar">
                        {options.map((c) => (
                          <option key={c.code} value={c.code}>{c.code} · tam. {c.size}{c.location ? ` · ${c.location}` : ""}{i.size && c.size !== i.size ? " (outro tamanho)" : ""}</option>
                        ))}
                      </Select>
                    </InlineForm>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {editable && (
        <div className="border-t border-line bg-ivory/40 px-5 py-4">
          <p className="mb-2 text-xs font-semibold text-muted">Adicionar peça à lista</p>
          <InlineForm action={addFittingItemAction.bind(null, appointmentId)} submitLabel="Adicionar" variant="outline">
            <Select name="productId" required className="h-9 flex-1 text-xs" aria-label="Produto" defaultValue="">
              <option value="" disabled>Produto…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input name="size" placeholder="Tam." maxLength={10} className="h-9 w-20 text-xs" aria-label="Tamanho" />
          </InlineForm>
        </div>
      )}
    </Card>
  );
}
