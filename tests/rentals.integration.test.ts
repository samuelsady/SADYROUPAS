import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/database/client";
import { flushBackground } from "@/lib/background";
import { AppointmentService } from "@/services/appointment.service";
import { RentalService } from "@/services/rental-workflow.service";
import { SpreadsheetService } from "@/services/spreadsheet.service";
import ExcelJS from "exceljs";
import { addDaysKey, todayKey, weekdayOfKey } from "@/utils/datetime";
import { actor, resetDb } from "./helpers";

let customerId: string;
let serviceId: string;
const today = todayKey("America/Fortaleza");

beforeEach(async () => {
  ({ service: { id: serviceId } } = await resetDb());
  const category = await db.category.create({ data: { slug: "ternos", name: "Ternos" } });
  const product = await db.product.create({ data: { slug: "terno-preto", name: "Terno Preto", categoryId: category.id, sizes: ["48", "50"] } });
  await db.inventoryItem.createMany({
    data: [
      { code: "TER-PRE-048-001", productId: product.id, size: "48", color: "Preto" },
      { code: "TER-PRE-050-001", productId: product.id, size: "50", color: "Preto" },
    ],
  });
  customerId = (await db.customer.create({ data: { name: "João Silva", whatsapp: "5586999990001" } })).id;
});
afterEach(() => flushBackground());
afterAll(() => db.$disconnect());

const base = (overrides: Record<string, unknown> = {}) => ({
  customerId,
  eventName: "Casamento",
  pickupDate: addDaysKey(today, 2),
  returnDueDate: addDaysKey(today, 5),
  deliveryMethod: "STORE_PICKUP",
  itemCodes: ["TER-PRE-048-001"],
  total: 350,
  paidNow: 100,
  paymentMethod: "PIX",
  ...overrides,
});

