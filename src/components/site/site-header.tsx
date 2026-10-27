"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { Wordmark } from "@/components/ui/wordmark";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#contato", label: "Localização" },
];

/** Cabeçalho: logo, três links e o botão principal (agendar pelo WhatsApp). */
export function SiteHeader({ bookingHref }: { bookingHref: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={cn("sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300", scrolled ? "border-line bg-paper/90 shadow-[0_10px_30px_-24px_rgb(14_12_10/0.5)] backdrop-blur-xl" : "border-transparent bg-paper")}>
      <div className="container-site flex h-16 items-center justify-between gap-6 sm:h-[72px]">
        <Link href="/" className="text-[15px] text-ink sm:text-[17px]" aria-label="Sady Roupas — início">
          <Wordmark tone="dark" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="link-draw pb-0.5 text-sm font-semibold text-ink/75 transition hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        {bookingHref && (
          <a href={bookingHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-ivory transition hover:bg-ink-3 sm:h-11 sm:px-5">
            <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
            <span className="hidden sm:inline">Agendar prova</span>
            <span className="sm:hidden">Agendar</span>
          </a>
        )}
      </div>
    </header>
  );
}
