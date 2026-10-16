"use client";

/**
 * Abertura do site: um terno sendo montado peça por peça sob um foco de luz
 * (camisa → calça → gravata → colete → blazer → lenço) e a assinatura da Sady.
 * Não é um indicador de carregamento: roda uma vez por sessão e pode ser pulada.
 * O script em (site)/layout.tsx marca a sessão antes da pintura, então quem já
 * viu não vê a abertura nem por um instante.
 */
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
} from "framer-motion";
import { SuitDefs, suitLayers } from "@/components/site/atelie/suit-figure";
import {
  DEFAULT_CONFIG,
  type SuitConfig,
} from "@/components/site/atelie/suit-config";

import { INTRO_KEY } from "@/lib/intro";
import { INTRO_PHOTOS } from "@/content/site-media";

/** Com fotos reais do manequim (src/content/site-media.ts), a abertura usa as fotos. */
const PHOTO_MODE = INTRO_PHOTOS.length >= 3;
const PHOTO_STEP = 0.55;
const DURATION = PHOTO_MODE
  ? Math.round((0.4 + INTRO_PHOTOS.length * PHOTO_STEP + 1.5) * 1000)
  : 4300;
const PHOTO_CAPTIONS = INTRO_PHOTOS.flatMap((p, i) =>
  p.caption
    ? [
        {
          at: 0.4 + i * PHOTO_STEP,
          side: i % 2 ? "right" : "left",
          ...p.caption,
        },
      ]
    : [],
);
const LOOK: SuitConfig = {
  ...DEFAULT_CONFIG,
  suit: "preto",
  fabric: "liso",
  lapel: "entalhada",
  shirt: "branca",
  tieStyle: "gravata",
  tie: "dourada",
  vest: "terno",
};
const EASE = [0.22, 1, 0.36, 1] as const;

/** De onde cada peça "chega" e quando. */
function entrance(id: string): { from: TargetAndTransition; delay: number } {
  if (id === "manequim") return { from: { opacity: 0, y: 24 }, delay: 0.1 };
  if (id === "camisa" || id === "colarinho")
    return {
      from: { opacity: 0, y: 90, scale: 0.9, filter: "blur(14px)" },
      delay: 0.5,
    };
  if (id.startsWith("calca"))
    return { from: { opacity: 0, y: 70, filter: "blur(10px)" }, delay: 0.95 };
  if (id === "gravata")
    return { from: { opacity: 0, y: -40, filter: "blur(8px)" }, delay: 1.3 };
  if (id === "colete")
    return {
      from: { opacity: 0, x: -110, rotate: -5, filter: "blur(12px)" },
      delay: 1.55,
    };
  if (id === "lenco") return { from: { opacity: 0, scale: 0.6 }, delay: 2.75 };
  return {
    from: { opacity: 0, y: -130, scale: 1.06, filter: "blur(16px)" },
    delay: 2.05,
  }; // blazer
}

const CAPTIONS = [
  {
    at: 0.55,
    side: "left",
    eyebrow: "A camisa",
    text: "Algodão que veste leve",
  },
  {
    at: 1.5,
    side: "right",
    eyebrow: "O colete",
    text: "Estrutura bem ajustada",
  },
  { at: 2.1, side: "left", eyebrow: "O blazer", text: "Alfaiataria completa" },
  {
    at: 2.85,
    side: "right",
    eyebrow: "Sady Roupas",
    text: "Feito para o seu momento",
  },
] as const;

