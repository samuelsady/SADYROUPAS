import { describe, expect, it } from "vitest";
import { buildAppointmentReceipt } from "@/services/print/receipt";
import { calculateLateFee, paymentStatus, periodsOverlap } from "@/services/rental.service";
import { buildInventoryCode, formatAppointmentCode } from "@/utils/codes";
import { addDaysKey, formatDate, startOfWeekKey, toTimeKey, zonedToUtc } from "@/utils/datetime";
import { formatPhone, maskPhone, normalizePhone } from "@/utils/phone";
import { buildIcs } from "@/utils/ics";
import { renderTemplate } from "@/utils/text";

describe("telefone", () => {
  it("normaliza números brasileiros com e sem DDI", () => {
    expect(normalizePhone("(86) 99999-0000")).toBe("5586999990000");
    expect(normalizePhone("+55 86 98810-0001")).toBe("5586988100001");
    expect(normalizePhone("8632310219")).toBe("558632310219");
    expect(normalizePhone("123")).toBeNull();
  });
  it("formata e mascara", () => {
    expect(formatPhone("5586999990000")).toBe("(86) 99999-0000");
    expect(maskPhone("5586999990000")).toBe("(86) 9XXXX-0000");
  });
});

describe("datas", () => {
  it("converte horário local de Teresina para UTC e volta", () => {
    const d = zonedToUtc("2026-10-18", "14:30", "America/Fortaleza");
    expect(d.toISOString()).toBe("2026-10-18T17:30:00.000Z");
    expect(toTimeKey(d)).toBe("14:30");
    expect(formatDate(d)).toBe("18/10/2026");
  });
  it("calcula semana e soma de dias", () => {
    expect(startOfWeekKey("2026-10-18")).toBe("2026-10-12"); // domingo → segunda anterior
    expect(addDaysKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("códigos", () => {
  it("gera código de agendamento e de peça", () => {
    expect(formatAppointmentCode(2026, 124)).toBe("SADY-2026-000124");
    expect(buildInventoryCode("Ternos", "Preto", "42", 1)).toBe("TER-PRE-042-001");
    expect(buildInventoryCode("Beca", "Azul", "M", 3)).toBe("BEC-AZU-00M-003");
  });
});

describe("comprovante térmico", () => {
  const text = buildAppointmentReceipt({
    companyName: "Sady Roupas",
    code: "SADY-2026-000124",
    customerName: "João Silva",
    customerPhone: "(86) 9XXXX-0000",
    service: "Atendimento para aluguel de terno",
    date: "18/10/2026",
    time: "14:30",
    notes: "Observação longa ".repeat(10),
    createdAt: "07/10/2026 14:20",
  });
  it("respeita 48 colunas e remove acentos", () => {
    for (const line of text.split("\n")) expect(line.length).toBeLessThanOrEqual(48);
    expect(text).toContain("COMPROVANTE DE AGENDAMENTO");
    expect(text).toContain("Joao Silva");
    expect(text).toContain("SADY-2026-000124");
  });
  it("respeita 32 colunas no formato 58mm", () => {
    const narrow = buildAppointmentReceipt({ companyName: "Sady Roupas", code: "X", customerName: "Maria", customerPhone: "", service: "Prova de roupa", date: "", time: "", createdAt: "" }, "THERMAL_58MM");
    for (const line of narrow.split("\n")) expect(line.length).toBeLessThanOrEqual(32);
  });
});

describe("mensagens", () => {
  it("substitui variáveis do template", () => {
    expect(renderTemplate("Olá, {nome}! {data} às {horario} {desconhecida}", { nome: "João", data: "18/10/2026", horario: "14:30" })).toBe("Olá, João! 18/10/2026 às 14:30 {desconhecida}");
  });
  it("gera .ics válido", () => {
    const ics = buildIcs({ uid: "SADY-1", start: new Date("2026-10-18T17:30:00Z"), end: new Date("2026-10-18T18:00:00Z"), title: "Prova; terno, azul" });
    expect(ics).toContain("DTSTART:20261018T173000Z");
    expect(ics).toContain("SUMMARY:Prova\; terno\\, azul");
  });
});

describe("regras de locação (V2)", () => {
  const policy = { enabled: true, graceDays: 0, fixedPerDay: 20, percentPerDay: 0, maxAmount: null };
  it("multa por atraso: prevista 20/10, devolvida 23/10, R$ 20/dia = R$ 60", () => {
    expect(calculateLateFee({ returnDueKey: "2026-10-20", returnedKey: "2026-10-23", rentalTotal: 350, policy })).toEqual({ days: 3, amount: 60 });
  });
  it("aplica tolerância, percentual e teto", () => {
    expect(calculateLateFee({ returnDueKey: "2026-10-20", returnedKey: "2026-10-23", rentalTotal: 350, policy: { ...policy, graceDays: 1 } }).amount).toBe(40);
    expect(calculateLateFee({ returnDueKey: "2026-10-20", returnedKey: "2026-10-22", rentalTotal: 300, policy: { ...policy, fixedPerDay: 0, percentPerDay: 10 } }).amount).toBe(60);
    expect(calculateLateFee({ returnDueKey: "2026-10-20", returnedKey: "2026-10-30", rentalTotal: 300, policy: { ...policy, maxAmount: 100 } }).amount).toBe(100);
    expect(calculateLateFee({ returnDueKey: "2026-10-20", returnedKey: "2026-10-19", rentalTotal: 300, policy }).amount).toBe(0);
  });
  it("detecta sobreposição de períodos (Pedro 18→22 conflita com João 16→20)", () => {
    expect(periodsOverlap({ from: "2026-10-16", until: "2026-10-20" }, { from: "2026-10-18", until: "2026-10-22" })).toBe(true);
    expect(periodsOverlap({ from: "2026-10-16", until: "2026-10-20" }, { from: "2026-10-21", until: "2026-10-22" })).toBe(false);
  });
  it("status de pagamento", () => {
    expect(paymentStatus({ total: 350, discount: 0, paid: 100, lateFees: 0 })).toEqual({ remaining: 250, status: "PARTIAL" });
    expect(paymentStatus({ total: 350, discount: 50, paid: 300, lateFees: 0 }).status).toBe("PAID");
    expect(paymentStatus({ total: 350, discount: 0, paid: 0, lateFees: 60 })).toEqual({ remaining: 410, status: "PENDING" });
  });
});
