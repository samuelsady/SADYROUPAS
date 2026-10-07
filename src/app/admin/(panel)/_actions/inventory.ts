"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formStr, toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { InventoryService } from "@/services/inventory.service";

function revalidateInventory(code?: string) {
  revalidatePath("/admin/estoque");
  revalidatePath("/admin");
  if (code) revalidatePath(`/admin/estoque/${code}`);
}

export async function createItemsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let first: string;
  try {
    const user = await requireUser("inventory.manage");
    const items = await InventoryService.create(
      { productId: formStr(fd, "productId"), size: formStr(fd, "size"), color: formStr(fd, "color"), location: formStr(fd, "location"), notes: formStr(fd, "notes"), code: formStr(fd, "code"), quantity: formStr(fd, "quantity") || 1 },
      actorOf(user, await clientIp()),
    );
    first = items[0]!.code;
    if (items.length > 1) {
      revalidateInventory();
      return { ok: true, message: `${items.length} peças cadastradas: ${items.map((i) => i.code).join(", ")}` };
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidateInventory();
  redirect(`/admin/estoque/${first}`);
}

export async function changeItemStatusAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("inventory.manage");
    await InventoryService.changeStatus(code, { status: formStr(fd, "status"), note: formStr(fd, "note") || null, customerName: formStr(fd, "customerName") || null, location: formStr(fd, "location") || null }, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateInventory(code);
  return { ok: true, message: "Status atualizado." };
}

export async function updateItemAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("inventory.manage");
    await InventoryService.update(code, { size: formStr(fd, "size"), color: formStr(fd, "color"), location: formStr(fd, "location") || null, notes: formStr(fd, "notes") || null }, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateInventory(code);
  return { ok: true, message: "Peça atualizada." };
}

export async function deactivateItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const code = formStr(fd, "code") ?? "";
  try {
    const user = await requireUser("inventory.manage");
    await InventoryService.deactivate(code, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateInventory(code);
  redirect("/admin/estoque");
}
