import "server-only";
import { headers } from "next/headers";

/** IP do cliente (Vercel/proxies preenchem x-forwarded-for). Usado só para rate limit e auditoria. */
export async function clientIp() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}
