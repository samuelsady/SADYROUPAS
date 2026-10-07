import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Check, MessageCircle } from "lucide-react";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { ProductCard } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product-gallery";
import { CatalogService } from "@/services/catalog.service";
import { SettingsService } from "@/services/settings.service";
import { whatsappLink } from "@/utils/phone";
import { cn } from "@/utils/cn";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await CatalogService.publicBySlug(slug);
  if (!p) return { title: "Produto não encontrado" };
  return { title: p.name, description: p.description ?? undefined, openGraph: { images: p.images[0] ? [p.images[0].url] : undefined } };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await CatalogService.publicBySlug(slug);
  if (!product) notFound();
  const [related, settings] = await Promise.all([CatalogService.related(product), SettingsService.get()]);
  const wa = whatsappLink(settings.whatsapp, `Olá! Gostaria de saber a disponibilidade do ${product.name}.`);

  return (
    <>
      <div className="container-site pt-6 text-xs text-muted">
        <nav aria-label="Trilha">
          <Link href="/catalogo" className="hover:text-ink">Catálogo</Link>
          <span className="mx-2">/</span>
          <Link href={`/catalogo?categoria=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>
      </div>

      <section className="container-site grid gap-10 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-12">
        <ProductGallery images={product.images} name={product.name} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{product.category.name}</p>
          <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          {product.description && <p className="mt-5 leading-relaxed text-muted">{product.description}</p>}

          <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
            <div className="flex justify-between py-3.5"><dt className="text-muted">Categoria</dt><dd className="font-medium">{product.category.name}</dd></div>
            {product.model && <div className="flex justify-between py-3.5"><dt className="text-muted">Modelo</dt><dd className="font-medium">{product.model}</dd></div>}
            {product.colors.length > 0 && <div className="flex justify-between py-3.5"><dt className="text-muted">Cor</dt><dd className="font-medium">{product.colors.join(", ")}</dd></div>}
          </dl>

          {product.sizes.length > 0 && (
            <div className="mt-7">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Tamanhos</h2>
                {product.hasInventory && <span className="text-xs text-muted">Disponibilidade atual na loja</span>}
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const available = product.availability[size] ?? 0;
                  const known = product.hasInventory;
                  return (
                    <li key={size} className={cn("flex min-w-14 flex-col items-center rounded-md border px-3 py-2 text-sm font-semibold", !known || available > 0 ? "border-ink/20" : "border-line text-muted/60 line-through")} title={known ? (available > 0 ? "Disponível" : "Indisponível no momento") : undefined}>
                      {size}
                    </li>
                  );
                })}
              </ul>
              {product.hasInventory && <p className="mt-2 text-xs text-muted">Tamanhos riscados estão reservados ou alugados no momento. A confirmação final é feita no atendimento.</p>}
            </div>
          )}

          {product.details && (
            <div className="mt-7 rounded-lg bg-ivory p-4 text-sm leading-relaxed text-ink/80">
              <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{product.details}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href={`/agendamento?produto=${product.slug}`} variant="primary" size="xl" className="flex-1">
              <CalendarCheck className="h-5 w-5" /> Agendar atendimento
            </LinkButton>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "xl", "flex-1")}>
                <MessageCircle className="h-5 w-5" /> Consultar no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-line bg-ivory py-16">
          <div className="container-site">
            <h2 className="display text-3xl sm:text-4xl">Você também pode gostar</h2>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
