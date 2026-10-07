"use server";

import { revalidatePath } from "next/cache";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formStr, toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { FittingService } from "@/services/fitting.service";

function revalidate(appointmentId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/estoque");
  if (appointmentId) revalidatePath(`/admin/agendamentos/${appointmentId}`);
}

export async function reserveFittingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const code = formStr(fd, "code") ?? "";
  try {
    const user = await requireUser("inventory.manage");
    if (!code) return { ok: false, error: "Escolha a peça." };
    await FittingService.reserve(formStr(fd, "itemId") ?? "", code, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidate(formStr(fd, "appointmentId"));
  return { ok: true, message: `Peça ${code.toUpperCase()} separada e reservada.` };
}

export async function releaseFittingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("inventory.manage");
    await FittingService.release(formStr(fd, "itemId") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidate(formStr(fd, "appointmentId"));
  return { ok: true, message: "Peça liberada (disponível novamente)." };
}

export async function addFittingItemAction(appointmentId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("appointments.manage");
    await FittingService.addItem(appointmentId, formStr(fd, "productId") ?? "", formStr(fd, "size") ?? null, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidate(appointmentId);
  return { ok: true, message: "Peça adicionada à lista de provas." };
}

export async function removeFittingItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("appointments.manage");
    await FittingService.removeItem(formStr(fd, "itemId") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidate(formStr(fd, "appointmentId"));
  return { ok: true, message: "Removida da lista." };
}
