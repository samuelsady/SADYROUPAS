"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { NotificationEvent } from "@prisma/client";
import { db } from "@/database/client";
import { isUniqueViolation } from "@/database/errors";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formBool, formStr, toActionError, type ActionState } from "@/lib/action";
import { badRequest, conflict } from "@/lib/errors";
import { clientIp } from "@/lib/request";
import { serviceSchema } from "@/lib/schemas";
import { AuditService } from "@/services/audit.service";
import { AuthService } from "@/services/auth.service";
import { parseRentalPolicy } from "@/services/rental.service";
import { dayRangeUtc, isDateKey, isTimeKey, timeToMinutes, zonedToUtc } from "@/utils/datetime";
import { normalizePhone } from "@/utils/phone";

async function admin() {
  const user = await requireUser("settings.manage");
  return { user, actor: actorOf(user, await clientIp()) };
}

function done(message = "Configurações salvas.") {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { ok: true as const, message };
}

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

export async function saveCompanyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const input = z
      .object({ companyName: z.string().trim().min(2).max(80), phone: opt(30), whatsapp: opt(30), email: opt(160), address: opt(300), instagram: opt(60), facebook: opt(60), mapsEmbedUrl: opt(2000) })
      .parse(Object.fromEntries(["companyName", "phone", "whatsapp", "email", "address", "instagram", "facebook", "mapsEmbedUrl"].map((k) => [k, formStr(fd, k)])));
    const phone = input.phone ? normalizePhone(input.phone) : null;
    const whatsapp = input.whatsapp ? normalizePhone(input.whatsapp) : null;
    if (input.phone && !phone) throw badRequest("Telefone inválido.");
    if (input.whatsapp && !whatsapp) throw badRequest("WhatsApp inválido.");
    if (input.mapsEmbedUrl && !input.mapsEmbedUrl.startsWith("https://www.google.com/maps/embed")) throw badRequest("O mapa deve ser um link de incorporação do Google Maps.");
    await db.storeSettings.update({ where: { id: "store" }, data: { ...input, phone, whatsapp, instagram: input.instagram?.replace(/^@/, "") ?? null } });
    await AuditService.log(actor, { action: "settings.company_updated", entity: "StoreSettings", entityId: "store", summary: "Dados da empresa alterados" });
  } catch (err) {
    return toActionError(err);
  }
  return done();
}

export async function saveScheduleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const s = z
      .object({
        slotDurationMin: z.coerce.number().int().min(10).max(240),
        slotBufferMin: z.coerce.number().int().min(0).max(120),
        simultaneousSlots: z.coerce.number().int().min(1).max(10),
        minLeadMinutes: z.coerce.number().int().min(0).max(10080),
        maxAdvanceDays: z.coerce.number().int().min(1).max(365),
      })
      .parse(Object.fromEntries(["slotDurationMin", "slotBufferMin", "simultaneousSlots", "minLeadMinutes", "maxAdvanceDays"].map((k) => [k, formStr(fd, k)])));
    const hours = Array.from({ length: 7 }, (_, weekday) => {
      const isOpen = formBool(fd, `open_${weekday}`);
      const openTime = formStr(fd, `from_${weekday}`) ?? "09:00";
      const closeTime = formStr(fd, `to_${weekday}`) ?? "18:00";
      const breakStart = formStr(fd, `bs_${weekday}`) || null;
      const breakEnd = formStr(fd, `be_${weekday}`) || null;
      if (!isTimeKey(openTime) || !isTimeKey(closeTime)) throw badRequest("Horário inválido.");
      if (isOpen && timeToMinutes(closeTime) <= timeToMinutes(openTime)) throw badRequest("O fechamento deve ser depois da abertura.");
      if ((breakStart && !isTimeKey(breakStart)) || (breakEnd && !isTimeKey(breakEnd)) || Boolean(breakStart) !== Boolean(breakEnd)) throw badRequest("Informe início e fim da pausa.");
      return { weekday, isOpen, openTime, closeTime, breakStart, breakEnd };
    });
    await db.$transaction(async (tx) => {
      await tx.storeSettings.update({ where: { id: "store" }, data: s });
      for (const h of hours) await tx.businessHours.upsert({ where: { weekday: h.weekday }, create: h, update: h });
      await AuditService.log(actor, { action: "settings.schedule_updated", entity: "StoreSettings", entityId: "store", summary: "Horários e regras de agenda alterados", data: { ...s } }, tx);
    });
  } catch (err) {
    return toActionError(err);
  }
  return done();
}

