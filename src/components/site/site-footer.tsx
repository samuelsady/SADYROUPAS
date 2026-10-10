import Link from "next/link";
import type { StoreSettings } from "@prisma/client";
import { MapPin, Phone, MessageCircle } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/ui/brand-icons";
import { Wordmark } from "@/components/ui/wordmark";
import { formatPhone, whatsappLink } from "@/utils/phone";
import { weekdayName } from "@/utils/datetime";

type Hours = { weekday: number; isOpen: boolean; openTime: string; closeTime: string }[];

export function hoursSummary(hours: Hours) {
  // Agrupa dias consecutivos com o mesmo horário: "Terça a sexta 09:00–18:00"
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups: { days: number[]; label: string }[] = [];
  for (const wd of order) {
    const h = hours.find((x) => x.weekday === wd);
    const label = h?.isOpen ? `${h.openTime} às ${h.closeTime}` : "Fechado";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.days.push(wd);
    else groups.push({ days: [wd], label });
  }
  return groups.map((g) => {
    const first = weekdayName(g.days[0]!);
    const name = g.days.length === 1 ? first : `${first.replace("-feira", "")} a ${weekdayName(g.days[g.days.length - 1]!).replace("-feira", "")}`;
    return { days: name.charAt(0).toUpperCase() + name.slice(1), label: g.label };
  });
}

export function SiteFooter({ settings, hours }: { settings: StoreSettings; hours: Hours }) {
  const wa = whatsappLink(settings.whatsapp, "Olá! Vim pelo site da Sady Roupas.");
  return (
    <footer className="aura grain text-ivory/75">
      <div className="container-site pt-20 sm:pt-28">
        <div className="flex flex-col gap-10 border-b border-white/10 pb-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Sady Roupas · Desde 2008</p>
            <h2 className="display mt-4 text-4xl leading-[1.05] text-ivory sm:text-6xl">
              Seu próximo grande momento <em className="text-gold-shine font-normal">começa aqui.</em>
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/agendamento" className="btn-shine inline-flex h-14 items-center justify-center rounded-full bg-gold px-8 text-[13px] font-bold uppercase tracking-[0.18em] text-ink transition hover:bg-gold-light">
              Agendar atendimento
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 px-8 text-[13px] font-bold uppercase tracking-[0.18em] text-ivory transition hover:border-gold-light hover:text-gold-light">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr]">
          <div className="space-y-5">
            <Wordmark tone="light" className="text-2xl" />
            <p className="max-w-xs text-sm leading-relaxed text-ivory/55">Aluguel de ternos, smokings, becas, roupas sociais e acessórios em Teresina.</p>
            <div className="flex gap-3">
              {settings.instagram && (
                <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition hover:-translate-y-0.5 hover:border-gold-light hover:text-gold-light" aria-label="Instagram">
                  <InstagramIcon className="h-4 w-4" />
                </a>
              )}
              {settings.facebook && (
                <a href={`https://facebook.com/${settings.facebook}`} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition hover:-translate-y-0.5 hover:border-gold-light hover:text-gold-light" aria-label="Facebook">
                  <FacebookIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          <div>
            <h3 className="eyebrow mb-5">Explore</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/catalogo" className="link-draw hover:text-ivory">Catálogo completo</Link></li>
              <li><Link href="/catalogo?ocasiao=casamento" className="link-draw hover:text-ivory">Casamento</Link></li>
              <li><Link href="/catalogo?ocasiao=formatura" className="link-draw hover:text-ivory">Formatura</Link></li>
              <li><Link href="/catalogo?ocasiao=gala" className="link-draw hover:text-ivory">Gala & noite</Link></li>
              <li><Link href="/agendamento" className="link-draw hover:text-ivory">Agendar atendimento</Link></li>
              <li><Link href="/admin" className="link-draw hover:text-ivory">Área da equipe</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="eyebrow mb-5">Horários</h3>
            <ul className="space-y-2.5 text-sm">
              {hoursSummary(hours).map((g) => (
                <li key={g.days} className="flex flex-col">
                  <span className="text-ivory/45">{g.days}</span>
                  <span className="text-ivory/85">{g.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="eyebrow mb-5">Visite a loja</h3>
            <ul className="space-y-3.5 text-sm">
              {settings.address && <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{settings.address}</span></li>}
              {settings.phone && <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={`tel:+${settings.phone}`} className="link-draw hover:text-ivory">{formatPhone(settings.phone)}</a></li>}
              {wa && <li className="flex gap-3"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={wa} target="_blank" rel="noopener noreferrer" className="link-draw hover:text-ivory">{formatPhone(settings.whatsapp)}</a></li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Assinatura gigante */}
      <div className="overflow-hidden" aria-hidden>
        <p className="display select-none whitespace-nowrap text-center text-[22vw] leading-[0.8] tracking-[-0.03em] text-ivory/[0.05]">SADY ROUPAS</p>
      </div>
      <div className="border-t border-white/10 pb-28 md:pb-0">
        <div className="container-site flex flex-col gap-2 py-6 text-xs text-ivory/40 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {settings.companyName}. Desde 30/10/2008.</span>
          <span>Teresina — Piauí</span>
        </div>
      </div>
    </footer>
  );
}
