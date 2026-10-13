import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/database/client";
import { flushBackground } from "@/lib/background";
import { AppointmentService } from "@/services/appointment.service";
import { InterestService } from "@/services/interest.service";
import { RentalService } from "@/services/rental-workflow.service";
import { addDaysKey, todayKey } from "@/utils/datetime";
import { actor, resetDb } from "./helpers";

let serviceId: string;
const today = todayKey("America/Fortaleza");

beforeEach(async () => {
  ({ service: { id: serviceId } } = await resetDb());
  await db.storeSettings.update({ where: { id: "store" }, data: { whatsapp: "5586988100001" } });
  const category = await db.category.create({ data: { slug: "ternos", name: "Ternos" } });
  const product = await db.product.create({ data: { slug: "terno-azul", name: "Terno Azul", categoryId: category.id, sizes: ["48", "50"] } });
  await db.inventoryItem.create({ data: { code: "TER-AZU-048-001", productId: product.id, size: "48", color: "Azul" } });
});
afterEach(() => flushBackground());
afterAll(() => db.$disconnect());

const lead = (overrides: Record<string, unknown> = {}) => ({ name: "Carlos Lima", whatsapp: "86999991111", items: [{ slug: "terno-azul", size: "48" }], ...overrides });

describe("Interessados", () => {
  it("pedido de contato cria cliente, interesse com as peças e avisa a loja", async () => {
    await InterestService.createFromWebsite(lead({ message: "Casamento dia 20" }), actor);
    const board = await InterestService.board();
    expect(board.novos).toHaveLength(1);
    expect(board.novos[0]!.customer.name).toBe("Carlos Lima");
    expect(board.novos[0]!.pieces).toEqual([expect.objectContaining({ name: "Terno Azul", size: "48" })]);
    const alert = await db.notification.findFirstOrThrow({ where: { event: "INTEREST_CREATED", channel: "WHATSAPP" } });
    expect(alert.recipient).toBe("5586988100001");
    expect(alert.body).toContain("Terno Azul (48)");
    expect((await InterestService.counts()).novos).toBe(1);
  });

  it("pedido repetido no mesmo dia junta as peças; tamanho inexistente vira 'a definir'", async () => {
    await InterestService.createFromWebsite(lead(), actor);
    await InterestService.createFromWebsite(lead({ items: [{ slug: "terno-azul", size: "48" }, { slug: "terno-azul", size: "99" }] }), actor);
    const all = await db.interest.findMany({ include: { items: true } });
    expect(all).toHaveLength(1);
    expect(all[0]!.items.map((i) => i.size).sort()).toEqual(["48", null].sort());
  });

  it("rejeita robô (honeypot) e lista vazia", async () => {
    await expect(InterestService.createFromWebsite(lead({ company: "spam" }), actor)).rejects.toThrow();
    await expect(InterestService.createFromWebsite(lead({ items: [] }), actor)).rejects.toThrow();
  });

  it("ao agendar, o interesse sai de 'pediram contato' e vai para 'vão provar'", async () => {
    await InterestService.createFromWebsite(lead(), actor);
    await AppointmentService.createFromWebsite({ name: "Carlos Lima", whatsapp: "86999991111", serviceId, date: addDaysKey(today, 2), time: "10:00", items: [{ slug: "terno-azul", size: "48" }] }, actor);
    const board = await InterestService.board();
    expect(board.novos).toHaveLength(0);
    expect(board.agendados).toHaveLength(1);
    expect(board.agendados[0]!.pieces[0]!.name).toBe("Terno Azul");
  });

  it("provou e não alugou aparece para retorno até alugar ou registrar o retorno", async () => {
    const { appointment } = await AppointmentService.createFromWebsite({ name: "Carlos Lima", whatsapp: "86999991111", serviceId, date: addDaysKey(today, 1), time: "10:00" }, actor);
    await db.appointment.update({ where: { id: appointment.id }, data: { status: "COMPLETED", startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() - 86400000 + 1800000), blockedUntil: new Date(Date.now() - 86400000 + 2400000) } });
    let board = await InterestService.board();
    expect(board.semLocacao.map((a) => a.id)).toEqual([appointment.id]);
    expect((await InterestService.counts()).semLocacao).toBe(1);

    await RentalService.create({ customerId: appointment.customerId, pickupDate: addDaysKey(today, 3), returnDueDate: addDaysKey(today, 5), itemCodes: ["TER-AZU-048-001"] }, actor);
    board = await InterestService.board();
    expect(board.semLocacao).toHaveLength(0);
    expect(board.alugaram).toHaveLength(1);
    expect((await InterestService.counts()).semLocacao).toBe(0);
  });

  it("retorno feito tira da lista; 'já falei' e 'encerrar' mudam o status", async () => {
    await InterestService.createFromWebsite(lead(), actor);
    const i = await db.interest.findFirstOrThrow();
    await InterestService.markContacted(i.id, actor);
    expect((await InterestService.board()).novos[0]!.status).toBe("CONTACTED");
    expect((await InterestService.counts()).novos).toBe(0);
    await InterestService.close(i.id, actor);
    expect((await InterestService.board()).novos).toHaveLength(0);
  });
});
