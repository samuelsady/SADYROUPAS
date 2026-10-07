import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@prisma/client";

/**
 * Sessão administrativa em cookie httpOnly assinado (HS256).
 * Este módulo roda tanto no proxy quanto no servidor; o segredo só existe no servidor.
 */
export const SESSION_COOKIE = "sady_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h — um turno de trabalho

export type SessionPayload = {
  sub: string;
  name: string;
  role: UserRole;
};

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET ausente ou curto.");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-0123456789");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { sub: payload.sub, name: String(payload.name ?? ""), role: payload.role as UserRole };
  } catch {
    return null;
  }
}
