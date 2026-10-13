import "server-only";
import type { Appointment, Customer, NotificationEvent, Prisma, Service, StoreSettings } from "@prisma/client";
import { db, type Tx } from "@/database/client";
import { env } from "@/lib/env";
import { formatDate, toTimeKey } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";
import { renderTemplate } from "@/utils/text";
import { SettingsService } from "../settings.service";
import { CloudApiWhatsAppProvider } from "./providers/cloud-api";
import { SimulatedWhatsAppProvider } from "./providers/simulated";
import type { WhatsAppProvider } from "./providers/types";
import { DEFAULT_TEMPLATES } from "./templates";

/**
 * Sistema → Evento → NotificationService → WhatsApp API → Cliente
 *
 * Padrão "outbox": a notificação é gravada (PENDING) na MESMA transação do
 * agendamento; o envio acontece depois. Se o WhatsApp falhar, o agendamento
 * continua válido e a notificação fica como FALHOU, visível no painel.
 */

const MAX_ATTEMPTS = 3;

type AppointmentWithRelations = Appointment & { customer: Customer; service: Service };

function appointmentVars(a: AppointmentWithRelations, settings: StoreSettings): Record<string, string> {
  return {
    nome: a.customer.name.split(" ")[0] ?? a.customer.name,
    nome_completo: a.customer.name,
    data: formatDate(a.startsAt, settings.timezone),
    horario: toTimeKey(a.startsAt, settings.timezone),
    servico: a.service.name,
    codigo: a.code,
    loja: settings.companyName,
    telefone_loja: formatPhone(settings.whatsapp ?? settings.phone),
    // Página do cliente para ver, remarcar ou cancelar
    link: `${env.appUrl}/agendamento/confirmado/${a.publicToken}`,
  };
}

export function resolveProvider(settings: Pick<StoreSettings, "whatsappMode">): WhatsAppProvider | { error: string } {
  if (settings.whatsappMode === "SIMULATED") return new SimulatedWhatsAppProvider();
  const { accessToken, phoneNumberId, apiVersion } = env.whatsapp;
  if (!accessToken || !phoneNumberId) {
    return { error: "Modo PRODUÇÃO ativo, mas WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID não estão configurados." };
  }
  return new CloudApiWhatsAppProvider({ accessToken, phoneNumberId, apiVersion });
}

