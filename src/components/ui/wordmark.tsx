import { cn } from "@/utils/cn";

/** Logotipo tipográfico (o "Y" dourado do logo oficial). Funciona em fundo claro e escuro. */
export function Wordmark({ className, tone = "dark", compact }: { className?: string; tone?: "dark" | "light"; compact?: boolean }) {
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", tone === "light" ? "text-ivory" : "text-ink", className)} aria-label="Sady Roupas">
      <span className="font-display text-[1.65em] font-medium tracking-[0.04em]" aria-hidden>
        SAD<span className="text-gold">Y</span>
      </span>
      {!compact && (
        <span className="mt-[0.15em] font-sans text-[0.42em] font-semibold tracking-[0.55em] pl-[0.55em]" aria-hidden>
          ROUPAS
        </span>
      )}
    </span>
  );
}
