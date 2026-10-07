"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // Aberto apenas na página em que foi aberto: navegar fecha o menu
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpenOn(open ? null : pathname)} className="flex h-11 w-11 items-center justify-center rounded-md text-ivory" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Fechar menu" : "Abrir menu"}>
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      {open && createPortal(
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col bg-ink text-ivory px-6 pb-10 pt-6 animate-fade-up">
          <nav className="flex flex-col" aria-label="Menu">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="border-b border-white/10 py-5 font-display text-3xl text-ivory">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/agendamento" className="mt-auto flex h-14 items-center justify-center rounded-md bg-gold text-[15px] font-semibold text-ink">
            Agendar atendimento
          </Link>
        </div>,
        document.body,
      )}
    </div>
  );
}
