/** Check de sucesso desenhado em traço (animação em CSS: .draw-check). */
export function AnimatedCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden>
      <g className="draw-check" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="28" cy="28" r="25" />
        <path d="M17 29l7.5 7.5L39 21" />
      </g>
    </svg>
  );
}
