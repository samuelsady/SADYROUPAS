"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/site/product-card";

type Product = Parameters<typeof ProductCard>[0]["product"] & { id: string };

/** Carrossel horizontal com rolagem por arraste/touch e setas no desktop. */
export function ProductRail({ products }: { products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="relative">
      <div className="absolute -top-20 right-0 hidden gap-2 md:flex">
        <button type="button" onClick={() => scroll(-1)} aria-label="Anteriores" className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/15 transition hover:border-ink hover:bg-ink hover:text-ivory"><ArrowLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => scroll(1)} aria-label="Próximos" className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/15 transition hover:border-ink hover:bg-ink hover:text-ivory"><ArrowRight className="h-4 w-4" /></button>
      </div>
      <div ref={ref} className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-4 [scrollbar-width:none] sm:-mx-8 sm:gap-6 sm:px-8 lg:-mx-12 lg:px-12 [&::-webkit-scrollbar]:hidden">
        {products.map((p) => (
          <div key={p.id} className="w-[72vw] shrink-0 snap-start sm:w-[42vw] md:w-[30vw] xl:w-[22vw]">
            <ProductCard product={p} hideFeaturedBadge sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 72vw" />
          </div>
        ))}
      </div>
    </div>
  );
}