export async function saveServiceAction(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const input = serviceSchema.parse({
      name: formStr(fd, "name"),
      description: formStr(fd, "description"),
      durationMin: formStr(fd, "durationMin") || null,
      active: formBool(fd, "active"),
      publicBooking: formBool(fd, "publicBooking"),
      sortOrder: formStr(fd, "sortOrder") || 0,
    });
    const service = id ? await db.service.update({ where: { id }, data: input }) : await db.service.create({ data: input });
    await AuditService.log(actor, { action: id ? "service.updated" : "service.created", entity: "Service", entityId: service.id, summary: `Serviço ${service.name} ${id ? "alterado" : "criado"}` });
  } catch (err) {
    return toActionError(err);
  }
  return done("Serviço salvo.");
}

export async function addBlockedPeriodAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const settings = await db.storeSettings.findUniqueOrThrow({ where: { id: "store" } });
    const date = formStr(fd, "date") ?? "";
    const endDate = formStr(fd, "endDate") || date;
    const from = formStr(fd, "from");
    const to = formStr(fd, "to");
    if (!isDateKey(date) || !isDateKey(endDate) || endDate < date) throw badRequest("Datas inválidas.");
    const allDay = !from && !to;
    if (!allDay && (!from || !to || !isTimeKey(from) || !isTimeKey(to))) throw badRequest("Informe início e fim, ou deixe ambos vazios para o dia inteiro.");
    const startsAt = allDay ? dayRangeUtc(date, settings.timezone).start : zonedToUtc(date, from!, settings.timezone);
    const endsAt = allDay ? dayRangeUtc(endDate, settings.timezone).end : zonedToUtc(endDate, to!, settings.timezone);
    if (endsAt <= startsAt) throw badRequest("O fim deve ser depois do início.");
    const reason = formStr(fd, "reason")?.slice(0, 200) || null;
    const b = await db.blockedPeriod.create({ data: { startsAt, endsAt, reason } });
    await AuditService.log(actor, { action: "schedule.blocked", entity: "BlockedPeriod", entityId: b.id, summary: `Período bloqueado: ${reason ?? "sem motivo"}` });
  } catch (err) {
    return toActionError(err);
  }
  return done("Período bloqueado. Agendamentos já existentes nesse período não são alterados.");
}

export async function removeBlockedPeriodAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const id = formStr(fd, "id") ?? "";
    await db.blockedPeriod.delete({ where: { id } });
    await AuditService.log(actor, { action: "schedule.unblocked", entity: "BlockedPeriod", entityId: id, summary: "Bloqueio removido" });
  } catch (err) {
    return toActionError(err);
  }
  return done("Bloqueio removido.");
}

export async function saveWhatsAppAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const mode = formStr(fd, "whatsappMode") === "PRODUCTION" ? "PRODUCTION" : "SIMULATED";
    const reminderHoursBefore = z.coerce.number().int().min(1).max(168).parse(formStr(fd, "reminderHoursBefore"));
    await db.storeSettings.update({ where: { id: "store" }, data: { whatsappEnabled: formBool(fd, "whatsappEnabled"), whatsappMode: mode, reminderHoursBefore } });
    await AuditService.log(actor, { action: "settings.whatsapp_updated", entity: "StoreSettings", entityId: "store", summary: `WhatsApp: modo ${mode}` });
  } catch (err) {
    return toActionError(err);
  }
  return done();
}

export async function saveTemplateAction(event: NotificationEvent, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const input = z
      .object({ body: z.string().trim().min(5).max(1500), waTemplateName: opt(120), waLanguage: z.string().trim().max(10).default("pt_BR"), waParams: z.string().optional() })
      .parse({ body: formStr(fd, "body"), waTemplateName: formStr(fd, "waTemplateName"), waLanguage: formStr(fd, "waLanguage") || "pt_BR", waParams: formStr(fd, "waParams") });
    const params = (input.waParams ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    await db.notificationTemplate.update({ where: { event }, data: { body: input.body, waTemplateName: input.waTemplateName, waLanguage: input.waLanguage, waParams: params, active: formBool(fd, "active") } });
    await AuditService.log(actor, { action: "template.updated", entity: "NotificationTemplate", entityId: event, summary: `Mensagem ${event} alterada` });
  } catch (err) {
    return toActionError(err);
  }
  return done("Mensagem salva.");
}

