import "server-only";
import { db } from "@/database/client";
import { runAfterResponse } from "@/lib/background";
import { notFound } from "@/lib/errors";
import { publicInterestSchema } from "@/lib/schemas";
import { formatPhone } from "@/utils/phone";
import { AuditService, type Actor } from "./audit.service";
import { CustomerService } from "./customer.service";
import { NotificationService } from "./notification/notification.service";
import { SettingsService } from "./settings.service";

/**
 * Interessados: quem mostrou interesse e ainda precisa de atenção da loja.
 * - Novos: deixaram nome e WhatsApp com a lista de provas, sem agendar.
 * - Agendados: têm atendimento marcado (com as roupas que querem provar).
 * - Provaram e não alugaram: atendimento concluído sem locação depois — para retornar.
 * - Alugaram: locações recentes.
 */

const DAY = 24 * 60 * 60 * 1000;
const FOLLOW_UP_DAYS = 60;
const RENTED_DAYS = 30;

const productSelect = { name: true, slug: true, images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } } };

export type InterestPiece = { name: string; slug: string; size: string | null; image: string | null };

async function resolveItems(requested: { slug: string; size: string | null }[]) {
  const products = await db.product.findMany({ where: { slug: { in: requested.map((r) => r.slug) }, active: true }, select: { id: true, slug: true, sizes: true } });
  const items: { productId: string; size: string | null }[] = [];
  for (const r of requested) {
    const product = products.find((p) => p.slug === r.slug);
    if (!product) continue;
    const size = r.size && product.sizes.includes(r.size) ? r.size : null;
    if (items.some((i) => i.productId === product.id && i.size === size)) continue;
    items.push({ productId: product.id, size });
  }
  return items;
}

