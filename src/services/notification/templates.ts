import type { NotificationEvent } from "@prisma/client";

/**
 * Textos padrão das mensagens. Ficam no banco (NotificationTemplate) e podem
 * ser editados no painel; estes valores são usados no seed e como fallback.
 * Variáveis disponíveis: {nome} {data} {horario} {servico} {codigo} {loja} {telefone_loja} {link}
 */
export const DEFAULT_TEMPLATES: { event: NotificationEvent; name: string; body: string; waParams: string[] }[] = [
  {
    event: "APPOINTMENT_CREATED",
    name: "Confirmação de agendamento",
    body: "Olá, {nome}! Seu atendimento na Sady Roupas foi confirmado.\n\n📅 Data: {data}\n🕐 Horário: {horario}\n📌 Serviço: {servico}\n🔖 Código: {codigo}\n\nPara ver, remarcar ou cancelar: {link}\n\nEsperamos você!",
    waParams: ["nome", "data", "horario", "servico", "codigo"],
  },
  {
    event: "APPOINTMENT_UPDATED",
    name: "Agendamento alterado",
    body: "Olá, {nome}! Seu atendimento na Sady Roupas foi alterado.\n\n📅 Nova data: {data}\n🕐 Novo horário: {horario}\n📌 Serviço: {servico}\n🔖 Código: {codigo}\n\nQualquer dúvida, é só responder esta mensagem.",
    waParams: ["nome", "data", "horario", "servico", "codigo"],
  },
  {
    event: "APPOINTMENT_CANCELLED",
    name: "Agendamento cancelado",
    body: "Olá, {nome}. Seu atendimento do dia {data} às {horario} na Sady Roupas foi cancelado (código {codigo}).\n\nSe quiser remarcar, é só agendar um novo horário pelo nosso site ou responder esta mensagem.",
    waParams: ["nome", "data", "horario", "codigo"],
  },
  {
    event: "APPOINTMENT_REMINDER",
    name: "Lembrete de atendimento",
    body: "Olá, {nome}! 🔔\n\nLembramos que seu atendimento na Sady Roupas será amanhã.\n\n📅 {data}\n🕐 {horario}\n\nEsperamos você!",
    waParams: ["nome", "data", "horario"],
  },
  {
    event: "RETURN_OVERDUE",
    name: "Devolução atrasada (V2)",
    body: "Olá, {nome}! Identificamos que a devolução da sua locação está pendente.\n\nData prevista: {data}\n\nEntre em contato com a Sady Roupas para regularizar a devolução.",
    waParams: ["nome", "data"],
  },
  {
    event: "PICKUP_REMINDER",
    name: "Lembrete de retirada (V2)",
    body: "Olá, {nome}! Sua locação está pronta para retirada na Sady Roupas em {data}. Esperamos você!",
    waParams: ["nome", "data"],
  },
  {
    event: "RETURN_REMINDER",
    name: "Lembrete de devolução (V2)",
    body: "Olá, {nome}! Lembramos que a devolução da sua locação na Sady Roupas está prevista para {data}.",
    waParams: ["nome", "data"],
  },
  {
    event: "RENTAL_CONFIRMED",
    name: "Locação confirmada (V2)",
    body: "Olá, {nome}! Sua locação na Sady Roupas está confirmada. Retirada: {data}.",
    waParams: ["nome", "data"],
  },
];

/** Eventos que geram mensagem ao cliente na V1. */
export const V1_WHATSAPP_EVENTS: NotificationEvent[] = ["APPOINTMENT_CREATED", "APPOINTMENT_UPDATED", "APPOINTMENT_CANCELLED", "APPOINTMENT_REMINDER"];
