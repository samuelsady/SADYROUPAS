"use server";

import { revalidatePath } from "next/cache";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formStr, toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { PrintService } from "@/services/print/print.service";

export async function retryPrintAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("print.manage");
    await PrintService.retry(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/impressoes");
  return { ok: true };
}

export async function cancelPrintAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("print.manage");
    await PrintService.cancel(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/impressoes");
  return { ok: true };
}
