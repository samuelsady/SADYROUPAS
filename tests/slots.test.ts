import { describe, expect, it } from "vitest";
import { generateSlots } from "@/services/availability/slots";
import { zonedToUtc } from "@/utils/datetime";

const TZ = "America/Fortaleza";
const base = {
  dateKey: "2026-10-19", // segunda-feira
  tz: TZ,
  hours: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  rules: { durationMin: 30, slotDurationMin: 30, bufferMin: 10, lanes: 1, minLeadMinutes: 0 },
  appointments: [],
  blocked: [],
  now: new Date("2026-10-01T00:00:00Z"),
};

describe("generateSlots", () => {
  it("gera a grade a partir de duração + intervalo (08:00, 08:40, 09:20…)", () => {
    const slots = generateSlots(base);
    expect(slots.slice(0, 4).map((s) => s.time)).toEqual(["08:00", "08:40", "09:20", "10:00"]);
    expect(slots.at(-1)!.time).toBe("17:20");
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("converte para UTC no fuso da loja (UTC-3)", () => {
    const [first] = generateSlots(base);
    expect(first!.startsAt.toISOString()).toBe("2026-10-19T11:00:00.000Z");
    expect(first!.blockedUntil.toISOString()).toBe("2026-10-19T11:40:00.000Z");
  });

  it("não gera horários em dia fechado", () => {
    expect(generateSlots({ ...base, hours: { ...base.hours, isOpen: false } })).toEqual([]);
  });

  it("marca como ocupado o horário que conflita com um agendamento (incluindo o intervalo)", () => {
    const start = zonedToUtc("2026-10-19", "08:40", TZ);
    const slots = generateSlots({ ...base, appointments: [{ start, end: new Date(start.getTime() + 40 * 60_000), lane: 0 }] });
    expect(slots.find((s) => s.time === "08:00")!.available).toBe(true);
    expect(slots.find((s) => s.time === "08:40")!.reason).toBe("BOOKED");
    expect(slots.find((s) => s.time === "09:20")!.available).toBe(true);
  });

  it("com 2 atendimentos simultâneos, o horário só lota quando as duas lanes estão ocupadas", () => {
    const start = zonedToUtc("2026-10-19", "08:00", TZ);
    const end = new Date(start.getTime() + 40 * 60_000);
    const rules = { ...base.rules, lanes: 2 };
    const one = generateSlots({ ...base, rules, appointments: [{ start, end, lane: 0 }] });
    expect(one[0]!.available).toBe(true);
    expect(one[0]!.freeLanes).toEqual([1]);
    const two = generateSlots({ ...base, rules, appointments: [{ start, end, lane: 0 }, { start, end, lane: 1 }] });
    expect(two[0]!.available).toBe(false);
  });

  it("respeita períodos bloqueados e pausa de almoço", () => {
    const blocked = [{ start: zonedToUtc("2026-10-19", "14:00", TZ), end: zonedToUtc("2026-10-19", "15:00", TZ) }];
    const slots = generateSlots({ ...base, blocked, hours: { ...base.hours, breakStart: "12:00", breakEnd: "13:00" } });
    expect(slots.find((s) => s.time === "14:00")!.reason).toBe("BLOCKED");
    expect(slots.some((s) => s.time === "12:00" || s.time === "11:40")).toBe(false);
  });

  it("aplica a antecedência mínima", () => {
    const now = zonedToUtc("2026-10-19", "09:00", TZ);
    const slots = generateSlots({ ...base, now, rules: { ...base.rules, minLeadMinutes: 60 } });
    expect(slots.find((s) => s.time === "09:20")!.reason).toBe("PAST");
    expect(slots.find((s) => s.time === "10:00")!.available).toBe(true);
  });

  it("não ultrapassa o fechamento com serviços longos", () => {
    const slots = generateSlots({ ...base, rules: { ...base.rules, durationMin: 90 } });
    expect(slots.at(-1)!.time).toBe("16:00");
  });
});
