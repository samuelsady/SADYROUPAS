"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/jwt";
import { getCurrentUser } from "@/lib/auth/session";
import { toActionError, type ActionState } from "@/lib/action";
import { clientIp } from "@/lib/request";
import { AuditService } from "@/services/audit.service";
import { AuthService } from "@/services/auth.service";

function safeNext(next: FormDataEntryValue | null) {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/admin") && !s.startsWith("//") ? s : "/admin";
}

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let token: string;
  try {
    token = await AuthService.login({ email: fd.get("email"), password: fd.get("password") }, await clientIp());
  } catch (err) {
    return toActionError(err);
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS });
  redirect(safeNext(fd.get("next")));
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await AuditService.log({ userId: user.id, label: user.name }, { action: "auth.logout", entity: "User", entityId: user.id, summary: "Saiu do painel" });
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
