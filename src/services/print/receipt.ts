import { toAscii } from "@/utils/text";

/**
 * Layout do comprovante para impressora térmica (texto monoespaçado).
 * 80mm ≈ 48 colunas; 58mm ≈ 32 colunas. Sem acentos para funcionar em
 * qualquer impressora ESC/POS, independente da página de código.
 */

export type ReceiptFormat = "THERMAL_58MM" | "THERMAL_80MM" | "A4";

export const RECEIPT_WIDTH: Record<ReceiptFormat, number> = { THERMAL_58MM: 32, THERMAL_80MM: 48, A4: 64 };

export type AppointmentReceiptData = {
  companyName: string;
  code: string;
  customerName: string;
  customerPhone: string; // já mascarado
  service: string;
  date: string; // dd/MM/yyyy
  time: string; // HH:mm
  notes?: string | null;
  product?: string | null;
  createdAt: string; // dd/MM/yyyy HH:mm
  storePhone?: string | null;
  address?: string | null;
};

export function wrapText(text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (word.length > width) {
        if (line) lines.push(line);
        for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
        line = "";
        continue;
      }
      if ((line ? line.length + 1 : 0) + word.length > width) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  return lines;
}

const center = (s: string, width: number) => {
  const pad = Math.max(0, Math.floor((width - s.length) / 2));
  return `${" ".repeat(pad)}${s}`.trimEnd();
};

export function buildAppointmentReceipt(data: AppointmentReceiptData, format: ReceiptFormat = "THERMAL_80MM") {
  const w = RECEIPT_WIDTH[format] ?? 48;
  const rule = "-".repeat(w);
  const out: string[] = [];
  const field = (label: string, value: string | null | undefined) => {
    if (!value) return;
    out.push(`${label}:`);
    out.push(...wrapText(toAscii(value), w));
    out.push("");
  };

  out.push(rule, center(toAscii(data.companyName.toUpperCase()), w), center("COMPROVANTE DE AGENDAMENTO", w), rule, "");
  field("Codigo", data.code);
  field("Cliente", data.customerName);
  field("WhatsApp", data.customerPhone);
  field("Servico", data.service);
  field("Data", data.date);
  field("Horario", data.time);
  field("Peca de interesse", data.product);
  field("Observacoes", data.notes);
  field("Criado em", data.createdAt);
  out.push(rule, center(toAscii(data.companyName.toUpperCase()), w));
  if (data.storePhone) out.push(center(toAscii(data.storePhone), w));
  if (data.address) out.push(...wrapText(toAscii(data.address), w).map((l) => center(l, w)));
  out.push(rule);
  return out.join("\n");
}
