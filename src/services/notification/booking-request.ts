import { eventRoleLabel, pieceLabel } from "@/lib/event-roles";
import { formatDate, formatDateKey, toTimeKey, weekdayName, weekdayOfKey, toDateKey } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";

/**
 * Texto do pedido de agendamento: vai pronto no WhatsApp que o cliente envia
 * para a loja (onde a equipe ou o agente de IA responde) e no aviso da loja.
 */
export type BookingRequest = {
  code: string;
  startsAt: Date;
  notes: string | null;
  eventDate: Date | null;
  eventRole: string | null;
  piecesNeeded: string[];
  customer: { name: string; whatsapp: string };
  service: { name: string };
  items?: { size: string | null; product: { name: string } }[];
};

export function bookingRequestLines(a: BookingRequest, settings: { timezone: string }) {
  const tz = settings.timezone;
  const day = toDateKey(a.startsAt, tz);
  const lines = [
    `👤 Nome: ${a.customer.name}`,
    `📞 WhatsApp: ${formatPhone(a.customer.whatsapp)}`,
  ];
  const role = eventRoleLabel(a.eventRole);
  if (role) lines.push(`🎩 Para: ${role}`);
  if (a.eventDate) lines.push(`🎉 Data do evento: ${formatDateKey(a.eventDate.toISOString().slice(0, 10))}`);
  lines.push(`🗓️ Prova desejada: ${weekdayName(weekdayOfKey(day))}, ${formatDate(a.startsAt, tz)} às ${toTimeKey(a.startsAt, tz)}`);
  lines.push(`📌 Atendimento: ${a.service.name}`);
  if (a.piecesNeeded.length) lines.push(`👔 Peças: ${a.piecesNeeded.map(pieceLabel).join(", ")}`);
  if (a.items?.length) lines.push(`🧥 Do catálogo: ${a.items.map((i) => `${i.product.name}${i.size ? ` (tam. ${i.size})` : ""}`).join(", ")}`);
  if (a.notes) lines.push(`📝 Obs.: ${a.notes}`);
  lines.push(`🔖 Pedido: ${a.code}`);
  return lines;
}

/** Mensagem que o cliente envia para a loja pelo WhatsApp. */
export function bookingRequestMessage(a: BookingRequest, settings: { timezone: string }) {
  return `Olá, Sady Roupas! Quero agendar uma prova de roupa. Esse dia e horário estão disponíveis?\n\n${bookingRequestLines(a, settings).join("\n")}`;
}
