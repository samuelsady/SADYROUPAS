import type { Metadata } from "next";
import { Clock, MapPin, ShieldCheck } from "lucide-react";
import { db } from "@/database/client";
import { BookingForm } from "@/components/site/booking-form";
import { hoursSummary } from "@/components/site/site-footer";
import { SettingsService } from "@/services/settings.service";

export const metadata: Metadata = {
  title: "Agendar atendimento",
  description: "Agende online seu horário na Sady Roupas para escolher, provar, retirar ou devolver seu traje.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function BookingPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const productSlug = typeof sp.produto === "string" ? sp.produto.slice(0, 120) : undefined;
  const [services, product, settings, hours] = await Promise.all([
    db.service.findMany({ where: { active: true, publicBooking: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, description: true } }),
    productSlug ? db.product.findFirst({ where: { slug: productSlug, active: true }, select: { slug: true, name: true, category: { select: { slug: true } } } }) : null,
    SettingsService.get(),
    SettingsService.businessHours(),
  ]);
  const initialServiceId = product ? services.find((s) => (product.category.slug === "becas" ? /beca/i.test(s.name) : /terno/i.test(s.name)))?.id : undefined;

  return (
    <div className="bg-ivory">
      <div className="container-site grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        <div className="min-w-0">
          <p className="eyebrow">Agendamento</p>
          <h1 className="display mt-3 text-4xl sm:text-5xl">Agende seu atendimento</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Escolha o serviço, a data e o horário. Não é preciso criar conta — a confirmação chega no seu WhatsApp.</p>
          <div className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-8">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">O agendamento online está temporariamente indisponível. Fale conosco pelo WhatsApp.</p>
            ) : (
              <BookingForm services={services} product={product ? { slug: product.slug, name: product.name } : null} initialServiceId={initialServiceId} />
            )}
          </div>
        </div>
        <aside className="space-y-6 lg:pt-28">
          <div className="rounded-xl bg-ink p-6 text-ivory">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-gold" /> Horário de atendimento</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {hoursSummary(hours).map((g) => (
                <li key={g.days} className="flex justify-between gap-4"><span className="text-ivory/60">{g.days}</span><span>{g.label}</span></li>
              ))}
            </ul>
          </div>
          {settings.address && (
            <div className="rounded-xl border border-line bg-white p-6 text-sm">
              <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-gold" /> Onde estamos</h2>
              <p className="mt-2 text-muted-foreground">{settings.address}</p>
            </div>
          )}
          <div className="flex gap-3 rounded-xl border border-line bg-white p-6 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 shrink-0 text-gold" />
            <p>O horário só é confirmado depois de gravado no nosso sistema — se outra pessoa reservar o mesmo horário antes, avisaremos na hora para você escolher outro.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
