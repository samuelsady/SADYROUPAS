/**
 * Tipos compartilhados entre camadas. Os tipos das entidades vêm do Prisma
 * (@prisma/client); aqui ficam os contratos que atravessam a fronteira
 * servidor ↔ navegador e as integrações.
 */
export type { ActionState } from "@/lib/action";
export type { Slot } from "@/services/availability/slots";
export type { Actor } from "@/services/audit.service";
export type { PrinterState } from "@/services/print/print.service";
export type { RentalPolicy } from "@/services/rental.service";
export type { OutgoingWhatsApp, WhatsAppProvider } from "@/services/notification/providers/types";

/** Resposta pública do agendamento (POST /api/public/appointments). */
export type PublicBookingResponse = { code: string; token: string };

/** Contrato da API do serviço local de impressão. */
export type PrintAgentJob = { id: string; kind: string; format: string; content: string; attempts: number };
