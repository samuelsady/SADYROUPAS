import "server-only";
import { cache } from "react";
import type { BusinessHours, StoreSettings } from "@prisma/client";
import { db, type Tx } from "@/database/client";

export const DEFAULT_HOURS: Omit<BusinessHours, "weekday">[] = [
  { isOpen: false, openTime: "09:00", closeTime: "18:00", breakStart: null, breakEnd: null }, // domingo
  { isOpen: true, openTime: "09:00", closeTime: "17:00", breakStart: null, breakEnd: null },
  { isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: null, breakEnd: null },
  { isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: null, breakEnd: null },
  { isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: null, breakEnd: null },
  { isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: null, breakEnd: null },
  { isOpen: true, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null }, // sábado
];

async function getInTx(tx: Tx): Promise<StoreSettings> {
  const found = await tx.storeSettings.findUnique({ where: { id: "store" } });
  return found ?? tx.storeSettings.upsert({ where: { id: "store" }, create: { id: "store" }, update: {} });
}

async function hoursInTx(tx: Tx): Promise<BusinessHours[]> {
  const rows = await tx.businessHours.findMany({ orderBy: { weekday: "asc" } });
  if (rows.length === 7) return rows;
  await tx.businessHours.createMany({ data: DEFAULT_HOURS.map((h, weekday) => ({ weekday, ...h })), skipDuplicates: true });
  return tx.businessHours.findMany({ orderBy: { weekday: "asc" } });
}

export const SettingsService = {
  /** Configurações da loja (cria a linha padrão na primeira leitura). Deduplicado por requisição. */
  get: cache(() => getInTx(db)),
  getInTx,
  businessHours: cache(() => hoursInTx(db)),
  hoursInTx,
};
