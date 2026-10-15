import { connection } from "next/server";
import { IntroSplash } from "@/components/site/intro-splash";
import { INTRO_KEY } from "@/lib/intro";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Toaster } from "@/components/ui/toaster";
import { OCCASIONS } from "@/lib/occasions";
import { CatalogService } from "@/services/catalog.service";
import { SettingsService } from "@/services/settings.service";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [settings, hours, categories, occasionCounts] = await Promise.all([
    SettingsService.get(),
    SettingsService.businessHours(),
    CatalogService.categories(),
    CatalogService.occasionCounts(),
  ]);
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
        Pular para o conteúdo
      </a>
      {/* Quem já viu a abertura nesta sessão não a vê de novo (antes da pintura, sem piscar) */}
      <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("${INTRO_KEY}"))document.documentElement.dataset.intro="seen"}catch(e){}` }} />
      <IntroSplash />
      <SiteHeader
        categories={categories.filter((c) => c._count.products > 0).map((c) => ({ slug: c.slug, name: c.name, count: c._count.products }))}
        occasions={OCCASIONS.filter((o) => occasionCounts[o.slug]).map((o) => ({ slug: o.slug, name: o.name }))}
        feature={[
          { href: "/catalogo?ocasiao=gala", image: "/catalogo/smoking-tradicional-1-bota-o-foto-1.jpg", title: "Gala & noite" },
          { href: "/catalogo?ocasiao=casamento", image: "/catalogo/dior-bege-foto-1.jpg", title: "Casamento" },
        ]}
      />
      <main id="conteudo" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter settings={settings} hours={hours} />
      <MobileBottomNav />
      <Toaster />
    </>
  );
}
