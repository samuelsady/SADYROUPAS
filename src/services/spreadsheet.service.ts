import "server-only";
import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { db } from "@/database/client";
import { appointmentSourceLabel, appointmentStatusLabel, inventoryStatusLabel, rentalStatusLabel } from "@/lib/labels";
import { formatRentalNumber } from "@/utils/codes";
import { addDaysKey, dayRangeUtc, isDateKey, toDateKey, toTimeKey, todayKey } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";
import { DELIVERY_LABEL } from "./rental-workflow.service";
import { SettingsService } from "./settings.service";

/**
 * Planilha de controle da loja: as mesmas linhas alimentam a tela
 * (/admin/planilha) e o arquivo .xlsx baixado.
 */

export const SHEETS = [
  { key: "agendamentos", label: "Agendamentos" },
  { key: "locacoes", label: "Locações" },
  { key: "estoque", label: "Estoque" },
  { key: "clientes", label: "Clientes" },
] as const;
export type SheetKey = (typeof SHEETS)[number]["key"];

export function isSheetKey(s: string | undefined): s is SheetKey {
  return SHEETS.some((x) => x.key === s);
}

type CellType = "text" | "date" | "time" | "money" | "int";
export type Column = { key: string; header: string; width: number; type?: CellType; wide?: boolean };
export type Cell = string | number | null;
export type Row = Record<string, Cell> & { _href?: string; _tone?: "late" | "muted" | null };
export type Sheet = { key: SheetKey; title: string; columns: Column[]; rows: Row[]; total: number };

export type SheetFilters = { de?: string; ate?: string; status?: string; q?: string };

const LIMIT = 5000;

/** Período padrão: 30 dias para trás e 60 para frente (agendamentos e locações). */
export function defaultPeriod(tz: string) {
  const today = todayKey(tz);
  return { de: addDaysKey(today, -30), ate: addDaysKey(today, 60) };
}

function period(f: SheetFilters, tz: string) {
  const def = defaultPeriod(tz);
  const de = f.de && isDateKey(f.de) ? f.de : def.de;
  const ate = f.ate && isDateKey(f.ate) ? f.ate : def.ate;
  return de <= ate ? { de, ate } : { de: ate, ate: de };
}

const dateKeyOf = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const money = (v: Prisma.Decimal | number) => Math.round(Number(v) * 100) / 100;
const q = (f: SheetFilters) => f.q?.trim().slice(0, 80) || undefined;

/* ----------------------------------------------------------------------------- */

