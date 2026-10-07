import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar — Painel", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-ink p-12 text-ivory lg:flex">
        <Wordmark tone="light" className="text-2xl" />
        <div>
          <p className="display text-5xl leading-tight">Painel de gestão</p>
          <p className="mt-4 max-w-sm text-ivory/60">Agenda, clientes, catálogo, estoque, impressões e notificações em um só lugar.</p>
        </div>
        <p className="text-xs text-ivory/40">Acesso restrito à equipe da Sady Roupas.</p>
      </div>
      <div className="flex items-center justify-center bg-paper px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Wordmark className="text-2xl" />
          </div>
          <h1 className="display text-3xl">Entrar</h1>
          <p className="mt-1 text-sm text-muted">Use seu e-mail e senha da equipe.</p>
          <div className="mt-8">
            <LoginForm next={next} />
          </div>
          <Link href="/" className="mt-10 block text-center text-xs text-muted hover:text-ink">← Voltar ao site</Link>
        </div>
      </div>
    </div>
  );
}
