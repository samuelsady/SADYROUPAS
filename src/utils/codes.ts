/** SADY-2026-000124 */
export function formatAppointmentCode(year: number, seq: number) {
  return `SADY-${year}-${String(seq).padStart(6, "0")}`;
}

/** #000184 */
export function formatRentalNumber(n: number) {
  return `#${String(n).padStart(6, "0")}`;
}

/**
 * Código da peça física: CAT-COR-TAM-SEQ → TER-PRE-042-001.
 * Prefixos derivam da categoria e da cor (3 letras, sem acento).
 */
export function buildInventoryCode(category: string, color: string, size: string, seq: number) {
  const prefix = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3)
      .padEnd(3, "X");
  const sizePart = /^\d+$/.test(size) ? size.padStart(3, "0") : size.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3).padStart(3, "0");
  return `${prefix(category)}-${prefix(color)}-${sizePart}-${String(seq).padStart(3, "0")}`;
}
