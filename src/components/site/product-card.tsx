import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Image from "@/components/ui/sady-image";
import { cn } from "@/lib/utils";
import { swatchFor } from "@/utils/colors";

type CardProduct = {
  slug: string;
  name: string;
  model: string | null;
  colors: string[];
  sizes: string[];
  featured?: boolean;
  availableCount?: number;
  category: { name: string };
  images: { url: string; alt: string | null }[];
};

export function ProductImagePlaceholder({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn("aura flex h-full w-full flex-col items-center justify-center text-center", className)}>
      <span className="font-display text-6xl text-gold/80">S</span>
      <span className="mt-3 max-w-[80%] text-[11px] uppercase tracking-[0.25em] text-ivory/50">{name}</span>
    </div>
  );
}

/**
 * Card de produto: troca para a segunda foto no hover, selos (destaque,
 * última peça, indisponível), amostras de cor e tamanhos.
 */
export function ProductCard({ product, priority, hideFeaturedBadge, sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" }: { product: CardProduct; priority?: boolean; hideFeaturedBadge?: boolean; sizes?: string }) {
  const [first, second] = product.images;
  const out = product.availableCount === 0;
  const last = product.availableCount === 1;
  return (
    <Link href={`/catalogo/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[2px] bg-sand">
        {first ? (
          <>
            <Image src={first.url} alt={first.alt ?? product.name} fill sizes={sizes} priority={priority} className={cn("object-cover object-top transition duration-[1200ms] ease-[var(--ease-elegant)] group-hover:scale-[1.04]", second && "group-hover:opacity-0")} />
            {second && <Image src={second.url} alt="" fill sizes={sizes} className="scale-[1.04] object-cover object-top opacity-0 transition duration-[1200ms] ease-[var(--ease-elegant)] group-hover:scale-100 group-hover:opacity-100" aria-hidden />}
          </>
        ) : (
          <ProductImagePlaceholder name={product.category.name} />
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {product.featured && !hideFeaturedBadge && <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-gold-light backdrop-blur">Mais procurado</span>}
          {last && <span className="rounded-full bg-gold px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-ink">Última peça</span>}
          {out && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-ink/70">Consultar</span>}
        </div>
        <span className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-ivory/95 text-ink opacity-0 shadow-lg transition duration-500 group-hover:translate-y-0 group-hover:opacity-100" aria-hidden>
          <ArrowUpRight className="h-4 w-4" />
        </span>
        {product.sizes.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 hidden translate-y-full bg-gradient-to-t from-ink/80 to-transparent px-3 pb-3 pt-8 text-[11px] font-semibold tracking-wider text-ivory transition duration-500 group-hover:translate-y-0 md:block" aria-hidden>
            Tam. {product.sizes.join(" · ")}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-dark">{product.model ?? product.category.name}</p>
          <h3 className="mt-1 font-display text-[1.35rem] leading-tight text-ink transition-colors group-hover:text-gold-dark">{product.name}</h3>
        </div>
        <div className="mt-1 flex shrink-0 gap-1">
          {product.colors.slice(0, 3).map((c) => (
            <span key={c} title={c} className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/15 ring-offset-1 ring-offset-paper" style={{ background: swatchFor(c) }} />
          ))}
        </div>
      </div>
    </Link>
  );
}
