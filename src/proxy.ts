import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

/**
 * 1) MODO PRÉVIA (opcional): com PREVIEW_PASSWORD definida, o site inteiro pede
 *    usuário/senha (HTTP Basic) e não é indexado. Serve para testar online antes
 *    do lançamento. Remova a variável para abrir o site ao público.
 * 2) Painel: checagem otimista do cookie de sessão. A autorização definitiva
 *    acontece em cada página, Server Action e rota de API (src/lib/auth/session.ts).
 */

/** Rotas usadas por máquinas (agente de impressão, agendador): têm token próprio. */
const MACHINE_ROUTES = ["/api/print-agent/", "/api/cron/"];

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function previewAllowed(req: NextRequest, password: string) {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const pass = decoded.slice(decoded.indexOf(":") + 1);
    return safeEqual(pass, password);
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const previewPassword = process.env.PREVIEW_PASSWORD;

  if (previewPassword && !MACHINE_ROUTES.some((r) => pathname.startsWith(r)) && !previewAllowed(req, previewPassword)) {
    return new NextResponse("Prévia privada da Sady Roupas. Informe a senha de acesso.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Sady Roupas - previa", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdmin) {
    if (!previewPassword) return NextResponse.next();
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (pathname === "/admin/login") {
    return session ? NextResponse.redirect(new URL("/admin", req.url)) : NextResponse.next();
  }
  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const url = new URL("/admin/login", req.url);
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}

export const config = {
  // Tudo, exceto arquivos estáticos do Next e arquivos de imagem (as páginas /catalogo/... continuam protegidas)
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:jpg|jpeg|png|webp|avif|svg|ico)$).*)"],
};
