import "server-only";
import type { Appointment, Customer, PrintJob, Product, Service, StoreSettings } from "@prisma/client";
import { db, type Tx } from "@/database/client";
import { notFound } from "@/lib/errors";
import { formatDate, formatDateTime, toTimeKey } from "@/utils/datetime";
import { formatPhone, maskPhone } from "@/utils/phone";
import { AuditService, SYSTEM_ACTOR, type Actor } from "../audit.service";
import { NotificationService } from "../notification/notification.service";
import { SettingsService } from "../settings.service";
import { buildAppointmentReceipt, type AppointmentReceiptData, type ReceiptFormat } from "./receipt";

/**
 * BACKEND → PRINT QUEUE (tabela PrintJob) → SERVIÇO LOCAL DE IMPRESSÃO → IMPRESSORA
 *
 * O navegador nunca fala com a impressora. O agente local (print-agent/) roda
 * no computador da loja, busca trabalhos pendentes por HTTPS e informa o
 * resultado. Falha de impressão NUNCA invalida o agendamento.
 */

export type PrinterState = "CONECTADA" | "AGUARDANDO" | "DESCONECTADA" | "ERRO";

/** Sem heartbeat por este tempo, o agente é considerado desconectado. */
const HEARTBEAT_TIMEOUT_MS = 90_000;
/** Trabalho "imprimindo" há mais que isso volta para a fila (agente caiu no meio). */
const STUCK_PRINTING_MS = 3 * 60_000;
const MAX_ATTEMPTS = 3;

type AppointmentForReceipt = Appointment & {
  customer: Customer;
  service: Service;
  product?: Pick<Product, "name"> | null;
  items?: { size: string | null; product: Pick<Product, "name"> }[];
};

export function appointmentReceiptData(a: AppointmentForReceipt, settings: StoreSettings): AppointmentReceiptData {
  const tz = settings.timezone;
  return {
    companyName: settings.companyName,
    code: a.code,
    customerName: a.customer.name,
    customerPhone: maskPhone(a.customer.whatsapp),
    service: a.service.name,
    date: formatDate(a.startsAt, tz),
    time: toTimeKey(a.startsAt, tz),
    notes: a.notes,
    product: a.product?.name ?? null,
    fittingItems: a.items?.map((i) => `${i.product.name}${i.size ? ` (tam. ${i.size})` : ""}`),
    createdAt: formatDateTime(a.createdAt, tz),
    storePhone: settings.phone ? formatPhone(settings.phone) : null,
    address: settings.address,
  };
}

