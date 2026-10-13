"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import Image from "@/components/ui/sady-image";
import { Wordmark } from "@/components/ui/wordmark";
import { cn } from "@/lib/utils";
import { FittingBag } from "./fitting-bag";

export type HeaderCategory = { slug: string; name: string; count: number };
export type HeaderOccasion = { slug: string; name: string };

type Props = { categories: HeaderCategory[]; occasions: HeaderOccasion[]; feature: { href: string; image: string; title: string }[] };

/**
 * Cabeçalho do site.
 * - Na home começa transparente sobre a foto e fica sólido ao rolar.
 * - Logo centralizado; menu à esquerda; provador e "Agendar" à direita.
 * - "Catálogo" abre um mega menu com categorias, ocasiões e destaques.
 * No celular a navegação principal fica na barra inferior (MobileBottomNav).
 */
export function SiteHeader({ categories, occasions, feature }: Props) {
  const pathname = usePathname();
  const overlayPage = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOn, setMenuOn] = useState<string | null>(null);
  const megaOpen = menuOn === pathname;
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !overlayPage || scrolled || megaOpen;
  const openMega = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setMenuOn(pathname);
  };
  const closeMega = () => {
    closeTimer.current = window.setTimeout(() => setMenuOn(null), 140);
  };

  const navLink = (href: string, label: string) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className="link-draw pb-1 text-[12px] font-semibold uppercase tracking-[0.22em] text-current/80 transition hover:text-current">
        {label}
      </Link>
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,color,backdrop-filter] duration-500",
        overlayPage && "-mb-[var(--header-h)]",
        solid ? "bg-ink/88 text-ivory shadow-[0_10px_40px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl" : "bg-transparent text-ivory",
      )}
      style={{ "--header-h": "5rem" } as React.CSSProperties}
      onMouseLeave={closeMega}
    >
      <div className={cn("container-site grid grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-500", scrolled ? "h-16" : "h-16 sm:h-20")}>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          <button
            type="button"
            className="link-draw pb-1 text-[12px] font-semibold uppercase tracking-[0.22em] text-current/80 transition hover:text-current"
            aria-expanded={megaOpen}
            aria-controls="mega-catalogo"
            onMouseEnter={openMega}
            onFocus={openMega}
            onClick={() => (megaOpen ? setMenuOn(null) : openMega())}
          >
            Catálogo
          </button>
          {navLink("/catalogo?ocasiao=casamento", "Casamento")}
          {navLink("/catalogo?ocasiao=formatura", "Formatura")}
          {navLink("/contato", "A loja")}
        </nav>
        <div className="lg:hidden">
          <Link href="/catalogo" className="flex h-11 w-11 items-center justify-center rounded-full text-current/80 hover:text-gold-light" aria-label="Buscar no catálogo">
            <Search className="h-5 w-5" />
          </Link>
        </div>

        <Link href="/" className="justify-self-center text-[15px] transition-transform duration-500 sm:text-[18px]" aria-label="Sady Roupas — início">
          <Wordmark tone="light" className={cn("transition-transform duration-500", scrolled && "sm:scale-90")} />
        </Link>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <Link href="/catalogo" className="hidden h-11 w-11 items-center justify-center rounded-full text-current/80 transition hover:text-gold-light lg:flex" aria-label="Buscar no catálogo">
            <Search className="h-5 w-5" />
          </Link>
          <FittingBag />
          <Link href="/agendamento" className="btn-shine ml-1 hidden h-10 items-center rounded-full bg-gold px-5 text-[12px] font-bold uppercase tracking-[0.16em] text-ink transition hover:bg-gold-light sm:inline-flex">
            Agendar
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {megaOpen && (
          <motion.div
            id="mega-catalogo"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={openMega}
            className="absolute inset-x-0 top-full hidden border-t border-white/10 bg-ink/95 text-ivory backdrop-blur-xl lg:block"
          >
            <div className="container-site grid grid-cols-[1fr_1fr_2fr] gap-12 py-10">
              <div>
                <p className="eyebrow mb-5">Categorias</p>
                <ul className="space-y-3">
                  {categories.map((c, i) => (
                    <motion.li key={c.slug} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                      <Link href={`/catalogo?categoria=${c.slug}`} onClick={() => setMenuOn(null)} className="group flex items-baseline gap-3 font-display text-2xl text-ivory/85 transition hover:text-gold-light">
                        {c.name}
                        <span className="font-sans text-[11px] text-ivory/35 group-hover:text-gold-light/70">{c.count}</span>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
                <Link href="/catalogo" onClick={() => setMenuOn(null)} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light hover:gap-3 transition-all">
                  Ver tudo <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div>
                <p className="eyebrow mb-5">Ocasiões</p>
                <ul className="space-y-3">
                  {occasions.map((o, i) => (
                    <motion.li key={o.slug} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i + 0.1 }}>
                      <Link href={`/catalogo?ocasiao=${o.slug}`} onClick={() => setMenuOn(null)} className="font-display text-2xl italic text-ivory/85 transition hover:text-gold-light">
                        {o.name}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {feature.map((f, i) => (
                  <motion.div key={f.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i + 0.1 }}>
                    <Link href={f.href} onClick={() => setMenuOn(null)} className="group relative block aspect-[4/5] overflow-hidden rounded-sm">
                      <Image src={f.image} alt="" fill sizes="22vw" className="object-cover object-top transition duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent" />
                      <span className="absolute bottom-4 left-4 font-display text-2xl text-ivory">{f.title}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
