"use client";

/**
 * Topo da página inicial — a "aura" Sady: palco escuro com foco de luz e
 * fumaça dourada, o terno surgindo do desfocado para o nítido (como numa
 * vitrine de alfaiataria) e legendas editoriais nas laterais.
 * Fotos reais do catálogo; troca sozinha e pausa quando o mouse está em cima.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight, CalendarCheck } from "lucide-react";
import Image from "@/components/ui/sady-image";
import { cn } from "@/lib/utils";

export type AuraSlide = { slug: string; name: string; category: string; image: string };

const INTERVAL = 5200;
const EASE = [0.22, 1, 0.36, 1] as const;
const LINES = [
  "Corte que acompanha o seu passo.",
  "Estrutura que veste com presença.",
  "Detalhes que se notam de perto.",
  "Elegância que atravessa a noite.",
  "Feito para o seu grande dia.",
  "O orgulho de ser Sady.",
];

export function AuraHero({ slides }: { slides: AuraSlide[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const t = window.setTimeout(() => go(index + 1), INTERVAL);
    return () => window.clearTimeout(t);
  }, [index, paused, count, go]);

  // Leve profundidade acompanhando o mouse
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 80, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 80, damping: 18 });
  const glowX = useSpring(useTransform(mx, [-0.5, 0.5], ["44%", "56%"]), { stiffness: 60, damping: 20 });
  const spotlight = useTransform(glowX, (x) => `radial-gradient(34% 70% at ${x} 0%, rgb(255 240 210 / 0.20), transparent 70%)`);

  if (count === 0) return null;
  const s = slides[index]!;
  const n = String(index + 1).padStart(2, "0");

  return (
    <section
      className="aura grain relative isolate h-[calc(100svh-4rem)] min-h-[620px] overflow-hidden text-ivory sm:h-[calc(100svh-5rem)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        mx.set(0);
        my.set(0);
      }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      aria-roledescription="carrossel"
      aria-label="Trajes em destaque"
    >
      {/* Foco de luz vindo de cima + chão iluminado */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: spotlight }}
      />
      <div aria-hidden className="pointer-events-none absolute bottom-[6%] left-1/2 -z-10 h-24 w-[min(80vw,620px)] -translate-x-1/2 rounded-[50%] bg-gold/20 blur-3xl" />
      {/* Fumaça dourada */}
      {!reduce && (
        <>
          <motion.div aria-hidden className="pointer-events-none absolute -left-[10%] top-[30%] -z-10 h-[50vh] w-[50vw] rounded-full bg-gold-deep/30 blur-[90px]" animate={{ x: [0, 60, -20, 0], y: [0, -30, 20, 0] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden className="pointer-events-none absolute -right-[10%] top-[10%] -z-10 h-[45vh] w-[40vw] rounded-full bg-gold/15 blur-[100px]" animate={{ x: [0, -50, 30, 0], y: [0, 40, -10, 0] }} transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }} />
        </>
      )}

      {/* O terno no centro: quadro com borda dourada, sombra profunda e reflexo no chão */}
      <div className="absolute inset-x-0 top-[15%] flex justify-center [perspective:1400px] sm:inset-y-0 sm:top-0 sm:items-center">
        <motion.div className="relative aspect-[1463/2048] h-[38svh] sm:h-[74%]" style={{ rotateX: rx, rotateY: ry }}>
          <div aria-hidden className="absolute -inset-3 rounded-[30px] border border-gold/25 sm:-inset-4" />
          <div className="absolute inset-0 overflow-hidden rounded-[24px] bg-ink-3 shadow-[0_60px_120px_-30px_rgb(0_0_0/0.85),0_0_0_1px_rgb(226_199_147/0.35)]">
            <AnimatePresence initial={false}>
              <motion.div
                key={s.slug}
                className="absolute inset-0"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08, filter: "blur(18px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(8px)" }}
                transition={{ duration: 1.15, ease: EASE }}
              >
                <Image src={s.image} alt={s.name} fill priority={index === 0} sizes="(min-width: 640px) 40vw, 60vw" className="object-cover object-top [filter:brightness(0.94)_contrast(1.06)]" />
              </motion.div>
            </AnimatePresence>
            {/* luz e sombra sobre a foto */}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(255_244_220/0.10)_0%,transparent_30%,transparent_65%,rgb(14_12_10/0.55)_100%)]" />
          </div>
          {/* reflexo */}
          <div aria-hidden className="absolute inset-x-6 -bottom-8 h-8 rounded-[50%] bg-black/70 blur-xl" />
        </motion.div>
      </div>

      {/* Manifesto à esquerda */}
      <div className="container-site pointer-events-none relative flex h-full flex-col justify-end pb-20 sm:pb-28 lg:justify-center lg:pb-0">
        <div className="pointer-events-auto max-w-md">
          <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            Sady Roupas · desde 2008
          </motion.p>
          <motion.h1 className="display mt-3 text-[2.3rem] leading-[1.02] sm:mt-4 sm:text-6xl lg:text-7xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.35, ease: EASE }}>
            Ser Sady é vestir <em className="text-gold-shine">orgulho</em>.
          </motion.h1>
          <motion.div className="mt-5 flex flex-wrap gap-2.5 sm:mt-7 sm:gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.6 }}>
            <Link href="/agendamento" className="btn-shine inline-flex h-12 items-center gap-2 rounded-full bg-gold px-6 text-[12px] font-bold uppercase tracking-[0.16em] text-ink transition hover:bg-gold-light sm:h-14 sm:px-8">
              <CalendarCheck className="h-4 w-4" /> Agendar prova
            </Link>
            <Link href="/catalogo" className="inline-flex h-12 items-center rounded-full border border-white/25 px-6 text-[12px] font-bold uppercase tracking-[0.16em] text-ivory transition hover:border-gold-light hover:text-gold-light sm:h-14 sm:px-8">
              Ver catálogo
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Legenda do traje à direita (no celular, acima dos botões) */}
      <div className="pointer-events-none absolute inset-x-0 top-5 sm:top-10 lg:inset-x-auto lg:right-[max(3rem,calc(50%-42rem))] lg:top-1/2 lg:w-64 lg:-translate-y-1/2">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.slug}
            className="pointer-events-auto text-center lg:text-left"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-light/80">
              Nº {n} · {s.category}
            </p>
            <Link href={`/catalogo/${s.slug}`} className="group mt-2 inline-block font-display text-2xl leading-tight text-ivory transition hover:text-gold-light lg:text-3xl">
              {s.name}
              <ArrowRight className="ml-2 inline h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
            </Link>
            <p className="mt-2 hidden font-display text-lg italic text-ivory/60 lg:block">{LINES[index % LINES.length]}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progresso */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-6 sm:bottom-8">
          <div className="container-site flex items-center gap-4">
            <span className="font-display text-sm tabular-nums text-gold-light">{n}</span>
            <div className="flex flex-1 gap-1.5 sm:max-w-md">
              {slides.map((sl, i) => (
                <button key={sl.slug} type="button" onClick={() => go(i)} aria-label={`Ver ${sl.name}`} aria-current={i === index} className="group relative h-6 flex-1">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/20" />
                  <span
                    className={cn("absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gold-light", i < index ? "w-full" : "w-0")}
                    style={i === index && !paused && !reduce ? { animation: `hero-progress ${INTERVAL}ms linear forwards` } : i === index ? { width: "100%" } : undefined}
                  />
                </button>
              ))}
            </div>
            <span className="font-display text-sm tabular-nums text-ivory/40">{String(count).padStart(2, "0")}</span>
          </div>
        </div>
      )}
    </section>
  );
}
