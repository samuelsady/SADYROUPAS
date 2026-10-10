"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Search, Store, Truck, X } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { CustomerPicker } from "@/components/admin/appointment-form";
import { Field, FormAlert, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { cn } from "@/lib/utils";
import { addDaysKey } from "@/utils/datetime";

type Piece = { code: string; size: string; color: string; status: string; location: string | null; product: { name: string } };
type CustomerLite = { id: string; name: string; whatsapp: string; email: string | null };

export function RentalForm({
  action, initialCustomer, appointmentId, initialPieces, defaultDays, today,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initialCustomer?: CustomerLite | null;
  appointmentId?: string | null;
  initialPieces: Piece[];
  defaultDays: number;
  today: string;
}) {
  const { state, pending, onSubmit } = useActionForm(action, { errors: false });
  const [pickup, setPickup] = useState(today);
  const [due, setDue] = useState(addDaysKey(today, defaultDays));
  const [delivery, setDelivery] = useState<"STORE_PICKUP" | "DELIVERY">("STORE_PICKUP");
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/inventory/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setResults((await res.json()).pieces ?? []);
      } catch {
        /* cancelada */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const add = (p: Piece) => {
    if (!pieces.some((x) => x.code === p.code)) setPieces([...pieces, p]);
    setQ("");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {appointmentId && <input type="hidden" name="appointmentId" value={appointmentId} />}
      <section>
        <h2 className="mb-3 text-sm font-semibold">1. Cliente</h2>
        <CustomerPicker initial={initialCustomer} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-sm font-semibold sm:col-span-2">2. Evento e datas</h2>
        <Field label="Evento"><Input name="eventName" placeholder="Casamento, formatura…" maxLength={120} /></Field>
        <Field label="Data do evento"><Input type="date" name="eventDate" /></Field>
        <Field label="Retirada / entrega" required>
          <Input type="date" name="pickupDate" value={pickup} onChange={(e) => { setPickup(e.target.value); if (e.target.value) setDue(addDaysKey(e.target.value, defaultDays)); }} required />
        </Field>
        <Field label="Devolução prevista" required hint={`Padrão: ${defaultDays} dias após a retirada`}>
          <Input type="date" name="returnDueDate" value={due} min={pickup} onChange={(e) => setDue(e.target.value)} required />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">3. Entrega</h2>
        <input type="hidden" name="deliveryMethod" value={delivery} />
        <div className="grid gap-2 sm:grid-cols-2">
          {([["STORE_PICKUP", "Retirada na loja", Store], ["DELIVERY", "Entrega no endereço", Truck]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" onClick={() => setDelivery(v)} aria-pressed={delivery === v} className={cn("flex items-center gap-3 rounded-lg border p-4 text-left text-sm font-semibold transition", delivery === v ? "border-gold bg-[#fbf6ec] ring-1 ring-gold" : "border-line bg-white hover:border-ink/30")}>
              <Icon className="h-5 w-5 text-gold-dark" /> {label}
            </button>
          ))}
        </div>
        {delivery === "DELIVERY" && <Field label="Endereço de entrega" required><Input name="deliveryAddress" maxLength={300} placeholder="Rua, número, bairro, referência" /></Field>}
        <Field label="Observações de entrega/retirada"><Input name="deliveryNotes" maxLength={300} placeholder="Ex.: entregar às 15h, falar com Maria" /></Field>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">4. Peças ({pieces.length})</h2>
        {pieces.map((p) => <input key={p.code} type="hidden" name="itemCodes" value={p.code} />)}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código da peça (TER-PRE-050…) ou nome do produto" className="pl-9" aria-label="Buscar peça" />
          {loading && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />}
          {q.trim().length >= 2 && results.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-line bg-white shadow-lg">
              {results.map((p) => (
                <li key={p.code}>
                  <button type="button" onClick={() => add(p)} disabled={pieces.some((x) => x.code === p.code)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-ivory disabled:opacity-40">
                    <span><span className="font-mono text-xs font-semibold">{p.code}</span> · {p.product.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">Tam. {p.size}{p.status === "RESERVED" && <span className="rounded bg-sky-50 px-1.5 text-sky-800">reservada</span>}<Plus className="h-3.5 w-3.5" /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {pieces.length > 0 ? (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white">
            {pieces.map((p) => (
              <li key={p.code} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span><span className="font-mono text-xs font-semibold">{p.code}</span> · {p.product.name} · tam. {p.size}{p.location ? <span className="text-xs text-muted-foreground"> · {p.location}</span> : null}</span>
                <button type="button" onClick={() => setPieces(pieces.filter((x) => x.code !== p.code))} className="rounded p-1 text-muted-foreground hover:text-red-700" aria-label={`Remover ${p.code}`}><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Busque e adicione as peças físicas (paletó, calça, camisa, acessórios…).</p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <h2 className="text-sm font-semibold sm:col-span-4">5. Valores</h2>
        <Field label="Total (R$)"><Input name="total" type="number" step="0.01" min={0} defaultValue={0} /></Field>
        <Field label="Desconto (R$)"><Input name="discount" type="number" step="0.01" min={0} defaultValue={0} /></Field>
        <Field label="Pago agora (R$)"><Input name="paidNow" type="number" step="0.01" min={0} defaultValue={0} /></Field>
        <Field label="Forma">
          <Select name="paymentMethod" defaultValue="PIX">
            <option value="PIX">PIX</option><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option><option value="TRANSFER">Transferência</option>
          </Select>
        </Field>
        <Field label="Observações" className="sm:col-span-4"><Textarea name="notes" rows={2} maxLength={1000} /></Field>
      </section>

      {state && !state.ok && <FormAlert state={state} />}
      <div className="flex justify-end">
        <SubmitButton pending={pending} size="lg" disabled={pieces.length === 0} pendingText="Salvando…">Criar locação</SubmitButton>
      </div>
    </form>
  );
}
