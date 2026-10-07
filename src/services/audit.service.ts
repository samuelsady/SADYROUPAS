import "server-only";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/database/client";

export type Actor = { userId: string | null; label: string; ip?: string | null };

export const SYSTEM_ACTOR: Actor = { userId: null, label: "Sistema" };
export const websiteActor = (ip?: string | null): Actor => ({ userId: null, label: "Site (cliente)", ip });

type AuditEntry = {
  action: string;
  entity: string;
  entityId?: string | null;
  summary?: string;
  data?: Prisma.InputJsonValue;
};

/**
 * Trilha de auditoria: quem, o quê, quando e qual registro.
 * Use dentro da mesma transação da operação para que auditoria e dado
 * nunca fiquem inconsistentes.
 */
export const AuditService = {
  async log(actor: Actor, entry: AuditEntry, tx: Tx = db) {
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        actorLabel: actor.label,
        ip: actor.ip ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        data: entry.data,
      },
    });
  },
};
