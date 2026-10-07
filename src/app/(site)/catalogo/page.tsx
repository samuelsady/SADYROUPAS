import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/site/product-card";
import { AutoSubmitSelect } from "@/components/site/auto-submit-select";
import { EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { CatalogService } from "@/services/catalog.service";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Ternos, smokings, becas, camisas, gravatas e acessórios para alugar em Teresina.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 80) || undefined;

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = { categoria: one(sp.categoria), tamanho: one(sp.tamanho), cor: one(sp.cor), modelo: one(sp.modelo), q: one(sp.q) };
  const [categories, options, products] = await Promise.all([CatalogService.categories(), CatalogService.filterOptions(), CatalogService.publicList(filters)]);
  const activeCategory = categories.find((c) => c.slug === filters.categoria);
  const hasFilters = Boolean(filters.tamanho || filters.cor || filters.modelo || filters.q);

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...patch })) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/catalogo?${s}` : "/catalogo";
  };

  return (
    <>
      <section className="border-b border-line bg-ivory">
        <div className="container-site py-12 sm:py-16">
          <p className="eyebrow">Catálogo</p>
          <h1 className="display mt-3 text-4xl sm:text-6xl">{activeCategory?.name ?? "Todos os trajes"}</h1>
          <p className="mt-3 max-w-xl text-muted">{activeCategory?.description ?? "Ternos, smokings, becas e acessórios para alugar. Escolha os modelos e agende para experimentar."}</p>
        </div>
        <div className="container-site -mb-px flex gap-1 overflow-x-auto pb-0 [scrollbar-width:none]">
          {[{ slug: undefined, name: "Todos" }, ...categories].map((c) => {
            const active = c.slug === filters.categoria;
            return (
              <Link key={c.name} href={hrefWith({ categoria: c.slug })} className={cn("whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition", active ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink")} aria-current={active ? "page" : undefined}>
                {c.name}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-site py-10 sm:py-14">
        <form action="/catalogo" className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
          {filters.categoria && <input type="hidden" name="categoria" value={filters.categoria} />}
          <div className="flex items-center gap-2 text-sm font-semibold text-ink sm:mr-2 sm:self-center">
            <SlidersHorizontal className="h-4 w-4 text-gold" /> Filtrar
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
            <AutoSubmitSelect name="tamanho" defaultValue={filters.tamanho ?? ""} aria-label="Tamanho" className="sm:w-36">
              <option value="">Tamanho</option>
              {options.sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </AutoSubmitSelect>
            <AutoSubmitSelect name="cor" defaultValue={filters.cor ?? ""} aria-label="Cor" className="sm:w-36">
              <option value="">Cor</option>
              {options.colors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </AutoSubmitSelect>
            <AutoSubmitSelect name="modelo" defaultValue={filters.modelo ?? ""} aria-label="Modelo" className="sm:w-44">
              <option value="">Modelo</option>
              {options.models.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </AutoSubmitSelect>
          </div>
          <input name="q" defaultValue={filters.q} placeholder="Buscar pelo nome…" aria-label="Buscar" className="h-11 flex-1 rounded-md border border-line px-3 text-[15px] focus:border-gold focus:outline-none sm:min-w-48 sm:text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="h-11 flex-1 rounded-md bg-ink px-5 text-sm font-semibold text-ivory sm:flex-none">Filtrar</button>
            {hasFilters && (
              <Link href={hrefWith({ tamanho: undefined, cor: undefined, modelo: undefined, q: undefined })} className="flex h-11 items-center rounded-md px-3 text-sm font-semibold text-muted hover:text-ink">
                Limpar
              </Link>
            )}
          </div>
        </form>

        <p className="mt-8 text-sm text-muted" aria-live="polite">
          {products.length} {products.length === 1 ? "modelo encontrado" : "modelos encontrados"}
        </p>

        {products.length === 0 ? (
          <EmptyState title="Nenhum modelo com esses filtros" description="Tente outro tamanho ou cor — ou agende um atendimento: temos opções que ainda não estão no catálogo online." action={<LinkButton href="/agendamento" variant="gold">Agendar atendimento</LinkButton>} />
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
