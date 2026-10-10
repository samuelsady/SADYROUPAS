import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import { Bell, LogOut, Search } from "lucide-react";
import { ADMIN_NAV } from "@/components/admin/nav";
import { MobileSidebar, Sidebar } from "@/components/admin/sidebar";
import { can } from "@/lib/auth/permissions";
import { requirePageUser } from "@/lib/auth/session";
import { roleLabel } from "@/lib/labels";
import { NotificationService } from "@/services/notification/notification.service";
import { SettingsService } from "@/services/settings.service";
import { formatDateTime } from "@/utils/datetime";
import { initials } from "@/utils/text";
import { logoutAction } from "../login/actions";
import { markAlertsReadAction } from "./_actions/common";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel Sady Roupas" }, robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const [alerts, settings] = await Promise.all([NotificationService.unreadAlerts(8), SettingsService.get()]);
  const nav = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(user.role, i.permission)) }));

  return (
    <div className="min-h-svh bg-[#f6f4f0]">
      <Sidebar nav={nav} />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <MobileSidebar nav={nav} />
          <form action="/admin/busca" className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" placeholder="Buscar cliente, código, peça…" aria-label="Busca global" className="h-10 w-full rounded-md border border-line bg-[#f6f4f0] pl-9 pr-3 text-sm focus:border-gold focus:bg-white focus:outline-none" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <details className="relative">
              <summary className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md hover:bg-ivory" aria-label={`Notificações (${alerts.count} não lidas)`}>
                <Bell className="h-5 w-5 text-ink/70" />
                {alerts.count > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">{alerts.count}</span>}
              </summary>
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <p className="text-sm font-semibold">Notificações</p>
                  {alerts.count > 0 && (
                    <form action={markAlertsReadAction}><button className="text-xs font-semibold text-gold-dark hover:underline">Marcar como lidas</button></form>
                  )}
                </div>
                <ul className="max-h-80 overflow-y-auto">
                  {alerts.items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação.</li>}
                  {alerts.items.map((n) => (
                    <li key={n.id} className={`border-b border-line/60 px-4 py-3 text-sm ${n.readAt ? "" : "bg-[#fbf6ec]"}`}>
                      <Link href={n.appointmentId ? `/admin/agendamentos/${n.appointmentId}` : "/admin/notificacoes"} className="block">
                        <p className="font-semibold">🔔 {n.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/70">{formatDateTime(n.createdAt, settings.timezone)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/admin/notificacoes" className="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-ink hover:bg-ivory">Ver todas</Link>
              </div>
            </details>
            <div className="hidden items-center gap-2.5 border-l border-line pl-3 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-gold-light">{initials(user.name)}</span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-[11px] text-muted-foreground">{roleLabel[user.role]}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button className="flex h-10 w-10 items-center justify-center rounded-md text-ink/60 hover:bg-ivory hover:text-ink" aria-label="Sair" title="Sair">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
