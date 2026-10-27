import Link from "next/link";
import { ArrowRight, CalendarClock, Check, MessageCircle, Ruler, Scissors, Shirt, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/site/product-card";
import { MonogramSeal } from "@/components/site/tailoring";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { Reveal } from "@/components/ui/reveal";
import Image from "@/components/ui/sady-image";
import { STORE_VIDEO } from "@/content/site-media";
import { db } from "@/database/client";
import { OCCASIONS } from "@/lib/occasions";
import { bookingWhatsapp, questionWhatsapp } from "@/lib/whatsapp-messages";
import { CatalogService } from "@/services/catalog.service";
import { SettingsService } from "@/services/settings.service";
import { TestimonialService } from "@/services/testimonial.service";

const OCCASION_IMAGES: Record<string, string> = {
  casamento: "/catalogo/dior-bege-foto-1.jpg",
  formatura: "/catalogo/preto-resumo-slim-foto-1.jpg",
  padrinhos: "/catalogo/azul-dama-foto-1.jpg",
  gala: "/catalogo/smoking-summer-preto-foto-1.jpg",
  social: "/catalogo/blazer-com-calc-a-sarja-1-foto-1.jpg",
};

const STEPS = [
  { icon: Shirt, title: "Escolha no catálogo", text: "Veja ternos, smokings e becas por ocasião, cor e tamanho." },
  { icon: MessageCircle, title: "Chame no WhatsApp", text: "Nosso assistente responde na hora, confere a agenda e marca a sua prova." },
  { icon: Ruler, title: "Prove e leve", text: "Prove com orientação, ajuste o que precisar e retire perto da data do evento." },
];

const FEATURES = [
  { icon: Sparkles, title: "Acervo para cada ocasião", text: "Ternos, smokings, becas, camisas, gravatas e acessórios em vários tamanhos e cores." },
  { icon: CalendarClock, title: "Hora marcada, sem fila", text: "Você chega no seu horário e é atendido com calma, do começo ao fim." },
  { icon: Scissors, title: "Ajustes na prova", text: "Barra e manga ajustadas na prova, conforme disponibilidade, para vestir bem." },
  { icon: Check, title: "Peças conferidas", text: "Cada traje é conferido antes da retirada e na devolução." },
];

const FAQ = [
  ["Como faço para agendar a prova?", "Pelo WhatsApp da Sady. Toque em “Agendar prova” em qualquer página: a mensagem já vai pronta e o nosso assistente responde na hora com os dias e horários livres."],
  ["Preciso ir à loja para alugar?", "Sim. A prova é presencial, com hora marcada, para escolher o tamanho certo e fazer os ajustes."],
  ["Vocês alugam becas para formatura?", "Sim. Trabalhamos com becas, capelos e faixas, além de ternos e smokings para o baile."],
  ["Com quanto tempo de antecedência devo agendar?", "Quanto antes, mais opções no seu tamanho — principalmente em época de formaturas e casamentos."],
  ["E se eu quiser uma peça específica do catálogo?", "Na página da peça, escolha o tamanho e toque em “Agendar prova pelo WhatsApp”. O nome da peça e o tamanho já vão na mensagem."],
];

function WhatsButton({ href, label = "Agendar prova pelo WhatsApp" }: { href: string | null; label?: string }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-shine inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-7 text-[13px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_16px_34px_-18px_rgb(37_211_102/0.95)] transition hover:bg-[#1ebe5b]">
      <WhatsAppIcon className="h-5 w-5" /> {label}
    </a>
  );
}

export default async function HomePage() {
  const [featured, categories, testimonials, settings, occasionCounts, pieces] = await Promise.all([
    CatalogService.featured(8),
    CatalogService.categories(),
    TestimonialService.listPublic(),
    SettingsService.get(),
    CatalogService.occasionCounts(),
    db.inventoryItem.count({ where: { active: true } }),
  ]);
  const totalProducts = categories.reduce((s, c) => s + c._count.products, 0);
  const years = new Date().getFullYear() - 2008;
  const booking = bookingWhatsapp(settings.whatsapp);
  const question = questionWhatsapp(settings.whatsapp);
  const heroImages = featured.filter((p) => p.images[0]).slice(0, 3).map((p) => ({ src: p.images[0]!.url, name: p.name }));
  const occasions = OCCASIONS.filter((o) => occasionCounts[o.slug]).slice(0, 4);

  return (
    <>
      {/* 1. TOPO */}
      <section className="aura-light">
        <div className="container-site grid items-center gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Desde 2008 · Teresina – PI
            </p>
            <h1 className="display mt-6 text-[2.7rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
              O traje certo para o seu <em className="text-gold-dark">grande dia</em>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75">
              Aluguel de ternos, smokings e becas para casamentos, formaturas e eventos. Escolha no catálogo e agende sua prova pelo WhatsApp — respondemos na hora.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <WhatsButton href={booking} />
              <Link href="/catalogo" className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-ink/20 px-7 text-[13px] font-bold uppercase tracking-[0.12em] text-ink transition hover:border-ink">
                Ver catálogo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-8 grid gap-2.5 text-sm text-ink/75 sm:grid-cols-2">
              {["Resposta rápida no WhatsApp", "Atendimento com hora marcada", "Ajustes na prova", `${totalProducts} modelos no catálogo`].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/15 text-gold-dark"><Check className="h-3 w-3" /></span>{t}</li>
              ))}
            </ul>
          </div>

          {/* Vitrine: fotos reais + conversa no WhatsApp */}
          <div className="relative mx-auto h-[440px] w-full max-w-[520px] sm:h-[540px]">
            {heroImages[1] && (
              <div className="absolute left-0 top-10 h-[62%] w-[44%] -rotate-3 overflow-hidden rounded-3xl shadow-[0_30px_60px_-30px_rgb(14_12_10/0.6)] ring-1 ring-black/5">
                <Image src={heroImages[1].src} alt={heroImages[1].name} fill sizes="240px" className="object-cover object-top" />
              </div>
            )}
            {heroImages[2] && (
              <div className="absolute bottom-6 right-0 h-[56%] w-[40%] rotate-3 overflow-hidden rounded-3xl shadow-[0_30px_60px_-30px_rgb(14_12_10/0.6)] ring-1 ring-black/5">
                <Image src={heroImages[2].src} alt={heroImages[2].name} fill sizes="220px" className="object-cover object-top" />
              </div>
            )}
            {heroImages[0] && (
              <div className="absolute left-1/2 top-0 h-[84%] w-[54%] -translate-x-1/2 overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_40px_80px_-30px_rgb(14_12_10/0.7)]">
                <Image src={heroImages[0].src} alt={heroImages[0].name} fill priority sizes="300px" className="object-cover object-top" />
              </div>
            )}
            {/* cartão de conversa */}
            <div className="absolute -bottom-2 left-0 w-[78%] max-w-[300px] rounded-2xl border border-line bg-white p-3.5 shadow-[0_24px_50px_-24px_rgb(14_12_10/0.5)] sm:bottom-2 sm:left-[-1rem]">
              <p className="flex items-center gap-2 text-[11px] font-semibold text-ink/60"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366] text-white"><WhatsAppIcon className="h-3.5 w-3.5" /></span> Sady Roupas · WhatsApp</p>
              <p className="mt-2.5 w-fit max-w-[90%] rounded-2xl rounded-tl-sm bg-sand px-3 py-2 text-xs text-ink/80">Olá! Quero agendar uma prova de terno.</p>
              <p className="ml-auto mt-1.5 w-fit max-w-[90%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-xs text-ink/85">Claro! Temos horário amanhã às 10h ou às 15h. Qual prefere? 😊</p>
            </div>
            <MonogramSeal className="absolute -right-2 top-0 w-20 drop-shadow-xl sm:w-24" />
          </div>
        </div>
      </section>

      {/* 2. NÚMEROS */}
      <section className="bg-ink text-ivory">
        <div className="container-site grid grid-cols-2 gap-y-8 py-10 text-center sm:py-12 lg:grid-cols-4">
          {[
            [`${years} anos`, "vestindo momentos especiais"],
            [`${totalProducts}`, "modelos no catálogo"],
            [pieces > 0 ? `+${Math.floor(pieces / 10) * 10}` : "—", "peças no acervo"],
            ["Na hora", "resposta pelo WhatsApp"],
          ].map(([n, l]) => (
            <div key={l}>
              <p className="font-display text-4xl text-gold-light sm:text-5xl">{n}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ivory/60">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CATÁLOGO */}
      <section className="bg-paper py-16 sm:py-24">
        <div className="container-site">
          <div className="max-w-2xl">
            <p className="eyebrow">Catálogo</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Escolha pela ocasião</h2>
            <p className="mt-3 text-ink/70">Cada traje com fotos reais, tamanhos e cores. Encontrou? Agende a prova pelo WhatsApp na própria página da peça.</p>
          </div>
          {occasions.length > 0 && (
            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {occasions.map((o, i) => (
                <Reveal key={o.slug} delay={i * 70}>
                  <Link href={`/catalogo?ocasiao=${o.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-ink">
                    <Image src={OCCASION_IMAGES[o.slug] ?? OCCASION_IMAGES.casamento!} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover object-top transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-ivory sm:p-5">
                      <p className="font-display text-2xl sm:text-3xl">{o.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light">
                        {occasionCounts[o.slug]} trajes <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}

          {featured.length > 0 && (
            <>
              <div className="mt-16 flex items-end justify-between gap-4">
                <h3 className="display text-3xl sm:text-4xl">Os mais procurados</h3>
                <Link href="/catalogo" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink hover:text-gold-dark sm:inline-flex">
                  Ver os {totalProducts} trajes <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
                {featured.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} hideFeaturedBadge />
                ))}
              </div>
              <div className="mt-10 text-center">
                <Link href="/catalogo" className="inline-flex h-12 items-center gap-2 rounded-full border border-ink/20 px-7 text-xs font-bold uppercase tracking-[0.16em] text-ink transition hover:border-ink">
                  Ver catálogo completo <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. COMO FUNCIONA */}
      <section id="como-funciona" className="aura grain scroll-mt-16 py-16 text-ivory sm:py-24">
        <div className="container-site">
          <div className="max-w-2xl">
            <p className="eyebrow">Como funciona</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Do catálogo à prova em três passos</h2>
          </div>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} as="li" delay={i * 90} className="stitch stitch-light relative rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                <span className="font-display text-6xl leading-none text-gold/30">0{i + 1}</span>
                <span className="absolute right-6 top-7 flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold-light"><s.icon className="h-5 w-5" /></span>
                <h3 className="mt-5 font-display text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory/70">{s.text}</p>
              </Reveal>
            ))}
          </ol>
          <div className="mt-10">
            <WhatsButton href={booking} label="Falar com a Sady agora" />
          </div>
        </div>
      </section>

      {/* 5. DIFERENCIAIS + ATENDIMENTO */}
      <section className="bg-paper py-16 sm:py-24">
        <div className="container-site">
          <div className="max-w-2xl">
            <p className="eyebrow">Por que a Sady</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Elegância com atendimento de verdade</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 70} className="rounded-2xl border border-line bg-card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-gold-light"><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-display text-xl">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-16 grid items-center gap-10 overflow-hidden rounded-3xl bg-ivory lg:grid-cols-2">
            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[420px]">
              {STORE_VIDEO ? (
                <video className="absolute inset-0 h-full w-full object-cover" src={STORE_VIDEO.src} poster={STORE_VIDEO.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden />
              ) : (
                <Image src="/brand/ana-claudia-sady.jpg" alt="Ana Claudia Sady, dona da Sady Roupas, na loja" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-top" />
              )}
            </div>
            <div className="p-7 sm:p-10">
              <p className="eyebrow">Quem cuida de você</p>
              <h3 className="display mt-3 text-4xl">Ana Claudia <em className="text-gold-dark">Sady</em></h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Dona da Sady Roupas</p>
              <p className="mt-6 font-display text-2xl leading-snug text-ink/85">
                “Há mais de 15 anos ajudo noivos, padrinhos e formandos a encontrar o traje certo — com calma e atenção a cada detalhe.”
              </p>
              <div className="mt-8">
                <WhatsButton href={booking} label="Agendar minha prova" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DEPOIMENTOS (só com depoimentos reais cadastrados no painel) */}
      {testimonials.length > 0 && (
        <section className="bg-ivory py-16 sm:py-24">
          <div className="container-site">
            <p className="eyebrow">Depoimentos</p>
            <h2 className="display mt-3 max-w-2xl text-4xl sm:text-5xl">Quem já se vestiu com a Sady</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.id} delay={i * 80} as="li" className="flex flex-col rounded-2xl border border-line bg-card p-7">
                  <span aria-hidden className="font-display text-6xl leading-none text-gold/60">“</span>
                  <p className="-mt-4 flex-1 font-display text-xl leading-snug text-ink/85">{t.text}</p>
                  <div className="mt-6 flex items-center gap-3">
                    {t.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- foto enviada pela loja (local ou Supabase)
                      <img src={t.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand font-display text-lg text-gold-dark">{t.name.charAt(0)}</span>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      {t.detail && <p className="text-xs text-muted-foreground">{t.detail}</p>}
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 7. PERGUNTAS FREQUENTES */}
      <section className="bg-paper py-16 sm:py-24">
        <div className="container-site grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="eyebrow">Dúvidas</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Perguntas frequentes</h2>
            {question && (
              <a href={question} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark hover:underline">
                <WhatsAppIcon className="h-4 w-4 text-[#25D366]" /> Outra dúvida? Pergunte no WhatsApp
              </a>
            )}
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
                  {q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-gold-dark transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 pr-10 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CHAMADA FINAL */}
      <section className="bg-paper pb-16 sm:pb-24">
        <div className="container-site">
          <div className="aura grain relative overflow-hidden rounded-3xl px-6 py-12 text-center text-ivory sm:px-12 sm:py-16">
            <h2 className="display mx-auto max-w-2xl text-4xl leading-tight sm:text-5xl">
              Pronto para escolher o seu <em className="text-gold-shine">traje</em>?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-ivory/70">Mande uma mensagem: a Sady responde na hora e já deixa sua prova marcada.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <WhatsButton href={booking} />
              <Link href="/catalogo" className="inline-flex h-14 items-center rounded-full border border-white/25 px-7 text-[13px] font-bold uppercase tracking-[0.12em] text-ivory transition hover:border-gold-light hover:text-gold-light">
                Ver catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
