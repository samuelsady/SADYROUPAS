"use client";

/**
 * Entrada do site: a logo da Sady sendo assinada ao lado de um terno sendo
 * vestido, sobre o vidro dourado animado. Uma vez por sessão, com "Pular";
 * desligada para quem prefere menos movimento. O script em (site)/layout.tsx
 * marca a sessão antes da pintura, então quem já viu não vê nem por um instante.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, type TargetAndTransition } from "framer-motion";
import { GlassFold } from "@/components/ui/glass-fold";
import { INTRO_KEY } from "@/lib/intro";
import { DEFAULT_CONFIG, type SuitConfig } from "./suit-config";
import { SuitDefs, suitLayers, VIEWBOX } from "./suit-figure";

const DURATION = 4600;
const EASE = [0.22, 1, 0.36, 1] as const;
const LOOK: SuitConfig = { ...DEFAULT_CONFIG, suit: "preto", fabric: "liso", lapel: "entalhada", shirt: "branca", tieStyle: "gravata", tie: "dourada", vest: "terno" };

/** De onde cada peça "chega" e quando. */
function entrance(id: string): { from: TargetAndTransition; delay: number } {
  if (id === "manequim") return { from: { opacity: 0, y: 20 }, delay: 0.15 };
  if (id === "camisa" || id === "colarinho") return { from: { opacity: 0, y: 70, filter: "blur(12px)" }, delay: 0.45 };
  if (id.startsWith("calca")) return { from: { opacity: 0, y: 60, filter: "blur(10px)" }, delay: 0.85 };
  if (id === "gravata") return { from: { opacity: 0, y: -30, filter: "blur(8px)" }, delay: 1.15 };
  if (id === "colete") return { from: { opacity: 0, x: -80, filter: "blur(10px)" }, delay: 1.4 };
  if (id === "lenco") return { from: { opacity: 0, scale: 0.6 }, delay: 2.5 };
  return { from: { opacity: 0, y: -110, scale: 1.05, filter: "blur(14px)" }, delay: 1.85 }; // blazer
}

export function SiteIntro() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (root.dataset.intro === "seen" || reduce) {
      const t = window.setTimeout(() => setShow(false), 0);
      return () => window.clearTimeout(t);
    }
    root.style.overflow = "hidden";
    const t = window.setTimeout(() => setShow(false), DURATION);
    return () => window.clearTimeout(t);
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
          key="entrada"
          className="site-intro fixed inset-0 z-[100] overflow-hidden bg-ink text-ivory"
          style={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.9, ease: EASE } }}
          role="dialog"
          aria-label="Entrada do site"
        >
          <GlassFold color1="#5a4426" color2="#0b0907" color3="#e9cf98" speed={0.35} scale={0.9} noise={0.1} className="absolute inset-0 opacity-70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgb(11_9_7/0.65)_100%)]" />

          <div className="relative flex h-full flex-col items-center justify-center gap-4 px-6 md:flex-row md:gap-16">
            {/* O terno sendo vestido */}
            <SuitDefs />
            <div className="relative aspect-[400/620] h-[42vh] md:h-[64vh] md:max-h-[560px]">
              {layers.map((l) => {
                const { from, delay } = entrance(l.id);
                return (
                  <motion.div
                    key={l.id}
                    className="absolute inset-0"
                    initial={from}
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }}
                    transition={{ delay, duration: 0.85, ease: EASE }}
                  >
                    <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible drop-shadow-[0_30px_40px_rgb(0_0_0/0.45)]">
                      {l.node}
                    </svg>
                  </motion.div>
                );
              })}
            </div>

            {/* A logo sendo assinada */}
            <div className="flex flex-col items-center md:items-start">
              <svg viewBox="0 0 520 210" className="w-[min(78vw,460px)] overflow-visible" role="img" aria-label="Sady">
                <motion.text
                  x="10"
                  y="160"
                  fontFamily="var(--font-signature), cursive"
                  fontSize="190"
                  fill="#e9cf98"
                  stroke="#e9cf98"
                  strokeWidth="1.4"
                  strokeDasharray="2400"
                  initial={{ strokeDashoffset: 2400, fillOpacity: 0 }}
                  animate={{ strokeDashoffset: 0, fillOpacity: 1 }}
                  transition={{ strokeDashoffset: { delay: 0.6, duration: 2.2, ease: "easeInOut" }, fillOpacity: { delay: 2.2, duration: 0.8 } }}
                >
                  Sady
                </motion.text>
                {/* traço final da assinatura */}
                <motion.path
                  d="M40 186 C 160 172, 320 176, 500 160"
                  fill="none"
                  stroke="#c2a06a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 2.5, duration: 0.8, ease: "easeOut" }}
                />
              </svg>
              <motion.p
                className="mt-2 pl-1 text-[11px] font-semibold uppercase tracking-[0.6em] text-ivory/75 md:text-xs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.9, duration: 0.8, ease: EASE }}
              >
                Roupas · desde 2008
              </motion.p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShow(false)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-ivory/80 backdrop-blur transition hover:border-gold-light hover:text-gold-light"
          >
            Pular
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
