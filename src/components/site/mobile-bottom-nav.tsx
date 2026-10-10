"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck, Home, LayoutGrid, MapPin, Shirt } from "lucide-react";
import { BottomNavBar, type BottomNavItem } from "@/components/ui/bottom-nav-bar";
import { OPEN_FITTING_EVENT } from "@/hooks/use-fitting-list";
import { useFittingList } from "@/hooks/use-fitting-list";

/** Navegação principal no celular: pílula fixa no rodapé da tela. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const fitting = useFittingList();
  const items: BottomNavItem[] = [
    { label: "Início", icon: Home, href: "/" },
    { label: "Catálogo", icon: LayoutGrid, href: "/catalogo" },
    { label: "Provador", icon: Shirt, onClick: () => window.dispatchEvent(new Event(OPEN_FITTING_EVENT)), badge: fitting.length || undefined },
    { label: "Agendar", icon: CalendarCheck, href: "/agendamento" },
    { label: "Loja", icon: MapPin, href: "/contato" },
  ];
  const active =
    pathname === "/" ? 0 : pathname.startsWith("/catalogo") ? 1 : pathname.startsWith("/agendamento") ? 3 : pathname.startsWith("/contato") ? 4 : -1;

  return (
    <div className="no-print fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] md:hidden">
      <BottomNavBar items={items} activeIndex={active} variant="dark" className="min-w-0" aria-label="Navegação" />
    </div>
  );
}
