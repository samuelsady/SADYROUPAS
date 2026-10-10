/** Letreiro duplo em movimento com as categorias da loja. */
export function MarqueeBand({ words }: { words: string[] }) {
  const row = (outline: boolean) =>
    [0, 1].map((k) => (
      <div key={k} className="flex shrink-0 items-center" aria-hidden>
        {words.map((w, i) => (
          <span key={`${k}-${i}`} className="flex items-center">
            <span className={outline ? "text-outline" : "text-ivory"}>{w}</span>
            <span className="mx-8 text-2xl text-gold sm:mx-12">✦</span>
          </span>
        ))}
      </div>
    ));
  return (
    <section className="aura grain overflow-hidden py-10 sm:py-14" aria-label={words.join(", ")}>
      <div className="group space-y-2 font-display text-[clamp(2.6rem,8vw,6.5rem)] font-medium uppercase leading-none tracking-[-0.01em]">
        <div className="marquee" style={{ "--marquee-duration": "48s" } as React.CSSProperties}>{row(false)}</div>
        <div className="marquee marquee-reverse" style={{ "--marquee-duration": "56s" } as React.CSSProperties}>{row(true)}</div>
      </div>
    </section>
  );
}
