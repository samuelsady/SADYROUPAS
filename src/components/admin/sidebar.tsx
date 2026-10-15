"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Boxes, CalendarDays, FileSignature, LayoutDashboard, Menu, Printer, Settings, Sheet, Sparkles, Users, X } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { cn } from "@/utils/cn";
import type { NavItem } from "./nav";

const ICONS = { Boxes, CalendarDays, FileSignature, LayoutDashboard, Printer, Settings, Sheet, Sparkles, Users };

export type Badges = Partial<Record<NonNullable<NavItem["badgeKey"]>, number>>;

function NavList({ nav, pathname, badges }: { nav: NavItem[]; pathname: string; badges: Badges }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Painel">
      <ul className="space-y-0.5">
        {nav.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
          const active = item.href === "/admin" ? pathname === "/admin" : [item.href, ...(item.also ?? [])].some((p) => pathname.startsWith(p));
          const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition", active ? "bg-white/10 text-ivory" : "text-ivory/70 hover:bg-white/5 hover:text-ivory")}>
                <Icon className={cn("h-4 w-4", active ? "text-gold-light" : "")} strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {badge ? <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold tabular-nums text-ink">{badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type Nav = NavItem[];

export function Sidebar({ nav, badges }: { nav: Nav; badges: Badges }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink lg:flex">
      <Link href="/admin" className="flex h-16 items-center px-6 text-sm"><Wordmark tone="light" /></Link>
      <NavList nav={nav} pathname={pathname} badges={badges} />
    </aside>
  );
}

export function MobileSidebar({ nav, badges }: { nav: Nav; badges: Badges }) {
  const pathname = usePathname();
  // O menu fica aberto apenas na página em que foi aberto: navegar fecha automaticamente
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-md text-ink lg:hidden" aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-ink animate-fade-up">
            <div className="flex h-16 items-center justify-between px-6 text-sm">
              <Wordmark tone="light" />
              <button type="button" onClick={() => setOpen(false)} className="text-ivory" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            </div>
            <NavList nav={nav} pathname={pathname} badges={badges} />
          </aside>
        </div>
      )}
    </>
  );
}
