"use server";

import { revalidatePath } from "next/cache";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formStr, toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { TestimonialService } from "@/services/testimonial.service";

function revalidateTestimonials() {
  revalidatePath("/");
  revalidatePath("/admin/configuracoes");
}

export async function createTestimonialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("settings.manage");
    const photo = fd.get("photo");
    await TestimonialService.create({ name: formStr(fd, "name"), detail: formStr(fd, "detail"), text: formStr(fd, "text") }, photo instanceof File ? photo : null, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateTestimonials();
  return { ok: true, message: "Depoimento adicionado." };
}

export async function toggleTestimonialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("settings.manage");
    await TestimonialService.toggle(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateTestimonials();
  return { ok: true };
}

export async function removeTestimonialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("settings.manage");
    await TestimonialService.remove(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateTestimonials();
  return { ok: true, message: "Depoimento removido." };
}
