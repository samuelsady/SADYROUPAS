import type {
  AppointmentSource,
  AppointmentStatus,
  InventoryStatus,
  NotificationEvent,
  NotificationStatus,
  PrintJobStatus,
  RentalStatus,
  UserRole,
} from "@prisma/client";

/** Rótulos em português para os enums do banco. */
export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export const appointmentSourceLabel: Record<AppointmentSource, string> = {
  WEBSITE: "Site",
  ADMIN: "Painel",
  WHATSAPP: "WhatsApp",
  PHONE: "Telefone",
  WALK_IN: "Balcão",
};

export const inventoryStatusLabel: Record<InventoryStatus, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  RENTED: "Alugado",
  UNAVAILABLE: "Indisponível",
  INSPECTION: "Conferência",
  LAUNDRY: "Lavanderia",
  MAINTENANCE: "Manutenção",
  LOST: "Perdido",
};

/** Status de peça usados na V1 (os demais pertencem ao fluxo de locação da V2). */
export const V1_INVENTORY_STATUSES: InventoryStatus[] = ["AVAILABLE", "RESERVED", "RENTED", "UNAVAILABLE"];

export const printStatusLabel: Record<PrintJobStatus, string> = {
  PRINT_PENDING: "Pendente",
  PRINTING: "Imprimindo",
  PRINTED: "Impresso",
  PRINT_FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

export const notificationStatusLabel: Record<NotificationStatus, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  SIMULATED: "Simulado",
  FAILED: "Falhou",
  SKIPPED: "Não enviado",
};

export const notificationEventLabel: Record<NotificationEvent, string> = {
  APPOINTMENT_CREATED: "Agendamento criado",
  APPOINTMENT_UPDATED: "Agendamento alterado",
  APPOINTMENT_CANCELLED: "Agendamento cancelado",
  APPOINTMENT_REMINDER: "Lembrete de atendimento",
  PRINT_FAILED: "Falha de impressão",
  RENTAL_CONFIRMED: "Locação confirmada",
  PICKUP_REMINDER: "Lembrete de retirada",
  RETURN_REMINDER: "Lembrete de devolução",
  RETURN_OVERDUE: "Devolução atrasada",
  MAINTENANCE_STARTED: "Peça em manutenção",
  PAYMENT_PENDING: "Pagamento pendente",
};

export const rentalStatusLabel: Record<RentalStatus, string> = {
  QUOTE: "Orçamento",
  RESERVED: "Reservado",
  CONFIRMED: "Confirmado",
  PICKED_UP: "Retirado",
  RETURNED: "Devolvido",
  OVERDUE: "Atrasado",
  CANCELLED: "Cancelado",
  CLOSED: "Finalizado",
};

export const roleLabel: Record<UserRole, string> = {
  ADMIN: "Administrador",
  STAFF: "Atendente",
};

export type Tone = "neutral" | "gold" | "green" | "blue" | "red" | "amber" | "gray" | "purple";

export const appointmentStatusTone: Record<AppointmentStatus, Tone> = {
  SCHEDULED: "blue",
  CONFIRMED: "green",
  COMPLETED: "gray",
  CANCELLED: "red",
  NO_SHOW: "amber",
};

export const inventoryStatusTone: Record<InventoryStatus, Tone> = {
  AVAILABLE: "green",
  RESERVED: "blue",
  RENTED: "gold",
  UNAVAILABLE: "red",
  INSPECTION: "purple",
  LAUNDRY: "blue",
  MAINTENANCE: "amber",
  LOST: "red",
};

export const printStatusTone: Record<PrintJobStatus, Tone> = {
  PRINT_PENDING: "amber",
  PRINTING: "blue",
  PRINTED: "green",
  PRINT_FAILED: "red",
  CANCELLED: "gray",
};

export const notificationStatusTone: Record<NotificationStatus, Tone> = {
  PENDING: "amber",
  SENT: "green",
  SIMULATED: "purple",
  FAILED: "red",
  SKIPPED: "gray",
};

export const rentalStatusTone: Record<RentalStatus, Tone> = {
  QUOTE: "gray",
  RESERVED: "blue",
  CONFIRMED: "blue",
  PICKED_UP: "gold",
  RETURNED: "green",
  OVERDUE: "red",
  CANCELLED: "gray",
  CLOSED: "green",
};

export const returnConditionLabel: Record<string, string> = {
  RECEIVED: "Recebida — bom estado",
  DIRTY: "Recebida — suja (lavanderia)",
  DAMAGED: "Recebida — danificada (manutenção)",
  NOT_RECEIVED: "Não devolvida",
  LOST: "Perdida",
};
