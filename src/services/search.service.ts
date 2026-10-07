import "server-only";
import { db } from "@/database/client";

/** Busca global do painel: clientes, agendamentos, peças e produtos. */
export const SearchService = {
  async global(q: string) {
    const term = q.trim();
    if (term.length < 2) return { customers: [], appointments: [], items: [], products: [] };
    const digits = term.replace(/\D/g, "");
    const [customers, appointments, items, products] = await Promise.all([
      db.customer.findMany({
        where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, ...(digits.length >= 4 ? [{ whatsapp: { contains: digits } }] : [])] },
        take: 8,
        orderBy: { name: "asc" },
      }),
      db.appointment.findMany({
        where: { OR: [{ code: { contains: term, mode: "insensitive" } }, { customer: { name: { contains: term, mode: "insensitive" } } }] },
        take: 8,
        orderBy: { startsAt: "desc" },
        include: { customer: { select: { name: true } }, service: { select: { name: true } } },
      }),
      db.inventoryItem.findMany({
        where: { active: true, code: { contains: term, mode: "insensitive" } },
        take: 8,
        include: { product: { select: { name: true } } },
      }),
      db.product.findMany({ where: { name: { contains: term, mode: "insensitive" } }, take: 8, include: { category: { select: { name: true } } } }),
    ]);
    return { customers, appointments, items, products };
  },
};
