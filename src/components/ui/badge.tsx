import type { Tone } from "@/lib/labels";
import { cn } from "@/utils/cn";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink/80 ring-ink/10",
  gold: "bg-[#f6eedf] text-gold-dark ring-gold/30",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  blue: "bg-sky-50 text-sky-800 ring-sky-600/20",
  red: "bg-red-50 text-red-800 ring-red-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  gray: "bg-stone-100 text-stone-600 ring-stone-500/20",
  purple: "bg-violet-50 text-violet-800 ring-violet-600/20",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
