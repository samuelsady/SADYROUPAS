import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/database/client";
import { flushBackground } from "@/lib/background";
import { AppointmentService } from "@/services/appointment.service";
import { FittingService } from "@/services/fitting.service";
import { InventoryService } from "@/services/inventory.service";
import { addDaysKey, todayKey, weekdayOfKey } from "@/utils/datetime";
import { actor, resetDb } from "./helpers";

function futureDay(offset = 3) {
  let d = addDaysKey(todayKey("America/Fortaleza"), offset);
  while (weekdayOfKey(d) === 0) d = addDaysKey(d, 1);
  return d;
}

let serviceId: string;
let productId: string;
const date = futureDay();

async function seedCatalog() {
  const category = await db.category.create({ data: { slug: "ternos", name: "Ternos" } });
  const product = await db.product.create({ data: { slug: "terno-azul", name: "Terno Azul", categoryId: category.id, sizes: ["48", "50"], colors: ["Azul"] } });
  await db.product.create({ data: { slug: "inativo", name: "Inativo", categoryId: category.id, active: false } });
  await db.inventoryItem.createMany({
    data: [
      { code: "TER-AZU-048-001", productId: product.id, size: "48", color: "Azul" },
      { code: "TER-AZU-050-001", productId: product.id, size: "50", color: "Azul" },
    ],
  });
  return product.id;
}

const book = (overrides: Record<string, unknown> = {}) =>
  AppointmentService.createFromWebsite({ name: "Maria Santos", whatsapp: "86999990010", serviceId, date, time: "10:00", ...overrides }, actor);

beforeEach(async () => {
  ({ service: { id: serviceId } } = await resetDb());
  productId = await seedCatalog();
});
afterEach(() => flushBackground());
afterAll(() => db.$disconnect());

describe("Lista de provas", () => {
  it("grava as peças escolhidas no site (ignora inativas, tamanhos inválidos e duplicadas)", async () => {
    const { appointment } = await book({
      items: [
        { slug: "terno-azul", size: "50" },
        { slug: "terno-azul", size: "50" },
        { slug: "terno-azul", size: "99" },
        { slug: "inativo", size: null },
        { slug: "nao-existe", size: "50" },
      ],
    });
    const items = await db.appointmentItem.findMany({ where: { appointmentId: appointment.id }, orderBy: { createdAt: "asc" } });
    // tamanho inválido vira "a definir" e não duplica a peça já escolhida
    expect(items.map((i) => i.size)).toEqual(["50"]);
    const job = await db.printJob.findFirstOrThrow({ where: { appointmentId: appointment.id } });
    expect(job.content).toContain("Pecas para provar:");
    expect(job.content).toContain("- Terno Azul (tam. 50)");
  });

  it("separar reserva a peça com histórico; a mesma peça não pode ser separada duas vezes", async () => {
    const a = await book({ items: [{ slug: "terno-azul", size: "50" }] });
    const b = await book({ whatsapp: "86999990011", time: "11:20", items: [{ slug: "terno-azul", size: "50" }] });
    const [ia] = await db.appointmentItem.findMany({ where: { appointmentId: a.appointment.id } });
    const [ib] = await db.appointmentItem.findMany({ where: { appointmentId: b.appointment.id } });

    const results = await Promise.allSettled([FittingService.reserve(ia!.id, "TER-AZU-050-001", actor), FittingService.reserve(ib!.id, "ter-azu-050-001", actor)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const piece = await db.inventoryItem.findUniqueOrThrow({ where: { code: "TER-AZU-050-001" }, include: { history: true } });
    expect(piece.status).toBe("RESERVED");
    expect(piece.history.some((h) => h.action === "RESERVED_FOR_APPOINTMENT" && h.customerName === "Maria Santos")).toBe(true);
  });

  it("não separa peça de outro produto", async () => {
    const other = await db.product.create({ data: { slug: "outro", name: "Outro", categoryId: (await db.category.findFirstOrThrow()).id } });
    const a = await book({ items: [{ slug: "terno-azul", size: "48" }] });
    const [item] = await db.appointmentItem.findMany({ where: { appointmentId: a.appointment.id } });
    await db.inventoryItem.create({ data: { code: "OUT-XXX-048-001", productId: other.id, size: "48", color: "Preto" } });
    await expect(FittingService.reserve(item!.id, "OUT-XXX-048-001", actor)).rejects.toMatchObject({ status: 400 });
  });

  it("cancelar ou não comparecer libera as peças separadas", async () => {
    const a = await book({ items: [{ slug: "terno-azul", size: "48" }] });
    const [item] = await db.appointmentItem.findMany({ where: { appointmentId: a.appointment.id } });
    await FittingService.reserve(item!.id, "TER-AZU-048-001", actor);
    await AppointmentService.changeStatus(a.appointment.id, "CANCELLED", actor);
    const piece = await db.inventoryItem.findUniqueOrThrow({ where: { code: "TER-AZU-048-001" } });
    expect(piece.status).toBe("AVAILABLE");
    expect((await db.appointmentItem.findUniqueOrThrow({ where: { id: item!.id } })).inventoryItemId).toBeNull();
  });

  it("estoque: alteração em lote registra histórico e grade por tamanho", async () => {
    const count = await InventoryService.bulkChange({ codes: ["TER-AZU-048-001", "TER-AZU-050-001"], status: "UNAVAILABLE", location: "Costura" }, actor);
    expect(count).toBe(2);
    const matrix = await InventoryService.sizeMatrix(productId);
    expect(matrix.map((m) => [m.size, m.counts.UNAVAILABLE])).toEqual([["48", 1], ["50", 1]]);
    const sold = await InventoryService.soldOutSizes();
    expect(sold.total).toBe(2);
    expect(await db.inventoryHistory.count({ where: { note: { contains: "lote" } } })).toBe(2);
  });
});

describe("Autoatendimento do cliente", () => {
  it("remarca pelo link e avisa a equipe", async () => {
    const { appointment } = await book();
    const updated = await AppointmentService.rescheduleByCustomer(appointment.publicToken, { date, time: "15:20" }, actor);
    expect(updated.startsAt.getTime()).not.toBe(appointment.startsAt.getTime());
    expect(await db.notification.count({ where: { channel: "INTERNAL", title: "Cliente remarcou pelo site" } })).toBe(1);
    expect(await db.notification.count({ where: { appointmentId: appointment.id, event: "APPOINTMENT_UPDATED", channel: "WHATSAPP" } })).toBe(1);
  });

  it("cancela pelo link; depois não permite novas alterações", async () => {
    const { appointment } = await book();
    await AppointmentService.cancelByCustomer(appointment.publicToken, { reason: "Mudança de data do evento" }, actor);
    const a = await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(a.status).toBe("CANCELLED");
    expect(a.cancelReason).toContain("Cancelado pelo cliente");
    await expect(AppointmentService.rescheduleByCustomer(appointment.publicToken, { date, time: "15:20" }, actor)).rejects.toMatchObject({ status: 400 });
  });

  it("respeita o prazo mínimo antes do horário", async () => {
    const { appointment } = await book();
    await db.storeSettings.update({ where: { id: "store" }, data: { selfServiceCutoffHours: 24 * 30 } });
    await expect(AppointmentService.cancelByCustomer(appointment.publicToken, {}, actor)).rejects.toMatchObject({ status: 400 });
  });

  it("token inválido não encontra nada", async () => {
    await expect(AppointmentService.cancelByCustomer("token-que-nao-existe-123", {}, actor)).rejects.toMatchObject({ status: 404 });
  });
});
