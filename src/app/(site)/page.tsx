import Link from "next/link";
import { ArrowRight, CalendarCheck, LayoutGrid, Sparkles } from "lucide-react";
import { ProductRail } from "@/components/site/home/product-rail";
import { Reveal } from "@/components/ui/reveal";
import Image from "@/components/ui/sady-image";
import { CatalogService } from "@/services/catalog.service";

const PATHS = [
  { href: "/catalogo", icon: LayoutGrid, title: "Catálogo", text: "Ternos, smokings, becas e acessórios. Escolha e monte sua lista de provas." },
  { href: "/monte-seu-terno", icon: Sparkles, title: "Monte seu terno", text: "Teste cores e peças no manequim digital antes de vir provar." },
  { href: "/agendamento", icon: CalendarCheck, title: "Agendar prova", text: "Escolha o dia e o horário. A confirmação chega pelo WhatsApp." },
];

export default async function HomePage() {
  const [featured, categories] = await Promise.all([CatalogService.featured(10), CatalogService.categories()]);
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
            <p className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-light shadow-lg">Desde 2008</p>
          </div>

          <div className="lg:order-1">
            <p className="eyebrow">Sady Roupas · Teresina</p>
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

      {/* CAMINHOS */}
      <section className="bg-paper py-12 sm:py-16">
        <div className="container-site grid gap-3 sm:grid-cols-3">
          {PATHS.map((p, i) => (
            <Reveal key={p.href} delay={i * 80}>
              <Link href={p.href} className="group flex h-full flex-col rounded-2xl border border-line bg-card p-6 transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_20px_40px_-28px_rgb(14_12_10/0.4)]">
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

      {/* DESTAQUES */}
      {featured.length > 0 && (
        <section className="overflow-hidden bg-paper pb-16 sm:pb-24">
          <div className="container-site">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Destaques</p>
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
    </>
  );
}
