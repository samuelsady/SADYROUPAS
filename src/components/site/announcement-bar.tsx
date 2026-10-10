const MESSAGES = [
  "Atendimento com hora marcada",
  "Desde 2008 vestindo momentos especiais",
  "Ternos · Smokings · Becas · Acessórios",
  "Monte sua lista de provas online",
  "Teresina — Piauí",
];

/** Faixa fina no topo com mensagens em movimento contínuo. */
export function AnnouncementBar() {
  const row = [...MESSAGES, ...MESSAGES];
  return (
    <div className="group relative z-50 overflow-hidden border-b border-white/5 bg-ink text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-light/90 sm:text-[11px]">
      <div className="marquee py-2" style={{ "--marquee-duration": "45s" } as React.CSSProperties} aria-hidden>
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {row.map((m, i) => (
              <span key={`${k}-${i}`} className="flex items-center whitespace-nowrap px-6">
                {m}
                <span className="ml-12 text-gold/50">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="sr-only">{MESSAGES.join(". ")}</p>
    </div>
  );
}
