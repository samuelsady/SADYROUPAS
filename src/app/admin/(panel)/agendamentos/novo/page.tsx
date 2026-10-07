import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { AppointmentForm } from "@/components/admin/appointment-form";
import { Card } from "@/components/ui/card";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { isDateKey, isTimeKey } from "@/utils/datetime";
import { createAppointmentAction } from "../../_actions/appointments";

export const metadata: Metadata = { title: "Novo agendamento" };

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageUser("appointments.manage");
  const sp = await searchParams;
  const [services, products, customer] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, durationMin: true } }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    sp.cliente ? db.customer.findUnique({ where: { id: sp.cliente }, select: { id: true, name: true, whatsapp: true, email: true } }) : null,
  ]);
  return (
    <>
      <PageHeader title="Novo agendamento" description="Para clientes que entram em contato pelo WhatsApp, telefone ou balcão. As regras de disponibilidade são as mesmas do site." back={{ href: "/admin/agendamentos", label: "Agendamentos" }} />
      <Card className="max-w-3xl p-5 sm:p-7">
        <AppointmentForm
          action={createAppointmentAction}
          services={services}
          products={products}
          mode="create"
          initialCustomer={customer}
          initial={{ date: sp.date && isDateKey(sp.date) ? sp.date : undefined, time: sp.time && isTimeKey(sp.time) ? sp.time : undefined }}
        />
      </Card>
    </>
  );
}
