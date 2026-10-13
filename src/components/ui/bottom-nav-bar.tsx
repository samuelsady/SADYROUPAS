"use client";

/**
 * BottomNavBar — barra de navegação inferior em "pílula" (padrão shadcn/ui +
 * framer-motion). Base: componente fornecido; adaptado para a Sady Roupas:
 * - `items` com rotas reais (Next Link) ou ações (onClick), com selo de contagem;
 * - item ativo controlado de fora (`activeIndex`, ex.: pela rota atual);
 * - variante "dark" (preto + dourado) além da "light" com os tokens shadcn.
 * Sem `items`, renderiza a demonstração original com estado interno.
 */
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Home, LineChart, MessageCircle, Trophy, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: number;
};

const demoItems: BottomNavItem[] = [
  { label: "Home", icon: Home },
  { label: "Portfolio", icon: LineChart },
  { label: "Transactions", icon: CreditCard },
  { label: "Messages", icon: MessageCircle },
  { label: "Rewards", icon: Trophy },
  { label: "Profile", icon: User },
];

const MOBILE_LABEL_WIDTH = 72;

type BottomNavBarProps = {
  className?: string;
  items?: BottomNavItem[];
  defaultIndex?: number;
  /** Controlado: índice ativo (ex.: calculado a partir da rota). */
  activeIndex?: number;
  stickyBottom?: boolean;
  variant?: "light" | "dark";
  "aria-label"?: string;
};

export function BottomNavBar({
  className,
  items = demoItems,
  defaultIndex = 0,
  activeIndex: controlledIndex,
  stickyBottom = false,
  variant = "light",
  "aria-label": ariaLabel = "Navegação inferior",
}: BottomNavBarProps) {
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const activeIndex = controlledIndex ?? internalIndex;
  const dark = variant === "dark";

  return (
    <motion.nav
      initial={{ scale: 0.9, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label={ariaLabel}
      className={cn(
        "flex h-[56px] min-w-[320px] max-w-[95vw] items-center space-x-1 rounded-full border p-2 shadow-xl",
        dark ? "border-white/10 bg-ink/90 shadow-black/40 backdrop-blur-xl" : "border-border bg-card dark:border-sidebar-border dark:bg-card",
        stickyBottom && "fixed inset-x-0 bottom-4 z-40 mx-auto w-fit",
        className,
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx;
        const content = (
          <>
            <span className="relative">
              <Icon size={21} strokeWidth={isActive ? 2 : 1.75} aria-hidden className="transition-colors duration-200" />
              {item.badge ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">{item.badge}</span>
              ) : null}
            </span>
            <motion.div
              initial={false}
              animate={{
                width: isActive ? `${MOBILE_LABEL_WIDTH}px` : "0px",
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? "8px" : "0px",
              }}
              transition={{
                width: { type: "spring", stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className="flex max-w-[72px] items-center overflow-hidden"
            >
              <span
                className={cn(
                  "overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.625rem,0.5263rem+0.5263vw,1rem)] font-medium leading-[1.9] select-none transition-opacity duration-200",
                  isActive ? (dark ? "text-gold-light" : "text-primary") : "opacity-0",
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>
          </>
        );
        const cls = cn(
          "relative flex h-10 max-h-[44px] min-h-[40px] min-w-[44px] items-center gap-0 rounded-full px-3 py-2 transition-colors duration-200",
          isActive
            ? dark
              ? "gap-2 bg-gold/15 text-gold-light"
              : "gap-2 bg-primary/10 text-primary dark:bg-primary/15"
            : dark
              ? "bg-transparent text-ivory/60 hover:bg-white/5 hover:text-ivory"
              : "bg-transparent text-muted-foreground hover:bg-muted",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
        );
        const select = () => {
          setInternalIndex(idx);
          item.onClick?.();
        };

        return item.href ? (
          <motion.div key={item.label} whileTap={{ scale: 0.97 }}>
            <Link href={item.href} onClick={select} aria-label={item.label} aria-current={isActive ? "page" : undefined} className={cls}>
              {content}
            </Link>
          </motion.div>
        ) : (
          <motion.button key={item.label} whileTap={{ scale: 0.97 }} className={cls} onClick={select} aria-label={item.label} type="button">
            {content}
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;
