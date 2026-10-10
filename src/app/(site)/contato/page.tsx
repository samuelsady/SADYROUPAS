import type { Metadata } from "next";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { InstagramIcon } from "@/components/ui/brand-icons";
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

      <section className="container-site grid gap-10 py-14 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          {settings.address && (
            <div className="flex gap-4"><MapPin className="mt-1 h-5 w-5 shrink-0 text-gold" /><div><h2 className="font-semibold">Endereço</h2><p className="text-muted-foreground">{settings.address}</p>{directions && <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-gold-dark hover:underline">Como chegar →</a>}</div></div>
          )}
          {settings.phone && (
            <div className="flex gap-4"><Phone className="mt-1 h-5 w-5 shrink-0 text-gold" /><div><h2 className="font-semibold">Telefone</h2><a href={`tel:+${settings.phone}`} className="text-muted-foreground hover:text-ink">{formatPhone(settings.phone)}</a></div></div>
          )}
          {settings.whatsapp && wa && (
            <div className="flex gap-4"><MessageCircle className="mt-1 h-5 w-5 shrink-0 text-gold" /><div><h2 className="font-semibold">WhatsApp</h2><a href={wa} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-ink">{formatPhone(settings.whatsapp)}</a></div></div>
          )}
          {settings.instagram && (
            <div className="flex gap-4"><InstagramIcon className="mt-1 h-5 w-5 shrink-0 text-gold" /><div><h2 className="font-semibold">Instagram</h2><a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-ink">@{settings.instagram}</a></div></div>
          )}
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
          <div className="flex h-80 items-center justify-center rounded-xl bg-sand text-sm text-muted-foreground">Mapa não configurado</div>
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
