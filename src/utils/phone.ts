/**
 * Telefones/WhatsApp são guardados somente com dígitos e DDI (5586999990000).
 * Números brasileiros digitados sem DDI recebem 55 automaticamente.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Brasil sem DDI: DDD (2) + número (8 ou 9)
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13) return null;
  if (digits.startsWith("55")) {
    const ddd = Number(digits.slice(2, 4));
    if (ddd < 11 || ddd > 99) return null;
  }
  return digits;
}

/** 5586999990000 → (86) 99999-0000 */
export function formatPhone(digits: string | null | undefined) {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  const local = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return `+${d}`;
}

/** Mascara o telefone para comprovantes impressos: (86) 9XXXX-0000 */
export function maskPhone(digits: string) {
  const f = formatPhone(digits);
  return f.replace(/(\(\d{2}\) \d)\d{4}(-\d{4})/, "$1XXXX$2");
}

export function whatsappLink(digits: string | null | undefined, text?: string) {
  if (!digits) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits.replace(/\D/g, "")}${q}`;
}
