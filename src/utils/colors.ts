/** Amostra de cor para os nomes de cor usados no catálogo. */
const SWATCHES: Record<string, string> = {
  azul: "#1f3a68",
  preto: "#111111",
  cinza: "#8b8b8b",
  grafite: "#3b3b3e",
  bege: "#cdb79e",
  marrom: "#5b3a29",
  terracota: "#b5532f",
  branco: "#ffffff",
  vinho: "#5c1a24",
  verde: "#2f4a3a",
};

export function swatchFor(color: string) {
  const key = color.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(" ")[0]!;
  return SWATCHES[key] ?? "conic-gradient(from 0deg, #c2a06a, #1f3a68, #111, #cdb79e, #c2a06a)";
}
