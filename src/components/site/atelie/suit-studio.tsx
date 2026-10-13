"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { CalendarCheck, Hand, Minus, Pause, Play, Plus, RotateCcw, Shirt, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/utils/phone";
import {
  DEFAULT_CONFIG,
  describe,
  FABRICS,
  find,
  HOTSPOTS,
  LAPELS,
  LIGHTS,
  PIECES,
  SHIRT_TONES,
  SUIT_TONES,
  TIE_STYLES,
  TIE_TONES,
  VEST_TONES,
  type Light,
  type PieceId,
  type SuitConfig,
  type Swatch,
} from "./suit-config";
import { SuitDefs, suitLayers, VIEWBOX } from "./suit-figure";

const ORDER = PIECES.map((p) => p.id);
const MAX_TURN = 32;
type Zoom = { s: number; x: number; y: number };
const NO_ZOOM: Zoom = { s: 1, x: 200, y: 310 };

/** Peças que dependem de outras (gravata precisa da camisa; lenço precisa do blazer). */
function visible(worn: Set<PieceId>, id: PieceId) {
  if (id === "gravata") return worn.has("gravata") && worn.has("camisa");
  if (id === "lenco") return worn.has("lenco") && worn.has("blazer");
  return worn.has(id);
}

export function SuitStudio({ whatsapp, catalogColors }: { whatsapp: string | null; catalogColors: string[] }) {
  const reduce = useReducedMotion();
  const [config, setConfig] = useState<SuitConfig>(DEFAULT_CONFIG);
  const [worn, setWorn] = useState<Set<PieceId>>(new Set());
  const [step, setStep] = useState<PieceId | null>(null);
  const [light, setLight] = useState<Light>("loja");
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM);
  const [detail, setDetail] = useState<(typeof HOTSPOTS)[number] | null>(null);
  const [auto, setAuto] = useState(true);
  const [dragging, setDragging] = useState(false);
  const timers = useRef<number[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const set = <K extends keyof SuitConfig>(k: K, v: SuitConfig[K]) => setConfig((c) => ({ ...c, [k]: v }));

  /* ------------------------------------------------ giro (arrastar) */
  const ry = useMotionValue(0);
  const rx = useMotionValue(0);
  const sry = useSpring(ry, { stiffness: 120, damping: 20 });
  const srx = useSpring(rx, { stiffness: 120, damping: 20 });
  const shadowX = useTransform(sry, (v) => `${-v * 0.6}px`);
  const [turned, setTurned] = useState(false);
  useEffect(() => sry.on("change", (v) => setTurned(Math.abs(v) > 12)), [sry]);

  useAnimationFrame((t) => {
    if (!auto || reduce || dragging || zoom.s > 1) return;
    ry.set(Math.sin(t / 2600) * 10);
  });

  /* ------------------------------------------------ vestir passo a passo */
  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  const dress = useCallback(() => {
    clearTimers();
    setWorn(new Set());
    setStep(null);
    ORDER.forEach((id, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setWorn((w) => new Set([...w, id]));
          setStep(id);
        }, 500 + i * (reduce ? 150 : 1100)),
      );
    });
    timers.current.push(window.setTimeout(() => setStep(null), 500 + ORDER.length * (reduce ? 150 : 1100) + 1400));
  }, [reduce]);
  const undress = () => {
    clearTimers();
    setStep(null);
    [...ORDER].reverse().forEach((id, i) => timers.current.push(window.setTimeout(() => setWorn((w) => new Set([...w].filter((x) => x !== id))), i * 260)));
  };
  const toggle = (id: PieceId) => {
    clearTimers();
    setStep(null);
    setWorn((w) => {
      const next = new Set(w);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (id === "gravata") next.add("camisa");
        if (id === "lenco") next.add("blazer");
      }
      return next;
    });
  };

  // Começa a vestir quando o manequim aparece na tela
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !started.current) {
          started.current = true;
          dress();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimers();
    };
  }, [dress]);

  /* ------------------------------------------------ arrastar: gira ou move o zoom */
  const drag = useRef<{ x: number; y: number; ry: number; rx: number; zx: number; zy: number; w: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ry: ry.get(), rx: rx.get(), zx: zoom.x, zy: zoom.y, w: e.currentTarget.getBoundingClientRect().width };
    setDragging(true);
    setAuto(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (zoom.s > 1) {
      const unit = d.w / 400;
      setZoom((z) => ({ ...z, x: clamp(d.zx - dx / (unit * z.s), 40, 360), y: clamp(d.zy - dy / (unit * z.s), 40, 580) }));
    } else {
      ry.set(clamp(d.ry + dx * 0.35, -MAX_TURN, MAX_TURN));
      rx.set(clamp(d.rx - dy * 0.08, -8, 8));
    }
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
    rx.set(0);
  };

  const focus = (h: (typeof HOTSPOTS)[number]) => {
    ry.set(0);
    setAuto(false);
    setDetail(h);
    setZoom({ s: h.zoom, x: h.x, y: h.y });
  };
  const resetView = () => {
    setDetail(null);
    setZoom(NO_ZOOM);
    ry.set(0);
  };
  const zoomBy = (f: number) =>
    setZoom((z) => {
      const s = clamp(Math.round(z.s * f * 10) / 10, 1, 3.4);
      if (s === 1) setDetail(null);
      return s === 1 ? NO_ZOOM : { ...z, s };
    });

  /* ------------------------------------------------ dados derivados */
  const layers = suitLayers(config);
  const isOn = (id: string | null) => id === null || visible(worn, id as PieceId);
  const hotspots = HOTSPOTS.filter((h) =>
    h.id === "gravata" ? visible(worn, "gravata") : h.id === "punho" ? worn.has("camisa") : h.id === "tecido" ? worn.has("blazer") || worn.has("colete") : worn.has("blazer"),
  );
  const tone = find(SUIT_TONES, config.suit);
  const lightTint = find(LIGHTS, light);
  const summary = describe(config);
  const wa = whatsappLink(whatsapp, `Olá! Montei este look na página "Monte seu terno" do site: ${summary}. Vocês têm algo assim para eu provar?`);
  const catalogHref = tone.catalog && catalogColors.includes(tone.catalog) ? `/catalogo?cor=${encodeURIComponent(tone.catalog)}` : "/catalogo";
  const stepInfo = step ? PIECES.find((p) => p.id === step) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
      <SuitDefs />

      {/* ------------------------------------------------ palco */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div
          ref={stageRef}
          className={cn(
            "relative mx-auto aspect-[400/620] w-full max-w-[520px] touch-pan-y select-none overflow-hidden rounded-[28px] border border-white/10 bg-ink",
            zoom.s > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : dragging ? "cursor-grabbing" : "cursor-ew-resize",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => (zoom.s > 1 ? resetView() : setZoom({ s: 2, x: 200, y: 260 }))}
          role="application"
          aria-label="Manequim interativo: arraste para girar, use os botões para aproximar"
        >
          {/* luz de estúdio */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_30%,rgb(226_199_147/0.22),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
          <motion.div aria-hidden className="pointer-events-none absolute bottom-[1.2%] left-1/2 h-[4%] w-[46%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-md" style={{ x: shadowX }} />

          {/* zoom (2D) → perspectiva → giro (3D) → camadas */}
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${zoom.s}) translate(${((200 - zoom.x) / 400) * 100}%, ${((310 - zoom.y) / 620) * 100}%)`,
              transition: dragging ? "none" : "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div className="absolute inset-0 [perspective:1300px]">
              <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ rotateY: sry, rotateX: srx }}>
                <AnimatePresence>
                  {layers
                    .filter((l) => isOn(l.piece))
                    .map((l) => (
                      <motion.div
                        key={l.id}
                        className="absolute inset-0"
                        style={{ z: l.z }}
                        initial={l.piece ? { opacity: 0, y: -40, clipPath: "inset(0% 0% 100% 0%)" } : false}
                        animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
                        exit={{ opacity: 0, y: -24, transition: { duration: 0.3 } }}
                        transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible" aria-hidden>
                          {l.node}
                        </svg>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* pontos de detalhe */}
            <AnimatePresence>
              {!turned &&
                !detail &&
                hotspots.map((h) => (
                  <motion.button
                    key={h.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    onClick={() => focus(h)}
                    className="group absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={{ left: `${(h.x / 400) * 100}%`, top: `${(h.y / 620) * 100}%`, scale: 1 / zoom.s }}
                    aria-label={`Ver detalhe: ${h.title}`}
                  >
                    <span className="absolute h-full w-full animate-ping rounded-full bg-gold-light/40 [animation-duration:2.4s]" />
                    <span className="relative h-3 w-3 rounded-full border-2 border-ink bg-gold-light shadow-[0_0_0_3px_rgb(226_199_147/0.35)]" />
                    <span className="pointer-events-none absolute left-8 whitespace-nowrap rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      {h.title}
                    </span>
                  </motion.button>
                ))}
            </AnimatePresence>
          </div>

          {/* luz ambiente */}
          <div className="pointer-events-none absolute inset-0 mix-blend-overlay transition-colors duration-700" style={{ backgroundColor: lightTint.tint }} />

          {/* legenda do passo */}
          <AnimatePresence mode="wait">
            {stepInfo && (
              <motion.div
                key={stepInfo.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-ivory backdrop-blur-md"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-light">
                  {ORDER.indexOf(stepInfo.id) + 1}/{ORDER.length} · {stepInfo.label}
                </p>
                <p className="mt-1 text-sm text-ivory/80">{stepInfo.caption}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* detalhe aberto */}
          <AnimatePresence>
            {detail && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="absolute inset-x-3 bottom-16 rounded-2xl border border-gold/30 bg-ink/85 p-4 text-ivory backdrop-blur-md"
              >
                <button type="button" onClick={resetView} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-ivory/70 hover:text-gold-light" aria-label="Fechar detalhe">
                  <X className="h-4 w-4" />
                </button>
                <p className="eyebrow">{detail.title}</p>
                <p className="mt-1.5 pr-6 text-sm leading-relaxed text-ivory/80">{detail.text}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* controles */}
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory/70 backdrop-blur">
              <Hand className="h-3.5 w-3.5 text-gold-light" />
              <span className="sm:hidden">{zoom.s > 1 ? "Mover" : "Girar"}</span>
              <span className="hidden sm:inline">{zoom.s > 1 ? "Arraste para mover" : "Arraste para girar"}</span>
            </p>
            <div className="flex items-center gap-1 rounded-full bg-ink/60 p-1 backdrop-blur">
              <StageButton label="Afastar" onClick={() => zoomBy(1 / 1.4)} disabled={zoom.s <= 1}>
                <Minus className="h-4 w-4" />
              </StageButton>
              <StageButton label="Aproximar" onClick={() => zoomBy(1.4)} disabled={zoom.s >= 3.4}>
                <Plus className="h-4 w-4" />
              </StageButton>
              <StageButton label={auto ? "Parar giro automático" : "Giro automático"} onClick={() => setAuto((a) => !a)}>
                {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </StageButton>
              <StageButton label="Voltar à posição inicial" onClick={resetView}>
                <RotateCcw className="h-4 w-4" />
              </StageButton>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-[520px] flex-wrap justify-center gap-2">
          {LIGHTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLight(l.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold transition",
                light === l.id ? "border-ink bg-ink text-ivory" : "border-line text-muted-foreground hover:border-ink hover:text-ink",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ painel */}
      <div className="space-y-8">
        <Section title="Vestir" hint="Veja o terno sendo montado, peça por peça, ou ligue e desligue cada uma.">
          <div className="flex flex-wrap gap-2">
            {PIECES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={worn.has(p.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  worn.has(p.id) ? "border-gold bg-gold/15 text-ink" : "border-line text-muted-foreground hover:border-ink hover:text-ink",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={dress} className="btn-shine inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-xs font-bold uppercase tracking-[0.16em] text-ivory hover:bg-ink-3">
              <Sparkles className="h-4 w-4 text-gold-light" /> Vestir passo a passo
            </button>
            <button type="button" onClick={undress} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-xs font-bold uppercase tracking-[0.16em] text-ink hover:border-ink">
              <Shirt className="h-4 w-4" /> Tirar tudo
            </button>
          </div>
        </Section>

        <Section title="Tom do terno" value={tone.label}>
          <Swatches list={SUIT_TONES} value={config.suit} onChange={(v) => set("suit", v)} />
          <Segmented className="mt-4" label="Tecido" list={FABRICS} value={config.fabric} onChange={(v) => set("fabric", v)} />
          <Segmented className="mt-3" label="Lapela" list={LAPELS} value={config.lapel} onChange={(v) => set("lapel", v)} />
        </Section>

        <Section title="Camisa" value={find(SHIRT_TONES, config.shirt).label}>
          <Swatches list={SHIRT_TONES} value={config.shirt} onChange={(v) => set("shirt", v)} />
        </Section>

        <Section title="Gravata" value={config.tieStyle === "sem" ? "Sem gravata" : find(TIE_TONES, config.tie).label}>
          <Segmented label="Estilo" list={TIE_STYLES} value={config.tieStyle} onChange={(v) => set("tieStyle", v)} />
          {config.tieStyle !== "sem" && <Swatches className="mt-4" list={TIE_TONES} value={config.tie} onChange={(v) => set("tie", v)} />}
        </Section>

        <Section title="Colete" value={find(VEST_TONES, config.vest).label}>
          <Swatches list={VEST_TONES.map((v) => (v.id === "terno" ? { ...v, hex: tone.hex } : v))} value={config.vest} onChange={(v) => set("vest", v)} />
        </Section>

        <div className="aura grain rounded-3xl p-6 text-ivory sm:p-8">
          <p className="eyebrow">Seu look</p>
          <p className="mt-3 font-display text-2xl leading-snug sm:text-3xl">{summary}.</p>
          <p className="mt-3 text-sm text-ivory/65">É uma simulação — na loja você vê o caimento, sente o tecido e ajustamos as medidas.</p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link href={catalogHref} className="btn-shine inline-flex h-12 items-center justify-center rounded-full bg-gold px-6 text-xs font-bold uppercase tracking-[0.16em] text-ink hover:bg-gold-light">
              Ver ternos {tone.catalog && catalogColors.includes(tone.catalog) ? `na cor ${tone.catalog.toLowerCase()}` : "no catálogo"}
            </Link>
            <Link href="/agendamento" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-xs font-bold uppercase tracking-[0.16em] text-ivory hover:border-gold-light hover:text-gold-light">
              <CalendarCheck className="h-4 w-4" /> Agendar prova
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-xs font-bold uppercase tracking-[0.16em] text-ivory hover:border-gold-light hover:text-gold-light">
                Enviar no WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ peças de UI */
function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function StageButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ivory/80 transition hover:bg-white/10 hover:text-gold-light disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Section({ title, value, hint, children }: { title: string; value?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <h2 className="font-display text-2xl">{title}</h2>
        {value && <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">{value}</span>}
      </div>
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

function Swatches({ list, value, onChange, className }: { list: Swatch[]; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2.5", className)} role="radiogroup">
      {list.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          aria-label={s.label}
          title={s.label}
          onClick={() => onChange(s.id)}
          className={cn("relative h-10 w-10 rounded-full p-[3px] ring-1 transition", value === s.id ? "ring-2 ring-gold" : "ring-line hover:ring-ink/40")}
        >
          <span className="block h-full w-full rounded-full shadow-[inset_0_-6px_10px_rgb(0_0_0/0.25),inset_0_4px_8px_rgb(255_255_255/0.15)]" style={{ background: s.hex }} />
          {value === s.id && <motion.span layoutId={`sw-${list[0]!.id}`} className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold" />}
        </button>
      ))}
    </div>
  );
}

function Segmented<T extends string>({ label, list, value, onChange, className }: { label: string; list: readonly { id: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="w-16 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {list.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("rounded-full border px-3.5 py-1.5 text-xs font-medium transition", value === o.id ? "border-ink bg-ink text-ivory" : "border-line text-ink/75 hover:border-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
