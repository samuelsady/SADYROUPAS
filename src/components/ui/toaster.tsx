"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/toast";
import { cn } from "@/utils/cn";

type Item = ToastDetail & { id: number };

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      const id = ++seq;
      setItems((list) => [...list.slice(-2), { ...detail, id }]);
      window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), detail.tone === "error" ? 6000 : 3800);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] md:bottom-8 flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {items.map((t) => {
        const Icon = t.tone === "error" ? XCircle : t.tone === "info" ? Info : CheckCircle2;
        return (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={cn("toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-xl shadow-black/15", t.tone === "error" ? "bg-red-700 text-white" : "bg-ink text-ivory")}>
            <Icon className={cn("h-5 w-5 shrink-0", t.tone === "error" ? "text-white" : "text-gold-light")} />
            <span className="flex-1">{t.message}</span>
            {t.action && <Link href={t.action.href} className="shrink-0 font-semibold text-gold-light hover:underline">{t.action.label}</Link>}
            <button type="button" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} aria-label="Fechar aviso" className="shrink-0 opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
