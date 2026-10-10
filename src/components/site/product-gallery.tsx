"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, X } from "lucide-react";
import Image from "@/components/ui/sady-image";
import { cn } from "@/lib/utils";
import { ProductImagePlaceholder } from "./product-card";

type Img = { url: string; alt: string | null };

/**
 * Galeria do produto.
 * Desktop: fotos grandes lado a lado (editorial). Celular: carrossel com arraste.
 * Clique em qualquer foto abre em tela cheia.
 */
export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] overflow-hidden">
        <ProductImagePlaceholder name={name} />
      </div>
    );
  }

  return (
    <>
      {/* Celular: carrossel */}
      <div className="relative -mx-5 sm:-mx-8 lg:hidden">
        <div
          ref={track}
          onScroll={(e) => setCurrent(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <button key={img.url} type="button" onClick={() => setZoom(i)} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-sand" aria-label={`Ampliar foto ${i + 1}`}>
              <Image src={img.url} alt={img.alt ?? name} fill priority={i === 0} sizes="100vw" className="object-cover object-top" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((img, i) => (
              <span key={img.url} className={cn("h-1.5 rounded-full bg-ivory/90 transition-all", i === current ? "w-6" : "w-1.5 opacity-60")} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: grade editorial */}
      <div className={cn("hidden gap-3 lg:grid", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setZoom(i)}
            className={cn("group relative overflow-hidden bg-sand", images.length > 2 && i === 0 ? "col-span-2 aspect-[4/5]" : "aspect-[3/4]")}
            aria-label={`Ampliar foto ${i + 1}`}
          >
            <Image src={img.url} alt={img.alt ?? name} fill priority={i < 2} sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover object-top transition duration-[1200ms] ease-[var(--ease-elegant)] group-hover:scale-[1.03]" />
            <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/90 text-ink opacity-0 transition group-hover:opacity-100"><Maximize2 className="h-4 w-4" /></span>
          </button>
        ))}
      </div>

      {/* Tela cheia */}
      <AnimatePresence>
        {zoom !== null && (
          <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)} role="dialog" aria-modal="true" aria-label="Foto ampliada">
            <motion.div key={zoom} className="relative h-[92svh] w-[92vw] max-w-4xl" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }}>
              <Image src={images[zoom]!.url} alt={images[zoom]!.alt ?? name} fill sizes="92vw" className="object-contain" />
            </motion.div>
            <button type="button" className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-ivory/10 text-ivory hover:bg-ivory/20" aria-label="Fechar"><X className="h-5 w-5" /></button>
            {images.length > 1 && (
              <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
                {images.map((img, i) => (
                  <button key={img.url} type="button" onClick={() => setZoom(i)} className={cn("relative h-16 w-12 overflow-hidden rounded ring-2", i === zoom ? "ring-gold-light" : "ring-transparent opacity-60")} aria-label={`Foto ${i + 1}`}>
                    <Image src={img.url} alt="" fill sizes="48px" quality={75} className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
