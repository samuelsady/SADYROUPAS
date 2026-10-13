"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Loader2, XCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { useOpenDays, useSlots } from "@/hooks/use-availability";
import { toast } from "@/lib/toast";
import { cn } from "@/utils/cn";
import { formatDateKey, monthName, weekdayName, weekdayOfKey } from "@/utils/datetime";

/** Autoatendimento do cliente: remarcar ou cancelar pelo link da confirmação. */
export function ManageAppointment({ token, serviceId, cutoffHours }: { token: string; serviceId: string; cutoffHours: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reschedule" | "cancel">("idle");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const days = useOpenDays(mode === "reschedule" ? serviceId : null, refreshKey);
  const slots = useSlots(mode === "reschedule" ? serviceId : null, date, { refreshKey });

  async function post(path: string, body: unknown) {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/appointments/${token}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          setTime(null);
          setRefreshKey((k) => k + 1);
        }
        throw new Error(json.error ?? "Não foi possível concluir.");
      }
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível concluir.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function reschedule() {
    if (!date || !time) return;
    if (await post("reschedule", { date, time })) {
      toast(`Remarcado para ${formatDateKey(date)} às ${time}. Enviamos a confirmação no WhatsApp.`);
      setMode("idle");
      setDate(null);
      setTime(null);
      router.refresh();
    }
  }

  async function cancel() {
    if (await post("cancel", { reason })) {
      toast("Agendamento cancelado. Esperamos você em outra ocasião!", "info");
      setMode("idle");
      router.refresh();
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-line bg-ivory/60 p-5 text-left">
      <p className="text-sm font-semibold">Precisa mudar algo?</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Você pode remarcar ou cancelar por aqui até {cutoffHours}h antes do horário.</p>
      {mode === "idle" && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setMode("reschedule")} className={buttonClass("outline", "md")}><CalendarClock className="h-4 w-4" /> Remarcar</button>
          <button type="button" onClick={() => setMode("cancel")} className={buttonClass("danger-outline", "md")}><XCircle className="h-4 w-4" /> Cancelar</button>
        </div>
      )}

      {mode === "reschedule" && (
        <div className="mt-4 animate-fade-up space-y-4">
          {days.loading ? (
            <div className="flex gap-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-20 w-16 rounded-lg" />)}</div>
          ) : (
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:thin]">
              {days.days.map((d) => {
                const disabled = d.available === 0;
                const [, m, day] = d.date.split("-").map(Number);
                return (
                  <button key={d.date} type="button" disabled={disabled} onClick={() => { setDate(d.date); setTime(null); }} aria-pressed={date === d.date} aria-label={`${weekdayName(weekdayOfKey(d.date))}, ${formatDateKey(d.date)}`}
                    className={cn("flex min-w-[4rem] flex-col items-center rounded-lg border py-2.5 transition", date === d.date ? "border-ink bg-ink text-ivory" : disabled ? "border-line bg-sand/40 text-muted-foreground/50" : "border-line bg-white hover:border-ink/40")}>
                    <span className="text-[10px] font-semibold uppercase opacity-70">{weekdayName(weekdayOfKey(d.date), true)}</span>
                    <span className="font-display text-xl leading-tight">{day}</span>
                    <span className="text-[10px] uppercase opacity-70">{monthName(m!).slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {date && (slots.loading ? (
            <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-10 rounded-md" />)}</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.slots.filter((s) => s.available).map((s) => (
                <button key={s.time} type="button" onClick={() => setTime(s.time)} aria-pressed={time === s.time} className={cn("h-10 rounded-md border text-sm font-semibold transition active:scale-95", time === s.time ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink/40")}>{s.time}</button>
              ))}
              {slots.slots.every((s) => !s.available) && <p className="col-span-4 text-sm text-muted-foreground">Sem horários livres nesta data.</p>}
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("idle")} className={buttonClass("ghost", "md")}>Voltar</button>
            <button type="button" onClick={reschedule} disabled={!time || busy} className={buttonClass("primary", "md", "flex-1")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirmar novo horário</button>
          </div>
        </div>
      )}

      {mode === "cancel" && (
        <div className="mt-4 animate-fade-up space-y-3">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" maxLength={300} rows={2} aria-label="Motivo do cancelamento" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("idle")} className={buttonClass("ghost", "md")}>Voltar</button>
            <button type="button" onClick={cancel} disabled={busy} className={buttonClass("danger", "md", "flex-1")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirmar cancelamento</button>
          </div>
        </div>
      )}
    </div>
  );
}
