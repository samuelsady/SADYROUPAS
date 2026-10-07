"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { NotificationService } from "@/services/notification/notification.service";

export async function markAlertsReadAction() {
  await requireUser("notifications.view");
  await NotificationService.markAllRead();
  revalidatePath("/admin", "layout");
}
