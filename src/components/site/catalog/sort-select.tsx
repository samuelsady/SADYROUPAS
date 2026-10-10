"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const SORT_OPTIONS = [
  { value: "destaques", label: "Destaques" },
  { value: "novidades", label: "Novidades" },
  { value: "a-z", label: "Nome: A–Z" },
  { value: "z-a", label: "Nome: Z–A" },
];

/** Ordenação: troca o parâmetro "ordem" mantendo os demais filtros. */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      <span className="hidden sm:inline">Ordenar</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "destaques") next.delete("ordem");
          else next.set("ordem", e.target.value);
          router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
        }}
        className="h-11 cursor-pointer rounded-full border border-ink/15 bg-white px-4 text-xs font-bold uppercase tracking-[0.12em] text-ink focus:border-gold focus:outline-none"
        aria-label="Ordenar"
      >
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
