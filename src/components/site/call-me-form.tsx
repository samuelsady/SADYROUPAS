"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import type { FittingEntry } from "@/hooks/use-fitting-list";
import { maskPhoneInput } from "@/utils/phone";

/**
 * "Quero que a loja me chame": a pessoa deixa nome e WhatsApp com a lista de
 * provas, sem marcar horário. Vira um interessado no painel da loja.
 */
export function CallMeForm({ items }: { items: FittingEntry[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", whatsapp: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError(null);
    setState("sending");
    try {
      const company = (ev.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value ?? "";
      const res = await fetch("/api/public/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: items.map((i) => ({ slug: i.slug, size: i.size })), company }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Não foi possível enviar. Tente de novo.");
      setState("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar. Tente de novo.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Pronto! A Sady recebeu sua lista e vai te chamar no WhatsApp.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-ink/15 text-sm font-semibold text-ink transition hover:border-ink">
        <MessageCircle className="h-4 w-4 text-gold-dark" /> Quero que a loja me chame
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2.5 rounded-md border border-line bg-white p-3" noValidate>
      <p className="text-xs text-muted-foreground">Deixe seu contato: a loja te chama no WhatsApp para combinar a prova.</p>
      <input required autoComplete="name" placeholder="Seu nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-gold" aria-label="Nome" />
      <input required type="tel" inputMode="tel" autoComplete="tel-national" placeholder="WhatsApp (86) 99999-0000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhoneInput(e.target.value) })} className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-gold" aria-label="WhatsApp" />
      <input placeholder="Data do evento ou recado (opcional)" maxLength={500} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-gold" aria-label="Recado" />
      {/* Honeypot anti-robô */}
      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error && <p className="text-xs font-medium text-red-700" role="alert">{error}</p>}
      <button disabled={state === "sending"} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gold text-sm font-bold text-ink transition hover:bg-gold-light disabled:opacity-60">
        {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />} Enviar meu contato
      </button>
    </form>
  );
}
