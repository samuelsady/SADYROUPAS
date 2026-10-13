"use client";

import Link from "next/link";
import { useState } from "react";
import type { InventoryStatus } from "@prisma/client";
import { MapPin, X } from "lucide-react";
import { bulkInventoryAction, quickStatusAction } from "@/app/admin/(panel)/_actions/inventory";
import { Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm, withToast } from "@/hooks/use-action-form";
import { inventoryStatusLabel, inventoryStatusTone, V1_INVENTORY_STATUSES } from "@/lib/labels";
import { cn } from "@/utils/cn";

type Row = { id: string; code: string; size: string; color: string; status: InventoryStatus; location: string | null; rentalCount: number; product: { id: string; name: string; category: string } };

const toneClass: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200",
  gold: "bg-[#f6eedf] text-gold-dark border-gold/30",
  red: "bg-red-50 text-red-800 border-red-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  purple: "bg-violet-50 text-violet-800 border-violet-200",
  gray: "bg-stone-100 text-stone-600 border-stone-200",
  neutral: "bg-white border-line",
};

/** Status que muda direto na linha (envia ao trocar a opção). */
function QuickStatus({ code, status }: { code: string; status: InventoryStatus }) {
  const { pending, onSubmit } = useActionForm(quickStatusAction, {});
  const options = V1_INVENTORY_STATUSES.includes(status) ? V1_INVENTORY_STATUSES : [status, ...V1_INVENTORY_STATUSES];
  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="code" value={code} />
      <select
        name="status"
        defaultValue={status}
        key={status}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label={`Status de ${code}`}
        className={cn("h-8 cursor-pointer rounded-full border px-2.5 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-50", toneClass[inventoryStatusTone[status]])}
      >
        {options.map((s) => <option key={s} value={s}>{inventoryStatusLabel[s]}</option>)}
      </select>
    </form>
  );
}

export function InventoryTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { pending, onSubmit } = useActionForm(async (prev, fd) => {
    const r = await withToast(bulkInventoryAction)(prev, fd);
    if (r?.ok) setSelected(new Set());
    return r;
  });
  const all = rows.length > 0 && rows.every((r) => selected.has(r.code));
  const toggle = (code: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(code)) n.delete(code);
    else n.add(code);
    return n;
  });

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ivory/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="w-10 px-4 py-2.5"><input type="checkbox" checked={all} onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.code)))} aria-label="Selecionar todas" className="h-4 w-4 accent-[var(--color-gold-dark)]" /></th>
              <th className="px-4 py-2.5">Código</th>
              <th className="px-4 py-2.5">Produto</th>
              <th className="px-4 py-2.5">Tam.</th>
              <th className="px-4 py-2.5">Cor</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Localização</th>
              <th className="px-4 py-2.5 text-right">Locações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className={cn("border-b border-line/70 transition-colors", selected.has(i.code) ? "bg-[#fbf6ec]" : "hover:bg-ivory/50")}>
                <td className="px-4 py-2.5"><input type="checkbox" checked={selected.has(i.code)} onChange={() => toggle(i.code)} aria-label={`Selecionar ${i.code}`} className="h-4 w-4 accent-[var(--color-gold-dark)]" /></td>
                <td className="px-4 py-2.5"><Link href={`/admin/estoque/${i.code}`} className="whitespace-nowrap font-mono text-xs font-semibold hover:text-gold-dark">{i.code}</Link></td>
                <td className="px-4 py-2.5"><Link href={`/admin/catalogo/${i.product.id}`} className="hover:text-gold-dark">{i.product.name}</Link><span className="block text-[11px] text-muted-foreground">{i.product.category}</span></td>
                <td className="px-4 py-2.5 font-semibold">{i.size}</td>
                <td className="px-4 py-2.5 text-xs">{i.color}</td>
                <td className="px-4 py-2.5"><QuickStatus code={i.code} status={i.status} /></td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{i.location ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{i.rentalCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <form onSubmit={onSubmit} className="toast-in fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-3xl flex-col gap-2 rounded-xl bg-ink p-3 text-ivory shadow-2xl sm:flex-row sm:items-center lg:left-60">
          {[...selected].map((c) => <input key={c} type="hidden" name="codes" value={c} />)}
          <div className="flex items-center justify-between gap-2 px-1 sm:justify-start">
            <span className="text-sm font-semibold">{selected.size} selecionada(s)</span>
            <button type="button" onClick={() => setSelected(new Set())} className="rounded p-1 text-ivory/60 hover:text-ivory" aria-label="Limpar seleção"><X className="h-4 w-4" /></button>
          </div>
          <Select name="status" defaultValue="" aria-label="Novo status" className="h-10 flex-1 border-white/10 bg-ink-3 text-ivory">
            <option value="">Manter status</option>
            {V1_INVENTORY_STATUSES.map((s) => <option key={s} value={s}>{inventoryStatusLabel[s]}</option>)}
          </Select>
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ivory/40" />
            <Input name="location" placeholder="Nova localização" maxLength={80} className="h-10 border-white/10 bg-ink-3 pl-9 text-ivory placeholder:text-ivory/40" />
          </div>
          <SubmitButton pending={pending} variant="gold" size="md">Aplicar</SubmitButton>
        </form>
      )}
    </>
  );
}
