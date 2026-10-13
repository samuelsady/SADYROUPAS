import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarCheck, Ruler, Shirt, ShoppingBag, Sparkles, RotateCcw } from "lucide-react";
import { HeroSlideshow, type HeroSlide } from "@/components/site/home/hero-slideshow";
import { MarqueeBand } from "@/components/site/home/marquee-band";
import { ProductRail } from "@/components/site/home/product-rail";
import Image from "@/components/ui/sady-image";
import { Reveal } from "@/components/ui/reveal";
import { OCCASIONS } from "@/lib/occasions";
import { cn } from "@/lib/utils";
import { CatalogService } from "@/services/catalog.service";

const SLIDES: HeroSlide[] = [
  { image: "/catalogo/smoking-tradicional-1-bota-o-foto-1.jpg", eyebrow: "Gala & noite", caption: "Smoking Tradicional 1 Botão", href: "/catalogo/smoking-tradicional-1-botao", position: "50% 15%" },
  { image: "/catalogo/azul-dior-foto-1.jpg", eyebrow: "Mais procurado", caption: "Terno Azul Dior", href: "/catalogo/terno-azul-dior", position: "50% 15%" },
  { image: "/catalogo/dior-bege-foto-1.jpg", eyebrow: "Casamento de dia", caption: "Terno Dior Bege", href: "/catalogo/terno-dior-bege", position: "50% 15%" },
  { image: "/catalogo/terracota-foto-1.jpg", eyebrow: "Para ousar", caption: "Terno Terracota", href: "/catalogo/terno-terracota", position: "50% 15%" },
];

const OCCASION_IMAGES: Record<string, string> = {
  casamento: "/catalogo/dior-bege-foto-1.jpg",
  formatura: "/catalogo/preto-resumo-slim-foto-1.jpg",
  padrinhos: "/catalogo/azul-dama-foto-1.jpg",
  gala: "/catalogo/smoking-summer-preto-foto-1.jpg",
  social: "/catalogo/blazer-com-calc-a-sarja-1-foto-1.jpg",
};

const STEPS = [
  { icon: Shirt, title: "Escolha", text: "Navegue pelo catálogo e monte sua lista de provas." },
  { icon: CalendarCheck, title: "Agende", text: "Marque um horário online, sem criar conta." },
  { icon: Ruler, title: "Experimente", text: "Prove com orientação da nossa equipe." },
  { icon: Sparkles, title: "Reserve", text: "Garanta as peças para a data do evento." },
  { icon: ShoppingBag, title: "Retire", text: "Traje pronto e conferido, perto da data." },
  { icon: RotateCcw, title: "Devolva", text: "Depois da festa, devolva na data combinada." },
];

