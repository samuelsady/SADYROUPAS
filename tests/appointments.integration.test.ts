import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/database/client";
import { flushBackground } from "@/lib/background";
import { AppError } from "@/lib/errors";
import { AppointmentService } from "@/services/appointment.service";
import { PrintService } from "@/services/print/print.service";
import { addDaysKey, todayKey, weekdayOfKey } from "@/utils/datetime";
import { actor, resetDb } from "./helpers";

/** Próximo dia útil daqui a alguns dias (evita o "agora" interferir na grade). */
function futureDay() {
  let d = addDaysKey(todayKey("America/Fortaleza"), 3);
  while (weekdayOfKey(d) === 0) d = addDaysKey(d, 1);
  return d;
}

const booking = (serviceId: string, date: string, overrides: Record<string, unknown> = {}) => ({
  name: "João Silva",
  whatsapp: "(86) 99999-0001",
  email: "joao@example.com",
  serviceId,
  date,
  time: "14:00",
  ...overrides,
});

let serviceId: string;
const date = futureDay();

beforeEach(async () => {
  ({ service: { id: serviceId } } = await resetDb());
});
afterEach(() => flushBackground());
afterAll(() => db.$disconnect());

describe("AppointmentService (banco real)", () => {
  it("cria agendamento com código, cliente, notificação, impressão e auditoria", async () => {
    const { appointment } = await AppointmentService.createFromWebsite(booking(serviceId, date), actor);
    expect(appointment.code).toMatch(/^SADY-\d{4}-000001$/);
    expect(appointment.customer.whatsapp).toBe("5586999990001");

    const [notifications, jobs, audit] = await Promise.all([
      db.notification.findMany({ where: { appointmentId: appointment.id } }),
      db.printJob.findMany({ where: { appointmentId: appointment.id } }),
      db.auditLog.findMany({ where: { entityId: appointment.id } }),
    ]);
    expect(notifications.map((n) => n.channel).sort()).toEqual(["INTERNAL", "WHATSAPP"]);
    expect(notifications.find((n) => n.channel === "WHATSAPP")!.body).toContain(appointment.code);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.status).toBe("PRINT_PENDING");
    expect(jobs[0]!.content).toContain(appointment.code);
    expect(audit[0]!.action).toBe("appointment.created");
  });

  it("CONCORRÊNCIA: duas pessoas no mesmo horário ao mesmo tempo — só uma consegue", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) => AppointmentService.createFromWebsite(booking(serviceId, date, { name: `Cliente ${i}`, whatsapp: `(86) 99999-01${10 + i}` }), actor)),
    );
    const ok = attempts.filter((r) => r.status === "fulfilled");
    const failed = attempts.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(5);
    for (const f of failed) expect((f.reason as AppError).status).toBe(409);
    expect(await db.appointment.count()).toBe(1);
  });

  it("o banco rejeita sobreposição mesmo se a validação da aplicação for burlada", async () => {
    const { appointment } = await AppointmentService.createFromWebsite(booking(serviceId, date), actor);
    await expect(
      db.appointment.create({
        data: {
          code: "X-1",
          publicToken: "tok_manual_insert_123",
          customerId: appointment.customerId,
          serviceId,
          startsAt: new Date(appointment.startsAt.getTime() + 10 * 60_000),
          endsAt: new Date(appointment.startsAt.getTime() + 40 * 60_000),
          blockedUntil: new Date(appointment.startsAt.getTime() + 50 * 60_000),
        },
      }),
    ).rejects.toThrow(/exclusion|23P01|no_overlap/i);
  });

  it("horário vizinho continua livre e cancelamento libera o horário", async () => {
    const first = await AppointmentService.createFromWebsite(booking(serviceId, date), actor);
    await expect(AppointmentService.createFromWebsite(booking(serviceId, date, { whatsapp: "86999990002" }), actor)).rejects.toMatchObject({ status: 409 });
    await AppointmentService.createFromWebsite(booking(serviceId, date, { whatsapp: "86999990003", time: "14:40" }), actor);
    await AppointmentService.changeStatus(first.appointment.id, "CANCELLED", actor, { reason: "teste" });
    const again = await AppointmentService.createFromWebsite(booking(serviceId, date, { whatsapp: "86999990002" }), actor);
    expect(again.appointment.status).toBe("SCHEDULED");
    const cancelMsg = await db.notification.findFirst({ where: { appointmentId: first.appointment.id, event: "APPOINTMENT_CANCELLED" } });
    expect(cancelMsg).not.toBeNull();
  });

  it("rejeita horário fora da grade e dados inválidos no backend", async () => {
    await expect(AppointmentService.createFromWebsite(booking(serviceId, date, { time: "14:05" }), actor)).rejects.toMatchObject({ status: 400 });
    await expect(AppointmentService.createFromWebsite(booking(serviceId, date, { whatsapp: "123" }), actor)).rejects.toThrow();
    await expect(AppointmentService.createFromWebsite(booking(serviceId, date, { company: "spam-bot" }), actor)).rejects.toThrow();
  });

  it("site não sobrescreve o nome de um cliente existente; painel atualiza", async () => {
    await AppointmentService.createFromWebsite(booking(serviceId, date), actor);
    await AppointmentService.createFromWebsite(booking(serviceId, date, { name: "Outra Pessoa", time: "15:20" }), actor);
    expect((await db.customer.findUniqueOrThrow({ where: { whatsapp: "5586999990001" } })).name).toBe("João Silva");
    await AppointmentService.createByStaff({ name: "João da Silva", whatsapp: "86999990001", serviceId, date, time: "16:00", source: "PHONE" }, actor);
    expect((await db.customer.findUniqueOrThrow({ where: { whatsapp: "5586999990001" } })).name).toBe("João da Silva");
  });

  it("remarcar valida disponibilidade e permite manter o próprio horário", async () => {
    const a = await AppointmentService.createFromWebsite(booking(serviceId, date), actor);
    await AppointmentService.createFromWebsite(booking(serviceId, date, { whatsapp: "86999990009", time: "15:20" }), actor);
    await expect(AppointmentService.update(a.appointment.id, { serviceId, date, time: "15:20" }, actor)).rejects.toMatchObject({ status: 409 });
    const moved = await AppointmentService.update(a.appointment.id, { serviceId, date, time: "16:00", notes: "remarcado" }, actor);
    expect(moved.notes).toBe("remarcado");
    const same = await AppointmentService.update(a.appointment.id, { serviceId, date, time: "16:00", notes: "só a observação" }, actor);
    expect(same.startsAt.getTime()).toBe(moved.startsAt.getTime());
  });
});

