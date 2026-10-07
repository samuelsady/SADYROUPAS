import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Shirt } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { AppointmentStatusBadge } from "@/components/admin/status-badges";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { appointmentStatusTone } from "@/lib/labels";
import { AppointmentService } from "@/services/appointment.service";
import { AvailabilityService } from "@/services/availability/availability.service";
import { SettingsService } from "@/services/settings.service";
import {
  addDaysKey, addMonthsKey, dayRangeUtc, formatDateKey, formatLongDateKey, isDateKey, monthName, startOfMonthKey, startOfWeekKey, toDateKey, todayKey, toTimeKey, weekdayName, weekdayOfKey,
} from "@/utils/datetime";
import { cn } from "@/utils/cn";

export const metadata: Metadata = { title: "Agenda" };

type View = "day" | "week" | "month";
const toneBorder: Record<string, string> = { blue: "border-l-sky-500", green: "border-l-emerald-500", gray: "border-l-stone-400", red: "border-l-red-400", amber: "border-l-amber-500" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  await requirePageUser("appointments.manage");
  const sp = await searchParams;
  const settings = await SettingsService.get();
  const tz = settings.timezone;
  const today = todayKey(tz);
  const view: View = sp.view === "week" || sp.view === "month" ? sp.view : "day";
  const date = sp.date && isDateKey(sp.date) ? sp.date : today;

  let rangeStart: string, rangeEndExclusive: string, prev: string, next: string, title: string;
  if (view === "day") {
    rangeStart = date;
    rangeEndExclusive = addDaysKey(date, 1);
    prev = addDaysKey(date, -1);
    next = addDaysKey(date, 1);
    title = formatLongDateKey(date);
  } else if (view === "week") {
    rangeStart = startOfWeekKey(date);
    rangeEndExclusive = addDaysKey(rangeStart, 7);
    prev = addDaysKey(rangeStart, -7);
    next = addDaysKey(rangeStart, 7);
    title = `${formatDateKey(rangeStart).slice(0, 5)} – ${formatDateKey(addDaysKey(rangeStart, 6))}`;
  } else {
    const m = startOfMonthKey(date);
    rangeStart = startOfWeekKey(m);
    rangeEndExclusive = addDaysKey(startOfWeekKey(addDaysKey(addMonthsKey(m, 1), -1)), 7);
    prev = addMonthsKey(m, -1);
    next = addMonthsKey(m, 1);
    title = `${monthName(Number(m.slice(5, 7)))} de ${m.slice(0, 4)}`;
  }

  const appointments = await AppointmentService.listRange(dayRangeUtc(rangeStart, tz).start, dayRangeUtc(rangeEndExclusive, tz).start);
  const byDay = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const k = toDateKey(a.startsAt, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }

  // Visão diária: mostra também os horários livres da grade
  const defaultService = view === "day" ? await db.service.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" } }) : null;
  const freeSlots = defaultService ? (await AvailabilityService.slotsForDay(date, defaultService, { staff: true })).filter((s) => s.available) : [];

  const link = (v: View, d: string) => `/admin/agenda?view=${v}&date=${d}`;

  return (
    <>
      <PageHeader title="Agenda" description="Atendimentos por dia, semana e mês." actions={<LinkButton href={`/admin/agendamentos/novo?date=${date}`}><Plus className="h-4 w-4" /> Novo agendamento</LinkButton>} />

      <Card className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <Link href={link(view, prev)} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-ivory" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Link>
          <Link href={link(view, today)} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-ivory">Hoje</Link>
          <Link href={link(view, next)} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-ivory" aria-label="Próximo"><ChevronRight className="h-4 w-4" /></Link>
          <h2 className="ml-2 text-sm font-semibold capitalize">{title}</h2>
        </div>
        <div className="flex rounded-md border border-line p-0.5 text-xs font-semibold" role="tablist">
          {(["day", "week", "month"] as View[]).map((v) => (
            <Link key={v} href={link(v, date)} role="tab" aria-selected={view === v} className={cn("rounded px-3 py-1.5", view === v ? "bg-ink text-ivory" : "text-muted hover:text-ink")}>
              {{ day: "Dia", week: "Semana", month: "Mês" }[v]}
            </Link>
          ))}
        </div>
      </Card>

      {view === "day" && (
        <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_260px]">
          <Card>
            {appointments.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">Nenhum atendimento neste dia.</p>
            ) : (
              <ul className="divide-y divide-line">
                {appointments.map((a) => (
                  <li key={a.id} className={cn("flex flex-col gap-3 border-l-4 px-5 py-4 sm:flex-row sm:items-center", toneBorder[appointmentStatusTone[a.status]])}>
                    <Link href={`/admin/agendamentos/${a.id}`} className="flex flex-1 items-start gap-4">
                      <span className="w-14 shrink-0 font-mono text-base font-semibold tabular-nums">{toTimeKey(a.startsAt, tz)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold">{a.customer.name}</p>
                        <p className="text-xs text-muted">{a.service.name} · até {toTimeKey(a.endsAt, tz)}</p>
                        {a.items.length > 0 && (
                          <p className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", a.items.every((i) => i.inventoryItemId) ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>
                            <Shirt className="h-3 w-3" /> {a.items.filter((i) => i.inventoryItemId).length}/{a.items.length} peças separadas
                          </p>
                        )}
                        {a.notes && <p className="mt-1 text-xs text-ink/70">“{a.notes}”</p>}
                      </div>
                    </Link>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <AppointmentStatusBadge status={a.status} />
                      <AppointmentActions id={a.id} status={a.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="h-fit p-4">
            <p className="text-sm font-semibold">Horários livres</p>
            <p className="mb-3 text-xs text-muted">Clique para agendar ({defaultService?.name ?? "serviço padrão"}).</p>
            {freeSlots.length === 0 ? (
              <p className="text-xs text-muted">Sem horários livres (loja fechada ou agenda cheia).</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {freeSlots.map((s) => (
                  <Link key={s.time} href={`/admin/agendamentos/novo?date=${date}&time=${s.time}`} className="rounded-md border border-line py-1.5 text-center font-mono text-xs font-semibold hover:border-gold hover:bg-[#fbf6ec]">
                    {s.time}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {view === "week" && (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDaysKey(rangeStart, i)).map((d) => {
            const list = byDay.get(d) ?? [];
            return (
              <Card key={d} className={cn("min-h-40 p-2", d === today && "ring-2 ring-gold/50")}>
                <Link href={link("day", d)} className="mb-2 flex items-baseline justify-between px-1 hover:text-gold-dark">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{weekdayName(weekdayOfKey(d), true)}</span>
                  <span className="text-lg font-semibold">{Number(d.slice(8))}</span>
                </Link>
                <ul className="space-y-1.5">
                  {list.map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/agendamentos/${a.id}`} className={cn("block rounded-md border-l-4 bg-ivory/70 px-2 py-1.5 text-xs hover:bg-ivory", toneBorder[appointmentStatusTone[a.status]], a.status === "CANCELLED" && "opacity-50 line-through")}>
                        <span className="font-mono font-semibold">{toTimeKey(a.startsAt, tz)}</span> {a.customer.name}
                        <span className="block truncate text-[10px] text-muted">{a.service.name}{a.items.length > 0 ? ` · ${a.items.length} peça(s)` : ""}</span>
                      </Link>
                    </li>
                  ))}
                  {list.length === 0 && <li className="px-1 text-[11px] text-muted/60">—</li>}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line bg-ivory/60 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">
            {[1, 2, 3, 4, 5, 6, 0].map((w) => <div key={w} className="py-2">{weekdayName(w, true)}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: Math.round((dayRangeUtc(rangeEndExclusive, tz).start.getTime() - dayRangeUtc(rangeStart, tz).start.getTime()) / 86_400_000) }, (_, i) => addDaysKey(rangeStart, i)).map((d) => {
              const list = (byDay.get(d) ?? []).filter((a) => a.status !== "CANCELLED");
              const inMonth = d.slice(0, 7) === startOfMonthKey(date).slice(0, 7);
              return (
                <Link key={d} href={link("day", d)} className={cn("min-h-20 border-b border-r border-line p-1.5 text-xs hover:bg-ivory/60 sm:min-h-28 sm:p-2", !inMonth && "bg-[#faf8f4] text-muted/50")}>
                  <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full font-semibold", d === today && "bg-ink text-ivory")}>{Number(d.slice(8))}</span>
                  {list.length > 0 && (
                    <>
                      <span className="mt-1 block rounded bg-gold/15 px-1 font-semibold text-gold-dark sm:hidden">{list.length}</span>
                      <ul className="mt-1 hidden space-y-0.5 sm:block">
                        {list.slice(0, 3).map((a) => <li key={a.id} className="truncate"><span className="font-mono">{toTimeKey(a.startsAt, tz)}</span> {a.customer.name.split(" ")[0]}</li>)}
                        {list.length > 3 && <li className="font-semibold text-gold-dark">+{list.length - 3}</li>}
                      </ul>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
