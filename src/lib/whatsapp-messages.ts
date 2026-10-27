import { whatsappLink } from "@/utils/phone";

/**
 * Mensagens prontas do site para o WhatsApp da Sady. Quem responde é o agente
 * de IA (ou a equipe): ele confere a agenda e marca a prova.
 */
export function bookingWhatsapp(phone: string | null | undefined, piece?: { name: string; size?: string | null }) {
  const lines = ["Olá, Sady Roupas! Quero agendar uma prova de roupa."];
  if (piece) lines.push(`👔 Peça: ${piece.name}${piece.size ? ` — tamanho ${piece.size}` : ""}`);
  lines.push("Quais dias e horários vocês têm disponíveis?");
  return whatsappLink(phone, lines.join("\n"));
}

export function questionWhatsapp(phone: string | null | undefined) {
  return whatsappLink(phone, "Olá, Sady Roupas! Vim pelo site e tenho uma dúvida.");
}
