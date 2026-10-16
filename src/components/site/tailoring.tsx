/**
 * Assinatura visual de alfaiataria da Sady: fita métrica, botão de terno e
 * selo com monograma. Peças pequenas, usadas como detalhe — não como enfeite
 * em todo canto.
 */
import { cn } from "@/lib/utils";

/** Fita métrica que desliza devagar — divisória entre seções. */
export function TapeMeasure({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const cm = 150;
  const step = 12; // px por centímetro
  const tape = (
    <svg width={cm * step} height="34" viewBox={`0 0 ${cm * step} 34`} aria-hidden className="block shrink-0">
      {Array.from({ length: cm }, (_, i) => {
        const x = i * step;
        const big = i % 10 === 0;
        const mid = i % 5 === 0;
        return (
          <g key={i}>
            <line x1={x} y1="0" x2={x} y2={big ? 15 : mid ? 10 : 6} stroke="currentColor" strokeWidth={big ? 1.2 : 0.8} />
            {big && (
              <text x={x + 3} y="27" fontSize="10" fontFamily="var(--font-manrope)" fill="currentColor" opacity="0.85">
                {i}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden border-y",
        dark ? "border-white/10 bg-[#1a1612] text-gold-light/70" : "border-gold/30 bg-[linear-gradient(180deg,#f3e7cf,#ead9b8)] text-gold-deep",
        className,
      )}
    >
      <div className="tape-slide flex w-max">
        {tape}
        {tape}
      </div>
    </div>
  );
}

/** Botão de terno (4 furos) — marcador dourado. */
export function TailorButton({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cn("shrink-0", className)}>
      <defs>
        <radialGradient id="tb-g" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#f3dfb1" />
          <stop offset="0.55" stopColor="#c2a06a" />
          <stop offset="1" stopColor="#6e5530" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#tb-g)" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="#6e5530" strokeOpacity="0.45" strokeWidth="0.9" />
      {[
        [9.2, 9.2],
        [14.8, 9.2],
        [9.2, 14.8],
        [14.8, 14.8],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" fill="#3d2f1b" />
      ))}
    </svg>
  );
}

/** Selo com monograma "S" e texto girando em volta. */
export function MonogramSeal({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <div className={cn("relative aspect-square", className)} aria-hidden>
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <path id="seal-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <circle cx="60" cy="60" r="58" fill={dark ? "#0e0c0a" : "#f6f1e8"} />
        <circle cx="60" cy="60" r="54" fill="none" stroke="#c2a06a" strokeWidth="0.8" strokeDasharray="2 2.5" />
        <circle cx="60" cy="60" r="31" fill="none" stroke="#c2a06a" strokeWidth="0.8" />
        <g className="seal-spin">
          <text fontSize="9.5" letterSpacing="3.6" fill="#e2c793" fontFamily="var(--font-manrope)" fontWeight="600">
            <textPath href="#seal-circle">SADY ROUPAS · DESDE 2008 · </textPath>
          </text>
        </g>
        <text x="60" y="73" textAnchor="middle" fontSize="40" fontFamily="var(--font-cormorant)" fontStyle="italic" fill={dark ? "#e2c793" : "#94743f"}>
          S
        </text>
      </svg>
    </div>
  );
}
