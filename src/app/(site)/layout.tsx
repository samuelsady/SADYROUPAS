import { connection } from "next/server";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { SettingsService } from "@/services/settings.service";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [settings, hours] = await Promise.all([SettingsService.get(), SettingsService.businessHours()]);
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter settings={settings} hours={hours} />
      <WhatsAppFloat phone={settings.whatsapp} />
    </>
  );
}