async function appointments(f: SheetFilters, tz: string): Promise<Sheet> {
  const { de, ate } = period(f, tz);
  const term = q(f);
  const where: Prisma.AppointmentWhereInput = {
    startsAt: { gte: dayRangeUtc(de, tz).start, lt: dayRangeUtc(ate, tz).end },
    ...(f.status && f.status in appointmentStatusLabel ? { status: f.status as keyof typeof appointmentStatusLabel } : {}),
    ...(term
      ? {
          OR: [
            { code: { contains: term, mode: "insensitive" } },
            { customer: { name: { contains: term, mode: "insensitive" } } },
            { customer: { whatsapp: { contains: term.replace(/\D/g, "") || term } } },
            { items: { some: { inventoryItem: { code: { contains: term, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.appointment.findMany({
      where,
      orderBy: { startsAt: "asc" },
      take: LIMIT,
      include: {
        customer: true,
        service: true,
        product: { select: { name: true } },
        rental: { select: { number: true } },
        items: { include: { product: { select: { name: true } }, inventoryItem: { select: { code: true } } } },
      },
    }),
    db.appointment.count({ where }),
  ]);
  return {
    key: "agendamentos",
    title: "Agendamentos",
    total,
    columns: [
      { key: "data", header: "Data", width: 12, type: "date" },
      { key: "hora", header: "Hora", width: 8, type: "time" },
      { key: "cliente", header: "Cliente", width: 28 },
      { key: "whatsapp", header: "WhatsApp", width: 18 },
      { key: "servico", header: "Atendimento", width: 22 },
      { key: "status", header: "Status", width: 15 },
      { key: "origem", header: "Origem", width: 11 },
      { key: "roupas", header: "Roupas de interesse", width: 40, wide: true },
      { key: "pecas", header: "Peças separadas", width: 24 },
      { key: "locacao", header: "Locação", width: 10 },
      { key: "obs", header: "Observações", width: 36, wide: true },
      { key: "codigo", header: "Código", width: 18 },
      { key: "criado", header: "Agendado em", width: 12, type: "date" },
    ],
    rows: rows.map((a) => {
      const interest = [a.product?.name, ...a.items.map((i) => i.product.name + (i.size ? ` (${i.size})` : ""))].filter(Boolean);
      return {
        _href: `/admin/agendamentos/${a.id}`,
        _tone: a.status === "CANCELLED" || a.status === "NO_SHOW" ? "muted" : null,
        data: toDateKey(a.startsAt, tz),
        hora: toTimeKey(a.startsAt, tz),
        cliente: a.customer.name,
        whatsapp: formatPhone(a.customer.whatsapp),
        servico: a.service.name,
        status: appointmentStatusLabel[a.status],
        origem: appointmentSourceLabel[a.source],
        roupas: [...new Set(interest)].join(", ") || null,
        pecas: a.items.map((i) => i.inventoryItem?.code).filter(Boolean).join(", ") || null,
        locacao: a.rental ? formatRentalNumber(a.rental.number) : null,
        obs: a.notes,
        codigo: a.code,
        criado: toDateKey(a.createdAt, tz),
      };
    }),
  };
}

async function rentals(f: SheetFilters, tz: string): Promise<Sheet> {
  const { de, ate } = period(f, tz);
  const today = todayKey(tz);
  const term = q(f);
  const num = term && /^#?\d+$/.test(term) ? Number(term.replace("#", "")) : undefined;
  const statusFilter: Prisma.RentalWhereInput =
    f.status === "ATRASADAS"
      ? { status: { in: ["PICKED_UP", "OVERDUE"] }, returnDueDate: { lt: new Date(`${today}T00:00:00Z`) } }
      : f.status && f.status in rentalStatusLabel
        ? { status: f.status as keyof typeof rentalStatusLabel }
        : {};
  const where: Prisma.RentalWhereInput = {
    // Locações que tocam o período (retirada até "ate" e devolução a partir de "de")
    pickupDate: { lte: new Date(`${ate}T00:00:00Z`) },
    returnDueDate: { gte: new Date(`${de}T00:00:00Z`) },
    ...statusFilter,
    ...(term
      ? {
          OR: [
            ...(num ? [{ number: num }] : []),
            { eventName: { contains: term, mode: "insensitive" } },
            { customer: { name: { contains: term, mode: "insensitive" } } },
            { customer: { whatsapp: { contains: term.replace(/\D/g, "") || term } } },
            { items: { some: { inventoryItem: { code: { contains: term, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.rental.findMany({
      where,
      orderBy: [{ pickupDate: "asc" }, { number: "asc" }],
      take: LIMIT,
      include: {
        customer: true,
        lateFees: true,
        items: { include: { inventoryItem: { include: { product: { select: { name: true } } } } } },
      },
    }),
    db.rental.count({ where }),
  ]);
  return {
    key: "locacoes",
    title: "Locações",
    total,
    columns: [
      { key: "numero", header: "Nº", width: 9 },
      { key: "cliente", header: "Cliente", width: 28 },
      { key: "whatsapp", header: "WhatsApp", width: 18 },
      { key: "roupas", header: "Roupas alugadas", width: 44, wide: true },
      { key: "pecas", header: "Peças", width: 24 },
      { key: "evento", header: "Evento", width: 22 },
      { key: "dataEvento", header: "Data do evento", width: 13, type: "date" },
      { key: "retirada", header: "Retirada", width: 12, type: "date" },
      { key: "devolucao", header: "Devolução", width: 12, type: "date" },
      { key: "entrega", header: "Entrega", width: 16 },
      { key: "endereco", header: "Endereço / observações", width: 36, wide: true },
      { key: "status", header: "Status", width: 13 },
      { key: "total", header: "Total", width: 12, type: "money" },
      { key: "pago", header: "Pago", width: 12, type: "money" },
      { key: "saldo", header: "Saldo", width: 12, type: "money" },
      { key: "retiradoEm", header: "Retirado em", width: 12, type: "date" },
      { key: "devolvidoEm", header: "Devolvido em", width: 12, type: "date" },
    ],
    rows: rows.map((r) => {
      const fees = r.lateFees.filter((x) => !x.waived).reduce((s, x) => s + Number(x.amount), 0);
      const due = money(Number(r.total) - Number(r.discount) + fees);
      const returnKey = dateKeyOf(r.returnDueDate)!;
      const late = (r.status === "PICKED_UP" || r.status === "OVERDUE") && returnKey < today;
      return {
        _href: `/admin/locacoes/${r.id}`,
        _tone: late ? "late" : r.status === "CANCELLED" ? "muted" : null,
        numero: formatRentalNumber(r.number),
        cliente: r.customer.name,
        whatsapp: formatPhone(r.customer.whatsapp),
        roupas: r.items.map((i) => `${i.inventoryItem.product.name} (${i.inventoryItem.size})`).join(", "),
        pecas: r.items.map((i) => i.inventoryItem.code).join(", "),
        evento: r.eventName,
        dataEvento: dateKeyOf(r.eventDate),
        retirada: dateKeyOf(r.pickupDate),
        devolucao: returnKey,
        entrega: DELIVERY_LABEL[r.deliveryMethod],
        endereco: [r.deliveryAddress, r.deliveryNotes].filter(Boolean).join(" — ") || null,
        status: late ? "Atrasado" : rentalStatusLabel[r.status],
        total: due,
        pago: money(r.paid),
        saldo: r.status === "CANCELLED" ? 0 : Math.max(0, money(due - Number(r.paid))),
        retiradoEm: r.pickedUpAt ? toDateKey(r.pickedUpAt, tz) : null,
        devolvidoEm: r.returnedAt ? toDateKey(r.returnedAt, tz) : null,
      };
    }),
  };
}

async function inventory(f: SheetFilters): Promise<Sheet> {
  const term = q(f);
  const where: Prisma.InventoryItemWhereInput = {
    active: true,
    ...(f.status && f.status in inventoryStatusLabel ? { status: f.status as keyof typeof inventoryStatusLabel } : {}),
    ...(term
      ? {
          OR: [
            { code: { contains: term, mode: "insensitive" } },
            { color: { contains: term, mode: "insensitive" } },
            { product: { name: { contains: term, mode: "insensitive" } } },
            { rentalItems: { some: { active: true, rental: { customer: { name: { contains: term, mode: "insensitive" } } } } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.inventoryItem.findMany({
      where,
      orderBy: [{ product: { name: "asc" } }, { size: "asc" }, { code: "asc" }],
      take: LIMIT,
      include: {
        product: { select: { name: true, category: { select: { name: true } } } },
        rentalItems: {
          where: { active: true, rental: { status: { notIn: ["CANCELLED", "RETURNED", "CLOSED"] } } },
          orderBy: { reservedFrom: "asc" },
          take: 1,
          include: { rental: { select: { id: true, number: true, pickupDate: true, returnDueDate: true, customer: { select: { name: true, whatsapp: true } } } } },
        },
      },
    }),
    db.inventoryItem.count({ where }),
  ]);
  return {
    key: "estoque",
    title: "Estoque",
    total,
    columns: [
      { key: "codigo", header: "Código", width: 16 },
      { key: "roupa", header: "Roupa", width: 32 },
      { key: "categoria", header: "Categoria", width: 16 },
      { key: "tamanho", header: "Tamanho", width: 9 },
      { key: "cor", header: "Cor", width: 16 },
      { key: "status", header: "Status", width: 13 },
      { key: "comQuem", header: "Com quem / reservado para", width: 28 },
      { key: "contato", header: "WhatsApp", width: 18 },
      { key: "locacao", header: "Locação", width: 10 },
      { key: "retirada", header: "Retirada", width: 12, type: "date" },
      { key: "devolucao", header: "Volta em", width: 12, type: "date" },
      { key: "local", header: "Local", width: 22 },
      { key: "vezes", header: "Nº de locações", width: 10, type: "int" },
    ],
    rows: rows.map((i) => {
      const r = i.rentalItems[0]?.rental;
      return {
        _href: `/admin/estoque/${encodeURIComponent(i.code)}`,
        _tone: i.status === "LOST" || i.status === "UNAVAILABLE" ? "muted" : null,
        codigo: i.code,
        roupa: i.product.name,
        categoria: i.product.category.name,
        tamanho: i.size,
        cor: i.color,
        status: inventoryStatusLabel[i.status],
        comQuem: r?.customer.name ?? null,
        contato: r ? formatPhone(r.customer.whatsapp) : null,
        locacao: r ? formatRentalNumber(r.number) : null,
        retirada: r ? dateKeyOf(r.pickupDate) : null,
        devolucao: r ? dateKeyOf(r.returnDueDate) : null,
        local: i.location,
        vezes: i.rentalCount,
      };
    }),
  };
}

async function customers(f: SheetFilters, tz: string): Promise<Sheet> {
  const term = q(f);
  const where: Prisma.CustomerWhereInput = term
    ? {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { whatsapp: { contains: term.replace(/\D/g, "") || term } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      }
    : {};
  const [rows, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { name: "asc" },
      take: LIMIT,
      include: {
        _count: { select: { appointments: true, rentals: true } },
        appointments: { orderBy: { startsAt: "desc" }, take: 1, select: { startsAt: true } },
        rentals: { orderBy: { pickupDate: "desc" }, take: 1, select: { pickupDate: true } },
      },
    }),
    db.customer.count({ where }),
  ]);
  return {
    key: "clientes",
    title: "Clientes",
    total,
    columns: [
      { key: "nome", header: "Nome", width: 30 },
      { key: "whatsapp", header: "WhatsApp", width: 18 },
      { key: "email", header: "E-mail", width: 28 },
      { key: "agendamentos", header: "Agendamentos", width: 13, type: "int" },
      { key: "locacoes", header: "Locações", width: 10, type: "int" },
      { key: "ultimoAgendamento", header: "Último agendamento", width: 15, type: "date" },
      { key: "ultimaLocacao", header: "Última locação", width: 15, type: "date" },
      { key: "obs", header: "Observações", width: 36, wide: true },
      { key: "cadastro", header: "Cliente desde", width: 13, type: "date" },
    ],
    rows: rows.map((c) => ({
      _href: `/admin/clientes/${c.id}`,
      nome: c.name,
      whatsapp: formatPhone(c.whatsapp),
      email: c.email,
      agendamentos: c._count.appointments,
      locacoes: c._count.rentals,
      ultimoAgendamento: c.appointments[0] ? toDateKey(c.appointments[0].startsAt, tz) : null,
      ultimaLocacao: dateKeyOf(c.rentals[0]?.pickupDate),
      obs: c.notes,
      cadastro: toDateKey(c.createdAt, tz),
    })),
  };
}

/* ----------------------------------------------------------------------------- */

const GOLD = "FFC2A06A";
const INK = "FF0E0C0A";
const IVORY = "FFF6F1E8";

function addWorksheet(wb: ExcelJS.Workbook, sheet: Sheet) {
  const ws = wb.addWorksheet(sheet.title, { views: [{ state: "frozen", ySplit: 1 }], properties: { tabColor: { argb: GOLD } } });
  ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "medium", color: { argb: GOLD } } };
  });

  for (const row of sheet.rows) {
    const values: Record<string, unknown> = {};
    for (const c of sheet.columns) {
      const v = row[c.key];
      // Datas viram datas de verdade no Excel (ordenáveis e filtráveis)
      values[c.key] = c.type === "date" && typeof v === "string" ? new Date(`${v}T00:00:00Z`) : v ?? "";
    }
    const r = ws.addRow(values);
    if (row._tone === "late") r.font = { color: { argb: "FFB42318" }, bold: true };
    else if (row._tone === "muted") r.font = { color: { argb: "FF8A8178" } };
  }

  sheet.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (c.type === "date") col.numFmt = "dd/mm/yyyy";
    if (c.type === "money") col.numFmt = '"R$" #,##0.00';
    if (c.type === "int" || c.type === "money" || c.type === "date" || c.type === "time") col.alignment = { horizontal: "center" };
    if (c.wide) col.alignment = { wrapText: true, vertical: "top" };
  });

  // Faixas alternadas para facilitar a leitura
  for (let i = 2; i <= ws.rowCount; i++) {
    if (i % 2 === 1) ws.getRow(i).eachCell({ includeEmpty: true }, (cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: IVORY } }));
  }
  if (sheet.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
}

export const SpreadsheetService = {
  async sheet(key: SheetKey, filters: SheetFilters = {}): Promise<Sheet> {
    const tz = (await SettingsService.get()).timezone;
    switch (key) {
      case "agendamentos":
        return appointments(filters, tz);
      case "locacoes":
        return rentals(filters, tz);
      case "estoque":
        return inventory(filters);
      case "clientes":
        return customers(filters, tz);
    }
  },

  /** Arquivo .xlsx: uma aba (com os filtros da tela) ou todas ("completa"). */
  async workbook(key: SheetKey | "completa", filters: SheetFilters = {}) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Sady Roupas";
    wb.created = new Date();
    const keys = key === "completa" ? SHEETS.map((s) => s.key) : [key];
    for (const k of keys) addWorksheet(wb, await SpreadsheetService.sheet(k, key === "completa" ? {} : filters));
    return Buffer.from(await wb.xlsx.writeBuffer());
  },
};
