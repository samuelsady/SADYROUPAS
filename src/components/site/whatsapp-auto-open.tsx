"use client";

import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";

/**
 * Botão "Enviar pedido no WhatsApp". Logo após o pedido, abre o WhatsApp
 * sozinho uma vez (com a mensagem pronta); depois fica só o botão.
 */
export function WhatsAppAutoOpen({ href, auto, onceKey }: { href: string; auto: boolean; onceKey: string }) {
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const key = `sady:wa-aberto:${onceKey}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    const show = window.setTimeout(() => setOpening(true), 0);
    const go = window.setTimeout(() => {
      // Marca só quando abre de fato (voltar para esta página não reabre)
      try {
        sessionStorage.setItem(key, "1");
      } catch {}
      window.location.href = href;
    }, 1600);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(go);
    };
  }, [auto, href, onceKey]);

  return (
    <div>
      <a href={href} className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#25D366] px-6 text-base font-bold text-white shadow-[0_14px_30px_-16px_rgb(37_211_102/0.9)] transition hover:bg-[#1ebe5b]">
        <WhatsAppIcon className="h-6 w-6" /> Enviar pedido no WhatsApp
      </a>
      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        {opening ? "Abrindo o WhatsApp com a mensagem pronta…" : "A mensagem já vai pronta com seus dados, o dia e o horário."}
      </p>
    </div>
  );
}
