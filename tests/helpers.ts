import { db } from "@/database/client";
import { DEFAULT_TEMPLATES } from "@/services/notification/templates";

/** Limpa todas as tabelas do banco de TESTE e recria a configuração mínima. */
export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await db.storeSettings.create({ data: { id: "store", slotDurationMin: 30, slotBufferMin: 10, minLeadMinutes: 0, maxAdvanceDays: 365, simultaneousSlots: 1 } });
  await db.businessHours.createMany({ data: Array.from({ length: 7 }, (_, weekday) => ({ weekday, isOpen: true, openTime: "08:00", closeTime: "18:00" })) });
  for (const t of DEFAULT_TEMPLATES) await db.notificationTemplate.create({ data: { event: t.event, name: t.name, body: t.body, waParams: t.waParams } });
  const service = await db.service.create({ data: { name: "Atendimento para aluguel de terno", durationMin: 30 } });
  return { service };
}

export const actor = { userId: null, label: "Teste" };
