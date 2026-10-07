"use client";

import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Abre uma janela com a etiqueta (QR + código) pronta para imprimir. */
export function PrintLabelButton({ code, product, size, qrSvg }: { code: string; product: string; size: string; qrSvg: string }) {
  function print() {
    const w = window.open("", "_blank", "width=420,height=520");
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    w.document.write(`<!doctype html><html><head><title>${esc(code)}</title><style>
      @page { size: 50mm 30mm; margin: 2mm } body { font-family: monospace; margin: 0; display: flex; gap: 6px; align-items: center }
      svg { width: 24mm; height: 24mm } p { margin: 0; font-size: 9px } .c { font-size: 11px; font-weight: bold }
    </style></head><body>${qrSvg}<div><p class="c">${esc(code)}</p><p>${esc(product)}</p><p>Tam. ${esc(size)}</p></div></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }
  return <Button variant="outline" size="sm" onClick={print}><Tag className="h-3.5 w-3.5" /> Imprimir etiqueta</Button>;
}
