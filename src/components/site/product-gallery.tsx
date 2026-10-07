"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/utils/cn";
import { ProductImagePlaceholder } from "./product-card";

export function ProductGallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] overflow-hidden rounded-xl">
        <ProductImagePlaceholder name={name} />
      </div>
    );
  }
  const current = images[active] ?? images[0]!;
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="flex gap-3 sm:flex-col" role="tablist" aria-label="Fotos">
          {images.map((img, i) => (
            <button key={img.url} type="button" role="tab" aria-selected={i === active} aria-label={`Foto ${i + 1}`} onClick={() => setActive(i)} className={cn("relative aspect-[3/4] w-20 overflow-hidden rounded-md ring-2 ring-offset-2 transition", i === active ? "ring-gold" : "ring-transparent opacity-70 hover:opacity-100")}>
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="relative aspect-[3/4] flex-1 overflow-hidden rounded-xl bg-sand">
        <Image key={current.url} src={current.url} alt={current.alt ?? name} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover animate-fade-up" />
      </div>
    </div>
  );
}
