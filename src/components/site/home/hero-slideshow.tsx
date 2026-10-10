"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "@/components/ui/sady-image";
import { cn } from "@/lib/utils";

export type HeroSlide = { image: string; eyebrow: string; caption: string; href: string; position?: string };

const INTERVAL = 6500;
const TITLE = ["Elegância", "para", "momentos", "que", "merecem", "ser", "lembrados."];

/**
 * Topo da home: fotos reais em tela cheia, troca suave com zoom lento (Ken Burns),
 * título que surge palavra por palavra e indicadores com barra de progresso.
 */
export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (slides.length < 2) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), INTERVAL);
    return () => window.clearTimeout(t);
  }, [index, slides.length]);

  const slide = slides[index]!;

  return (
    <section className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ink text-ivory" aria-roledescription="carrossel" aria-label="Destaques">
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.image}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image src={slide.image} alt="" fill priority={index === 0} sizes="100vw" className={cn("object-cover", !reduce && "ken-burns")} style={{ objectPosition: slide.position ?? "50% 20%" }} />
        </motion.div>
      </AnimatePresence>
      {/* Véu para leitura do texto */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-ink via-ink/45 to-ink/30" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-ink/80 via-ink/20 to-transparent" />

      <div className="container-site relative z-[2] pb-28 pt-40 sm:pb-24">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="eyebrow">
          Aluguel de trajes · Teresina · Desde 2008
        </motion.p>
        <h1 className="display mt-6 max-w-4xl text-[clamp(2.9rem,8vw,7.5rem)] leading-[0.95]">
          {TITLE.map((word, i) => (
            <span key={word + i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                className={cn("inline-block pr-[0.25em]", word === "merecem" && "text-gold-shine italic font-normal")}
                initial={reduce ? false : { y: "110%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.35 + i * 0.07, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.8 }} className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/agendamento" className="btn-shine inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gold px-8 text-[13px] font-bold uppercase tracking-[0.18em] text-ink transition hover:bg-gold-light">
            Agendar atendimento
          </Link>
          <Link href="/catalogo" className="group inline-flex h-14 items-center justify-center gap-2 rounded-full border border-ivory/30 px-8 text-[13px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm transition hover:border-gold-light hover:text-gold-light">
            Explorar catálogo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Legenda do slide atual + indicadores */}
        <div className="mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <AnimatePresence mode="wait">
            <motion.div key={slide.caption} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5 }}>
              <Link href={slide.href} className="group inline-flex items-center gap-3 text-sm text-ivory/80 hover:text-gold-light">
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-light">{slide.eyebrow}</span>
                <span className="link-draw">{slide.caption}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-2" role="tablist" aria-label="Escolher destaque">
            {slides.map((s, i) => (
              <button key={s.image} type="button" role="tab" aria-selected={i === index} aria-label={`Destaque ${i + 1}: ${s.caption}`} onClick={() => setIndex(i)} className="group relative h-8 w-12 sm:w-16">
                <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 overflow-hidden rounded-full bg-ivory/25">
                  <span
                    key={i === index ? `on-${index}` : `off-${i}`}
                    className="block h-full origin-left bg-gold-light"
                    style={i === index ? { animation: reduce ? undefined : `hero-progress ${INTERVAL}ms linear forwards` } : { transform: i < index ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Indicação de rolagem */}
      <div className="absolute bottom-6 left-1/2 z-[2] hidden h-12 w-px -translate-x-1/2 overflow-hidden bg-ivory/20 lg:block" aria-hidden>
        <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-gold-light" />
      </div>
      <style>{`@keyframes hero-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
    </section>
  );
}
