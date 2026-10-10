"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Bell, Boxes, Sheet, CalendarDays, ClipboardList, FileSignature, LayoutDashboard, Menu, PackageCheck, Printer, Scissors, Settings, Shirt, ShieldCheck, Undo2, Users, Wallet, WashingMachine, X,
} from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { cn } from "@/utils/cn";
import type { NavItem } from "./nav";

const ICONS = { BarChart3, Bell, Boxes, Sheet, CalendarDays, ClipboardList, FileSignature, LayoutDashboard, PackageCheck, Printer, Scissors, Settings, Shirt, ShieldCheck, Undo2, Users, Wallet, WashingMachine };

function NavList({ nav, pathname }: { nav: { section: string; items: NavItem[] }[]; pathname: string }) {
  const currentQuery = useSearchParams().toString();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Painel">
      {nav.map((group) => (
        <div key={group.section}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory/35">{group.section}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
              const [path, query] = item.href.split("?");
              const active = item.href === "/admin" ? pathname === "/admin" : query ? pathname === path && currentQuery === query : pathname.startsWith(path!) && !(path === "/admin/locacoes" && currentQuery.startsWith("aba=") && /aba=(retiradas|devolucoes)/.test(currentQuery));
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined}
                    className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition", active ? "bg-white/10 text-ivory" : item.future ? "text-ivory/35 hover:text-ivory/60" : "text-ivory/70 hover:bg-white/5 hover:text-ivory")}>
                    <Icon className={cn("h-4 w-4", active ? "text-gold-light" : "")} strokeWidth={1.75} />
                    <span className="flex-1">{item.label}</span>
                    {item.future && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">V2</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

type Nav = { section: string; items: NavItem[] }[];

export function Sidebar({ nav }: { nav: Nav }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink lg:flex">
      <Link href="/admin" className="flex h-16 items-center px-6 text-sm"><Wordmark tone="light" /></Link>
      <NavList nav={nav} pathname={pathname} />
    </aside>
  );
}

export function MobileSidebar({ nav }: { nav: Nav }) {
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
            <NavList nav={nav} pathname={pathname} />
          </aside>
        </div>
      )}
    </>
  );
}