describe("Locações", () => {
  it("criar reserva as peças, registra pagamento, comprovante e mensagem", async () => {
    const r = await RentalService.create(base(), actor);
    expect(r.number).toBe(1);
    expect(r.status).toBe("RESERVED");
    expect(Number(r.paid)).toBe(100);
    expect(r.paymentStatus).toBe("PARTIAL");
    const piece = await db.inventoryItem.findUniqueOrThrow({ where: { code: "TER-PRE-048-001" } });
    expect(piece.status).toBe("RESERVED");
    expect(await db.printJob.count({ where: { rentalId: r.id, kind: "RENTAL_RECEIPT" } })).toBe(1);
    const msg = await db.notification.findFirstOrThrow({ where: { rentalId: r.id, event: "RENTAL_CONFIRMED" } });
    expect(msg.body).toContain("#000001");
    expect(msg.body).toContain("Terno Preto (tam. 48)");
  });

  it("não deixa a mesma peça em duas locações com datas sobrepostas", async () => {
    await RentalService.create(base(), actor);
    await expect(RentalService.create(base({ pickupDate: addDaysKey(today, 4), returnDueDate: addDaysKey(today, 8) }), actor)).rejects.toMatchObject({ status: 409 });
  });

  it("retirada dá baixa automática (ALUGADO, +1 locação) e devolução atualiza o estoque", async () => {
    const r = await RentalService.create(base({ itemCodes: ["TER-PRE-048-001", "TER-PRE-050-001"] }), actor);
    await RentalService.confirmPickup(r.id, { checklist: [{ label: "Paletó", checked: true }] }, actor);
    let pieces = await db.inventoryItem.findMany({ orderBy: { code: "asc" } });
    expect(pieces.map((p) => p.status)).toEqual(["RENTED", "RENTED"]);
    expect(pieces.map((p) => p.rentalCount)).toEqual([1, 1]);
    expect(pieces[0]!.location).toContain("João Silva");

    const items = (await RentalService.get(r.id))!.items;
    await RentalService.registerReturn(r.id, { items: [{ rentalItemId: items[0]!.id, condition: "RECEIVED" }, { rentalItemId: items[1]!.id, condition: "DIRTY" }] }, actor);
    pieces = await db.inventoryItem.findMany({ orderBy: { code: "asc" } });
    expect(pieces.map((p) => p.status)).toEqual(["AVAILABLE", "LAUNDRY"]);
    expect((await db.rental.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("RETURNED");
    // devolvida: a peça pode ser alugada de novo nas mesmas datas
    await expect(RentalService.create(base({ itemCodes: ["TER-PRE-048-001"] }), actor)).resolves.toBeTruthy();
  });

  it("devolução atrasada gera multa pela política", async () => {
    await db.storeSettings.update({ where: { id: "store" }, data: { rentalPolicy: { lateFee: { enabled: true, graceDays: 0, fixedPerDay: 20, percentPerDay: 0, maxAmount: null } } } });
    const r = await RentalService.create(base({ pickupDate: addDaysKey(today, -5), returnDueDate: addDaysKey(today, -3) }), actor);
    await RentalService.confirmPickup(r.id, {}, actor);
    const items = (await RentalService.get(r.id))!.items;
    const { lateFee } = await RentalService.registerReturn(r.id, { items: [{ rentalItemId: items[0]!.id, condition: "RECEIVED" }] }, actor);
    expect(lateFee).toEqual({ days: 3, amount: 60 });
    const after = await db.rental.findUniqueOrThrow({ where: { id: r.id } });
    expect(after.paymentStatus).toBe("PARTIAL"); // 350 + 60 − 100 pago
  });

  it("atrasada é marcada pelo cron e o cliente recebe aviso uma vez", async () => {
    const r = await RentalService.create(base({ pickupDate: addDaysKey(today, -4), returnDueDate: addDaysKey(today, -1) }), actor);
    await RentalService.confirmPickup(r.id, {}, actor);
    expect((await RentalService.flagOverdue()).flagged).toBe(1);
    expect((await RentalService.flagOverdue()).flagged).toBe(0);
    expect(await db.notification.count({ where: { rentalId: r.id, event: "RETURN_OVERDUE" } })).toBe(1);
    expect((await db.rental.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("OVERDUE");
  });

  it("cancelar devolve as peças para DISPONÍVEL", async () => {
    const r = await RentalService.create(base(), actor);
    await RentalService.cancel(r.id, "Desistiu", actor);
    expect((await db.inventoryItem.findUniqueOrThrow({ where: { code: "TER-PRE-048-001" } })).status).toBe("AVAILABLE");
    await expect(RentalService.create(base(), actor)).resolves.toBeTruthy();
  });

  it("entrega exige endereço", async () => {
    await expect(RentalService.create(base({ deliveryMethod: "DELIVERY" }), actor)).rejects.toThrow();
    const r = await RentalService.create(base({ deliveryMethod: "DELIVERY", deliveryAddress: "Rua A, 10" }), actor);
    expect(r.deliveryAddress).toBe("Rua A, 10");
  });
});

describe("Aviso no WhatsApp da loja", () => {
  it("cada agendamento pelo site gera mensagem para o número da loja", async () => {
    await db.storeSettings.update({ where: { id: "store" }, data: { whatsapp: "5586988100001" } });
    let d = addDaysKey(today, 3);
    while (weekdayOfKey(d) === 0) d = addDaysKey(d, 1);
    const { appointment } = await AppointmentService.createFromWebsite({ name: "Maria Santos", whatsapp: "86999990002", serviceId, date: d, time: "10:00", notes: "Formatura" }, actor);
    const alert = await db.notification.findFirstOrThrow({ where: { appointmentId: appointment.id, recipient: "5586988100001" } });
    expect(alert.body).toContain("Novo agendamento pelo site");
    expect(alert.body).toContain("Maria Santos");
    expect(alert.body).toContain("Formatura");
  });
});

describe("Planilha", () => {
  it("mostra quem está com cada peça e exporta o Excel com todas as abas", async () => {
    const r = await RentalService.create(base({ deliveryMethod: "DELIVERY", deliveryAddress: "Rua A, 10" }), actor);
    const rentals = await SpreadsheetService.sheet("locacoes");
    expect(rentals.rows).toHaveLength(1);
    expect(rentals.rows[0]).toMatchObject({ numero: "#000001", cliente: "João Silva", roupas: "Terno Preto (48)", entrega: "Entrega", endereco: "Rua A, 10", saldo: 250 });

    const stock = await SpreadsheetService.sheet("estoque", { status: "RESERVED" });
    expect(stock.rows).toHaveLength(1);
    expect(stock.rows[0]).toMatchObject({ codigo: "TER-PRE-048-001", comQuem: "João Silva", locacao: "#000001" });

    await RentalService.cancel(r.id, "teste", actor);
    expect((await SpreadsheetService.sheet("estoque", { q: "joão" })).rows).toHaveLength(0);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await SpreadsheetService.workbook("completa")) as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Agendamentos", "Locações", "Estoque", "Clientes"]);
    expect(wb.getWorksheet("Estoque")!.rowCount).toBe(3);
  });
});
