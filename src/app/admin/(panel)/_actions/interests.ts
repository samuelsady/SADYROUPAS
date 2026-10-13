"use server";

import { revalidatePath } from "next/cache";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formStr, toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { InterestService } from "@/services/interest.service";

function revalidateInterests() {
  revalidatePath("/admin");
  revalidatePath("/admin/interessados");
}

export async function markInterestContactedAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("customers.manage");
    await InterestService.markContacted(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateInterests();
  return { ok: true, message: "Marcado como contatado." };
}

export async function closeInterestAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("customers.manage");
    await InterestService.close(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateInterests();
  return { ok: true, message: "Interesse encerrado." };
}

export async function followUpDoneAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("customers.manage");
    await InterestService.followUpDone(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateInterests();
  return { ok: true, message: "Retorno registrado." };
}
