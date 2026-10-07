import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Shirt, Sparkles, Ruler, ShoppingBag, RotateCcw } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { ProductCard } from "@/components/site/product-card";
import { Reveal } from "@/components/ui/reveal";
import { CatalogService } from "@/services/catalog.service";

const STEPS = [
  { icon: Shirt, title: "Escolha", text: "Navegue pelo catálogo e separe os modelos que combinam com o seu evento." },
  { icon: CalendarCheck, title: "Agende", text: "Marque um horário online, sem precisar criar conta." },
  { icon: Ruler, title: "Experimente", text: "Prove os trajes com a orientação da nossa equipe." },
  { icon: Sparkles, title: "Reserve", text: "Garanta as peças escolhidas para a data do seu evento." },
  { icon: ShoppingBag, title: "Retire", text: "Retire o traje pronto e conferido, perto da data." },
  { icon: RotateCcw, title: "Devolva", text: "Depois do evento, devolva na data combinada." },
];

// Só usa foto quando ela representa a categoria; as demais recebem um bloco tipográfico
const CATEGORY_IMAGES: Record<string, string> = {
  ternos: "/catalogo/azul-dior-foto-1.jpg",
  camisas: "/catalogo/blazer-com-calc-a-sarja-1-foto-1.jpg",
  gravatas: "/catalogo/bonner-3-foto-1.jpg",
};

export default async function HomePage() {
  const [categories, featured] = await Promise.all([CatalogService.categories(), CatalogService.featured(8)]);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-ivory">
        <div className="container-site grid min-h-[calc(100svh-4rem)] items-center gap-10 py-14 sm:min-h-[calc(100svh-5rem)] lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="relative z-10 max-w-xl animate-fade-up">
            <p className="eyebrow">Aluguel de trajes · Desde 2008</p>
            <h1 className="display mt-5 text-[2.9rem] leading-[1.02] sm:text-6xl lg:text-7xl">
              Elegância para momentos que <em className="font-normal text-gold-light">merecem</em> ser lembrados.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ivory/70 sm:text-base">
              Ternos, smokings, becas, camisas e acessórios com atendimento personalizado em Teresina. Escolha o seu traje e agende um horário com a nossa equipe.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/agendamento" variant="gold" size="xl">
                Agendar atendimento
              </LinkButton>
              <LinkButton href="/catalogo" variant="outline-light" size="xl">
                Ver catálogo <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </div>
          </div>
          <div className="relative hidden h-full min-h-[520px] lg:block" aria-hidden>
            <div className="absolute right-0 top-0 h-[78%] w-[62%] overflow-hidden rounded-t-[999px]">
              <Image src="/catalogo/smoking-tradicional-1-bota-o-foto-1.jpg" alt="" fill priority sizes="30vw" className="hero-zoom object-cover" />
            </div>
            <div className="absolute bottom-0 left-0 h-[62%] w-[48%] overflow-hidden rounded-lg border-[10px] border-ink animate-fade-up [animation-delay:350ms]">
              <Image src="/catalogo/azul-dior-foto-1.jpg" alt="" fill priority sizes="25vw" className="object-cover" />
            </div>
            <div className="absolute bottom-10 right-6 rounded-md border border-gold/30 bg-ink/80 px-5 py-4 backdrop-blur animate-fade-up [animation-delay:700ms]">
              <p className="font-display text-3xl text-gold-light">Desde 2008</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-ivory/60">vestindo momentos especiais</p>
            </div>
          </div>
          <div className="relative -mx-5 aspect-[4/3] overflow-hidden sm:mx-0 sm:rounded-lg lg:hidden">
            <Image src="/catalogo/azul-dior-foto-1.jpg" alt="Terno Azul Dior da Sady Roupas" fill priority sizes="100vw" className="object-cover object-top" />
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="container-site py-20 sm:py-28">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Categorias</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Tudo para o seu traje</h2>
          </div>
          <Link href="/catalogo" className="text-sm font-semibold text-gold-dark hover:underline">
            Ver catálogo completo →
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {categories.map((c, i) => {
            const img = CATEGORY_IMAGES[c.slug];
            return (
              <Reveal key={c.id} delay={(i % 3) * 90}>
              <Link href={`/catalogo?categoria=${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-ink sm:aspect-[4/3]">
                {img ? (
                  <Image src={img} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover object-top opacity-60 transition duration-700 group-hover:scale-105 group-hover:opacity-45" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-display text-[7rem] leading-none text-gold/15 transition duration-700 group-hover:text-gold/25" aria-hidden>
                    {c.name.charAt(0)}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <h3 className="display text-2xl text-ivory sm:text-3xl">{c.name}</h3>
                  <p className="mt-1 text-xs text-ivory/60">{c._count.products} {c._count.products === 1 ? "item" : "itens"}</p>
                </div>
              </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* DESTAQUES */}
      {featured.length > 0 && (
        <section className="bg-ivory py-20 sm:py-28">
          <div className="container-site">
            <div className="text-center">
              <p className="eyebrow">Destaques</p>
              <h2 className="display mt-3 text-4xl sm:text-5xl">Os mais procurados</h2>
              <div className="gold-rule mx-auto mt-6" />
            </div>
            <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {featured.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
            <div className="mt-14 text-center">
              <LinkButton href="/catalogo" variant="outline" size="lg">
                Explorar o catálogo
              </LinkButton>
            </div>
          </div>
        </section>
      )}

      {/* COMO FUNCIONA */}
      <section className="container-site py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">Como funciona</p>
          <h2 className="display mt-3 text-4xl sm:text-5xl">Do primeiro contato à devolução, sem complicação.</h2>
        </div>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={(i % 3) * 100} className="bg-paper p-7 sm:p-9">
              <div className="flex items-center justify-between">
                <s.icon className="h-6 w-6 text-gold" strokeWidth={1.5} />
                <span className="font-display text-4xl text-ink/10">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="display mt-6 text-2xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* SOBRE */}
      <section className="bg-ink text-ivory">
        <div className="container-site grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2">
          <Reveal className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-lg">
            <Image src="/brand/ana-claudia-sady.jpg" alt="Ana Claudia Sady, proprietária da Sady Roupas, ao lado de manequins com ternos da loja" fill loading="eager" sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
          </Reveal>
          <Reveal delay={150} className="max-w-lg">
            <p className="eyebrow">Quem está por trás da Sady Roupas</p>
            <h2 className="display mt-4 text-4xl sm:text-5xl">Ana Claudia Sady</h2>
            <p className="mt-1 text-sm uppercase tracking-[0.2em] text-gold-light">Proprietária</p>
            <p className="mt-7 leading-relaxed text-ivory/70">
              Ana Claudia Sady está à frente da Sady Roupas com dedicação e atenção a cada detalhe. O objetivo é oferecer aos clientes não apenas um traje, mas uma experiência de atendimento acolhedora, personalizada e marcada pela elegância.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container-site py-24 text-center sm:py-32">
        <Reveal>
        <p className="eyebrow">Seu evento merece</p>
        <h2 className="display mx-auto mt-4 max-w-3xl text-4xl sm:text-6xl">Vamos encontrar o traje ideal para você?</h2>
        <p className="mx-auto mt-5 max-w-md text-muted">Agende um horário e venha experimentar com calma, com quem entende de trajes sociais.</p>
        <LinkButton href="/agendamento" variant="primary" size="xl" className="mt-10">
          Agende seu atendimento
        </LinkButton>
        </Reveal>
      </section>
    </>
  );
}