export default async function HomePage() {
  const [featured, occasionCounts, categories] = await Promise.all([CatalogService.featured(10), CatalogService.occasionCounts(), CatalogService.categories()]);
  const occasions = OCCASIONS.filter((o) => occasionCounts[o.slug]);
  const totalProducts = categories.reduce((s, c) => s + c._count.products, 0);

  return (
    <>
      <HeroSlideshow slides={SLIDES} />

      <MarqueeBand words={["Ternos", "Smokings", "Becas", "Camisas", "Gravatas", "Acessórios"]} />

      {/* OCASIÕES — coleções */}
      <section className="aura-light py-24 sm:py-32">
        <div className="container-site">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Coleções</p>
              <h2 className="display mt-4 text-5xl leading-[1] sm:text-7xl">
                Para cada <em className="font-normal text-gold-dark">ocasião</em>
              </h2>
            </div>
            <p className="max-w-sm text-muted-foreground">Do casamento ao baile de formatura: escolha pelo momento e encontre o traje certo em poucos cliques.</p>
          </Reveal>
          <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-6 lg:grid-rows-2">
            {occasions.map((o, i) => (
              <Reveal
                key={o.slug}
                delay={i * 90}
                className={cn(
                  i === 0 ? "col-span-2 row-span-2 lg:col-span-3" : i === 1 ? "col-span-1 lg:col-span-3" : "col-span-1 lg:col-span-1",
                  i >= 2 && occasions.length === 5 && "lg:col-span-1",
                  i === 4 && "col-span-2 lg:col-span-1",
                )}
              >
                <Link href={`/catalogo?ocasiao=${o.slug}`} className={cn("group relative block h-full overflow-hidden rounded-[2px] bg-ink", i === 0 ? "aspect-[4/5] lg:aspect-auto" : "aspect-[3/4] lg:aspect-auto lg:min-h-[19rem]")}>
                  <Image src={OCCASION_IMAGES[o.slug] ?? "/catalogo/areia-foto-1.jpg"} alt="" fill sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} className={cn("object-cover opacity-85 transition duration-[1400ms] ease-[var(--ease-elegant)] group-hover:scale-105 group-hover:opacity-70", i === 1 ? "object-[50%_38%]" : "object-top")} />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 sm:p-7">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-light">{occasionCounts[o.slug]} trajes</p>
                      <h3 className={cn("display mt-1 text-ivory", i === 0 ? "text-4xl sm:text-6xl" : "text-2xl sm:text-3xl")}>{o.name}</h3>
                      {i === 0 && <p className="mt-2 hidden max-w-xs text-sm text-ivory/70 sm:block">{o.description}</p>}
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ivory/30 text-ivory transition duration-500 group-hover:rotate-45 group-hover:border-gold-light group-hover:bg-gold-light group-hover:text-ink">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DESTAQUES */}
      {featured.length > 0 && (
        <section className="overflow-hidden bg-paper py-24 sm:py-32">
          <div className="container-site">
            <Reveal className="mb-12 max-w-2xl">
              <p className="eyebrow">Destaques</p>
              <h2 className="display mt-4 text-5xl leading-[1] sm:text-7xl">Os mais procurados</h2>
            </Reveal>
            <ProductRail products={featured} />
            <Reveal className="mt-12">
              <Link href="/catalogo" className="group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-ink">
                <span className="link-draw">Ver os {totalProducts} trajes do catálogo</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* EDITORIAL */}
      <section className="aura grain text-ivory">
        <div className="container-site grid items-center gap-14 py-24 sm:py-32 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <Reveal className="reveal-clip relative aspect-[4/5] overflow-hidden rounded-[2px]">
              <Image src="/catalogo/panama-azul-marinho-foto-1.jpg" alt="Terno Panamá Azul Marinho" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover object-top" />
            </Reveal>
            <Reveal delay={250} className="absolute -bottom-8 -right-2 w-2/5 overflow-hidden rounded-[2px] border-[6px] border-ink shadow-2xl sm:-right-8">
              <div className="relative aspect-[3/4]">
                <Image src="/catalogo/panama-azul-marinho-foto-2.jpg" alt="" fill sizes="20vw" className="object-cover object-top" />
              </div>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <p className="eyebrow">A arte de vestir bem</p>
            <h2 className="display mt-5 text-5xl leading-[1.02] sm:text-6xl">
              Corte certo, caimento perfeito, <em className="text-gold-shine font-normal">atenção a cada detalhe.</em>
            </h2>
            <p className="mt-7 max-w-lg leading-relaxed text-ivory/70">
              Na Sady Roupas o traje é escolhido com calma, provado com orientação e ajustado para você. Ternos, smokings, becas e acessórios para casamentos, formaturas e todos os momentos que merecem ser lembrados.
            </p>
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div><dt className="text-[10px] uppercase tracking-[0.25em] text-ivory/45">Desde</dt><dd className="display mt-1 text-4xl text-gold-light">2008</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.25em] text-ivory/45">Trajes</dt><dd className="display mt-1 text-4xl text-gold-light">{totalProducts}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.25em] text-ivory/45">Atendimento</dt><dd className="display mt-1 text-4xl text-gold-light">1:1</dd></div>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="bg-paper py-24 sm:py-32">
        <div className="container-site">
          <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="eyebrow">Como funciona</p>
              <h2 className="display mt-4 text-5xl leading-[1] sm:text-6xl">Do primeiro clique à devolução.</h2>
            </div>
            <p className="max-w-md text-muted-foreground lg:justify-self-end">Um processo simples, pensado para você chegar ao evento tranquilo e bem vestido.</p>
          </Reveal>
          <ol className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-6 lg:gap-6">
            <div className="hairline-gold absolute left-0 right-0 top-7 hidden lg:block" aria-hidden />
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 110} className="relative">
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-paper text-gold-dark shadow-[0_0_0_6px_var(--color-paper)]">
                  <s.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <p className="mt-6 font-display text-sm text-gold-dark">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="display mt-1 text-3xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* SOBRE */}
      <section className="aura-light py-24 sm:py-32">
        <div className="container-site grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          <Reveal className="reveal-clip relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2px] [--cover:var(--color-ivory)]">
            <Image src="/brand/ana-claudia-sady.jpg" alt="Ana Claudia Sady, proprietária da Sady Roupas, ao lado de manequins com ternos da loja" fill loading="eager" sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
          </Reveal>
          <Reveal delay={150} className="max-w-xl">
            <p className="eyebrow">Quem está por trás da Sady Roupas</p>
            <h2 className="display mt-5 text-5xl sm:text-7xl">Ana Claudia Sady</h2>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold-dark">Proprietária</p>
            <div className="gold-rule my-8" />
            <p className="font-display text-2xl leading-snug text-ink/85 sm:text-3xl">
              “Mais do que um traje, uma experiência de atendimento acolhedora, personalizada e marcada pela elegância.”
            </p>
            <p className="mt-6 leading-relaxed text-muted-foreground">Ana Claudia Sady está à frente da Sady Roupas com dedicação e atenção a cada detalhe.</p>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="grain relative isolate overflow-hidden bg-ink text-ivory">
        <Image src="/catalogo/smoking-azul-summer-foto-1.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover object-[50%_20%] opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/70 to-ink/20" />
        <div className="container-site py-28 sm:py-40">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Seu evento merece</p>
            <h2 className="display mt-5 text-5xl leading-[1] sm:text-7xl">Vamos encontrar o traje ideal para você?</h2>
            <p className="mt-6 max-w-md text-ivory/70">Agende um horário e venha experimentar com calma, com quem entende de trajes sociais.</p>
            <Link href="/agendamento" className="btn-shine mt-10 inline-flex h-14 items-center justify-center rounded-full bg-gold px-9 text-[13px] font-bold uppercase tracking-[0.18em] text-ink transition hover:bg-gold-light">
              Agende seu atendimento
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
