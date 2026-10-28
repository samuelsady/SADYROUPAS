"use client";

import { usePathname } from "next/navigation";
import { Home, LayoutGrid, MapPin, MessageCircle } from "lucide-react";
import { BottomNavBar, type BottomNavItem } from "@/components/ui/bottom-nav-bar";

/** Navegação no celular: início, catálogo, agendar pelo WhatsApp e localização. */
export function MobileBottomNav({ bookingHref }: { bookingHref: string | null }) {
  const pathname = usePathname();
  const items: BottomNavItem[] = [
    { label: "Início", icon: Home, href: "/" },
    { label: "Catálogo", icon: LayoutGrid, href: "/catalogo" },
    ...(bookingHref ? [{ label: "Agendar", icon: MessageCircle, onClick: () => window.open(bookingHref, "_blank", "noopener") }] : []),
    { label: "Loja", icon: MapPin, href: "/#contato" },
  ];
  const active = pathname === "/" ? 0 : pathname.startsWith("/catalogo") ? 1 : -1;

  return (
    <div className="no-print fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] md:hidden">
      <BottomNavBar items={items} activeIndex={active} variant="dark" className="min-w-0" aria-label="Navegação" />
    </div>
  );
}
