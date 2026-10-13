import type { Metadata } from "next";
import { Clock, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { LocationMap } from "@/components/ui/expanded-map";
import Image from "@/components/ui/sady-image";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { hoursSummary } from "@/components/site/site-footer";
import { SettingsService } from "@/services/settings.service";
import { formatPhone, whatsappLink } from "@/utils/phone";

export const metadata: Metadata = { title: "Contato", description: "Endereço, telefone, WhatsApp e horários da Sady Roupas em Teresina - PI." };

const FAQ = [
  ["Preciso agendar horário?", "Sim. O atendimento é realizado com hora marcada — você pode agendar online em poucos minutos."],
  ["Vocês alugam becas para formatura?", "Sim. Trabalhamos com becas, capelos e faixas. Agende um atendimento para escolha de beca."],
  ["Posso experimentar os trajes?", "Sim. O atendimento presencial permite experimentar as opções e ajustar o traje."],
  ["Como recebo a confirmação?", "Assim que o agendamento é gravado, mostramos o código na tela e enviamos a confirmação pelo WhatsApp."],
];

export default async function ContactPage() {
  const [settings, hours] = await Promise.all([SettingsService.get(), SettingsService.businessHours()]);
  const wa = whatsappLink(settings.whatsapp, "Olá! Vim pelo site da Sady Roupas e gostaria de mais informações.");
  const directions = settings.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings.address)}` : null;

  return (
    <>
      <section className="bg-ink text-ivory">
        <div className="container-site py-14 sm:py-20">
          <p className="eyebrow">Contato</p>
          <h1 className="display mt-3 text-4xl sm:text-6xl">Fale com a Sady Roupas</h1>
          <p className="mt-4 max-w-lg text-ivory/70">Estamos em Teresina, no bairro São Cristóvão. Atendimento com hora marcada.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/agendamento" variant="gold" size="lg">Agendar atendimento</LinkButton>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline-light", "lg")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          </div>
        </div>
      </section>

      <section className="container-site grid gap-12 py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="space-y-10">
          {settings.address && (
            <div>
              <p className="eyebrow mb-4">Onde estamos</p>
              {settings.latitude != null && settings.longitude != null ? (
                <LocationMap location="Sady Roupas" subtitle={settings.address} latitude={settings.latitude} longitude={settings.longitude} zoom={16} tileProvider="carto-light">
                  {directions && (
                    <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ivory transition hover:bg-gold hover:text-ink">
                      <Navigation className="h-3.5 w-3.5" /> Como chegar
                    </a>
                  )}
                </LocationMap>
              ) : (
                <div className="flex gap-4"><MapPin className="mt-1 h-5 w-5 shrink-0 text-gold" /><div><p className="text-muted-foreground">{settings.address}</p>{directions && <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-gold-dark hover:underline">Como chegar →</a>}</div></div>
              )}
            </div>
          )}

          <div>
            <p className="eyebrow mb-4">Fale com a gente</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {settings.whatsapp && wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl bg-[#25D366] p-4 text-white shadow-[0_14px_30px_-16px_rgb(37_211_102/0.9)] transition hover:-translate-y-0.5 hover:bg-[#1ebe5b]">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20"><WhatsAppIcon className="h-6 w-6" /></span>
                  <span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/85">WhatsApp</span><span className="block truncate text-base font-bold">{formatPhone(settings.whatsapp)}</span></span>
                </a>
              )}
              {settings.instagram && (
                <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl bg-[linear-gradient(45deg,#f58529,#dd2a7b_45%,#8134af_75%,#515bd4)] p-4 text-white shadow-[0_14px_30px_-16px_rgb(221_42_123/0.9)] transition hover:-translate-y-0.5 hover:brightness-110">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20"><InstagramIcon className="h-6 w-6" /></span>
                  <span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/85">Instagram</span><span className="block truncate text-base font-bold">@{settings.instagram}</span></span>
                </a>
              )}
              {settings.phone && (
                <a href={`tel:+${settings.phone}`} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:border-gold sm:col-span-2">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sand text-gold-dark"><Phone className="h-5 w-5" /></span>
                  <span><span className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Telefone</span><span className="block text-base font-bold">{formatPhone(settings.phone)}</span></span>
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Clock className="mt-1 h-5 w-5 shrink-0 text-gold" />
            <div className="flex-1">
              <h2 className="font-semibold">Horários</h2>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {hoursSummary(hours).map((g) => <li key={g.days} className="flex justify-between gap-4"><span>{g.days}</span><span>{g.label}</span></li>)}
              </ul>
            </div>
          </div>
        </div>
        {settings.mapsEmbedUrl?.startsWith("https://www.google.com/maps/embed") ? (
          <iframe src={settings.mapsEmbedUrl} title="Mapa — Sady Roupas" className="h-80 w-full rounded-xl border border-line lg:h-full lg:min-h-96" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        ) : (
          <figure className="relative min-h-96 overflow-hidden rounded-3xl lg:min-h-full">
            <Image src="/brand/ana-claudia-sady.jpg" alt="Atendimento na Sady Roupas" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-top" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-6 pt-24 text-ivory">
              <p className="eyebrow">Atendimento com hora marcada</p>
              <p className="mt-2 font-display text-3xl leading-tight">Venha provar com calma, do seu jeito.</p>
            </figcaption>
          </figure>
        )}
      </section>

      <section className="border-t border-line bg-ivory py-14">
        <div className="container-site max-w-3xl">
          <h2 className="display text-3xl sm:text-4xl">Perguntas frequentes</h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<span className="text-gold transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
