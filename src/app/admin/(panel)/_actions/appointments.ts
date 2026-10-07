"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AppointmentStatus } from "@prisma/client";
import { actorOf, requireUser } from "@/lib/auth/session";
import { formStr, toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { AppointmentService } from "@/services/appointment.service";
import { PrintService } from "@/services/print/print.service";
import { NotificationService } from "@/services/notification/notification.service";

const STATUSES: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

function revalidateAppointments(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agendamentos");
  if (id) revalidatePath(`/admin/agendamentos/${id}`);
}

export async function createAppointmentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireUser("appointments.manage");
    const { appointment } = await AppointmentService.createByStaff(
      {
        customerId: formStr(fd, "customerId"),
        name: formStr(fd, "name"),
        whatsapp: formStr(fd, "whatsapp"),
        email: formStr(fd, "email"),
        serviceId: formStr(fd, "serviceId"),
        date: formStr(fd, "date"),
        time: formStr(fd, "time"),
        notes: formStr(fd, "notes"),
        internalNotes: formStr(fd, "internalNotes"),
        productId: formStr(fd, "productId"),
        source: formStr(fd, "source"),
      },
      actorOf(user, await clientIp()),
    );
    id = appointment.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidateAppointments();
  redirect(`/admin/agendamentos/${id}?criado=1`);
}

export async function updateAppointmentAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser("appointments.manage");
    await AppointmentService.update(
      id,
      { serviceId: formStr(fd, "serviceId"), date: formStr(fd, "date"), time: formStr(fd, "time"), notes: formStr(fd, "notes"), internalNotes: formStr(fd, "internalNotes"), productId: formStr(fd, "productId") },
      actorOf(user, await clientIp()),
    );
  } catch (err) {
    return toActionError(err);
  }
  revalidateAppointments(id);
  redirect(`/admin/agendamentos/${id}?salvo=1`);
}

export async function changeAppointmentStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = formStr(fd, "id") ?? "";
  const status = formStr(fd, "status") as AppointmentStatus;
  try {
    if (!STATUSES.includes(status)) throw new Error("Status inválido");
    const user = await requireUser("appointments.manage");
    await AppointmentService.changeStatus(id, status, actorOf(user, await clientIp()), { reason: formStr(fd, "reason")?.slice(0, 300) || null });
  } catch (err) {
    return toActionError(err);
  }
  revalidateAppointments(id);
  return { ok: true, message: "Status atualizado." };
}

export async function reprintAppointmentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = formStr(fd, "id") ?? "";
  try {
    const user = await requireUser("print.manage");
    await PrintService.reprintAppointment(id, actorOf(user, await clientIp()));
  } catch (err) {
    return toActionError(err);
  }
  revalidateAppointments(id);
  revalidatePath("/admin/impressoes");
  return { ok: true, message: "Comprovante enviado para a fila de impressão." };
}

export async function retryNotificationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = formStr(fd, "id") ?? "";
  try {
    await requireUser("notifications.view");
    await NotificationService.retry(id);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/notificacoes");
  revalidatePath("/admin/agendamentos", "layout");
  return { ok: true, message: "Mensagem reenviada." };
}
