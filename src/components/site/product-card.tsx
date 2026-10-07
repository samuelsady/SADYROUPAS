import Image from "next/image";
import Link from "next/link";
import { cn } from "@/utils/cn";

type CardProduct = {
  slug: string;
  name: string;
  model: string | null;
  colors: string[];
  sizes: string[];
  category: { name: string };
  images: { url: string; alt: string | null }[];
};

export function ProductImagePlaceholder({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-ink-2 to-ink text-center", className)}>
      <span className="font-display text-5xl text-gold/80">S</span>
      <span className="mt-3 max-w-[80%] text-[11px] uppercase tracking-[0.25em] text-ivory/50">{name}</span>
    </div>
  );
}

export function ProductCard({ product, priority }: { product: CardProduct; priority?: boolean }) {
  const [first, second] = product.images;
  return (
    <Link href={`/catalogo/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-sand">
        {first ? (
          <>
            <Image src={first.url} alt={first.alt ?? product.name} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" priority={priority} className="object-cover transition duration-700 ease-[var(--ease-elegant)] group-hover:scale-[1.03]" />
            {second && <Image src={second.url} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover opacity-0 transition duration-700 group-hover:opacity-100" aria-hidden />}
          </>
        ) : (
          <ProductImagePlaceholder name={product.category.name} />
        )}
      </div>
      <div className="mt-3.5 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">{product.model ?? product.category.name}</p>
        <h3 className="font-display text-xl leading-tight text-ink transition group-hover:text-gold-dark">{product.name}</h3>
        <p className="text-xs text-muted">
          {product.colors.join(" · ")}
          {product.sizes.length > 0 && ` — Tam. ${product.sizes.join(", ")}`}
        </p>
      </div>
    </Link>
  );
}
