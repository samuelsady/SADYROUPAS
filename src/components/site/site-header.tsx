import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { MobileNav } from "./mobile-nav";

export const SITE_NAV = [
  { href: "/", label: "Início" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/agendamento", label: "Agendamento" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/95 text-ivory backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="container-site flex h-16 items-center justify-between gap-6 sm:h-20">
        <Link href="/" className="text-[15px] sm:text-[17px]" aria-label="Sady Roupas — início">
          <Wordmark tone="light" />
        </Link>
        <nav className="hidden items-center gap-9 md:flex" aria-label="Principal">
          {SITE_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-[13px] font-medium uppercase tracking-[0.18em] text-ivory/75 transition hover:text-gold-light">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LinkButton href="/agendamento" variant="gold" size="md" className="hidden sm:inline-flex">
            Agendar atendimento
          </LinkButton>
          <MobileNav items={SITE_NAV} />
        </div>
      </div>
    </header>
  );
}
