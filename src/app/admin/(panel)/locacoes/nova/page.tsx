import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { RentalForm } from "@/components/admin/rental-form";
import { Card } from "@/components/ui/card";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { parseRentalPolicy } from "@/services/rental.service";
import { SettingsService } from "@/services/settings.service";
import { todayKey } from "@/utils/datetime";
import { createRentalAction } from "../../_actions/rentals";

export const metadata: Metadata = { title: "Nova locação" };

export default async function NewRentalPage({ searchParams }: { searchParams: Promise<{ agendamento?: string; cliente?: string }> }) {
  await requirePageUser("inventory.manage");
  const sp = await searchParams;
  const settings = await SettingsService.get();
  const appointment = sp.agendamento
    ? await db.appointment.findUnique({
        where: { id: sp.agendamento },
        include: {
          customer: { select: { id: true, name: true, whatsapp: true, email: true } },
          items: { include: { inventoryItem: { select: { code: true, size: true, color: true, status: true, location: true, product: { select: { name: true } } } } } },
        },
      })
    : null;
  const customer = appointment?.customer ?? (sp.cliente ? await db.customer.findUnique({ where: { id: sp.cliente }, select: { id: true, name: true, whatsapp: true, email: true } }) : null);
  // Peças que já foram separadas para a prova entram automaticamente
  const initialPieces = appointment?.items.flatMap((i) => (i.inventoryItem ? [i.inventoryItem] : [])) ?? [];

  return (
    <>
      <PageHeader
        title="Nova locação"
        description={appointment ? `A partir do agendamento ${appointment.code}. As peças separadas na prova já estão na lista.` : "Registre o aluguel: cliente, peças, datas e entrega."}
        back={{ href: "/admin/locacoes", label: "Locações" }}
      />
      <Card className="max-w-3xl p-5 sm:p-7">
        <RentalForm
          action={createRentalAction}
          initialCustomer={customer}
          appointmentId={appointment?.id ?? null}
          initialPieces={initialPieces}
          defaultDays={parseRentalPolicy(settings.rentalPolicy).defaultRentalDays}
          today={todayKey(settings.timezone)}
        />
      </Card>
    </>
  );
}