export const PrintService = {
  /** Cria o trabalho de impressão do comprovante (dentro da transação do agendamento). */
  async enqueueAppointmentReceipt(tx: Tx, appointment: AppointmentForReceipt, settings: StoreSettings, requestedById?: string | null) {
    const format = settings.printFormat as ReceiptFormat;
    return tx.printJob.create({
      data: {
        kind: "APPOINTMENT_RECEIPT",
        content: buildAppointmentReceipt(appointmentReceiptData(appointment, settings), format),
        format,
        appointmentId: appointment.id,
        requestedById: requestedById ?? null,
      },
    });
  },

  async reprintAppointment(appointmentId: string, actor: Actor) {
    return db.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id: appointmentId }, include: { customer: true, service: true, product: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } } });
      if (!appointment) throw notFound("Agendamento");
      const settings = await SettingsService.getInTx(tx);
      const job = await this.enqueueAppointmentReceipt(tx, appointment, settings, actor.userId);
      await AuditService.log(actor, { action: "print.reprinted", entity: "Appointment", entityId: appointmentId, summary: `Reimpressão do comprovante ${appointment.code}` }, tx);
      return job;
    });
  },

  async retry(jobId: string, actor: Actor) {
    return db.$transaction(async (tx) => {
      const job = await tx.printJob.findUnique({ where: { id: jobId } });
      if (!job) throw notFound("Trabalho de impressão");
      const updated = await tx.printJob.update({ where: { id: jobId }, data: { status: "PRINT_PENDING", attempts: 0, error: null, agentId: null, claimedAt: null } });
      await AuditService.log(actor, { action: "print.retried", entity: "PrintJob", entityId: jobId, summary: "Impressão reenviada para a fila" }, tx);
      return updated;
    });
  },

  async cancel(jobId: string, actor: Actor) {
    return db.$transaction(async (tx) => {
      const res = await tx.printJob.updateMany({ where: { id: jobId, status: { in: ["PRINT_PENDING", "PRINT_FAILED"] } }, data: { status: "CANCELLED" } });
      if (res.count === 1) await AuditService.log(actor, { action: "print.cancelled", entity: "PrintJob", entityId: jobId, summary: "Impressão cancelada" }, tx);
      return res.count === 1;
    });
  },

  // ---------------------------------------------------------------------------
  // API do agente local
  // ---------------------------------------------------------------------------

  /** Reivindica o próximo trabalho de forma atômica (SKIP LOCKED evita duplicidade entre agentes). */
  async claimNext(agentId: string): Promise<PrintJob | null> {
    await db.printJob.updateMany({
      where: { status: "PRINTING", claimedAt: { lt: new Date(Date.now() - STUCK_PRINTING_MS) } },
      data: { status: "PRINT_PENDING", agentId: null, claimedAt: null },
    });
    const rows = await db.$queryRaw<{ id: string }[]>`
      UPDATE "PrintJob" SET "status" = 'PRINTING', "agentId" = ${agentId}, "claimedAt" = now(), "attempts" = "attempts" + 1, "updatedAt" = now()
      WHERE "id" = (
        SELECT "id" FROM "PrintJob" WHERE "status" = 'PRINT_PENDING' ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      RETURNING "id"
    `;
    if (!rows[0]) return null;
    return db.printJob.findUnique({ where: { id: rows[0].id } });
  },

  async complete(jobId: string, agentId: string, result: { ok: boolean; error?: string }) {
    const job = await db.printJob.findUnique({ where: { id: jobId }, include: { appointment: { select: { code: true, id: true } } } });
    if (!job || job.agentId !== agentId || job.status !== "PRINTING") throw notFound("Trabalho de impressão");

    if (result.ok) {
      await db.$transaction(async (tx) => {
        await tx.printJob.update({ where: { id: jobId }, data: { status: "PRINTED", printedAt: new Date(), error: null } });
        await AuditService.log({ ...SYSTEM_ACTOR, label: `Impressora (${agentId})` }, { action: "print.printed", entity: "PrintJob", entityId: jobId, summary: `Comprovante ${job.appointment?.code ?? ""} impresso` }, tx);
      });
      return;
    }

    const error = (result.error ?? "Falha desconhecida").slice(0, 500);
    const willRetry = job.attempts < MAX_ATTEMPTS;
    await db.$transaction(async (tx) => {
      await tx.printJob.update({
        where: { id: jobId },
        data: willRetry ? { status: "PRINT_PENDING", error, agentId: null, claimedAt: null } : { status: "PRINT_FAILED", error },
      });
      if (!willRetry) {
        await NotificationService.alert(tx, {
          event: "PRINT_FAILED",
          title: "Impressão pendente",
          body: `Não foi possível imprimir o comprovante ${job.appointment?.code ?? ""}: ${error}`,
          appointmentId: job.appointment?.id,
        });
      }
    });
  },

  async heartbeat(input: { agentId: string; state: string; printerName?: string | null; message?: string | null; hostname?: string | null }) {
    const state = ["READY", "WAITING", "ERROR"].includes(input.state) ? input.state : "WAITING";
    await db.printerStatus.upsert({
      where: { agentId: input.agentId },
      create: { agentId: input.agentId, state, printerName: input.printerName, message: input.message, hostname: input.hostname, lastSeenAt: new Date() },
      update: { state, printerName: input.printerName, message: input.message, hostname: input.hostname, lastSeenAt: new Date() },
    });
  },

  /** Status consolidado da impressora para o painel. */
  async printerState(now = new Date()): Promise<{ state: PrinterState; agent: { agentId: string; printerName: string | null; lastSeenAt: Date; message: string | null; hostname: string | null } | null }> {
    const agent = await db.printerStatus.findFirst({ orderBy: { lastSeenAt: "desc" } });
    if (!agent || now.getTime() - agent.lastSeenAt.getTime() > HEARTBEAT_TIMEOUT_MS) return { state: "DESCONECTADA", agent };
    const state: PrinterState = agent.state === "ERROR" ? "ERRO" : agent.state === "READY" ? "CONECTADA" : "AGUARDANDO";
    return { state, agent };
  },

  async queue(params: { status?: string; take?: number } = {}) {
    return db.printJob.findMany({
      where: params.status ? { status: params.status as PrintJob["status"] } : {},
      orderBy: { createdAt: "desc" },
      take: params.take ?? 50,
      include: { appointment: { select: { id: true, code: true, customer: { select: { name: true } } } } },
    });
  },
};
