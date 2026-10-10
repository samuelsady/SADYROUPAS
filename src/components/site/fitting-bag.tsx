"use client";

import Image from "@/components/ui/sady-image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Shirt, Trash2, X } from "lucide-react";
import { fittingList, OPEN_FITTING_EVENT, useFittingList } from "@/hooks/use-fitting-list";
import { cn } from "@/utils/cn";

/** Ícone da lista de provas no topo + painel lateral. */
export function FittingBag() {
  const list = useFittingList();
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const badge = useRef<HTMLSpanElement>(null);
  const prev = useRef(list.length);

  // A barra inferior (celular) pede para abrir o painel
  useEffect(() => {
    const open = () => setOpenOn(window.location.pathname);
    window.addEventListener(OPEN_FITTING_EVENT, open);
    return () => window.removeEventListener(OPEN_FITTING_EVENT, open);
  }, []);

  // Pequeno "pulo" no contador quando uma peça é adicionada
  useEffect(() => {
    if (list.length > prev.current && badge.current) {
      badge.current.classList.remove("bump");
      void badge.current.offsetWidth;
      badge.current.classList.add("bump");
    }
    prev.current = list.length;
  }, [list.length]);

  return (
    <>
      <button type="button" onClick={() => setOpenOn(pathname)} className="relative flex h-11 w-11 items-center justify-center rounded-full text-current/80 transition hover:text-gold-light" aria-label={`Lista de provas (${list.length})`}>
        <Shirt className="h-5 w-5" />
        {list.length > 0 && (
          <span ref={badge} className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">{list.length}</span>
        )}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Lista de provas">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-fade-up" onClick={() => setOpenOn(null)} />
          <aside className="slide-in-right absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-paper text-ink shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow">Provador</p>
                <h2 className="display text-2xl">Sua lista de provas</h2>
              </div>
              <button type="button" onClick={() => setOpenOn(null)} aria-label="Fechar" className="rounded p-2 hover:bg-sand/60"><X className="h-5 w-5" /></button>
            </div>
            {list.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <Shirt className="h-10 w-10 text-gold" strokeWidth={1.25} />
                <p className="mt-4 font-semibold">Sua lista está vazia</p>
                <p className="mt-1 text-sm text-muted-foreground">No catálogo, escolha o tamanho e toque em “Quero provar”. Separamos as peças antes do seu atendimento.</p>
                <Link href="/catalogo" className="mt-6 text-sm font-semibold text-gold-dark hover:underline">Ver catálogo →</Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {list.map((e, i) => (
                    <li key={`${e.slug}-${e.size}`} className="flex items-center gap-3 py-3 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                      <Link href={`/catalogo/${e.slug}`} className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-ink">
                        {e.image && <Image src={e.image} alt="" fill sizes="48px" className="object-cover" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.size ? `Tamanho ${e.size}` : "Tamanho a definir na prova"}</p>
                      </div>
                      <button type="button" onClick={() => fittingList.remove(e.slug, e.size)} className="rounded p-2 text-muted-foreground hover:text-red-700" aria-label={`Remover ${e.name}`}><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
                <div className={cn("border-t border-line p-5")}>
                  <Link href="/agendamento" className="flex h-12 items-center justify-center rounded-md bg-ink text-sm font-semibold text-ivory hover:bg-ink-3">Agendar prova ({list.length} {list.length === 1 ? "peça" : "peças"})</Link>
                  <button type="button" onClick={() => fittingList.clear()} className="mt-3 w-full text-xs font-semibold text-muted-foreground hover:text-ink">Limpar lista</button>
                </div>
              </>
            )}
          </aside>
        </div>,
        // Fora do <header>: o backdrop-blur dele prenderia o painel "fixed"
        document.body,
      )}
    </>
  );
}
