"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";

const noop = () => () => {};

/** Gaveta de filtros no celular (o conteúdo vem pronto do servidor). */
export function FilterDrawer({ children, activeCount }: { children: React.ReactNode; activeCount: number }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const key = `${pathname}?${search}`;
  // Fecha sozinha quando um filtro é aplicado (a URL muda)
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === key;
  // Só monta o portal depois da hidratação (o servidor não tem document.body)
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  return (
    <>
      <button type="button" onClick={() => setOpenOn(key)} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-white px-5 text-xs font-bold uppercase tracking-[0.16em] lg:hidden">
        <SlidersHorizontal className="h-4 w-4" /> Filtros {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-ivory">{activeCount}</span>}
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
                <motion.div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenOn(null)} />
                <motion.aside
                  className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-3xl bg-paper px-5 pb-10 pt-4"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 34 }}
                >
                  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/15" />
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="display text-3xl">Filtros</h2>
                    <button type="button" onClick={() => setOpenOn(null)} aria-label="Fechar" className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
                  </div>
                  {children}
                </motion.aside>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
