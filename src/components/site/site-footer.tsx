import Link from "next/link";
import type { StoreSettings } from "@prisma/client";
import { MapPin, Navigation, Phone } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { LocationMap } from "@/components/ui/expanded-map";
import { Wordmark } from "@/components/ui/wordmark";
import { MonogramSeal, TailorButton } from "./tailoring";
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
  const directions = settings.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings.address)}` : null;
  return (
    <footer id="contato" className="scroll-mt-16 border-t border-white/5 bg-ink text-ivory/75">
      <div className="container-site grid gap-10 py-14 sm:py-16 lg:grid-cols-[1.2fr_1fr_0.8fr] lg:gap-14">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <MonogramSeal className="w-16" />
            <Wordmark tone="light" className="text-2xl" />
          </div>
          {settings.address && settings.latitude != null && settings.longitude != null ? (
            <LocationMap location="Visite a loja" subtitle={settings.address} latitude={settings.latitude} longitude={settings.longitude} zoom={16}>
              {directions && (
                <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ivory transition hover:bg-gold hover:text-ink">
                  <Navigation className="h-3.5 w-3.5" /> Como chegar
                </a>
              )}
            </LocationMap>
          ) : (
            settings.address && <p className="flex gap-3 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{settings.address}</p>
          )}
        </div>

        <div>
          <h3 className="eyebrow mb-4 flex items-center gap-2"><TailorButton size={13} /> Fale com a gente</h3>
          <div className="grid gap-2.5">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-[#25D366] px-4 py-3 text-white transition hover:-translate-y-0.5 hover:bg-[#1ebe5b]">
                <WhatsAppIcon className="h-5 w-5" />
                <span className="text-sm font-bold">WhatsApp · {formatPhone(settings.whatsapp)}</span>
              </a>
            )}
            {settings.instagram && (
              <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-[linear-gradient(45deg,#f58529,#dd2a7b_45%,#8134af_75%,#515bd4)] px-4 py-3 text-white transition hover:-translate-y-0.5 hover:brightness-110">
                <InstagramIcon className="h-5 w-5" />
                <span className="text-sm font-bold">@{settings.instagram}</span>
              </a>
            )}
            {settings.phone && (
              <a href={`tel:+${settings.phone}`} className="flex items-center gap-3 rounded-xl border border-white/15 px-4 py-3 text-ivory transition hover:border-gold-light">
                <Phone className="h-5 w-5 text-gold-light" />
                <span className="text-sm font-bold">{formatPhone(settings.phone)}</span>
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="eyebrow mb-4 flex items-center gap-2"><TailorButton size={13} /> Horários</h3>
          <ul className="space-y-2 text-sm">
            {hoursSummary(hours).map((g) => (
              <li key={g.days} className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <span className="text-ivory/55">{g.days}</span>
                <span className="text-ivory/90">{g.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ivory/45">Atendimento com hora marcada.</p>
        </div>
      </div>

      <div className="border-t border-white/10 pb-24 md:pb-0">
        <div className="container-site flex flex-col gap-3 py-5 text-xs text-ivory/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {settings.companyName} · Desde 2008 · Teresina — PI</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Rodapé">
            <Link href="/catalogo" className="hover:text-ivory">Catálogo</Link>
            <Link href="/admin" className="hover:text-ivory">Área da equipe</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
