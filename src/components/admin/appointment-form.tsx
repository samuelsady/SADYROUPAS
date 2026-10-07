"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { Field, FormAlert, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useSlots } from "@/hooks/use-availability";
import { useActionForm } from "@/hooks/use-action-form";
import { cn } from "@/utils/cn";
import { formatPhone } from "@/utils/phone";

type Option = { id: string; name: string };
type CustomerLite = { id: string; name: string; whatsapp: string; email: string | null };

function CustomerPicker({ initial }: { initial?: CustomerLite | null }) {
  const [mode, setMode] = useState<"search" | "new">("search");
  const [selected, setSelected] = useState<CustomerLite | null>(initial ?? null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CustomerLite[]>([]);
  const [loading, setLoading] = useState(false);

  const searching = q.trim().length >= 2;
  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = await res.json();
        setResults(json.customers ?? []);
      } catch {
        /* busca cancelada */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-gold/40 bg-[#fbf6ec] px-4 py-3">
        <input type="hidden" name="customerId" value={selected.id} />
        <div>
          <p className="font-semibold">{selected.name}</p>
          <p className="text-xs text-muted">{formatPhone(selected.whatsapp)}{selected.email ? ` · ${selected.email}` : ""}</p>
        </div>
        <button type="button" onClick={() => setSelected(null)} className="rounded p-1 text-muted hover:text-ink" aria-label="Trocar cliente"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-md border border-line p-0.5 text-xs font-semibold">
        <button type="button" onClick={() => setMode("search")} className={cn("flex-1 rounded px-3 py-2", mode === "search" ? "bg-ink text-ivory" : "text-muted")}>Cliente existente</button>
        <button type="button" onClick={() => setMode("new")} className={cn("flex-1 rounded px-3 py-2", mode === "new" ? "bg-ink text-ivory" : "text-muted")}>Novo cliente</button>
      </div>
      {mode === "search" ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou WhatsApp…" className="pl-9" aria-label="Buscar cliente" />
          {loading && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted" />}
          {searching && results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-white shadow-lg">
              {(searching ? results : []).map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setSelected(c)} className="flex w-full justify-between px-3 py-2.5 text-left text-sm hover:bg-ivory">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted">{formatPhone(c.whatsapp)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="mt-2 text-xs text-muted">Nenhum cliente encontrado. <button type="button" className="font-semibold text-gold-dark" onClick={() => setMode("new")}>Cadastrar novo</button></p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo" required className="sm:col-span-2"><Input name="name" required minLength={3} maxLength={120} /></Field>
          <Field label="WhatsApp" required><Input name="whatsapp" type="tel" required placeholder="(86) 99999-0000" /></Field>
          <Field label="E-mail"><Input name="email" type="email" /></Field>
          <p className="flex items-center gap-1.5 text-xs text-muted sm:col-span-2"><UserPlus className="h-3.5 w-3.5" /> Se o WhatsApp já existir, o cadastro é atualizado.</p>
        </div>
      )}
    </div>
  );
}

export function AppointmentForm({
  action, services, products, initial, mode, appointmentId, initialCustomer,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  services: (Option & { durationMin: number | null })[];
  products: Option[];
  initial: { serviceId?: string; date?: string; time?: string; notes?: string | null; internalNotes?: string | null; productId?: string | null; source?: string };
  mode: "create" | "edit";
  appointmentId?: string;
  initialCustomer?: CustomerLite | null;
}) {
  // Após um conflito (horário ocupado por outra pessoa), recarrega os horários
  const [refreshKey, setRefreshKey] = useState(0);
  const { state, pending, onSubmit } = useActionForm(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result && !result.ok) setRefreshKey((k) => k + 1);
    return result;
  });
  const [serviceId, setServiceId] = useState(initial.serviceId ?? services[0]?.id ?? "");
  const [date, setDate] = useState(initial.date ?? "");
  const [time, setTime] = useState(initial.time ?? "");
  const slots = useSlots(serviceId || null, date || null, { admin: true, ignoreId: appointmentId, refreshKey });

  // Mantém o horário inicial visível mesmo antes de carregar os horários
  const slotList = slots.slots.length ? slots.slots : time ? [{ time, available: true }] : [];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {mode === "create" && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">1. Cliente</h2>
          <CustomerPicker initial={initialCustomer} />
        </section>
      )}
      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-sm font-semibold sm:col-span-2">{mode === "create" ? "2. Serviço, data e horário" : "Serviço, data e horário"}</h2>
        <Field label="Serviço" required>
          <Select name="serviceId" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTime(""); }} required>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}{s.durationMin ? ` (${s.durationMin} min)` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Data" required>
          <Input type="date" name="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} required />
        </Field>
        <div className="sm:col-span-2">
          <input type="hidden" name="time" value={time} />
          <p className="mb-2 text-[13px] font-semibold text-ink/80">Horário <span className="text-gold-dark">*</span></p>
          {!date ? (
            <p className="text-sm text-muted">Escolha uma data para ver os horários.</p>
          ) : slots.loading ? (
            <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando horários…</p>
          ) : slotList.length === 0 ? (
            <p className="text-sm text-muted">Loja fechada ou sem horários nesta data.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              {slotList.map((s) => (
                <button key={s.time} type="button" disabled={!s.available} onClick={() => setTime(s.time)} aria-pressed={time === s.time}
                  className={cn("h-10 rounded-md border font-mono text-xs font-semibold", time === s.time ? "border-ink bg-ink text-ivory" : s.available ? "border-line bg-white hover:border-ink/40" : "border-transparent bg-sand/50 text-muted/40 line-through")}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {mode === "create" && (
          <Field label="Origem do contato">
            <Select name="source" defaultValue={initial.source ?? "WHATSAPP"}>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PHONE">Telefone</option>
              <option value="WALK_IN">Balcão</option>
              <option value="ADMIN">Outro</option>
            </Select>
          </Field>
        )}
        <Field label="Peça de interesse">
          <Select name="productId" defaultValue={initial.productId ?? ""}>
            <option value="">—</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Observações (aparece no comprovante)" className="sm:col-span-2"><Textarea name="notes" defaultValue={initial.notes ?? ""} maxLength={1000} rows={2} /></Field>
        <Field label="Observações internas" hint="Visível apenas para a equipe." className="sm:col-span-2"><Textarea name="internalNotes" defaultValue={initial.internalNotes ?? ""} maxLength={1000} rows={2} /></Field>
      </section>
      <FormAlert state={state} />
      <div className="flex justify-end">
        <SubmitButton pending={pending} size="lg" disabled={!time} pendingText="Salvando…">{mode === "create" ? "Salvar agendamento" : "Salvar alterações"}</SubmitButton>
      </div>
    </form>
  );
}
