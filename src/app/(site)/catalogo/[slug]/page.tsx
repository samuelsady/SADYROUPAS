import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronDown, MessageCircle } from "lucide-react";
import { ProductRail } from "@/components/site/home/product-rail";
import { FittingPicker } from "@/components/site/fitting-picker";
import { ProductGallery } from "@/components/site/product-gallery";
import { Reveal } from "@/components/ui/reveal";
import { occasionName } from "@/lib/occasions";
import { CatalogService } from "@/services/catalog.service";
import { SettingsService } from "@/services/settings.service";
import { swatchFor } from "@/utils/colors";
import { whatsappLink } from "@/utils/phone";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await CatalogService.publicBySlug(slug);
  if (!p) return { title: "Produto não encontrado" };
  return { title: p.name, description: p.description ?? undefined, openGraph: { images: p.images[0] ? [p.images[0].url] : undefined } };
}

function Accordion({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[12px] font-bold uppercase tracking-[0.2em]">
        {title}
        <ChevronDown className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="pb-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await CatalogService.publicBySlug(slug);
  if (!product) notFound();
  const [related, settings] = await Promise.all([CatalogService.related(product, 8), SettingsService.get()]);
  const wa = whatsappLink(settings.whatsapp, `Olá! Gostaria de saber a disponibilidade do ${product.name}.`);

  return (
    <>
      <div className="container-site pt-6 sm:pt-8">
        <nav aria-label="Trilha" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Link href="/catalogo" className="hover:text-ink">Catálogo</Link>
          <span className="mx-2">/</span>
          <Link href={`/catalogo?categoria=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>
      </div>

      <section className="container-site grid gap-10 py-6 lg:grid-cols-[1.35fr_1fr] lg:gap-16 lg:py-10">
        <ProductGallery images={product.images} name={product.name} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{product.model ?? product.category.name}</p>
          <h1 className="display mt-3 text-5xl leading-[0.98] sm:text-6xl">{product.name}</h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            {product.colors.length > 0 && (
              <span className="flex items-center gap-2">
                {product.colors.map((c) => <span key={c} className="h-4 w-4 rounded-full ring-1 ring-ink/20 ring-offset-2 ring-offset-paper" style={{ background: swatchFor(c) }} title={c} />)}
                <span className="text-muted-foreground">{product.colors.join(", ")}</span>
              </span>
            )}
            <span className="text-muted-foreground">{product.category.name}</span>
          </div>

          {product.occasions.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {product.occasions.map((o) => (
                <Link key={o} href={`/catalogo?ocasiao=${o}`} className="rounded-full border border-gold/40 bg-[#fbf6ec] px-3 py-1 text-[11px] font-semibold text-gold-dark transition hover:border-gold">
                  {occasionName(o)}
                </Link>
              ))}
            </div>
          )}

          {product.description && <p className="mt-6 leading-relaxed text-ink/75">{product.description}</p>}

          <FittingPicker
            product={{ slug: product.slug, name: product.name, image: product.images[0]?.url ?? null, sizes: product.sizes }}
            availability={product.availability}
            hasInventory={product.hasInventory}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href={`/agendamento?produto=${product.slug}`} className="btn-shine inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[12px] font-bold uppercase tracking-[0.16em] text-ivory transition hover:bg-ink-3">
              <CalendarCheck className="h-4 w-4" /> Agendar prova
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-ink/20 px-6 text-[12px] font-bold uppercase tracking-[0.16em] transition hover:border-ink">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>

          <div className="mt-8 border-t border-line">
            <Accordion title="Detalhes" open>
              {product.details ?? "Consulte a equipe para detalhes de tecido e caimento."}
            </Accordion>
            <Accordion title="Como funciona o aluguel">
              Agende um horário, prove com orientação da equipe e reserve as peças para a data do evento. Na retirada o traje é conferido; depois do evento, é só devolver na data combinada.
            </Accordion>
            <Accordion title="Ajustes e tamanhos">
              Barra e manga podem ser ajustadas na prova, conforme disponibilidade. Os tamanhos indicados são os que temos no acervo — na dúvida, agende e prove mais de um.
            </Accordion>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="overflow-hidden border-t border-line bg-ivory py-20">
          <div className="container-site">
            <Reveal className="mb-12">
              <p className="eyebrow">Complete a escolha</p>
              <h2 className="display mt-3 text-4xl sm:text-6xl">Você também pode gostar</h2>
            </Reveal>
            <ProductRail products={related} />
          </div>
        </section>
      )}
    </>
  );
}
