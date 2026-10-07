"use client";

import { useState } from "react";
import { Check, Plus, Shirt } from "lucide-react";
import { fittingList, useFittingList } from "@/hooks/use-fitting-list";
import { toast } from "@/lib/toast";
import { cn } from "@/utils/cn";

type Props = {
  product: { slug: string; name: string; image: string | null; sizes: string[] };
  availability: Record<string, number>;
  hasInventory: boolean;
};

/** Escolha de tamanho + "Quero provar" (adiciona à lista de provas do cliente). */
export function FittingPicker({ product, availability, hasInventory }: Props) {
  const list = useFittingList();
  const [size, setSize] = useState<string | null>(null);
  const needsSize = product.sizes.length > 1;
  const inList = list.some((e) => e.slug === product.slug && e.size === (size ?? (needsSize ? undefined : product.sizes[0] ?? null)));

  function add() {
    if (needsSize && !size) {
      toast("Escolha um tamanho para provar.", "info");
      return;
    }
    const chosen = size ?? product.sizes[0] ?? null;
    const r = fittingList.add({ slug: product.slug, name: product.name, size: chosen, image: product.image });
    if (r === "full") toast("Sua lista já tem 12 peças. Remova alguma para adicionar.", "error");
    else if (r === "exists") toast("Essa peça já está na sua lista de provas.", "info", { label: "Agendar", href: "/agendamento" });
    else toast(`${product.name}${chosen ? ` (tam. ${chosen})` : ""} adicionado à lista de provas.`, "success", { label: "Agendar", href: "/agendamento" });
  }

  return (
    <div className="mt-7">
      {product.sizes.length > 0 && (
        <>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Tamanho</h2>
            {hasInventory && <span className="text-xs text-muted">Disponibilidade atual na loja</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Tamanho">
            {product.sizes.map((s) => {
              const available = availability[s] ?? 0;
              const out = hasInventory && available === 0;
              const selected = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSize(selected ? null : s)}
                  title={out ? "Indisponível no momento — pode provar outro tamanho ou consultar a loja" : undefined}
                  className={cn(
                    "relative min-w-14 rounded-md border px-3 py-2.5 text-sm font-semibold transition duration-200",
                    selected ? "border-ink bg-ink text-ivory shadow-md" : out ? "border-line text-muted/60" : "border-ink/20 hover:border-ink/60",
                  )}
                >
                  <span className={cn(out && !selected && "line-through")}>{s}</span>
                  {hasInventory && !out && available <= 1 && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-paper" title="Última peça disponível" />}
                </button>
              );
            })}
          </div>
          {hasInventory && <p className="mt-2 text-xs text-muted">Riscado = reservado ou alugado agora. <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" /> última peça.</span></p>}
        </>
      )}
      <button type="button" onClick={add} className={cn("mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md border text-sm font-semibold transition", inList ? "border-gold bg-[#fbf6ec] text-gold-dark" : "border-ink/20 bg-white hover:border-ink")}>
        {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {inList ? "Na sua lista de provas" : "Quero provar esta peça"}
      </button>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Shirt className="h-3.5 w-3.5 text-gold" /> Monte sua lista e agende: separamos as peças antes de você chegar.</p>
    </div>
  );
}