describe("WhatsApp em modo SIMULADO", () => {
  it("registra a mensagem como SIMULATED sem enviar", async () => {
    const { appointment } = await AppointmentService.createFromWebsite(booking(serviceId, date), actor);
    await flushBackground(); // o envio acontece em segundo plano, após a resposta
    const n = await db.notification.findFirstOrThrow({ where: { appointmentId: appointment.id, channel: "WHATSAPP" } });
    expect(n.status).toBe("SIMULATED");
    expect(n.providerMessageId).toMatch(/^sim_/);
  });

  it("em PRODUÇÃO sem credenciais marca FALHOU e o agendamento continua válido", async () => {
    await db.storeSettings.update({ where: { id: "store" }, data: { whatsappMode: "PRODUCTION" } });
    const { appointment } = await AppointmentService.createFromWebsite(booking(serviceId, date), actor);
    await flushBackground();
    const n = await db.notification.findFirstOrThrow({ where: { appointmentId: appointment.id, channel: "WHATSAPP" } });
    expect(n.status).toBe("FAILED");
    expect((await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } })).status).toBe("SCHEDULED");
  });
});

describe("Fila de impressão", () => {
  it("agente reivindica, imprime e falhas não afetam o agendamento", async () => {
    const { appointment } = await AppointmentService.createFromWebsite(booking(serviceId, date), actor);
    const [a, b] = await Promise.all([PrintService.claimNext("agente-1"), PrintService.claimNext("agente-2")]);
    expect([a, b].filter(Boolean)).toHaveLength(1); // nunca o mesmo trabalho para dois agentes
    const job = (a ?? b)!;
    const agent = a ? "agente-1" : "agente-2";

    await PrintService.complete(job.id, agent, { ok: false, error: "Impressora desligada" });
    expect((await db.printJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("PRINT_PENDING");
    for (let i = 0; i < 2; i++) {
      const again = await PrintService.claimNext(agent);
      await PrintService.complete(again!.id, agent, { ok: false, error: "Impressora desligada" });
    }
    const failed = await db.printJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(failed.status).toBe("PRINT_FAILED");
    expect(await db.notification.count({ where: { event: "PRINT_FAILED" } })).toBe(1);
    expect((await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } })).status).toBe("SCHEDULED");

    await PrintService.retry(job.id, actor);
    const retried = await PrintService.claimNext(agent);
    await PrintService.complete(retried!.id, agent, { ok: true });
    expect((await db.printJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("PRINTED");
  });

  it("status da impressora depende do heartbeat", async () => {
    expect((await PrintService.printerState()).state).toBe("DESCONECTADA");
    await PrintService.heartbeat({ agentId: "loja", state: "READY" });
    expect((await PrintService.printerState()).state).toBe("CONECTADA");
    expect((await PrintService.printerState(new Date(Date.now() + 5 * 60_000))).state).toBe("DESCONECTADA");
  });
});

describe("V2: mesma peça em duas locações sobrepostas", () => {
  it("o banco impede a reserva conflitante", async () => {
    const category = await db.category.create({ data: { slug: "ternos", name: "Ternos" } });
    const product = await db.product.create({ data: { slug: "terno", name: "Terno Slim Preto", categoryId: category.id } });
    const item = await db.inventoryItem.create({ data: { code: "TER-PRE-042-001", productId: product.id, size: "42", color: "Preto" } });
    const customer = await db.customer.create({ data: { name: "João", whatsapp: "5586999990001" } });
    const rental = (number: number, from: string, until: string) =>
      db.rental.create({ data: { number, customerId: customer.id, pickupDate: new Date(from), returnDueDate: new Date(until), items: { create: { inventoryItemId: item.id, reservedFrom: new Date(from), reservedUntil: new Date(until) } } } });
    await rental(1, "2026-10-16", "2026-10-20");
    await expect(rental(2, "2026-10-18", "2026-10-22")).rejects.toThrow(/exclusion|23P01|no_overlap/i);
    await expect(rental(3, "2026-10-21", "2026-10-24")).resolves.toBeTruthy();
  });
});
