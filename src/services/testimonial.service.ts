import "server-only";
import { z } from "zod";
import { db } from "@/database/client";
import { notFound } from "@/lib/errors";
import { AuditService, type Actor } from "./audit.service";
import { StorageService } from "./storage/storage.service";

/** Depoimentos reais de clientes — só aparecem no site os que a loja cadastrar e deixar ativos. */
const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(80),
  detail: z.string().trim().max(80).optional().transform((v) => v || null),
  text: z.string().trim().min(10, "Escreva o depoimento.").max(600, "Depoimento muito longo (até 600 caracteres)."),
});

export const TestimonialService = {
  listPublic() {
    return db.testimonial.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 9 });
  },

  listAll() {
    return db.testimonial.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
  },

  async create(raw: unknown, photo: File | null, actor: Actor) {
    const input = schema.parse(raw);
    const stored = photo && photo.size > 0 ? await StorageService.uploadImage(photo, "depoimentos") : null;
    const t = await db.$transaction(async (tx) => {
      const created = await tx.testimonial.create({ data: { ...input, photoUrl: stored?.url ?? null, photoKey: stored?.key ?? null } });
      await AuditService.log(actor, { action: "testimonial.created", entity: "Testimonial", entityId: created.id, summary: `Depoimento de ${created.name} adicionado` }, tx);
      return created;
    });
    return t;
  },

  async toggle(id: string, actor: Actor) {
    const t = await db.testimonial.findUnique({ where: { id } });
    if (!t) throw notFound("Depoimento");
    await db.$transaction(async (tx) => {
      await tx.testimonial.update({ where: { id }, data: { active: !t.active } });
      await AuditService.log(actor, { action: t.active ? "testimonial.hidden" : "testimonial.shown", entity: "Testimonial", entityId: id, summary: `Depoimento de ${t.name} ${t.active ? "ocultado" : "publicado"}` }, tx);
    });
  },

  async remove(id: string, actor: Actor) {
    const t = await db.testimonial.findUnique({ where: { id } });
    if (!t) throw notFound("Depoimento");
    await db.$transaction(async (tx) => {
      await tx.testimonial.delete({ where: { id } });
      await AuditService.log(actor, { action: "testimonial.removed", entity: "Testimonial", entityId: id, summary: `Depoimento de ${t.name} removido` }, tx);
    });
    await StorageService.remove(t.photoKey).catch(() => undefined);
  },
};
