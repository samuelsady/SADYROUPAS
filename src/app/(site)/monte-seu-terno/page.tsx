import type { Metadata } from "next";
import { SuitStudio } from "@/components/site/atelie/suit-studio";
import { CatalogService } from "@/services/catalog.service";
import { SettingsService } from "@/services/settings.service";

export const metadata: Metadata = {
  title: "Monte seu terno",
  description: "Gire o manequim, veja os detalhes de perto, troque cores e tecidos e acompanhe o terno sendo vestido peça por peça.",
};

export default async function SuitBuilderPage() {
  const [settings, facets] = await Promise.all([SettingsService.get(), CatalogService.filterOptions()]);
  return (
    <>
      <section className="aura grain text-ivory">
        <div className="container-site py-14 sm:py-20">
          <p className="eyebrow">Do seu jeito</p>
          <h1 className="display mt-3 max-w-3xl text-4xl leading-[1.05] sm:text-6xl">
            Monte seu terno <em className="text-gold-shine">peça por peça</em>
          </h1>
          <p className="mt-5 max-w-xl text-ivory/70">
            Arraste o manequim para girar, toque nos pontos dourados para ver os detalhes de perto e troque cores, tecidos, gravata e colete. Depois é só agendar a prova.
          </p>
        </div>
      </section>
      <section className="aura-light">
        <div className="container-site py-10 sm:py-16">
          <SuitStudio whatsapp={settings.whatsapp} catalogColors={facets.colors} />
        </div>
      </section>
    </>
  );
}
