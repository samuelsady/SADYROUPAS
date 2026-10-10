"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReturnCondition } from "@prisma/client";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formStr, toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { db } from "@/database/client";
import { CustomerService } from "@/services/customer.service";
import { RentalService } from "@/services/rental-workflow.service";
import { normalizePhone } from "@/utils/phone";

function revalidateRentals(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/locacoes");
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/planilha");
  if (id) revalidatePath(`/admin/locacoes/${id}`);
}

export async function createRentalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireUser("inventory.manage");
    // Cliente novo direto no formulário de locação
    let customerId = formStr(fd, "customerId");
    if (!customerId) {
      const whatsapp = normalizePhone(formStr(fd, "whatsapp") ?? "");
      const name = formStr(fd, "name")?.trim();
      if (!whatsapp || !name || name.length < 3) return { ok: false, error: "Escolha um cliente ou informe nome e WhatsApp do novo cliente." };
      customerId = (await db.$transaction((tx) => CustomerService.findOrCreate(tx, { name, whatsapp, email: formStr(fd, "email") || null }, { trusted: true }))).customer.id;
    }
    const rental = await RentalService.create(
      {
        customerId,
        appointmentId: formStr(fd, "appointmentId"),
        eventName: formStr(fd, "eventName"),
        eventDate: formStr(fd, "eventDate"),
        pickupDate: formStr(fd, "pickupDate"),
        returnDueDate: formStr(fd, "returnDueDate"),
        deliveryMethod: formStr(fd, "deliveryMethod"),
        deliveryAddress: formStr(fd, "deliveryAddress"),
        deliveryNotes: formStr(fd, "deliveryNotes"),
        itemCodes: fd.getAll("itemCodes").map(String),
        total: formStr(fd, "total") || 0,
        discount: formStr(fd, "discount") || 0,
        paidNow: formStr(fd, "paidNow") || 0,
        paymentMethod: formStr(fd, "paymentMethod"),
        notes: formStr(fd, "notes"),
      },
      actorOf(user, await clientIp()),
    );
    id = rental.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidateRentals();
  redirect(`/admin/locacoes/${id}?criada=1`);
}

export async function confirmPickupAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("inventory.manage");
    const labels = fd.getAll("checklistLabel").map(String);
    const checked = new Set(fd.getAll("checklist").map(String));
    await RentalService.confirmPickup(id, { checklist: labels.map((label) => ({ label, checked: checked.has(label) })), notes: formStr(fd, "notes") || null }, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateRentals(id);
  return { ok: true, message: "Retirada confirmada. As peças foram baixadas como ALUGADAS no estoque." };
}

export async function registerReturnAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("inventory.manage");
    const ids = fd.getAll("rentalItemId").map(String);
    const items = ids.map((rentalItemId) => ({
      rentalItemId,
      condition: (formStr(fd, `condition_${rentalItemId}`) ?? "RECEIVED") as ReturnCondition,
      note: formStr(fd, `note_${rentalItemId}`) || null,
    }));
    const { lateFee } = await RentalService.registerReturn(id, { items, notes: formStr(fd, "notes") || null }, actorOf(user, await clientIp()));
    revalidateRentals(id);
    return { ok: true, message: lateFee.amount > 0 ? `Devolução registrada. Multa por atraso: R$ ${lateFee.amount.toFixed(2)} (${lateFee.days} dia(s)).` : "Devolução registrada. Estoque atualizado." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function addPaymentAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("inventory.manage");
    await RentalService.addPayment(id, { amount: formStr(fd, "amount"), method: formStr(fd, "method"), notes: formStr(fd, "notes") }, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateRentals(id);
  return { ok: true, message: "Pagamento registrado." };
}

export async function cancelRentalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = formStr(fd, "id") ?? "";
  try {
    const user = await requireUser("inventory.manage");
    await RentalService.cancel(id, formStr(fd, "reason")?.slice(0, 300) || null, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateRentals(id);
  return { ok: true, message: "Locação cancelada. As peças voltaram a ficar disponíveis." };
}

export async function reprintRentalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("print.manage");
    await RentalService.reprint(formStr(fd, "id") ?? "", actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/impressoes");
  return { ok: true, message: "Comprovante enviado para a impressora." };
}
