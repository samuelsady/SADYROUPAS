"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formStr, toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { CustomerService } from "@/services/customer.service";

const fields = (fd: FormData) => ({ name: formStr(fd, "name"), whatsapp: formStr(fd, "whatsapp"), email: formStr(fd, "email"), notes: formStr(fd, "notes"), preferences: formStr(fd, "preferences") });

export async function createCustomerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireUser("customers.manage");
    id = (await CustomerService.create(fields(fd), actorOf(user, await clientIp()))).id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${id}`);
}

export async function updateCustomerAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("customers.manage");
    await CustomerService.update(id, fields(fd), actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true, message: "Cliente atualizado." };
}

export async function addMeasurementAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("customers.manage");
    await CustomerService.addMeasurement(id, { jacket: formStr(fd, "jacket"), pants: formStr(fd, "pants"), shirt: formStr(fd, "shirt"), shoe: formStr(fd, "shoe"), notes: formStr(fd, "notes") }, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true, message: "Medidas registradas." };
}
