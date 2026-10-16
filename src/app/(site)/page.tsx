import Link from "next/link";
import { ArrowRight, CalendarCheck, LayoutGrid, Sparkles } from "lucide-react";
import { ProductRail } from "@/components/site/home/product-rail";
import { MonogramSeal, TailorButton, TapeMeasure } from "@/components/site/tailoring";
import { Reveal } from "@/components/ui/reveal";
import Image from "@/components/ui/sady-image";
import { STORE_VIDEO } from "@/content/site-media";
import { CatalogService } from "@/services/catalog.service";
import { TestimonialService } from "@/services/testimonial.service";

const PATHS = [
  { href: "/catalogo", icon: LayoutGrid, title: "Catálogo", text: "Ternos, smokings, becas e acessórios. Escolha e monte sua lista de provas." },
  { href: "/monte-seu-terno", icon: Sparkles, title: "Monte seu terno", text: "Teste cores e peças no manequim digital antes de vir provar." },
  { href: "/agendamento", icon: CalendarCheck, title: "Agendar prova", text: "Escolha o dia e o horário. A confirmação chega pelo WhatsApp." },
];

export default async function HomePage() {
  const [featured, categories, testimonials] = await Promise.all([CatalogService.featured(10), CatalogService.categories(), TestimonialService.listPublic()]);
  const totalProducts = categories.reduce((s, c) => s + c._count.products, 0);

  return (
    <>
      {/* A DONA */}
      <section className="aura-light">
        <div className="container-site grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-20">
          <div className="relative mx-auto w-full max-w-[420px] lg:order-2">
            <div className="absolute -inset-3 rounded-t-full border border-gold/40" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-sand shadow-[0_40px_80px_-40px_rgb(14_12_10/0.55)]">
              <Image src="/brand/ana-claudia-sady.jpg" alt="Ana Claudia Sady, dona da Sady Roupas, na loja" fill priority sizes="(min-width: 1024px) 420px, 90vw" className="object-cover object-top" />
            </div>
            <MonogramSeal className="absolute -bottom-6 -left-4 w-24 drop-shadow-xl sm:-left-8 sm:w-28" />
          </div>

          <div className="lg:order-1">
            <p className="eyebrow flex items-center gap-2"><TailorButton size={14} /> Sady Roupas · Teresina</p>
            <h1 className="display mt-4 text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Olá, eu sou a <em className="text-gold-dark">Ana Claudia</em>.
            </h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Dona da Sady Roupas</p>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/80">
              Há mais de 15 anos ajudo noivos, padrinhos e formandos a encontrar o traje certo. Aqui você aluga ternos, smokings e becas com um atendimento feito com calma e atenção a cada detalhe.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/agendamento" className="btn-shine inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink px-8 text-[13px] font-bold uppercase tracking-[0.16em] text-ivory transition hover:bg-ink-3">
                <CalendarCheck className="h-4 w-4 text-gold-light" /> Agendar prova
              </Link>
              <Link href="/catalogo" className="inline-flex h-14 items-center justify-center rounded-full border border-ink/20 px-8 text-[13px] font-bold uppercase tracking-[0.16em] text-ink transition hover:border-ink">
                Ver catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <TapeMeasure />

      {/* CAMINHOS */}
      <section className="bg-paper py-12 sm:py-16">
        <div className="container-site grid gap-3 sm:grid-cols-3">
          {PATHS.map((p, i) => (
            <Reveal key={p.href} delay={i * 80}>
              <Link href={p.href} className="stitch group flex h-full flex-col rounded-2xl border border-line bg-card p-7 transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_20px_40px_-28px_rgb(14_12_10/0.4)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-gold-light"><p.icon className="h-5 w-5" /></span>
                <h2 className="mt-4 font-display text-2xl">{p.title}</h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-gold-dark">
                  Abrir <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* VÍDEO DA LOJA (aparece quando houver o arquivo em src/content/site-media.ts) */}
      {STORE_VIDEO && (
        <section className="relative isolate h-[70vh] min-h-[420px] overflow-hidden bg-ink text-ivory">
          <video className="absolute inset-0 -z-10 h-full w-full object-cover" src={STORE_VIDEO.src} poster={STORE_VIDEO.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/40" />
          <div className="container-site flex h-full flex-col justify-end pb-14">
            <p className="eyebrow flex items-center gap-2"><TailorButton size={14} /> Por dentro da Sady</p>
            <h2 className="display mt-3 max-w-2xl text-4xl leading-tight sm:text-6xl">{STORE_VIDEO.title ?? "Um atendimento que você sente desde a porta."}</h2>
            <Link href="/agendamento" className="btn-shine mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-gold px-7 text-xs font-bold uppercase tracking-[0.16em] text-ink hover:bg-gold-light">
              Agendar prova <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* DESTAQUES */}
      {featured.length > 0 && (
        <section className="overflow-hidden bg-paper pb-16 sm:pb-24">
          <div className="container-site">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow flex items-center gap-2"><TailorButton size={14} /> Destaques</p>
                <h2 className="display mt-3 text-4xl sm:text-5xl">Os mais procurados</h2>
              </div>
            </div>
            <ProductRail products={featured} />
            <Link href="/catalogo" className="group mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink">
              Ver os {totalProducts} trajes do catálogo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      )}

      {/* DEPOIMENTOS — só quando a loja cadastrar depoimentos reais no painel */}
      {testimonials.length > 0 && (
        <section className="aura grain py-16 text-ivory sm:py-24">
          <div className="container-site">
            <p className="eyebrow flex items-center gap-2"><TailorButton size={14} /> Quem já se vestiu com a Sady</p>
            <h2 className="display mt-3 max-w-2xl text-4xl sm:text-5xl">Histórias que passaram pelo nosso provador</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.id} delay={i * 80} as="li" className="stitch stitch-light flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                  <span aria-hidden className="font-display text-6xl leading-none text-gold/70">“</span>
                  <p className="-mt-4 flex-1 font-display text-xl leading-snug text-ivory/90">{t.text}</p>
                  <div className="mt-6 flex items-center gap-3">
                    {t.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- foto enviada pela loja (local ou Supabase)
                      <img src={t.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-gold/40" loading="lazy" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 font-display text-lg text-gold-light">{t.name.charAt(0)}</span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-ivory">{t.name}</p>
                      {t.detail && <p className="text-xs text-ivory/55">{t.detail}</p>}
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
