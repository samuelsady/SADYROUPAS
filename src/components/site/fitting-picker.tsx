"use client";

import { useState } from "react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { bookingWhatsapp } from "@/lib/whatsapp-messages";
import { cn } from "@/utils/cn";

type Props = {
  product: { name: string; sizes: string[] };
  availability: Record<string, number>;
  hasInventory: boolean;
  whatsapp: string | null;
};

/** Escolha de tamanho + "Agendar prova pelo WhatsApp" com a peça e o tamanho na mensagem. */
export function FittingPicker({ product, availability, hasInventory, whatsapp }: Props) {
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0]! : null);
  const href = bookingWhatsapp(whatsapp, { name: product.name, size });

  return (
    <div className="mt-7">
      {product.sizes.length > 0 && (
        <>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em]">Tamanho</h2>
            {hasInventory && <span className="text-xs text-muted-foreground">Disponibilidade atual na loja</span>}
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
                    "relative h-11 min-w-12 rounded-full border px-4 text-sm font-semibold transition duration-200",
                    selected ? "border-ink bg-ink text-ivory shadow-md" : out ? "border-line text-muted-foreground/60" : "border-ink/20 hover:border-ink/60",
                  )}
                >
                  <span className={cn(out && !selected && "line-through")}>{s}</span>
                  {hasInventory && !out && available <= 1 && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-paper" title="Última peça disponível" />}
                </button>
              );
            })}
          </div>
          {hasInventory && <p className="mt-2 text-xs text-muted-foreground">Riscado = reservado ou alugado agora. <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" /> última peça.</span></p>}
        </>
      )}
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-6 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] text-[13px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_14px_30px_-16px_rgb(37_211_102/0.9)] transition hover:bg-[#1ebe5b]">
          <WhatsAppIcon className="h-5 w-5" /> Agendar prova pelo WhatsApp
        </a>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {product.sizes.length > 1 && !size ? "Escolha o tamanho para ele ir na mensagem — ou envie sem tamanho e defina na prova." : "A mensagem já vai pronta com a peça e o tamanho. Respondemos na hora."}
      </p>
    </div>
  );
}