export async function savePrinterAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const format = z.enum(["THERMAL_58MM", "THERMAL_80MM", "A4"]).parse(formStr(fd, "printFormat"));
    await db.storeSettings.update({ where: { id: "store" }, data: { autoPrintOnCreate: formBool(fd, "autoPrintOnCreate"), printFormat: format, printerName: formStr(fd, "printerName")?.slice(0, 120) || null } });
    await AuditService.log(actor, { action: "settings.printer_updated", entity: "StoreSettings", entityId: "store", summary: `Impressão: ${format}` });
  } catch (err) {
    return toActionError(err);
  }
  return done();
}

export async function saveRentalPolicyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { actor } = await admin();
    const n = (k: string, min: number, max: number) => z.coerce.number().min(min).max(max).parse(formStr(fd, k) || 0);
    const maxRaw = formStr(fd, "maxAmount");
    const policy = parseRentalPolicy({
      defaultRentalDays: n("defaultRentalDays", 1, 60),
      turnaroundDays: n("turnaroundDays", 0, 30),
      lateFee: { enabled: formBool(fd, "lateFeeEnabled"), graceDays: n("graceDays", 0, 30), fixedPerDay: n("fixedPerDay", 0, 10000), percentPerDay: n("percentPerDay", 0, 100), maxAmount: maxRaw ? n("maxAmount", 0, 100000) : null },
    });
    await db.storeSettings.update({ where: { id: "store" }, data: { rentalPolicy: policy } });
    await AuditService.log(actor, { action: "settings.rental_policy_updated", entity: "StoreSettings", entityId: "store", summary: "Política de locação alterada" });
  } catch (err) {
    return toActionError(err);
  }
  return done();
}

export async function createUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("users.manage");
    const input = z
      .object({ name: z.string().trim().min(2).max(80), email: z.email("E-mail inválido.").trim().toLowerCase(), password: z.string().min(8, "Senha com no mínimo 8 caracteres.").max(200), role: z.enum(["ADMIN", "STAFF"]) })
      .parse({ name: formStr(fd, "name"), email: formStr(fd, "email"), password: formStr(fd, "password"), role: formStr(fd, "role") });
    const created = await db.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash: await AuthService.hashPassword(input.password) } }).catch((e) => {
      if (isUniqueViolation(e, "email")) throw conflict("Já existe um usuário com este e-mail.");
      throw e;
    });
    await AuditService.log(actorOf(user, await clientIp()), { action: "user.created", entity: "User", entityId: created.id, summary: `Usuário ${created.email} criado (${created.role})` });
  } catch (err) {
    return toActionError(err);
  }
  return done("Usuário criado.");
}

export async function toggleUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("users.manage");
    const id = formStr(fd, "id") ?? "";
    if (id === user.id) throw badRequest("Você não pode desativar o próprio acesso.");
    const target = await db.user.findUniqueOrThrow({ where: { id } });
    await db.user.update({ where: { id }, data: { active: !target.active, failedLogins: 0, lockedUntil: null } });
    await AuditService.log(actorOf(user, await clientIp()), { action: target.active ? "user.deactivated" : "user.activated", entity: "User", entityId: id, summary: `Usuário ${target.email} ${target.active ? "desativado" : "reativado"}` });
  } catch (err) {
    return toActionError(err);
  }
  return done("Usuário atualizado.");
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("users.manage");
    const id = formStr(fd, "id") ?? "";
    const password = z.string().min(8, "Senha com no mínimo 8 caracteres.").max(200).parse(formStr(fd, "password"));
    await db.user.update({ where: { id }, data: { passwordHash: await AuthService.hashPassword(password), failedLogins: 0, lockedUntil: null } });
    await AuditService.log(actorOf(user, await clientIp()), { action: "user.password_changed", entity: "User", entityId: id, summary: "Senha redefinida" });
  } catch (err) {
    return toActionError(err);
  }
  return done("Senha redefinida.");
}