export const InterestService = {
  /** "Quero que a loja me chame" — enviado pela lista de provas do site. */
  async createFromWebsite(raw: unknown, actor: Actor) {
    const input = publicInterestSchema.parse(raw);
    const items = await resolveItems(input.items.map((i) => ({ slug: i.slug, size: i.size ?? null })));

    const result = await db.$transaction(async (tx) => {
      const settings = await SettingsService.getInTx(tx);
      const { customer } = await CustomerService.findOrCreate(tx, { name: input.name, whatsapp: input.whatsapp }, { trusted: false });

      // Pedido repetido em menos de um dia: junta as peças no mesmo interesse
      const open = await tx.interest.findFirst({ where: { customerId: customer.id, status: "NEW", createdAt: { gte: new Date(Date.now() - DAY) } }, include: { items: true } });
      const interest = open
        ? await tx.interest.update({
            where: { id: open.id },
            data: {
              message: input.message ?? open.message,
              items: { create: items.filter((i) => !open.items.some((o) => o.productId === i.productId && o.size === i.size)) },
            },
            include: { items: { include: { product: { select: productSelect } } } },
          })
        : await tx.interest.create({
            data: { customerId: customer.id, message: input.message ?? null, items: { create: items } },
            include: { items: { include: { product: { select: productSelect } } } },
          });

      const pieces = interest.items.map((i) => `${i.product.name}${i.size ? ` (${i.size})` : ""}`).join(", ");
      let ownerAlertId: string | null = null;
      if (settings.ownerAlertWhatsapp && settings.whatsapp && settings.whatsappEnabled) {
        const n = await tx.notification.create({
          data: {
            channel: "WHATSAPP",
            event: "INTEREST_CREATED",
            status: "PENDING",
            recipient: settings.whatsapp,
            title: "Aviso para a loja",
            body: `🔔 Cliente pediu contato pelo site\n\n👤 ${customer.name}\n📞 ${formatPhone(customer.whatsapp)}\n👔 Quer provar: ${pieces || "—"}${input.message ? `\n📝 ${input.message}` : ""}`,
            customerId: customer.id,
          },
        });
        ownerAlertId = n.id;
      }
      await NotificationService.alert(tx, { event: "INTEREST_CREATED", title: "Novo interessado", body: `${customer.name} quer provar: ${pieces || "—"}`, customerId: customer.id });
      await AuditService.log(actor, { action: "interest.created", entity: "Interest", entityId: interest.id, summary: `Interesse de ${customer.name} (${interest.items.length} peça(s))` }, tx);
      return { interest, ownerAlertId };
    });

    if (result.ownerAlertId) runAfterResponse("whatsapp", () => NotificationService.processPending({ ids: [result.ownerAlertId!] }));
    return result.interest;
  },

  async markContacted(id: string, actor: Actor) {
    const i = await db.interest.findUnique({ where: { id }, include: { customer: { select: { name: true } } } });
    if (!i) throw notFound("Interesse");
    await db.$transaction(async (tx) => {
      await tx.interest.update({ where: { id }, data: { status: "CONTACTED", contactedAt: new Date() } });
      await AuditService.log(actor, { action: "interest.contacted", entity: "Interest", entityId: id, summary: `Contato feito com ${i.customer.name}` }, tx);
    });
  },

  async close(id: string, actor: Actor) {
    const i = await db.interest.findUnique({ where: { id }, include: { customer: { select: { name: true } } } });
    if (!i) throw notFound("Interesse");
    await db.$transaction(async (tx) => {
      await tx.interest.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
      await AuditService.log(actor, { action: "interest.closed", entity: "Interest", entityId: id, summary: `Interesse de ${i.customer.name} encerrado` }, tx);
    });
  },

  /** Provou e não alugou: a loja já retornou o contato. */
  async followUpDone(appointmentId: string, actor: Actor) {
    const a = await db.appointment.findUnique({ where: { id: appointmentId }, include: { customer: { select: { name: true } } } });
    if (!a) throw notFound("Agendamento");
    await db.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id: appointmentId }, data: { followUpAt: new Date() } });
      await AuditService.log(actor, { action: "appointment.follow_up", entity: "Appointment", entityId: appointmentId, summary: `Retorno feito com ${a.customer.name} (${a.code})` }, tx);
    });
  },

  /** Quadro de interessados para o painel. */
  async board() {
    const now = new Date();
    const [interests, scheduled, completed, rentals] = await Promise.all([
      db.interest.findMany({
        where: { status: { in: ["NEW", "CONTACTED"] } },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { customer: true, items: { include: { product: { select: productSelect } } } },
      }),
      db.appointment.findMany({
        where: { status: { in: ["SCHEDULED", "CONFIRMED"] }, startsAt: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } },
        orderBy: { startsAt: "asc" },
        take: 200,
        include: { customer: true, service: { select: { name: true } }, product: { select: productSelect }, items: { include: { product: { select: productSelect } } } },
      }),
      db.appointment.findMany({
        where: { status: "COMPLETED", followUpAt: null, startsAt: { gte: new Date(now.getTime() - FOLLOW_UP_DAYS * DAY) } },
        orderBy: { startsAt: "desc" },
        take: 200,
        include: {
          customer: { include: { rentals: { where: { status: { not: "CANCELLED" } }, select: { createdAt: true } } } },
          service: { select: { name: true } },
          product: { select: productSelect },
          items: { include: { product: { select: productSelect } } },
          rental: { select: { id: true } },
        },
      }),
      db.rental.findMany({
        where: { status: { not: "CANCELLED" }, createdAt: { gte: new Date(now.getTime() - RENTED_DAYS * DAY) } },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { customer: true, items: { include: { inventoryItem: { select: { code: true, size: true, product: { select: productSelect } } } } } },
      }),
    ]);

    const piece = (p: { name: string; slug: string; images: { url: string }[] }, size: string | null): InterestPiece => ({ name: p.name, slug: p.slug, size, image: p.images[0]?.url ?? null });
    const apptPieces = (a: { product: { name: string; slug: string; images: { url: string }[] } | null; items: { size: string | null; product: { name: string; slug: string; images: { url: string }[] } }[] }) => {
      const list = a.items.map((i) => piece(i.product, i.size));
      if (a.product && !list.some((x) => x.slug === a.product!.slug)) list.unshift(piece(a.product, null));
      return list;
    };

    return {
      novos: interests.map((i) => ({ id: i.id, status: i.status, createdAt: i.createdAt, contactedAt: i.contactedAt, message: i.message, customer: i.customer, pieces: i.items.map((x) => piece(x.product, x.size)) })),
      // Pedidos do site esperando a loja confirmar o horário
      pedidos: scheduled.filter((a) => a.status === "SCHEDULED").map((a) => ({ id: a.id, code: a.code, startsAt: a.startsAt, service: a.service.name, customer: a.customer, pieces: apptPieces(a), eventRole: a.eventRole, eventDate: a.eventDate, piecesNeeded: a.piecesNeeded, notes: a.notes })),
      agendados: scheduled.filter((a) => a.status === "CONFIRMED").map((a) => ({ id: a.id, code: a.code, startsAt: a.startsAt, service: a.service.name, customer: a.customer, pieces: apptPieces(a), eventRole: a.eventRole, eventDate: a.eventDate, piecesNeeded: a.piecesNeeded, notes: a.notes })),
      // Sem locação ligada ao atendimento nem criada depois dele
      semLocacao: completed
        .filter((a) => !a.rental && !a.customer.rentals.some((r) => r.createdAt >= a.startsAt))
        .map((a) => ({ id: a.id, code: a.code, startsAt: a.startsAt, service: a.service.name, customer: a.customer, pieces: apptPieces(a) })),
      alugaram: rentals.map((r) => ({
        id: r.id,
        number: r.number,
        createdAt: r.createdAt,
        pickupDate: r.pickupDate,
        status: r.status,
        customer: r.customer,
        pieces: r.items.map((i) => ({ ...piece(i.inventoryItem.product, i.inventoryItem.size), code: i.inventoryItem.code })),
      })),
    };
  },

  /** Contadores para o menu e o painel "Hoje" (mesmas regras do quadro). */
  async counts() {
    const [novos, pedidos, completed] = await Promise.all([
      db.interest.count({ where: { status: "NEW" } }),
      db.appointment.count({ where: { status: "SCHEDULED", startsAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } } }),
      db.appointment.findMany({
        where: { status: "COMPLETED", followUpAt: null, rental: null, startsAt: { gte: new Date(Date.now() - FOLLOW_UP_DAYS * DAY) } },
        select: { startsAt: true, customer: { select: { rentals: { where: { status: { not: "CANCELLED" } }, select: { createdAt: true } } } } },
      }),
    ]);
    return { novos, pedidos, semLocacao: completed.filter((a) => !a.customer.rentals.some((r) => r.createdAt >= a.startsAt)).length };
  },
};
