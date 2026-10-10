import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/database/client";
import { isUniqueViolation } from "@/database/errors";
import { conflict, notFound } from "@/lib/errors";
import { productSchema } from "@/lib/schemas";
import { slugify } from "@/utils/text";
import { AuditService, type Actor } from "./audit.service";
import { StorageService } from "./storage/storage.service";

export type CatalogFilters = { categoria?: string; ocasiao?: string; tamanho?: string; cor?: string; modelo?: string; q?: string; ordem?: string };

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  destaques: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  "a-z": [{ name: "asc" }],
  "z-a": [{ name: "desc" }],
  novidades: [{ createdAt: "desc" }],
};

export const CatalogService = {
  categories() {
    return db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: { where: { active: true } } } } } });
  },

  /** Catálogo público: apenas produtos ativos, com contagem de peças disponíveis. */
  async publicList(f: CatalogFilters) {
    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(f.categoria ? { category: { slug: f.categoria } } : {}),
      ...(f.ocasiao ? { occasions: { has: f.ocasiao } } : {}),
      ...(f.tamanho ? { sizes: { has: f.tamanho } } : {}),
      ...(f.cor ? { colors: { has: f.cor } } : {}),
      ...(f.modelo ? { model: f.modelo } : {}),
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }] } : {}),
    };
    const products = await db.product.findMany({
      where,
      orderBy: SORTS[f.ordem ?? ""] ?? SORTS.destaques,
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" }, take: 2 },
        _count: { select: { items: { where: { active: true, status: "AVAILABLE" } } } },
      },
    });
    return products.map(({ _count, ...p }) => ({ ...p, availableCount: _count.items }));
  },

  /** Quantidade de produtos ativos por ocasião (menus e filtros). */
  async occasionCounts() {
    const rows = await db.$queryRaw<{ occasion: string; count: bigint }[]>`
      SELECT unnest("occasions") AS occasion, count(*) AS count FROM "Product" WHERE "active" = true GROUP BY 1
    `;
    return Object.fromEntries(rows.map((r) => [r.occasion, Number(r.count)])) as Record<string, number>;
  },

  /** Valores para os filtros do catálogo (somente o que existe em produtos ativos). */
  async filterOptions() {
    const products = await db.product.findMany({ where: { active: true }, select: { sizes: true, colors: true, model: true } });
    const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => Boolean(x)))];
    const sizeOrder = (s: string) => (/^\d+$/.test(s) ? Number(s) : 1000 + ["PP", "P", "M", "G", "GG", "XG", "XGG", "U"].indexOf(s.toUpperCase()));
    return {
      sizes: uniq(products.flatMap((p) => p.sizes)).sort((a, b) => sizeOrder(a) - sizeOrder(b)),
      colors: uniq(products.flatMap((p) => p.colors)).sort((a, b) => a.localeCompare(b, "pt-BR")),
      models: uniq(products.map((p) => p.model)).sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  },

  async featured(take = 10) {
    const products = await db.product.findMany({
      where: { active: true, featured: true },
      orderBy: { sortOrder: "asc" },
      take,
      include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 2 }, _count: { select: { items: { where: { active: true, status: "AVAILABLE" } } } } },
    });
    return products.map(({ _count, ...p }) => ({ ...p, availableCount: _count.items }));
  },

  async publicBySlug(slug: string) {
    const product = await db.product.findFirst({
      where: { slug, active: true },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!product) return null;
    // Disponibilidade por tamanho (somente peças ativas e disponíveis)
    const grouped = await db.inventoryItem.groupBy({ by: ["size"], where: { productId: product.id, active: true, status: "AVAILABLE" }, _count: true });
    const hasInventory = (await db.inventoryItem.count({ where: { productId: product.id, active: true } })) > 0;
    const availability = Object.fromEntries(grouped.map((g) => [g.size, g._count]));
    return { ...product, availability, hasInventory };
  },

  async related(product: { id: string; categoryId: string }, take = 4) {
    const products = await db.product.findMany({
      where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
      take,
      include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 2 }, _count: { select: { items: { where: { active: true, status: "AVAILABLE" } } } } },
    });
    return products.map(({ _count, ...p }) => ({ ...p, availableCount: _count.items }));
  },

  // ---------------------------------------------------------------------------
  // Painel
  // ---------------------------------------------------------------------------

  adminList(params: { q?: string; categoryId?: string }) {
    return db.product.findMany({
      where: {
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.q ? { name: { contains: params.q, mode: "insensitive" } } : {}),
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, _count: { select: { items: { where: { active: true } } } } },
    });
  },

  async adminGet(id: string) {
    const p = await db.product.findUnique({
      where: { id },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } }, items: { where: { active: true }, orderBy: { code: "asc" } } },
    });
    if (!p) throw notFound("Produto");
    return p;
  },

  async save(id: string | null, raw: unknown, actor: Actor) {
    const input = productSchema.parse(raw);
    const slug = slugify(input.slug || input.name);
    const data = { ...input, slug };
    try {
      return await db.$transaction(async (tx) => {
        const product = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
        await AuditService.log(actor, { action: id ? "product.updated" : "product.created", entity: "Product", entityId: product.id, summary: `Produto ${product.name} ${id ? "alterado" : "criado"}` }, tx);
        return product;
      });
    } catch (err) {
      if (isUniqueViolation(err, "slug")) throw conflict("Já existe um produto com este endereço (slug). Altere o nome ou o slug.");
      throw err;
    }
  },

  async addImages(productId: string, files: File[], actor: Actor) {
    const product = await db.product.findUnique({ where: { id: productId }, include: { _count: { select: { images: true } } } });
    if (!product) throw notFound("Produto");
    let order = product._count.images;
    for (const file of files) {
      const stored = await StorageService.uploadImage(file, `produtos/${product.slug}`);
      await db.productImage.create({ data: { productId, url: stored.url, storageKey: stored.key, alt: product.name, sortOrder: order++ } });
    }
    await AuditService.log(actor, { action: "product.images_added", entity: "Product", entityId: productId, summary: `${files.length} imagem(ns) adicionada(s) a ${product.name}` });
  },

  async removeImage(imageId: string, actor: Actor) {
    const img = await db.productImage.findUnique({ where: { id: imageId } });
    if (!img) throw notFound("Imagem");
    await db.productImage.delete({ where: { id: imageId } });
    await StorageService.remove(img.storageKey);
    await AuditService.log(actor, { action: "product.image_removed", entity: "Product", entityId: img.productId, summary: "Imagem removida" });
  },
};
