export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Substitui {variavel} pelos valores informados (sem interpretar HTML). */
export function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

export function formatCurrency(value: number | string | { toString(): string }) {
  return Number(value.toString()).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Remove acentos e caracteres fora do ASCII (impressoras térmicas sem codepage). */
export function toAscii(input: string) {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E\n]/g, "");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
