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
    <footer className="bg-ink text-ivory/80">
      <div className="container-site grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <Wordmark tone="light" className="text-xl" />
          <p className="max-w-xs text-sm leading-relaxed text-ivory/60">Aluguel de ternos, becas, roupas sociais e acessórios. Vestindo momentos especiais em Teresina desde 2008.</p>
          <div className="flex gap-3">
            {settings.instagram && (
              <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition hover:border-gold-light hover:text-gold-light" aria-label="Instagram">
                <InstagramIcon className="h-4 w-4" />
              </a>
            )}
            {settings.facebook && (
              <a href={`https://facebook.com/${settings.facebook}`} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition hover:border-gold-light hover:text-gold-light" aria-label="Facebook">
                <FacebookIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div>
          <h3 className="eyebrow mb-4">Navegação</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/catalogo" className="hover:text-gold-light">Catálogo</Link></li>
            <li><Link href="/agendamento" className="hover:text-gold-light">Agendar atendimento</Link></li>
            <li><Link href="/contato" className="hover:text-gold-light">Contato e localização</Link></li>
            <li><Link href="/admin" className="hover:text-gold-light">Área da equipe</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-4">Horários</h3>
          <ul className="space-y-2 text-sm">
            {hoursSummary(hours).map((g) => (
              <li key={g.days} className="flex flex-col">
                <span className="text-ivory/50">{g.days}</span>
                <span>{g.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-4">Contato</h3>
          <ul className="space-y-3 text-sm">
            {settings.address && (
              <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{settings.address}</span></li>
            )}
            {settings.phone && (
              <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={`tel:+${settings.phone}`} className="hover:text-gold-light">{formatPhone(settings.phone)}</a></li>
            )}
            {wa && (
              <li className="flex gap-2.5"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-gold-light">{formatPhone(settings.whatsapp)}</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-2 py-6 text-xs text-ivory/40 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {settings.companyName}. Desde 30/10/2008.</span>
          <span>Teresina — Piauí</span>
        </div>
      </div>
    </footer>
  );
}
