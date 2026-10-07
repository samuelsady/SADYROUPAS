import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, MessageCircle } from "lucide-react";
import { CustomerFields } from "@/components/admin/customer-fields";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleForm } from "@/components/admin/simple-form";
import { AppointmentStatusBadge, NotificationStatusBadge } from "@/components/admin/status-badges";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { requirePageUser } from "@/lib/auth/session";
import { notificationEventLabel } from "@/lib/labels";
import { CustomerService } from "@/services/customer.service";
import { SettingsService } from "@/services/settings.service";
import { formatDate, formatDateTime, toTimeKey } from "@/utils/datetime";
import { formatPhone, whatsappLink } from "@/utils/phone";
import { addMeasurementAction, updateCustomerAction } from "../../_actions/customers";

export const metadata: Metadata = { title: "Cliente" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser("customers.manage");
  const { id } = await params;
  const [c, settings] = await Promise.all([CustomerService.get(id), SettingsService.get()]);
  const tz = settings.timezone;
  const m = c.measurements[0];
  const wa = whatsappLink(c.whatsapp);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/clientes", label: "Clientes" }}
        title={c.name}
        description={`${formatPhone(c.whatsapp)}${c.email ? ` · ${c.email}` : ""} · cliente desde ${formatDate(c.createdAt, tz)}`}
        actions={
          <>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
            <LinkButton href={`/admin/agendamentos/novo?cliente=${c.id}`}><CalendarPlus className="h-4 w-4" /> Agendar</LinkButton>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Agendamentos" description={`${c.appointments.length} no total`} />
            {c.appointments.length === 0 ? <p className="px-5 py-5 text-sm text-muted">Nenhum agendamento.</p> : (
              <ul className="divide-y divide-line">
                {c.appointments.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/agendamentos/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ivory/50">
                      <div>
                        <p className="text-sm font-semibold">{formatDate(a.startsAt, tz)} · {toTimeKey(a.startsAt, tz)}</p>
                        <p className="text-xs text-muted">{a.service.name}{a.product ? ` · ${a.product.name}` : ""} · <span className="font-mono">{a.code}</span></p>
                      </div>
                      <AppointmentStatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Dados do cliente" />
            <div className="p-5">
              <SimpleForm action={updateCustomerAction.bind(null, c.id)}><CustomerFields c={c} /></SimpleForm>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Medidas" description={m ? `Última atualização: ${formatDate(m.createdAt, tz)}` : "Facilita os próximos atendimentos"} />
            <div className="p-5">
              {m && (
                <dl className="mb-5 grid grid-cols-4 gap-2 text-center">
                  {[["Paletó", m.jacket], ["Calça", m.pants], ["Camisa", m.shirt], ["Sapato", m.shoe]].map(([k, v]) => (
                    <div key={k} className="rounded-md bg-ivory p-2"><dt className="text-[10px] uppercase text-muted">{k}</dt><dd className="text-lg font-semibold">{v || "—"}</dd></div>
                  ))}
                </dl>
              )}
              <SimpleForm action={addMeasurementAction.bind(null, c.id)} submitLabel="Registrar medidas" className="grid grid-cols-2 gap-3">
                <Field label="Paletó"><Input name="jacket" defaultValue={m?.jacket ?? ""} maxLength={10} /></Field>
                <Field label="Calça"><Input name="pants" defaultValue={m?.pants ?? ""} maxLength={10} /></Field>
                <Field label="Camisa"><Input name="shirt" defaultValue={m?.shirt ?? ""} maxLength={10} /></Field>
                <Field label="Sapato"><Input name="shoe" defaultValue={m?.shoe ?? ""} maxLength={10} /></Field>
                <Field label="Observação" className="col-span-2"><Input name="notes" maxLength={500} /></Field>
              </SimpleForm>
            </div>
          </Card>
          <Card>
            <CardHeader title="Mensagens enviadas" />
            {c.notifications.length === 0 ? <p className="px-5 py-5 text-sm text-muted">Nenhuma mensagem.</p> : (
              <ul className="divide-y divide-line">
                {c.notifications.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-xs">
                    <span>{notificationEventLabel[n.event]}<span className="block text-muted">{formatDateTime(n.createdAt, tz)}</span></span>
                    <NotificationStatusBadge status={n.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5 text-xs text-muted">
            <p className="font-semibold text-ink">Em breve (V2)</p>
            <p className="mt-1">Histórico de locações, pagamentos, devoluções e ocorrências deste cliente.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
