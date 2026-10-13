import type { Metadata } from "next";
import Link from "next/link";
import { Columns2, Columns3, Columns4, X } from "lucide-react";
import { FilterDrawer } from "@/components/site/catalog/filter-drawer";
import { SortSelect } from "@/components/site/catalog/sort-select";
import { ProductCard } from "@/components/site/product-card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { isOccasion, OCCASIONS, occasionName } from "@/lib/occasions";
import { cn } from "@/lib/utils";
import { CatalogService } from "@/services/catalog.service";
import { swatchFor } from "@/utils/colors";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Ternos, smokings, becas, camisas, gravatas e acessórios para alugar em Teresina — por ocasião, tamanho e cor.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 80) || undefined;

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ocasiao = one(sp.ocasiao);
  const filters = {
    categoria: one(sp.categoria),
    ocasiao: isOccasion(ocasiao) ? ocasiao : undefined,
    tamanho: one(sp.tamanho),
    cor: one(sp.cor),
    modelo: one(sp.modelo),
    q: one(sp.q),
    ordem: one(sp.ordem),
  };
  const grade = one(sp.grade) === "2" ? 2 : one(sp.grade) === "4" ? 4 : 3;
  const [categories, options, products, occasionCounts] = await Promise.all([
    CatalogService.categories(),
    CatalogService.filterOptions(),
    CatalogService.publicList(filters),
    CatalogService.occasionCounts(),
  ]);
  const activeCategory = categories.find((c) => c.slug === filters.categoria);
  const activeOccasion = OCCASIONS.find((o) => o.slug === filters.ocasiao);

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, grade: grade === 3 ? undefined : String(grade), ...patch })) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/catalogo?${s}` : "/catalogo";
  };
  const toggle = (key: keyof typeof filters, value: string) => hrefWith({ [key]: filters[key] === value ? undefined : value });

  const chips = [
    filters.categoria && { label: activeCategory?.name ?? filters.categoria, href: hrefWith({ categoria: undefined }) },
    filters.ocasiao && { label: occasionName(filters.ocasiao), href: hrefWith({ ocasiao: undefined }) },
    filters.tamanho && { label: `Tam. ${filters.tamanho}`, href: hrefWith({ tamanho: undefined }) },
    filters.cor && { label: filters.cor, href: hrefWith({ cor: undefined }) },
    filters.modelo && { label: filters.modelo, href: hrefWith({ modelo: undefined }) },
    filters.q && { label: `“${filters.q}”`, href: hrefWith({ q: undefined }) },
  ].filter(Boolean) as { label: string; href: string }[];

  const title = activeOccasion?.name ?? activeCategory?.name ?? "Todos os trajes";
  const subtitle = activeOccasion?.description ?? activeCategory?.description ?? "Ternos, smokings, becas e acessórios para alugar. Escolha, monte sua lista de provas e agende.";

  const groupTitle = "mb-4 text-[11px] font-bold uppercase tracking-[0.24em] text-ink";
  const filterPanel = (
    <div className="space-y-9">
      <form action="/catalogo" className="relative">
        {Object.entries(filters).map(([k, v]) => (k !== "q" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <input name="q" defaultValue={filters.q} placeholder="Buscar pelo nome…" aria-label="Buscar" className="h-11 w-full rounded-full border border-ink/15 bg-white px-4 text-sm focus:border-gold focus:outline-none" />
      </form>
      <div>
        <h3 className={groupTitle}>Categoria</h3>
        <ul className="space-y-2.5 text-sm">
          {categories.filter((c) => c._count.products > 0).map((c) => (
            <li key={c.slug}>
              <Link href={toggle("categoria", c.slug)} className={cn("flex items-center justify-between gap-2 transition hover:text-gold-dark", filters.categoria === c.slug ? "font-semibold text-ink" : "text-ink/70")}>
                <span className="flex items-center gap-2.5">
                  <span className={cn("h-3.5 w-3.5 rounded-[3px] border transition", filters.categoria === c.slug ? "border-ink bg-ink" : "border-ink/25")} />
                  {c.name}
                </span>
                <span className="text-xs text-muted-foreground">{c._count.products}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className={groupTitle}>Ocasião</h3>
        <ul className="space-y-2.5 text-sm">
          {OCCASIONS.filter((o) => occasionCounts[o.slug]).map((o) => (
            <li key={o.slug}>
              <Link href={toggle("ocasiao", o.slug)} className={cn("flex items-center justify-between gap-2 transition hover:text-gold-dark", filters.ocasiao === o.slug ? "font-semibold text-ink" : "text-ink/70")}>
                <span className="flex items-center gap-2.5">
                  <span className={cn("h-3.5 w-3.5 rounded-full border transition", filters.ocasiao === o.slug ? "border-ink bg-ink" : "border-ink/25")} />
                  {o.name}
                </span>
                <span className="text-xs text-muted-foreground">{occasionCounts[o.slug]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {options.sizes.length > 0 && (
        <div>
          <h3 className={groupTitle}>Tamanho</h3>
          <div className="flex flex-wrap gap-2">
            {options.sizes.map((s) => (
              <Link key={s} href={toggle("tamanho", s)} className={cn("flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-xs font-semibold transition", filters.tamanho === s ? "border-ink bg-ink text-ivory" : "border-ink/15 bg-white hover:border-ink/50")}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}
      {options.colors.length > 0 && (
        <div>
          <h3 className={groupTitle}>Cor</h3>
          <div className="flex flex-wrap gap-3">
            {options.colors.map((c) => (
              <Link key={c} href={toggle("cor", c)} title={c} aria-label={`Cor ${c}`} className="group flex flex-col items-center gap-1.5">
                <span className={cn("h-8 w-8 rounded-full ring-1 ring-ink/15 ring-offset-2 ring-offset-paper transition", filters.cor === c ? "ring-2 ring-ink" : "group-hover:ring-ink/50")} style={{ background: swatchFor(c) }} />
                <span className={cn("text-[10px]", filters.cor === c ? "font-semibold text-ink" : "text-muted-foreground")}>{c}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {options.models.length > 0 && (
        <div>
          <h3 className={groupTitle}>Modelo</h3>
          <div className="flex flex-wrap gap-2">
            {options.models.map((m) => (
              <Link key={m} href={toggle("modelo", m)} className={cn("rounded-full border px-3.5 py-2 text-xs font-semibold transition", filters.modelo === m ? "border-ink bg-ink text-ivory" : "border-ink/15 bg-white hover:border-ink/50")}>
                {m}
              </Link>
            ))}
          </div>
        </div>
      )}
      {chips.length > 0 && (
        <Link href="/catalogo" className="inline-block text-xs font-bold uppercase tracking-[0.18em] text-gold-dark link-draw">
          Limpar todos os filtros
        </Link>
      )}
    </div>
  );

  const gridCols = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[grade];

  return (
    <>
      {/* Cabeçalho da coleção */}
      <section className="aura grain -mt-px pb-10 pt-14 text-ivory sm:pb-14 sm:pt-20">
        <div className="container-site">
          <nav aria-label="Trilha" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/45">
            <Link href="/" className="hover:text-gold-light">Início</Link> <span className="mx-2">/</span>
            <Link href="/catalogo" className="hover:text-gold-light">Catálogo</Link>
            {(activeOccasion || activeCategory) && <><span className="mx-2">/</span><span className="text-gold-light">{title}</span></>}
          </nav>
          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">{title}</h1>
              <p className="mt-4 max-w-xl text-ivory/65">{subtitle}</p>
            </div>
            <p className="font-display text-2xl text-gold-light">{products.length} {products.length === 1 ? "traje" : "trajes"}</p>
          </div>
          {/* Ocasiões em destaque */}
          <div className="-mx-5 mt-10 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <Link href={hrefWith({ ocasiao: undefined })} className={cn("whitespace-nowrap rounded-full border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition", !filters.ocasiao ? "border-gold-light bg-gold-light text-ink" : "border-white/20 text-ivory/80 hover:border-gold-light hover:text-gold-light")}>
              Todas as ocasiões
            </Link>
            {OCCASIONS.filter((o) => occasionCounts[o.slug]).map((o) => (
              <Link key={o.slug} href={toggle("ocasiao", o.slug)} className={cn("whitespace-nowrap rounded-full border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition", filters.ocasiao === o.slug ? "border-gold-light bg-gold-light text-ink" : "border-white/20 text-ivory/80 hover:border-gold-light hover:text-gold-light")}>
                {o.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-site py-10 sm:py-14">
        {/* Barra de ferramentas */}
        <div className="sticky top-16 z-20 -mx-5 mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/90 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <div className="flex flex-wrap items-center gap-2">
            <FilterDrawer activeCount={chips.length}>{filterPanel}</FilterDrawer>
            {chips.map((c) => (
              <Link key={c.label} href={c.href} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[11px] font-semibold text-ivory transition hover:bg-ink-3">
                {c.label} <X className="h-3 w-3" aria-label="remover" />
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SortSelect value={filters.ordem ?? "destaques"} />
            <div className="hidden items-center rounded-full border border-ink/15 bg-white p-1 lg:flex" role="group" aria-label="Colunas">
              {([2, 3, 4] as const).map((g) => {
                const Icon = g === 2 ? Columns2 : g === 3 ? Columns3 : Columns4;
                return (
                  <Link key={g} href={hrefWith({ grade: g === 3 ? undefined : String(g) })} scroll={false} aria-label={`${g} colunas`} aria-current={grade === g ? "true" : undefined} className={cn("flex h-9 w-9 items-center justify-center rounded-full transition", grade === g ? "bg-ink text-ivory" : "text-ink/50 hover:text-ink")}>
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[250px_1fr]">
          <aside className="hidden lg:block" aria-label="Filtros">
            <div className="sticky top-28">{filterPanel}</div>
          </aside>
          <div>
            {products.length === 0 ? (
              <EmptyState
                title="Nenhum traje com esses filtros"
                description="Tente outro tamanho ou cor — ou agende um atendimento: temos opções que ainda não estão no catálogo online."
                action={<LinkButton href="/agendamento" variant="gold">Agendar atendimento</LinkButton>}
              />
            ) : (
              <div className={cn("grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6", gridCols)}>
                {products.map((p, i) => (
                  <Reveal key={p.id} delay={(i % grade) * 80}>
                    <ProductCard
                      product={p}
                      priority={i < grade}
                      sizes={grade === 2 ? "(min-width: 1024px) 40vw, 50vw" : grade === 4 ? "(min-width: 1024px) 20vw, 50vw" : "(min-width: 1024px) 27vw, 50vw"}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
