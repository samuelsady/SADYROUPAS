import { connection } from "next/server";
import { SiteIntro } from "@/components/site/intro/site-intro";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Toaster } from "@/components/ui/toaster";
import { INTRO_KEY } from "@/lib/intro";
import { bookingWhatsapp } from "@/lib/whatsapp-messages";
import { SettingsService } from "@/services/settings.service";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [settings, hours] = await Promise.all([SettingsService.get(), SettingsService.businessHours()]);
  const bookingHref = bookingWhatsapp(settings.whatsapp);
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
        Pular para o conteúdo
      </a>
      {/* Quem já viu a entrada nesta sessão não a vê de novo (antes da pintura, sem piscar) */}
      <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("${INTRO_KEY}"))document.documentElement.dataset.intro="seen"}catch(e){}` }} />
      <SiteIntro />
      <SiteHeader bookingHref={bookingHref} />
      <main id="conteudo" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter settings={settings} hours={hours} />
      <MobileBottomNav bookingHref={bookingHref} />
      <Toaster />
    </>
  );
}
