import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/database/client";
import type { Actor } from "@/services/audit.service";
import { forbidden, unauthorized } from "../errors";
import { SESSION_COOKIE, verifySession } from "./jwt";
import { can, type Permission } from "./permissions";

export type CurrentUser = { id: string; name: string; email: string; role: "ADMIN" | "STAFF" };

/**
 * Sessão atual, revalidada no banco a cada requisição: usuário desativado
 * perde o acesso imediatamente, mesmo com cookie válido.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** Páginas do painel: redireciona ao login sem sessão; sem permissão volta ao dashboard. */
export async function requirePageUser(permission?: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (permission && !can(user.role, permission)) redirect("/admin?negado=1");
  return user;
}

/** Server Actions e rotas de API: lança erro 401/403. */
export async function requireUser(permission?: Permission) {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  if (permission && !can(user.role, permission)) throw forbidden();
  return user;
}

export function actorOf(user: CurrentUser, ip?: string | null): Actor {
  return { userId: user.id, label: user.name, ip };
}