export function IntroSplash() {
  const [show, setShow] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (root.dataset.intro === "seen" || reduce) {
      timer.current = window.setTimeout(() => setShow(false), 0);
      return () => window.clearTimeout(timer.current);
    }
    root.style.overflow = "hidden";
    timer.current = window.setTimeout(() => setShow(false), DURATION);
    return () => window.clearTimeout(timer.current);
  }, []);

  const finish = () => {
    const root = document.documentElement;
    root.style.overflow = "";
    root.dataset.intro = "seen";
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {}
  };

  const layers = suitLayers(LOOK).sort((a, b) => a.z - b.z);

  return (
    <AnimatePresence onExitComplete={finish}>
      {show && (
        <motion.div
          key="abertura"
          className="intro-splash fixed inset-0 z-[100] overflow-hidden bg-ink text-ivory"
          exit={{
            clipPath: "inset(0% 0% 100% 0%)",
            transition: { duration: 0.9, ease: EASE },
          }}
          style={{ clipPath: "inset(0% 0% 0% 0%)" }}
          aria-label="Abertura do site"
          role="dialog"
        >
          <div className="aura grain flex h-full w-full items-center justify-center">
            {/* foco de luz e chão */}
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(38%_55%_at_50%_18%,rgb(255_244_220/0.16),transparent_70%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            />
            <div className="pointer-events-none absolute bottom-[8%] left-1/2 h-10 w-[min(70vw,420px)] -translate-x-1/2 rounded-[50%] bg-gold/15 blur-2xl" />

            {PHOTO_MODE ? (
              <div className="relative aspect-[4/5] h-[min(72vh,640px)]">
                {INTRO_PHOTOS.map((p, i) => (
                  <motion.div
                    key={p.src}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.06, filter: "blur(16px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{
                      delay: 0.4 + i * PHOTO_STEP,
                      duration: 0.9,
                      ease: EASE,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos locais pré-carregadas na abertura */}
                    <img
                      src={p.src}
                      alt=""
                      className="h-full w-full object-contain"
                      fetchPriority={i < 2 ? "high" : "auto"}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <>
                <SuitDefs />
                <div className="relative h-[min(68vh,560px)] aspect-[400/620]">
                  {layers.map((l) => {
                    const { from, delay } = entrance(l.id);
                    return (
                      <motion.div
                        key={l.id}
                        className="absolute inset-0"
                        initial={from}
                        animate={{
                          opacity: l.id === "manequim" ? 0.9 : 1,
                          x: 0,
                          y: 0,
                          scale: 1,
                          rotate: 0,
                          filter: "blur(0px)",
                        }}
                        transition={{ delay, duration: 0.85, ease: EASE }}
                      >
                        <svg
                          viewBox="0 0 400 620"
                          className="h-full w-full overflow-visible"
                        >
                          {l.node}
                        </svg>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {/* legendas editoriais, como numa vitrine */}
            {(PHOTO_MODE ? PHOTO_CAPTIONS : CAPTIONS).map((c, i, all) => {
              const next = all[i + 1]?.at ?? DURATION / 1000 - 0.3;
              return (
                <motion.div
                  key={c.text}
                  className={`pointer-events-none absolute top-[6%] left-1/2 w-[80vw] -translate-x-1/2 text-center md:top-1/2 md:w-56 md:-translate-y-1/2 md:translate-x-0 md:text-left ${
                    c.side === "left"
                      ? "md:left-[max(6vw,calc(50%-27rem))]"
                      : "md:left-auto md:right-[max(6vw,calc(50%-27rem))]"
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -6] }}
                  transition={{
                    delay: c.at,
                    duration: next - c.at,
                    times: [0, 0.22, 0.82, 1],
                    ease: "easeOut",
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-light">
                    {c.eyebrow}
                  </p>
                  <p className="mt-2 font-display text-2xl leading-tight text-ivory md:text-3xl">
                    {c.text}
                  </p>
                </motion.div>
              );
            })}

            {/* assinatura */}
            <motion.div
              className="pointer-events-none absolute bottom-[5%] left-1/2 -translate-x-1/2 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: DURATION / 1000 - 1.25,
                duration: 0.8,
                ease: EASE,
              }}
            >
              <p className="font-display text-3xl tracking-[0.18em] text-gold-shine">
                SADY
              </p>
              <motion.div
                className="hairline-gold mx-auto mt-1 w-24"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  delay: DURATION / 1000 - 1.05,
                  duration: 0.8,
                  ease: EASE,
                }}
              />
              <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.5em] text-ivory/60">
                Roupas · desde 2008
              </p>
            </motion.div>

            <button
              type="button"
              onClick={() => setShow(false)}
              className="absolute right-4 top-4 rounded-full border border-white/15 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-ivory/70 transition hover:border-gold-light hover:text-gold-light"
            >
              Pular
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
