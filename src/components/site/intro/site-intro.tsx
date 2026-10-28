"use client";

/**
 * Entrada do site: ao fundo, a foto real de um terno do acervo se monta faixa
 * por faixa (da barra da calça até a gola); na frente, a logo SADY ROUPAS é
 * montada como tipografia — filetes, letras encaixando, o Y dourado por último.
 * Uma vez por sessão, com "Pular"; desligada para quem prefere menos movimento.
 * O script em (site)/layout.tsx marca a sessão antes da pintura, então quem já
 * viu não vê nem por um instante.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlassFold } from "@/components/ui/glass-fold";
import Image from "@/components/ui/sady-image";
import { INTRO_KEY } from "@/lib/intro";

const DURATION = 4800;
const EASE = [0.22, 1, 0.36, 1] as const;
const PHOTO = "/catalogo/smoking-tradicional-1-bota-o-foto-1.jpg";
const BANDS = 7;

/** Faixas da foto, de baixo para cima: cada uma chega de um lado. */
const bands = Array.from({ length: BANDS }, (_, i) => {
  const top = Math.max(0, (100 / BANDS) * i - 0.2);
  const bottom = Math.max(0, 100 - (100 / BANDS) * (i + 1) - 0.2);
  const order = BANDS - 1 - i;
  return { i, clip: `inset(${top}% 0% ${bottom}% 0%)`, from: i % 2 ? 90 : -90, delay: 0.15 + order * 0.2 };
});

const LETTERS = ["S", "A", "D"];

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
          <GlassFold color1="#5a4426" color2="#0b0907" color3="#e9cf98" speed={0.35} scale={0.9} noise={0.1} className="absolute inset-0 opacity-50" />

          {/* O terno, montado ao fundo */}
          <motion.div
            aria-hidden
            className="absolute inset-y-0 left-1/2 aspect-[1463/2048] h-full -translate-x-1/2 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_45%,#000_40%,transparent_100%)]"
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: DURATION / 1000, ease: "easeOut" }}
          >
            {bands.map((b) => (
              <motion.div
                key={b.i}
                className="absolute inset-0"
                style={{ clipPath: b.clip }}
                initial={{ x: b.from, opacity: 0, filter: "blur(14px)" }}
                animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ delay: b.delay, duration: 0.9, ease: EASE }}
              >
                <Image src={PHOTO} alt="" fill priority sizes="(min-width: 768px) 60vh, 100vw" className="object-cover [filter:grayscale(0.35)_brightness(0.45)_contrast(1.15)_sepia(0.25)]" />
              </motion.div>
            ))}
            {/* linha de costura que sobe enquanto as faixas encaixam */}
            <motion.span
              className="absolute inset-x-[12%] h-px bg-gradient-to-r from-transparent via-gold-light to-transparent shadow-[0_0_12px_#e2c793]"
              initial={{ top: "100%", opacity: 0 }}
              animate={{ top: ["100%", "0%"], opacity: [0, 1, 1, 0] }}
              transition={{ delay: 0.15, duration: 0.2 * BANDS + 0.6, ease: "easeInOut" }}
            />
          </motion.div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(11_9_7/0.35)_0%,rgb(11_9_7/0.8)_75%)]" />

          {/* A logo, montada */}
          <div className="relative flex h-full flex-col items-center justify-center px-6" aria-label="Sady Roupas" role="img">
            <motion.span
              className="h-px w-[min(70vw,380px)] origin-center bg-gradient-to-r from-transparent via-gold to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.8, ease: EASE }}
            />

            <div className="mt-5 flex font-display text-[clamp(4.5rem,19vw,9.5rem)] font-medium leading-[0.9] tracking-[0.04em]" aria-hidden>
              {LETTERS.map((l, i) => (
                <span key={l} className="overflow-hidden pb-[0.06em]">
                  <motion.span
                    className="inline-block"
                    initial={{ y: "105%" }}
                    animate={{ y: 0 }}
                    transition={{ delay: 1.45 + i * 0.14, duration: 0.75, ease: EASE }}
                  >
                    {l}
                  </motion.span>
                </span>
              ))}
              <span className="overflow-hidden pb-[0.06em]">
                <motion.span
                  className="text-gold-shine inline-block"
                  initial={{ y: "-105%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 2.05, duration: 0.8, ease: EASE }}
                >
                  Y
                </motion.span>
              </span>
            </div>

            <motion.span
              className="mt-3 block pl-[0.55em] font-sans text-[clamp(0.85rem,3.6vw,1.6rem)] font-semibold"
              initial={{ opacity: 0, letterSpacing: "1.6em" }}
              animate={{ opacity: 1, letterSpacing: "0.55em" }}
              transition={{ delay: 2.4, duration: 1.1, ease: EASE }}
              aria-hidden
            >
              ROUPAS
            </motion.span>

            <motion.span
              className="mt-6 h-px w-[min(70vw,380px)] origin-center bg-gradient-to-r from-transparent via-gold to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.8, ease: EASE }}
            />
            <motion.p
              className="mt-4 text-[10px] font-semibold uppercase tracking-[0.45em] text-ivory/70 md:text-[11px]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.1, duration: 0.7, ease: EASE }}
            >
              Teresina · desde 2008
            </motion.p>
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
