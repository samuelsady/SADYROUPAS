"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { useOpenDays, useSlots } from "@/hooks/use-availability";
import { cn } from "@/utils/cn";
import { formatDateKey, monthName, weekdayName, weekdayOfKey } from "@/utils/datetime";

type ServiceOption = { id: string; name: string; description: string | null };

function StepTitle({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold", done ? "bg-gold text-ink" : "bg-ink text-ivory")}>{done ? <Check className="h-4 w-4" /> : n}</span>
      <h2 className="display text-2xl sm:text-[1.7rem]">{title}</h2>
    </div>
  );
}

function maskPhoneInput(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function BookingForm({ services, product, initialServiceId }: { services: ServiceOption[]; product: { slug: string; name: string } | null; initialServiceId?: string }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId ?? (services.length === 1 ? services[0]!.id : null));
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useOpenDays(serviceId, refreshKey);
  const slots = useSlots(serviceId, date, { refreshKey });

  const selectService = (id: string) => {
    setServiceId(id);
    setDate(null);
    setTime(null);
  };

  // Validação no frontend (o backend valida tudo de novo)
  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = "Informe o nome completo.";
    const digits = form.whatsapp.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) e.whatsapp = "Informe DDD + número.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError(null);
    if (!serviceId || !date || !time) return setError("Escolha o serviço, a data e o horário.");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const honeypot = (ev.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value ?? "";
      const res = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, serviceId, date, time, productSlug: product?.slug, company: honeypot }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          setTime(null);
          setRefreshKey((k) => k + 1);
        }
        if (json.issues) setErrors(Object.fromEntries(json.issues.map((i: { path: string; message: string }) => [i.path, i.message])));
        throw new Error(json.error ?? "Não foi possível concluir o agendamento.");
      }
      router.push(`/agendamento/confirmado/${json.token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir o agendamento.");
      setSubmitting(false);
    }
  }

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <form onSubmit={submit} className="space-y-10" noValidate>
      {product && (
        <div className="rounded-lg border border-gold/30 bg-[#f8f1e4] px-4 py-3 text-sm">
          Peça de interesse: <strong>{product.name}</strong>
        </div>
      )}

      <section>
        <StepTitle n={1} title="Escolha o serviço" done={Boolean(serviceId)} />
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button key={s.id} type="button" onClick={() => selectService(s.id)} aria-pressed={serviceId === s.id} className={cn("rounded-lg border p-4 text-left transition", serviceId === s.id ? "border-gold bg-[#fbf6ec] ring-1 ring-gold" : "border-line bg-white hover:border-ink/30")}>
              <span className="block font-semibold">{s.name}</span>
              {s.description && <span className="mt-1 block text-xs text-muted">{s.description}</span>}
            </button>
          ))}
        </div>
      </section>

      {serviceId && (
        <section className="animate-fade-up">
          <StepTitle n={2} title="Escolha a data" done={Boolean(date)} />
          {days.loading ? (
            <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando datas…</p>
          ) : days.error ? (
            <p className="text-sm text-red-700">{days.error}</p>
          ) : (
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
              {days.days.map((d) => {
                const disabled = d.available === 0;
                const [, m, day] = d.date.split("-").map(Number);
                return (
                  <button key={d.date} type="button" disabled={disabled} onClick={() => { setDate(d.date); setTime(null); }} aria-pressed={date === d.date} aria-label={`${weekdayName(weekdayOfKey(d.date))}, ${formatDateKey(d.date)}${disabled ? " — sem horários" : ""}`}
                    className={cn("flex min-w-[4.25rem] flex-col items-center rounded-lg border py-3 transition", date === d.date ? "border-ink bg-ink text-ivory" : disabled ? "border-line bg-sand/40 text-muted/50" : "border-line bg-white hover:border-ink/40")}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{weekdayName(weekdayOfKey(d.date), true)}</span>
                    <span className="font-display text-2xl leading-tight">{day}</span>
                    <span className="text-[10px] uppercase opacity-70">{monthName(m!).slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {serviceId && date && (
        <section className="animate-fade-up">
          <StepTitle n={3} title="Escolha o horário" done={Boolean(time)} />
          {slots.loading ? (
            <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando horários…</p>
          ) : slots.slots.filter((s) => s.available).length === 0 ? (
            <p className="text-sm text-muted">Não há horários livres nesta data. Escolha outro dia.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {slots.slots.map((s) => (
                <button key={s.time} type="button" disabled={!s.available} onClick={() => setTime(s.time)} aria-pressed={time === s.time}
                  className={cn("h-12 rounded-md border text-sm font-semibold transition", time === s.time ? "border-ink bg-ink text-ivory" : s.available ? "border-line bg-white hover:border-ink/40" : "border-transparent bg-sand/40 text-muted/40 line-through")}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {serviceId && date && time && (
        <section className="animate-fade-up">
          <StepTitle n={4} title="Seus dados" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" htmlFor="name" required error={errors.name} className="sm:col-span-2">
              <Input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={Boolean(errors.name)} maxLength={120} />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp" required error={errors.whatsapp} hint="Enviaremos a confirmação por WhatsApp.">
              <Input id="whatsapp" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(86) 99999-0000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhoneInput(e.target.value) })} aria-invalid={Boolean(errors.whatsapp)} />
            </Field>
            <Field label="E-mail (opcional)" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={Boolean(errors.email)} maxLength={160} />
            </Field>
            <Field label="Observações (opcional)" htmlFor="notes" className="sm:col-span-2" hint="Ex.: tipo de evento, data do evento, tamanho que costuma usar.">
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} rows={3} />
            </Field>
            {/* honeypot anti-robô: invisível para pessoas */}
            <div className="hidden" aria-hidden>
              <label>Empresa<input name="company" tabIndex={-1} autoComplete="off" /></label>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-ivory p-5 text-sm">
            <p className="font-semibold">Resumo</p>
            <p className="mt-1 text-muted">
              {selectedService?.name} — {weekdayName(weekdayOfKey(date))}, {formatDateKey(date)} às {time}
            </p>
          </div>

          {error && <div role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

          <button type="submit" disabled={submitting} className={buttonClass("primary", "xl", "mt-6 w-full")}>
            {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Confirmando…</> : "Confirmar agendamento"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">Seus dados são usados apenas para este atendimento.</p>
        </section>
      )}
    </form>
  );
}
