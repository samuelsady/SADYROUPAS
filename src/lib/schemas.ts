import { z } from "zod";
import { isDateKey, isTimeKey } from "@/utils/datetime";
import { normalizePhone } from "@/utils/phone";
import { OCCASIONS } from "./occasions";

/** Validações compartilhadas entre frontend e backend (o backend SEMPRE revalida). */

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const nameSchema = z.string().trim().min(3, "Informe o nome completo.").max(120, "Nome muito longo.");

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "WhatsApp inválido. Use DDD + número." });
      return z.NEVER;
    }
    return n;
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido.");

export const dateKeySchema = z.string().refine(isDateKey, "Data inválida.");
export const timeKeySchema = z.string().refine(isTimeKey, "Horário inválido.");
export const idSchema = z.string().trim().min(1).max(64);

export const publicBookingSchema = z.object({
  name: nameSchema,
  whatsapp: phoneSchema,
  email: emailSchema,
  serviceId: idSchema,
  date: dateKeySchema,
  time: timeKeySchema,
  notes: optionalText(1000),
  productSlug: optionalText(120),
  /** Lista de provas: peças (e tamanho) que o cliente quer experimentar */
  items: z
    .array(z.object({ slug: z.string().trim().min(1).max(120), size: optionalText(10) }))
    .max(12, "No máximo 12 peças na lista de provas.")
    .default([]),
  /** Honeypot anti-robô: humanos não veem este campo. */
  company: z.string().max(0, "Requisição inválida.").optional(),
});
export type PublicBookingInput = z.input<typeof publicBookingSchema>;

export const appointmentSourceSchema = z.enum(["WEBSITE", "ADMIN", "WHATSAPP", "PHONE", "WALK_IN"]);

export const staffBookingSchema = z
  .object({
    customerId: optionalText(64),
    name: optionalText(120),
    whatsapp: optionalText(40),
    email: emailSchema,
    serviceId: idSchema,
    date: dateKeySchema,
    time: timeKeySchema,
    notes: optionalText(1000),
    internalNotes: optionalText(1000),
    productId: optionalText(64),
    source: appointmentSourceSchema.default("ADMIN"),
  })
  .superRefine((v, ctx) => {
    if (v.customerId) return;
    if (!v.name || v.name.length < 3) ctx.addIssue({ code: "custom", path: ["name"], message: "Informe o nome do cliente." });
    if (!v.whatsapp || !normalizePhone(v.whatsapp)) ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "WhatsApp inválido." });
  });

export const customerRescheduleSchema = z.object({ date: dateKeySchema, time: timeKeySchema });
export const customerCancelSchema = z.object({ reason: optionalText(300) });

export const rescheduleSchema = z.object({
  serviceId: idSchema,
  date: dateKeySchema,
  time: timeKeySchema,
  notes: optionalText(1000),
  internalNotes: optionalText(1000),
  productId: optionalText(64),
});

export const customerSchema = z.object({
  name: nameSchema,
  whatsapp: phoneSchema,
  email: emailSchema,
  notes: optionalText(2000),
  preferences: optionalText(2000),
});

export const measurementSchema = z.object({
  jacket: optionalText(10),
  pants: optionalText(10),
  shirt: optionalText(10),
  shoe: optionalText(10),
  notes: optionalText(500),
});

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30),
  );

export const productSchema = z.object({
  name: trimmed(120).min(2, "Informe o nome."),
  slug: optionalText(80),
  categoryId: idSchema,
  description: optionalText(4000),
  model: optionalText(80),
  colors: csv,
  sizes: csv,
  occasions: z.array(z.enum(OCCASIONS.map((o) => o.slug) as [string, ...string[]])).max(10).default([]),
  details: optionalText(4000),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const inventoryStatusSchema = z.enum(["AVAILABLE", "RESERVED", "RENTED", "UNAVAILABLE", "INSPECTION", "LAUNDRY", "MAINTENANCE", "LOST"]);

export const inventoryItemSchema = z.object({
  productId: idSchema,
  size: trimmed(10).min(1, "Informe o tamanho."),
  color: trimmed(40).min(1, "Informe a cor."),
  location: optionalText(80),
  notes: optionalText(1000),
  code: optionalText(40),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
});

export const serviceSchema = z.object({
  name: trimmed(80).min(3, "Informe o nome do serviço."),
  description: optionalText(300),
  durationMin: z.coerce.number().int().min(5).max(480).optional().nullable(),
  active: z.boolean().default(true),
  publicBooking: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(160),
  password: z.string().min(1).max(200),
});
