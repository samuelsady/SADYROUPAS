"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/database/client";
import { isUniqueViolation } from "@/database/errors";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formBool, formStr, toActionError, type ActionState } from "@/lib/action";
import { conflict } from "@/lib/errors";
import { clientIp } from "@/lib/request";
import { AuditService } from "@/services/audit.service";
import { CatalogService } from "@/services/catalog.service";
import { slugify } from "@/utils/text";

const productFields = (fd: FormData) => ({
  name: formStr(fd, "name"),
  slug: formStr(fd, "slug"),
  categoryId: formStr(fd, "categoryId"),
  description: formStr(fd, "description"),
  model: formStr(fd, "model"),
  colors: formStr(fd, "colors"),
  sizes: formStr(fd, "sizes"),
  occasions: fd.getAll("occasions").map(String),
  details: formStr(fd, "details"),
  featured: formBool(fd, "featured"),
  active: formBool(fd, "active"),
  sortOrder: formStr(fd, "sortOrder") || 0,
});

function revalidateCatalog(id?: string) {
  revalidatePath("/admin/catalogo");
  if (id) revalidatePath(`/admin/catalogo/${id}`);
  revalidatePath("/", "layout");
}

export async function saveProductAction(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let savedId: string;
  try {
    const user = await requireUser("catalog.manage");
    savedId = (await CatalogService.save(id, productFields(fd), actorOf(user, await clientIp()))).id;
  } catch (err) {
    return toActionError(err);
  }
  revalidateCatalog(savedId);
  if (!id) redirect(`/admin/catalogo/${savedId}`);
  return { ok: true, message: "Produto salvo." };
}

export async function uploadImagesAction(productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("catalog.manage");
    const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
    if (files.length === 0) return { ok: false, error: "Selecione ao menos uma imagem." };
    await CatalogService.addImages(productId, files, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateCatalog(productId);
  return { ok: true, message: "Imagens enviadas." };
}

export async function removeImageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("catalog.manage");
    await CatalogService.removeImage(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateCatalog(formStr(fd, "productId"));
  return { ok: true };
}

const categorySchema = z.object({ name: z.string().trim().min(2, "Informe o nome.").max(60), description: z.string().trim().max(300).optional() });

export async function createCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("catalog.manage");
    const input = categorySchema.parse({ name: formStr(fd, "name"), description: formStr(fd, "description") || undefined });
    const count = await db.category.count();
    const category = await db.category.create({ data: { ...input, slug: slugify(input.name), sortOrder: count + 1, isAccessory: formBool(fd, "isAccessory") } }).catch((e) => {
      if (isUniqueViolation(e, "slug")) throw conflict("Já existe uma categoria com esse nome.");
      throw e;
    });
    await AuditService.log(actorOf(user, await clientIp()), { action: "category.created", entity: "Category", entityId: category.id, summary: `Categoria ${category.name} criada` });
  } catch (err) {
    return toActionError(err);
  }
  revalidateCatalog();
  return { ok: true, message: "Categoria criada." };
}
