"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor de "linha dourada": um anel fino que segue o mouse com leve atraso e
 * cresce sobre links e botões. Só aparece com mouse (CSS esconde no toque) e
 * some para quem prefere menos movimento. O cursor do sistema continua visível.
 */
export function GoldCursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = -100, y = -100, rx = -100, ry = -100, hover = false, raf = 0, visible = false;

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as Element | null;
      hover = Boolean(t?.closest("a, button, [role=button], summary, label, select"));
      if (!visible && ring.current && dot.current) {
        visible = true;
        ring.current.style.opacity = "1";
        dot.current.style.opacity = "1";
      }
    };
    const leave = () => {
      visible = false;
      if (ring.current && dot.current) {
        ring.current.style.opacity = "0";
        dot.current.style.opacity = "0";
      }
    };
    const tick = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      const s = hover ? 1.8 : 1;
      if (ring.current) ring.current.style.transform = `translate3d(${rx - 16}px, ${ry - 16}px, 0) scale(${s})`;
      if (dot.current) dot.current.style.transform = `translate3d(${x - 2.5}px, ${y - 2.5}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ring} aria-hidden className="gold-cursor h-8 w-8 rounded-full border border-gold/70 opacity-0 transition-[opacity,border-color] duration-300 [mix-blend-mode:difference]" />
      <div ref={dot} aria-hidden className="gold-cursor h-[5px] w-[5px] rounded-full bg-gold opacity-0 transition-opacity duration-300" />
    </>
  );
}
