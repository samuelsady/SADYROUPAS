/** Para quem é a roupa (perguntado no pedido de agendamento). */
export const EVENT_ROLES = [
  { id: "noivo", label: "Noivo" },
  { id: "padrinho", label: "Padrinho" },
  { id: "pai-noivos", label: "Pai dos noivos" },
  { id: "formando", label: "Formando" },
  { id: "pajem", label: "Pajem (criança)" },
  { id: "convidado", label: "Convidado" },
  { id: "outro", label: "Outro" },
] as const;
export type EventRole = (typeof EVENT_ROLES)[number]["id"];

/** Peças que a pessoa precisa. */
export const PIECES_NEEDED = [
  { id: "terno", label: "Terno completo" },
  { id: "smoking", label: "Smoking" },
  { id: "blazer", label: "Blazer" },
  { id: "calca", label: "Calça" },
  { id: "colete", label: "Colete" },
  { id: "camisa", label: "Camisa" },
  { id: "gravata", label: "Gravata" },
  { id: "borboleta", label: "Gravata-borboleta" },
  { id: "beca", label: "Beca" },
  { id: "acessorios", label: "Acessórios" },
] as const;
export type PieceNeeded = (typeof PIECES_NEEDED)[number]["id"];

export const eventRoleLabel = (id: string | null | undefined) => EVENT_ROLES.find((r) => r.id === id)?.label ?? null;
export const pieceLabel = (id: string) => PIECES_NEEDED.find((p) => p.id === id)?.label ?? id;
