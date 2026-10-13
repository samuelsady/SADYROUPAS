/**
 * Seed de DESENVOLVIMENTO.
 *
 * - Configurações reais da loja (endereço, telefone, horários) e o catálogo
 *   real de ternos com as fotos do site atual.
 * - Tamanhos, peças físicas, clientes e agendamentos são DADOS DE TESTE.
 *
 * Uso: npm run db:seed   (ou npm run db:reset para recriar o banco)
 */
import { randomBytes } from "node:crypto";
import { PrismaClient, type AppointmentStatus, type InventoryStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import ternos from "./seed-data/ternos.json";
import { DEFAULT_TEMPLATES } from "../src/services/notification/templates";
import { buildAppointmentReceipt } from "../src/services/print/receipt";
import { addDaysKey, formatDate, formatDateTime, todayKey, toTimeKey, weekdayOfKey, zonedToUtc } from "../src/utils/datetime";
import { buildInventoryCode, formatAppointmentCode } from "../src/utils/codes";
import { maskPhone } from "../src/utils/phone";
import { slugify } from "../src/utils/text";

const db = new PrismaClient();

/** Ocasiões sugeridas a partir do nome/categoria (a equipe ajusta no painel). */
function suggestOccasions(name: string, categorySlug: string): string[] {
  const n = name.toLowerCase();
  if (categorySlug === "becas") return ["formatura"];
  if (n.startsWith("smoking")) return ["gala", "casamento", "formatura"];
  if (["camisas", "gravatas", "acessorios"].includes(categorySlug)) return ["casamento", "formatura", "padrinhos", "gala", "social"];
  if (/areia|bege|kraft|linho|summer|terracota|céu/.test(n)) return ["casamento", "padrinhos", "social"];
  if (n.startsWith("blazer")) return ["social", "formatura"];
  return ["casamento", "formatura", "padrinhos", "social"];
}
const TZ = "America/Fortaleza";

// Gerador pseudoaleatório determinístico: o seed produz sempre os mesmos dados
let state = 42;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_FORCE !== "1") {
    throw new Error("Seed de desenvolvimento bloqueado em produção (defina SEED_FORCE=1 para forçar).");
  }

  // ---------------------------------------------------------------------------
  // Usuários
  // ---------------------------------------------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@sadyroupas.com.br").toLowerCase();
  // Em produção a senha do admin é obrigatória (o repositório é público: nada de senha padrão)
  if (process.env.NODE_ENV === "production" && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error("Defina SEED_ADMIN_PASSWORD (mínimo 8 caracteres) para criar o administrador em produção.");
  }
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "sady2008";
  if (adminPassword.length < 8) throw new Error("SEED_ADMIN_PASSWORD precisa ter pelo menos 8 caracteres.");
  await db.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: "Administrador", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 12) },
    update: {},
  });
  await db.user.upsert({
    where: { email: "atendimento@sadyroupas.com.br" },
    create: { email: "atendimento@sadyroupas.com.br", name: "Atendimento", role: "STAFF", passwordHash: await bcrypt.hash(adminPassword, 12) },
    update: {},
  });
  const admin = await db.user.findUniqueOrThrow({ where: { email: adminEmail } });

  // ---------------------------------------------------------------------------
  // Configurações reais da loja
  // ---------------------------------------------------------------------------
  await db.storeSettings.upsert({
    where: { id: "store" },
    create: {
      id: "store",
      companyName: "Sady Roupas",
      phone: "558632310219",
      whatsapp: "5586988100001",
      address: "Av. Homero Castelo Branco, 1094 - São Cristóvão, Teresina - PI, 64052-005",
      instagram: "sadyroupas",
      facebook: "sadyroupas",
      mapsEmbedUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3974.179262618363!2d-42.78424452600846!3d-5.0746760515001075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x78e3a21e5e58c63%3A0xc5ef3224ecd1c5c3!2sSady%20Roupas!5e0!3m2!1spt-BR!2sbr!4v1786986254650!5m2!1spt-BR!2sbr",
      foundedAt: new Date("2008-10-30T12:00:00Z"),
      slotDurationMin: 30,
      slotBufferMin: 10,
    },
    update: {},
  });

  const hours = [
    { weekday: 0, isOpen: false, openTime: "09:00", closeTime: "12:00" },
    { weekday: 1, isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { weekday: 2, isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { weekday: 3, isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { weekday: 4, isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { weekday: 5, isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { weekday: 6, isOpen: true, openTime: "08:00", closeTime: "12:00" },
  ];
  for (const h of hours) await db.businessHours.upsert({ where: { weekday: h.weekday }, create: h, update: {} });

  for (const t of DEFAULT_TEMPLATES) {
    await db.notificationTemplate.upsert({ where: { event: t.event }, create: { event: t.event, name: t.name, body: t.body, waParams: t.waParams }, update: {} });
  }

  // ---------------------------------------------------------------------------
  // Serviços
  // ---------------------------------------------------------------------------
  const serviceDefs = [
    { name: "Atendimento para aluguel de terno", description: "Escolha do traje com orientação da nossa equipe.", durationMin: 30, sortOrder: 1 },
    { name: "Atendimento para escolha de beca", description: "Becas, capelos e faixas para formaturas.", durationMin: 30, sortOrder: 2 },
    { name: "Prova de roupa", description: "Prova e ajustes do traje escolhido.", durationMin: 30, sortOrder: 3 },
    { name: "Retirada", description: "Retirada do traje alugado.", durationMin: 30, sortOrder: 4 },
    { name: "Devolução", description: "Devolução do traje alugado.", durationMin: 30, sortOrder: 5 },
  ];
  if ((await db.service.count()) === 0) await db.service.createMany({ data: serviceDefs });
  const services = await db.service.findMany({ orderBy: { sortOrder: "asc" } });

  // ---------------------------------------------------------------------------
  // Catálogo
  // ---------------------------------------------------------------------------
  const categoryDefs = [
    { slug: "ternos", name: "Ternos", description: "Ternos, smokings e blazers para casamentos, formaturas e eventos.", sortOrder: 1 },
    { slug: "becas", name: "Beca", description: "Becas, capelos e faixas para sua formatura.", sortOrder: 2 },
    { slug: "camisas", name: "Camisas", description: "Camisas sociais para compor o traje.", sortOrder: 3 },
    { slug: "gravatas", name: "Gravatas", description: "Gravatas e gravatas-borboleta.", sortOrder: 4, isAccessory: true },
    { slug: "acessorios", name: "Acessórios", description: "Cintos, coletes, suspensórios, lenços e mais.", sortOrder: 5, isAccessory: true },
    { slug: "outros", name: "Outros", description: "Outros itens para o seu evento.", sortOrder: 6 },
  ];
  for (const c of categoryDefs) await db.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  const cat = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c]));

  if ((await db.product.count()) > 0) {
    console.log("Catálogo já existe — dados de demonstração não foram recriados.");
    return;
  }

  const suitSizes = ["46", "48", "50", "52", "54", "56"];
  const featured = new Set(["Terno Azul Dior", "Smoking Tradicional 1 Botão", "Terno Preto Resumo Slim", "Terno Bonner 3", "Terno Dior Bege", "Terno Panamá Azul Marinho", "Terno Terracota", "Blazer com Calça Sarja 1"]);

  type Seeded = { id: string; name: string; categoryName: string; color: string; sizes: string[] };
  const seeded: Seeded[] = [];

  for (const [i, t] of ternos.entries()) {
    const sizes = suitSizes.filter(() => rand() > 0.25);
    const p = await db.product.create({
      data: {
        slug: slugify(t.name),
        name: t.name,
        categoryId: cat.ternos.id,
        description:
          t.model === "Smoking"
            ? `${t.name}: elegância de gala para casamentos, formaturas e eventos noturnos.`
            : `${t.name} para casamentos, formaturas, batizados e eventos sociais. Acompanha paletó e calça; camisa, gravata e acessórios podem ser combinados no atendimento.`,
        model: t.model,
        occasions: suggestOccasions(t.name, "ternos"),
        colors: [t.color],
        sizes,
        details: "Ajustes de barra e manga realizados na prova, conforme disponibilidade.",
        featured: featured.has(t.name),
        sortOrder: i,
        images: { create: t.images.map((file, idx) => ({ url: `/catalogo/${file}`, alt: `${t.name} — foto ${idx + 1}`, sortOrder: idx })) },
      },
    });
    seeded.push({ id: p.id, name: p.name, categoryName: "Ternos", color: t.color, sizes });
  }

  const extras = [
    { name: "Beca Preta", cat: "becas", color: "Preto", sizes: ["P", "M", "G", "GG"], model: "Beca de formatura", desc: "Beca tradicional preta para colação de grau." },
    { name: "Capelo", cat: "becas", color: "Preto", sizes: ["U"], model: null, desc: "Capelo de formatura com borla." },
    { name: "Faixa de Formatura", cat: "becas", color: "Diversas", sizes: ["U"], model: null, desc: "Faixa na cor do seu curso." },
    { name: "Camisa Social Branca", cat: "camisas", color: "Branco", sizes: ["1", "2", "3", "4", "5"], model: "Slim", desc: "Camisa social branca, tecido com toque macio." },
    { name: "Camisa Social Azul Claro", cat: "camisas", color: "Azul", sizes: ["2", "3", "4"], model: "Slim", desc: "Camisa social azul claro." },
    { name: "Gravata Preta", cat: "gravatas", color: "Preto", sizes: ["U"], model: "Tradicional", desc: "Gravata preta lisa." },
    { name: "Gravata Champagne", cat: "gravatas", color: "Bege", sizes: ["U"], model: "Tradicional", desc: "Gravata champagne, ideal para padrinhos." },
    { name: "Gravata-Borboleta Preta", cat: "gravatas", color: "Preto", sizes: ["U"], model: "Borboleta", desc: "Para smoking e trajes de gala." },
    { name: "Cinto Social Preto", cat: "acessorios", color: "Preto", sizes: ["90", "100", "110"], model: null, desc: "Cinto social em couro." },
    { name: "Colete Social", cat: "acessorios", color: "Preto", sizes: ["P", "M", "G"], model: null, desc: "Colete para compor o terno." },
    { name: "Suspensório", cat: "acessorios", color: "Preto", sizes: ["U"], model: null, desc: "Suspensório clássico." },
    { name: "Lenço de Bolso", cat: "acessorios", color: "Branco", sizes: ["U"], model: null, desc: "Lenço para o bolso do paletó." },
  ];
  for (const [i, e] of extras.entries()) {
    const p = await db.product.create({
      data: { slug: slugify(e.name), name: e.name, categoryId: cat[e.cat].id, occasions: suggestOccasions(e.name, e.cat), description: e.desc, model: e.model, colors: [e.color], sizes: e.sizes, sortOrder: 100 + i, featured: e.name === "Beca Preta" },
    });
    seeded.push({ id: p.id, name: p.name, categoryName: cat[e.cat].name, color: e.color, sizes: e.sizes });
  }

  // Kits (V2)
  await db.kit.create({ data: { name: "Kit Formatura", description: "Beca + Capelo + Faixa", items: { create: [{ label: "Beca" }, { label: "Capelo" }, { label: "Faixa" }] } } });
  await db.kit.create({ data: { name: "Kit Terno", description: "Paletó + Calça + Camisa + Gravata", items: { create: [{ label: "Paletó" }, { label: "Calça" }, { label: "Camisa" }, { label: "Gravata" }] } } });

  // ---------------------------------------------------------------------------
  // Peças físicas (DADOS DE TESTE)
  // ---------------------------------------------------------------------------
  const statuses: InventoryStatus[] = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "AVAILABLE", "AVAILABLE", "AVAILABLE", "RESERVED", "RENTED", "UNAVAILABLE"];
  const locations = ["Arara A", "Arara B", "Arara C", "Prateleira 1", "Prateleira 2", "Vitrine"];
  const customerNames = ["João Silva", "Maria Santos", "Pedro Oliveira"];
  // O número sequencial é por prefixo (categoria-cor-tamanho), como no InventoryService
  const seqByPrefix = new Map<string, number>();
  for (const p of seeded) {
    for (const size of p.sizes) {
      const qty = p.categoryName === "Ternos" ? 1 + Math.floor(rand() * 2) : 1;
      for (let n = 1; n <= qty; n++) {
        const prefix = buildInventoryCode(p.categoryName, p.color, size, 0).slice(0, -3);
        const next = (seqByPrefix.get(prefix) ?? 0) + 1;
        seqByPrefix.set(prefix, next);
        const status = pick(statuses);
        const rentalCount = Math.floor(rand() * 15);
        const item = await db.inventoryItem.create({
          data: {
            code: `${prefix}${String(next).padStart(3, "0")}`,
            productId: p.id,
            size,
            color: p.color,
            status,
            location: status === "RENTED" ? "Com cliente" : pick(locations),
            rentalCount: status === "RENTED" ? rentalCount + 1 : rentalCount,
            acquiredAt: new Date("2025-01-15T12:00:00Z"),
          },
        });
        await db.inventoryHistory.create({ data: { itemId: item.id, toStatus: "AVAILABLE", action: "CREATED", note: "Peça cadastrada", userId: admin.id, createdAt: new Date("2025-01-15T12:00:00Z") } });
        if (status !== "AVAILABLE") {
          await db.inventoryHistory.create({
            data: { itemId: item.id, fromStatus: "AVAILABLE", toStatus: status, action: "STATUS_CHANGED", customerName: status === "UNAVAILABLE" ? null : pick(customerNames), note: status === "UNAVAILABLE" ? "Aguardando ajuste de costura" : null, userId: admin.id },
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Clientes e agendamentos (DADOS DE TESTE)
  // ---------------------------------------------------------------------------
  const customers = await Promise.all(
    [
      { name: "João Silva", whatsapp: "5586999110001", email: "joao.silva@example.com", notes: "Prefere atendimento pela manhã." },
      { name: "Maria Santos", whatsapp: "5586999110002", email: "maria.santos@example.com", notes: "Formatura do filho em dezembro." },
      { name: "Pedro Oliveira", whatsapp: "5586999110003", email: null, notes: "Padrinho de casamento." },
      { name: "Ana Costa", whatsapp: "5586999110004", email: "ana.costa@example.com", notes: null },
      { name: "Lucas Almeida", whatsapp: "5586999110005", email: null, notes: "Medidas: paletó 50, calça 44." },
    ].map((c) => db.customer.create({ data: c })),
  );
  await db.customerMeasurement.create({ data: { customerId: customers[4]!.id, jacket: "50", pants: "44", shirt: "3", notes: "Registrado na última prova" } });

  const today = todayKey(TZ);
  const isOpen = (key: string) => {
    const wd = weekdayOfKey(key);
    return wd !== 0;
  };
  const plan: { offset: number; time: string; c: number; s: number; status: AppointmentStatus; notes?: string }[] = [
    { offset: -3, time: "09:00", c: 0, s: 0, status: "COMPLETED" },
    { offset: -2, time: "10:20", c: 1, s: 1, status: "NO_SHOW" },
    { offset: -1, time: "14:00", c: 2, s: 2, status: "COMPLETED" },
    { offset: -1, time: "15:20", c: 3, s: 0, status: "CANCELLED" },
    { offset: 0, time: "09:00", c: 0, s: 2, status: "CONFIRMED", notes: "Trazer o sapato para a prova." },
    { offset: 0, time: "09:40", c: 4, s: 0, status: "SCHEDULED" },
    { offset: 0, time: "11:00", c: 1, s: 1, status: "SCHEDULED", notes: "Formatura em Medicina." },
    { offset: 1, time: "09:00", c: 2, s: 3, status: "CONFIRMED" },
    { offset: 1, time: "10:20", c: 3, s: 0, status: "SCHEDULED" },
    { offset: 2, time: "11:00", c: 4, s: 4, status: "SCHEDULED" },
    { offset: 4, time: "09:40", c: 0, s: 0, status: "SCHEDULED" },
  ];

  const settings = await db.storeSettings.findUniqueOrThrow({ where: { id: "store" } });
  let seq = 0;
  for (const a of plan) {
    let date = addDaysKey(today, a.offset);
    while (!isOpen(date)) date = addDaysKey(date, a.offset < 0 ? -1 : 1);
    if (weekdayOfKey(date) === 6 && a.time >= "11:30") continue; // sábado fecha 12h
    const startsAt = zonedToUtc(date, a.time, TZ);
    const service = services[a.s]!;
    const endsAt = new Date(startsAt.getTime() + (service.durationMin ?? 30) * 60_000);
    const blockedUntil = new Date(endsAt.getTime() + settings.slotBufferMin * 60_000);
    const customer = customers[a.c]!;
    const year = Number(date.slice(0, 4));
    const code = formatAppointmentCode(year, ++seq);
    await db.counter.upsert({ where: { key: `appointment:${year}` }, create: { key: `appointment:${year}`, value: seq }, update: { value: seq } });
    const createdAt = new Date(startsAt.getTime() - 2 * 86_400_000);
    const appointment = await db.appointment.create({
      data: {
        code,
        publicToken: randomBytes(18).toString("base64url"),
        customerId: customer.id,
        serviceId: service.id,
        startsAt,
        endsAt,
        blockedUntil,
        status: a.status,
        source: a.c % 2 === 0 ? "WEBSITE" : "WHATSAPP",
        notes: a.notes ?? null,
        createdAt,
        confirmedAt: a.status === "CONFIRMED" ? createdAt : null,
        completedAt: a.status === "COMPLETED" ? endsAt : null,
        cancelledAt: a.status === "CANCELLED" ? createdAt : null,
        cancelReason: a.status === "CANCELLED" ? "Cliente remarcou por telefone" : null,
      },
    });
    const vars = { nome: customer.name.split(" ")[0]!, data: formatDate(startsAt, TZ), horario: toTimeKey(startsAt, TZ), servico: service.name, codigo: code };
    const tpl = DEFAULT_TEMPLATES.find((t) => t.event === "APPOINTMENT_CREATED")!;
    await db.notification.create({
      data: {
        channel: "WHATSAPP",
        event: "APPOINTMENT_CREATED",
        status: "SIMULATED",
        recipient: customer.whatsapp,
        body: tpl.body.replace(/\{(\w+)\}/g, (_, k: string) => (vars as Record<string, string>)[k] ?? ""),
        customerId: customer.id,
        appointmentId: appointment.id,
        attempts: 1,
        sentAt: createdAt,
        createdAt,
      },
    });
    await db.printJob.create({
      data: {
        appointmentId: appointment.id,
        status: a.offset < 0 ? "PRINTED" : a.offset === 0 && a.time === "11:00" ? "PRINT_PENDING" : "PRINTED",
        printedAt: a.offset < 0 ? createdAt : null,
        content: buildAppointmentReceipt({
          companyName: "Sady Roupas",
          code,
          customerName: customer.name,
          customerPhone: maskPhone(customer.whatsapp),
          service: service.name,
          date: formatDate(startsAt, TZ),
          time: toTimeKey(startsAt, TZ),
          notes: a.notes,
          createdAt: formatDateTime(createdAt, TZ),
          storePhone: "(86) 3231-0219",
          address: settings.address,
        }),
        createdAt,
      },
    });
    await db.auditLog.create({
      data: { userId: null, actorLabel: "Seed", action: "appointment.created", entity: "Appointment", entityId: appointment.id, summary: `Agendamento ${code} criado (dados de teste)`, createdAt },
    });
  }

  await db.notification.create({
    data: { channel: "INTERNAL", event: "APPOINTMENT_CREATED", status: "SENT", title: "Novo agendamento pelo site", body: "Maria Santos — Atendimento para escolha de beca (dados de teste)", sentAt: new Date() },
  });

  console.log("Seed concluído.");
  console.log(`Login do painel: ${adminEmail} / ${process.env.SEED_ADMIN_PASSWORD ? "(senha de SEED_ADMIN_PASSWORD)" : adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