export const NotificationService = {
  /** Grava (na transação) a mensagem de WhatsApp de um evento de agendamento. */
  async enqueueAppointmentMessage(tx: Tx, event: NotificationEvent, appointment: AppointmentWithRelations, settings: StoreSettings) {
    const template =
      (await tx.notificationTemplate.findUnique({ where: { event } })) ??
      (() => {
        const d = DEFAULT_TEMPLATES.find((t) => t.event === event);
        return d ? { body: d.body, active: true, waTemplateName: null, waLanguage: "pt_BR", waParams: d.waParams } : null;
      })();
    if (!template) return null;

    const vars = appointmentVars(appointment, settings);
    const body = renderTemplate(template.body, vars);
    const skipped = !settings.whatsappEnabled || !template.active;

    return tx.notification.create({
      data: {
        channel: "WHATSAPP",
        event,
        status: skipped ? "SKIPPED" : "PENDING",
        error: skipped ? (!settings.whatsappEnabled ? "WhatsApp desabilitado nas configurações." : "Modelo de mensagem inativo.") : null,
        recipient: appointment.customer.whatsapp,
        body,
        templateName: template.waTemplateName,
        templateLanguage: template.waTemplateName ? template.waLanguage : null,
        templateParams: template.waTemplateName ? (template.waParams.map((p) => vars[p] ?? "") as Prisma.InputJsonValue) : undefined,
        customerId: appointment.customerId,
        appointmentId: appointment.id,
      },
    });
  },

  /**
   * Aviso no WhatsApp DA LOJA quando um cliente agenda pelo site
   * (nome, telefone, serviço, data/hora e peças da lista de provas).
   */
  async enqueueOwnerAlert(tx: Tx, appointment: AppointmentWithRelations & { items?: { size: string | null; product: { name: string } }[] }, settings: StoreSettings) {
    if (!settings.ownerAlertWhatsapp || !settings.whatsapp || !settings.whatsappEnabled) return null;
    const v = appointmentVars(appointment, settings);
    const pieces = appointment.items?.length
      ? `\n👔 Quer provar: ${appointment.items.map((i) => `${i.product.name}${i.size ? ` (${i.size})` : ""}`).join(", ")}`
      : "";
    const body = `🔔 Novo agendamento pelo site\n\n👤 ${appointment.customer.name}\n📞 ${formatPhone(appointment.customer.whatsapp)}\n📌 ${v.servico}\n📅 ${v.data} às ${v.horario}\n🔖 ${v.codigo}${pieces}${appointment.notes ? `\n📝 ${appointment.notes}` : ""}`;
    return tx.notification.create({
      data: { channel: "WHATSAPP", event: "APPOINTMENT_CREATED", status: "PENDING", recipient: settings.whatsapp, title: "Aviso para a loja", body, appointmentId: appointment.id },
    });
  },

  /** Alerta interno do painel (sino). */
  async alert(tx: Tx, input: { event: NotificationEvent; title: string; body: string; appointmentId?: string; customerId?: string }) {
    return tx.notification.create({
      data: { channel: "INTERNAL", status: "SENT", sentAt: new Date(), ...input },
    });
  },

  /**
   * Envia mensagens pendentes. Cada uma é "reivindicada" de forma atômica
   * (attempts como versão), então execuções concorrentes não duplicam envio.
   */
  async processPending(filter: { ids?: string[]; limit?: number } = {}) {
    const settings = await SettingsService.getInTx(db);
    const pending = await db.notification.findMany({
      where: { channel: "WHATSAPP", status: "PENDING", attempts: { lt: MAX_ATTEMPTS }, ...(filter.ids ? { id: { in: filter.ids } } : {}) },
      orderBy: { createdAt: "asc" },
      take: filter.limit ?? 25,
    });
    if (pending.length === 0) return { processed: 0 };

    const provider = resolveProvider(settings);
    let processed = 0;
    for (const n of pending) {
      const claim = await db.notification.updateMany({
        where: { id: n.id, status: "PENDING", attempts: n.attempts },
        data: { attempts: { increment: 1 } },
      });
      if (claim.count !== 1) continue;
      processed++;

      if ("error" in provider) {
        await db.notification.update({ where: { id: n.id }, data: { status: "FAILED", error: provider.error } });
        continue;
      }
      try {
        const params = Array.isArray(n.templateParams) ? (n.templateParams as string[]) : [];
        const result = await provider.send({
          to: n.recipient!,
          body: n.body,
          template: n.templateName ? { name: n.templateName, language: n.templateLanguage ?? "pt_BR", params } : undefined,
        });
        await db.notification.update({
          where: { id: n.id },
          data: { status: result.simulated ? "SIMULATED" : "SENT", providerMessageId: result.providerMessageId, sentAt: new Date(), error: null },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message.slice(0, 500) : "Erro desconhecido";
        const finalFailure = n.attempts + 1 >= MAX_ATTEMPTS;
        await db.notification.update({ where: { id: n.id }, data: { status: finalFailure ? "FAILED" : "PENDING", error: message } });
        console.error("[whatsapp] falha no envio", n.id, message);
      }
    }
    return { processed };
  },

  /** Reenvio manual pelo painel. */
  async retry(id: string) {
    await db.notification.updateMany({ where: { id, channel: "WHATSAPP", status: { in: ["FAILED", "SKIPPED"] } }, data: { status: "PENDING", attempts: 0, error: null } });
    return this.processPending({ ids: [id] });
  },

  /**
   * Lembretes: agendamentos ativos que começam dentro da janela configurada
   * (padrão 24h) e ainda não receberam lembrete. Executado pelo cron.
   */
  async queueReminders(now = new Date()) {
    const settings = await SettingsService.getInTx(db);
    const until = new Date(now.getTime() + settings.reminderHoursBefore * 3_600_000);
    const due = await db.appointment.findMany({
      where: { status: { in: ["SCHEDULED", "CONFIRMED"] }, reminderSentAt: null, startsAt: { gt: now, lte: until } },
      include: { customer: true, service: true },
      take: 100,
    });
    const ids: string[] = [];
    for (const a of due) {
      await db.$transaction(async (tx) => {
        const marked = await tx.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: now } });
        if (marked.count !== 1) return;
        const n = await this.enqueueAppointmentMessage(tx, "APPOINTMENT_REMINDER", a, settings);
        if (n) ids.push(n.id);
      });
    }
    return { queued: ids.length, ids };
  },

  async unreadAlerts(take = 10) {
    const [items, count] = await Promise.all([
      db.notification.findMany({ where: { channel: "INTERNAL" }, orderBy: { createdAt: "desc" }, take }),
      db.notification.count({ where: { channel: "INTERNAL", readAt: null } }),
    ]);
    return { items, count };
  },

  async markAllRead() {
    await db.notification.updateMany({ where: { channel: "INTERNAL", readAt: null }, data: { readAt: new Date() } });
  },
};
