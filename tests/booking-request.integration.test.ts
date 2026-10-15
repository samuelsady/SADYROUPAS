import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/database/client";
import { flushBackground } from "@/lib/background";
import { AppointmentService } from "@/services/appointment.service";
import { bookingRequestMessage } from "@/services/notification/booking-request";
import { addDaysKey, todayKey } from "@/utils/datetime";
import { actor, resetDb } from "./helpers";

let serviceId: string;
const today = todayKey("America/Fortaleza");

beforeEach(async () => {
  ({ service: { id: serviceId } } = await resetDb());
  const category = await db.category.create({ data: { slug: "ternos", name: "Ternos" } });
  await db.product.create({ data: { slug: "terno-preto", name: "Terno Preto", categoryId: category.id, sizes: ["48"] } });
});
afterEach(() => flushBackground());
afterAll(() => db.$disconnect());

const request = (overrides: Record<string, unknown> = {}) => ({
  name: "Bruno Alves",
  whatsapp: "86999992222",
  serviceId,
  date: addDaysKey(today, 3),
  time: "10:00",
  eventRole: "padrinho",
  eventDate: addDaysKey(today, 40),
  piecesNeeded: ["terno", "gravata"],
  items: [{ slug: "terno-preto", size: "48" }],
  notes: "Padrinho de casamento",
  ...overrides,
});

describe("Pedido de agendamento pelo site", () => {
  it("fica aguardando confirmação, guarda o evento e avisa que o pedido foi recebido", async () => {
    const { appointment } = await AppointmentService.createFromWebsite(request(), actor);
    expect(appointment.status).toBe("SCHEDULED");
    expect(appointment.confirmedAt).toBeNull();
    expect(appointment.eventRole).toBe("padrinho");
    expect(appointment.piecesNeeded).toEqual(["terno", "gravata"]);
    const msg = await db.notification.findFirstOrThrow({ where: { appointmentId: appointment.id, event: "APPOINTMENT_CREATED", recipient: "5586999992222" } });
    expect(msg.body).toContain("Recebemos seu pedido");
  });

  it("a mensagem pronta para o WhatsApp da loja traz nome, número, papel, evento, horário e peças", async () => {
    const { appointment } = await AppointmentService.createFromWebsite(request(), actor);
    const full = await AppointmentService.getByPublicToken(appointment.publicToken);
    const text = bookingRequestMessage(full!, { timezone: "America/Fortaleza" });
    expect(text).toContain("Bruno Alves");
    expect(text).toContain("(86) 99999-2222");
    expect(text).toContain("Para: Padrinho");
    expect(text).toContain("Data do evento:");
    expect(text).toContain("às 10:00");
    expect(text).toContain("Terno completo, Gravata");
    expect(text).toContain("Terno Preto (tam. 48)");
    expect(text).toContain(appointment.code);
  });

  it("confirmar o pedido envia a confirmação ao cliente", async () => {
    const { appointment } = await AppointmentService.createFromWebsite(request(), actor);
    const confirmed = await AppointmentService.changeStatus(appointment.id, "CONFIRMED", actor);
    expect(confirmed.status).toBe("CONFIRMED");
    const msg = await db.notification.findFirstOrThrow({ where: { appointmentId: appointment.id, event: "APPOINTMENT_CONFIRMED" } });
    expect(msg.body).toContain("está confirmado");
  });

  it("agendamento feito pela equipe já nasce confirmado", async () => {
    const { appointment } = await AppointmentService.createByStaff({ name: "Bruno Alves", whatsapp: "86999992222", serviceId, date: addDaysKey(today, 3), time: "16:00", source: "WHATSAPP" }, actor);
    expect(appointment.status).toBe("CONFIRMED");
    expect(await db.notification.count({ where: { appointmentId: appointment.id, event: "APPOINTMENT_CONFIRMED" } })).toBe(1);
  });

  it("papel ou peça fora da lista é recusado", async () => {
    await expect(AppointmentService.createFromWebsite(request({ eventRole: "astronauta" }), actor)).rejects.toThrow();
    await expect(AppointmentService.createFromWebsite(request({ piecesNeeded: ["capa"] }), actor)).rejects.toThrow();
  });
});
