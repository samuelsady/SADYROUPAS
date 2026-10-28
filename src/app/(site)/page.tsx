import Link from "next/link";
import { ArrowRight, LayoutGrid, MapPin } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { GlassFold } from "@/components/ui/glass-fold";
import Image from "@/components/ui/sady-image";
import { bookingWhatsapp } from "@/lib/whatsapp-messages";
import { SettingsService } from "@/services/settings.service";

/**
 * Página inicial — só a apresentação: o que é a Sady, ver o catálogo,
 * agendar pelo WhatsApp (atendido pelo agente de IA) e onde fica.
 */
export default async function HomePage() {
  const settings = await SettingsService.get();
  const booking = bookingWhatsapp(settings.whatsapp);

  const cards = [
    { href: "/catalogo", external: false, icon: LayoutGrid, title: "Catálogo", text: "Ternos, smokings, becas e acessórios com fotos reais." },
    ...(booking ? [{ href: booking, external: true, icon: WhatsAppIcon, title: "Agendar prova", text: "Pelo WhatsApp: respondemos na hora e marcamos seu horário." }] : []),
    { href: "/#contato", external: false, icon: MapPin, title: "Onde estamos", text: settings.address ?? "Teresina – PI" },
  ];

  return (
    <section className="relative isolate -mt-16 overflow-hidden bg-ink text-ivory sm:-mt-[72px]">
      {/* Fundo: vidro dourado em movimento */}
      <GlassFold color1="#5a4426" color2="#0b0907" color3="#e9cf98" speed={0.3} scale={0.85} noise={0.1} className="absolute inset-0 -z-20" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(11_9_7/0.82)_0%,rgb(11_9_7/0.45)_55%,rgb(11_9_7/0.2)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />

      <div className="container-site flex min-h-[100svh] flex-col justify-center gap-12 pb-28 pt-28 md:pb-14 lg:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow animate-fade-up">Sady Roupas · Teresina · desde 2008</p>
            <h1 className="display mt-5 animate-fade-up text-[2.9rem] leading-[1.02] [animation-delay:120ms] sm:text-6xl lg:text-7xl">
              Vista-se para o seu <em className="text-gold-shine">grande dia</em>.
            </h1>
            <p className="mt-6 max-w-lg animate-fade-up text-lg leading-relaxed text-ivory/75 [animation-delay:240ms]">
              Aluguel de ternos, smokings e becas para casamentos, formaturas e eventos. Veja o catálogo e agende sua prova pelo WhatsApp.
            </p>
            <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:360ms] sm:flex-row">
              {booking && (
                <a href={booking} target="_blank" rel="noopener noreferrer" className="btn-shine inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-ivory px-7 text-[13px] font-bold uppercase tracking-[0.12em] text-ink transition hover:bg-white">
                  <WhatsAppIcon className="h-5 w-5 text-[#25D366]" /> Agendar pelo WhatsApp
                </a>
              )}
              <Link href="/catalogo" className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 text-[13px] font-bold uppercase tracking-[0.12em] text-ivory backdrop-blur-md transition hover:border-gold-light hover:text-gold-light">
                Ver catálogo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Uma peça do acervo, num quadro de vidro */}
          <div className="relative mx-auto hidden w-full max-w-[360px] animate-fade-up [animation-delay:300ms] lg:block">
            <div className="rounded-[2rem] border border-white/15 bg-white/[0.06] p-3 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.9)] backdrop-blur-xl">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
                <Image src="/catalogo/azul-dior-foto-1.jpg" alt="Terno Azul Dior, do acervo da Sady Roupas" fill priority sizes="360px" className="object-cover object-top" />
              </div>
              <p className="flex items-center justify-between px-2 pb-1 pt-3 text-xs text-ivory/70">
                <span className="font-display text-base text-ivory">Terno Azul Dior</span>
                <Link href="/catalogo/terno-azul-dior" className="inline-flex items-center gap-1 font-semibold text-gold-light hover:underline">Ver <ArrowRight className="h-3 w-3" /></Link>
              </p>
            </div>
          </div>
        </div>

        {/* O essencial, em três cartões de vidro */}
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((c, i) => {
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-light"><c.icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-display text-xl text-ivory">{c.title} <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100" /></span>
                  <span className="mt-0.5 block text-sm leading-snug text-ivory/65">{c.text}</span>
                </span>
              </>
            );
            const cls = "group flex animate-fade-up items-start gap-4 rounded-2xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur-xl transition hover:border-gold-light/50 hover:bg-white/[0.1]";
            const style = { animationDelay: `${480 + i * 90}ms` };
            return c.external ? (
              <a key={c.title} href={c.href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{body}</a>
            ) : (
              <Link key={c.title} href={c.href} className={cls} style={style}>{body}</Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
