/** Opções do Ateliê virtual (monte seu terno). Textos em português do Brasil. */

export type Swatch = { id: string; label: string; hex: string; catalog?: string };

export const SUIT_TONES: Swatch[] = [
  { id: "preto", label: "Preto", hex: "#17171b", catalog: "Preto" },
  { id: "marinho", label: "Azul-marinho", hex: "#1d2741", catalog: "Azul" },
  { id: "cobalto", label: "Azul cobalto", hex: "#24438f", catalog: "Azul" },
  { id: "grafite", label: "Grafite", hex: "#3a3c42", catalog: "Grafite" },
  { id: "cinza", label: "Cinza", hex: "#8a8d93", catalog: "Cinza" },
  { id: "bege", label: "Bege", hex: "#c8b08c", catalog: "Bege" },
  { id: "marrom", label: "Marrom", hex: "#5a3c2b", catalog: "Marrom" },
  { id: "terracota", label: "Terracota", hex: "#a5532f", catalog: "Terracota" },
  { id: "vinho", label: "Vinho", hex: "#561d2a" },
];

export const SHIRT_TONES: Swatch[] = [
  { id: "branca", label: "Branca", hex: "#f7f5f0" },
  { id: "azul", label: "Azul-claro", hex: "#c9dbef" },
  { id: "rosa", label: "Rosa-claro", hex: "#f0d6d6" },
  { id: "preta", label: "Preta", hex: "#1c1c20" },
];

export const TIE_TONES: Swatch[] = [
  { id: "dourada", label: "Dourada", hex: "#c2a06a" },
  { id: "prata", label: "Prata", hex: "#b9bcc2" },
  { id: "vinho", label: "Vinho", hex: "#6b1f30" },
  { id: "azul", label: "Azul", hex: "#2c4c9c" },
  { id: "preta", label: "Preta", hex: "#121214" },
  { id: "verde", label: "Verde", hex: "#2f5340" },
  { id: "rose", label: "Rosé", hex: "#d7a3a0" },
];

export const VEST_TONES: Swatch[] = [
  { id: "terno", label: "Mesmo tom do terno", hex: "" },
  { id: "cinza", label: "Cinza", hex: "#8a8d93" },
  { id: "bege", label: "Bege", hex: "#c8b08c" },
  { id: "preto", label: "Preto", hex: "#17171b" },
  { id: "dourado", label: "Dourado", hex: "#b8955c" },
];

export const FABRICS = [
  { id: "liso", label: "Liso" },
  { id: "risca", label: "Risca de giz" },
  { id: "xadrez", label: "Príncipe de Gales" },
  { id: "linho", label: "Linho" },
] as const;

export const LAPELS = [
  { id: "entalhada", label: "Entalhada" },
  { id: "bico", label: "Bico (peak)" },
  { id: "xale", label: "Xale (smoking)" },
] as const;

export const TIE_STYLES = [
  { id: "gravata", label: "Gravata" },
  { id: "borboleta", label: "Gravata-borboleta" },
  { id: "sem", label: "Sem gravata" },
] as const;

export const LIGHTS = [
  { id: "loja", label: "Luz da loja", tint: "rgb(255 214 160 / 0.10)" },
  { id: "dia", label: "Luz do dia", tint: "rgb(200 225 255 / 0.10)" },
  { id: "noite", label: "Festa à noite", tint: "rgb(60 40 120 / 0.22)" },
] as const;

export type Fabric = (typeof FABRICS)[number]["id"];
export type Lapel = (typeof LAPELS)[number]["id"];
export type TieStyle = (typeof TIE_STYLES)[number]["id"];
export type Light = (typeof LIGHTS)[number]["id"];

/** Ordem em que as peças são vestidas. */
export const PIECES = [
  { id: "camisa", label: "Camisa", caption: "Camisa social com colarinho firme e punhos com botão." },
  { id: "calca", label: "Calça", caption: "Calça de alfaiataria com vinco e cós ajustado." },
  { id: "gravata", label: "Gravata", caption: "O nó fica bem no centro do colarinho." },
  { id: "colete", label: "Colete", caption: "Colete com decote em V e quatro botões." },
  { id: "blazer", label: "Blazer", caption: "Blazer com ombro estruturado e um botão." },
  { id: "lenco", label: "Lenço", caption: "Lenço de bolso para o toque final." },
] as const;
export type PieceId = (typeof PIECES)[number]["id"];

export type SuitConfig = {
  suit: string;
  fabric: Fabric;
  lapel: Lapel;
  shirt: string;
  tieStyle: TieStyle;
  tie: string;
  vest: string;
};

export const DEFAULT_CONFIG: SuitConfig = { suit: "marinho", fabric: "liso", lapel: "entalhada", shirt: "branca", tieStyle: "gravata", tie: "dourada", vest: "terno" };

/** Pontos de detalhe (coordenadas do desenho 400×620). */
export const HOTSPOTS = [
  { id: "lapela", x: 158, y: 150, zoom: 2.6, title: "Lapela", text: "A lapela emoldura o rosto. Entalhada é a mais versátil; a de bico é mais formal; a de xale, em cetim, é a do smoking." },
  { id: "gravata", x: 216, y: 150, zoom: 2.8, title: "Nó e colarinho", text: "O nó deve preencher o colarinho sem deixar a camisa aparecer por cima. Ajustamos na prova." },
  { id: "bolso", x: 252, y: 196, zoom: 2.6, title: "Bolso e lenço", text: "O lenço combina com a gravata sem ser igual — um tom próximo deixa o visual mais elegante." },
  { id: "botao", x: 200, y: 336, zoom: 2.4, title: "Fechamento", text: "Em pé, o botão fica fechado; ao sentar, abra. O blazer deve vestir sem repuxar." },
  { id: "punho", x: 84, y: 444, zoom: 2.8, title: "Punho", text: "O ideal é aparecer cerca de 1 cm do punho da camisa abaixo da manga do blazer." },
  { id: "tecido", x: 152, y: 262, zoom: 3.2, title: "Tecido", text: "Veja a trama de perto: liso, risca de giz, Príncipe de Gales ou linho. Na loja você sente o caimento." },
] as const;

export function find<T extends { id: string }>(list: readonly T[], id: string) {
  return list.find((x) => x.id === id) ?? list[0]!;
}

/** Mistura uma cor hex com preto (amount < 0) ou branco (amount > 0). */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

export function describe(c: SuitConfig) {
  const suit = find(SUIT_TONES, c.suit).label.toLowerCase();
  const fabric = c.fabric === "liso" ? "" : ` ${find(FABRICS, c.fabric).label.toLowerCase()}`;
  const tie = c.tieStyle === "sem" ? "sem gravata" : `${c.tieStyle === "borboleta" ? "gravata-borboleta" : "gravata"} ${find(TIE_TONES, c.tie).label.toLowerCase()}`;
  const vest = c.vest === "terno" ? "colete no mesmo tom" : `colete ${find(VEST_TONES, c.vest).label.toLowerCase()}`;
  return `Terno ${suit}${fabric}, lapela ${find(LAPELS, c.lapel).label.toLowerCase()}, camisa ${find(SHIRT_TONES, c.shirt).label.toLowerCase()}, ${tie} e ${vest}`;
}
