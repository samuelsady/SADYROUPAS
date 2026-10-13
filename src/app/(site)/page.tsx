import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSlideshow, type HeroSlide } from "@/components/site/home/hero-slideshow";
import { ProductRail } from "@/components/site/home/product-rail";
import { Reveal } from "@/components/ui/reveal";
import { CatalogService } from "@/services/catalog.service";

const SLIDES: HeroSlide[] = [
  { image: "/catalogo/smoking-tradicional-1-bota-o-foto-1.jpg", eyebrow: "Gala & noite", caption: "Smoking Tradicional 1 Botão", href: "/catalogo/smoking-tradicional-1-botao", position: "50% 15%" },
  { image: "/catalogo/azul-dior-foto-1.jpg", eyebrow: "Mais procurado", caption: "Terno Azul Dior", href: "/catalogo/terno-azul-dior", position: "50% 15%" },
  { image: "/catalogo/dior-bege-foto-1.jpg", eyebrow: "Casamento de dia", caption: "Terno Dior Bege", href: "/catalogo/terno-dior-bege", position: "50% 15%" },
  { image: "/catalogo/terracota-foto-1.jpg", eyebrow: "Para ousar", caption: "Terno Terracota", href: "/catalogo/terno-terracota", position: "50% 15%" },
];

export default async function HomePage() {
  const [featured, categories] = await Promise.all([CatalogService.featured(10), CatalogService.categories()]);
  const totalProducts = categories.reduce((s, c) => s + c._count.products, 0);

  return (
    <>
      <HeroSlideshow slides={SLIDES} />

      {/* DESTAQUES */}
      {featured.length > 0 && (
        <section className="overflow-hidden bg-paper py-16 sm:py-24">
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
    </>
  );
}
