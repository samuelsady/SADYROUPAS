import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MessageCircle, PackageCheck, Printer, Store, Truck, Undo2 } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { InlineForm } from "@/components/admin/inline-form";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleForm } from "@/components/admin/simple-form";
import { InventoryStatusBadge } from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { requirePageUser } from "@/lib/auth/session";
import { rentalStatusLabel, rentalStatusTone, returnConditionLabel } from "@/lib/labels";
import { DELIVERY_LABEL, PAYMENT_METHOD_LABEL, RentalService } from "@/services/rental-workflow.service";
import { SettingsService } from "@/services/settings.service";
import { formatRentalNumber } from "@/utils/codes";
import { diffDaysKey, formatDateKey, formatDateTime, todayKey } from "@/utils/datetime";
import { formatPhone, whatsappLink } from "@/utils/phone";
import { formatCurrency } from "@/utils/text";
import { addPaymentAction, cancelRentalAction, confirmPickupAction, registerReturnAction, reprintRentalAction } from "../../_actions/rentals";

export const metadata: Metadata = { title: "Locação" };

const CHECKLIST = ["Paletó", "Calça", "Camisa", "Gravata", "Cinto", "Colete", "Acessórios"];

export default async function RentalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> }) {
  await requirePageUser("inventory.manage");
  const [{ id }, { criada }] = await Promise.all([params, searchParams]);
  const [r, settings] = await Promise.all([RentalService.get(id), SettingsService.get()]);
  if (!r) notFound();
  const tz = settings.timezone;
  const k = (d: Date) => d.toISOString().slice(0, 10);
  const today = todayKey(tz);
  const late = (r.status === "PICKED_UP" || r.status === "OVERDUE") ? Math.max(0, diffDaysKey(k(r.returnDueDate), today)) : 0;
  const fees = r.lateFees.filter((f) => !f.waived).reduce((s, f) => s + Number(f.amount), 0);
  const due = Math.max(0, Number(r.total) - Number(r.discount) + fees);
  const remaining = Math.max(0, due - Number(r.paid));
  const waitingPickup = r.status === "RESERVED" || r.status === "CONFIRMED";
  const out = r.status === "PICKED_UP" || r.status === "OVERDUE";
  const wa = whatsappLink(r.customer.whatsapp, `Olá, ${r.customer.name.split(" ")[0]}! Aqui é da Sady Roupas, sobre a sua locação ${formatRentalNumber(r.number)}.`);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/locacoes", label: "Locações" }}
        title={<span className="flex flex-wrap items-center gap-3"><span className="font-mono">{formatRentalNumber(r.number)}</span><Badge tone={late ? "red" : rentalStatusTone[r.status]}>{late ? `Atrasada ${late} dia(s)` : rentalStatusLabel[r.status]}</Badge></span>}
        description={`${r.customer.name} · criada em ${formatDateTime(r.createdAt, tz)}${r.appointment ? ` · agendamento ${r.appointment.code}` : ""}`}
        actions={
          <>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
            <ActionButton action={reprintRentalAction} fields={{ id: r.id }} variant="outline" size="md"><Printer className="h-4 w-4" /> Imprimir</ActionButton>
            {waitingPickup && <ActionButton action={cancelRentalAction} fields={{ id: r.id }} variant="danger-outline" size="md" prompt={{ field: "reason", message: "Motivo do cancelamento (opcional). As peças voltam a ficar disponíveis." }}>Cancelar</ActionButton>}
          </>
        }
      />
      {criada && <div role="status" className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Locação criada. As peças foram reservadas no estoque, o comprovante foi para a impressora e a confirmação para o WhatsApp do cliente.</div>}

      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Datas e entrega" />
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted-foreground">Evento</dt><dd className="font-semibold">{r.eventName ?? "—"}{r.eventDate && ` · ${formatDateKey(k(r.eventDate))}`}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Retirada</dt><dd className="flex items-center gap-1.5 font-semibold"><CalendarDays className="h-4 w-4 text-gold" />{formatDateKey(k(r.pickupDate))}</dd>{r.pickedUpAt && <dd className="text-xs text-emerald-700">Retirada em {formatDateTime(r.pickedUpAt, tz)}</dd>}</div>
              <div><dt className="text-xs text-muted-foreground">Devolução</dt><dd className={late ? "font-semibold text-red-700" : "font-semibold"}>{formatDateKey(k(r.returnDueDate))}</dd>{r.returnedAt && <dd className="text-xs text-emerald-700">Devolvida em {formatDateTime(r.returnedAt, tz)}</dd>}</div>
              <div className="sm:col-span-3 flex gap-3 rounded-md bg-ivory p-3">
                {r.deliveryMethod === "DELIVERY" ? <Truck className="h-5 w-5 shrink-0 text-gold-dark" /> : <Store className="h-5 w-5 shrink-0 text-gold-dark" />}
                <div><p className="font-semibold">{DELIVERY_LABEL[r.deliveryMethod]}</p>{r.deliveryAddress && <p>{r.deliveryAddress}</p>}{r.deliveryNotes && <p className="text-xs text-muted-foreground">{r.deliveryNotes}</p>}</div>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title={`Peças (${r.items.length})`} description="Status atual de cada peça no estoque" />
            <ul className="divide-y divide-line">
              {r.items.map((i) => {
                const ret = r.return?.items.find((x) => x.rentalItemId === i.id);
                return (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <Link href={`/admin/estoque/${i.inventoryItem.code}`} className="font-mono text-xs font-semibold hover:text-gold-dark">{i.inventoryItem.code}</Link>
                      <p>{i.inventoryItem.product.name} · tam. {i.inventoryItem.size} · {i.inventoryItem.color}</p>
                      {ret && <p className="text-xs text-muted-foreground">Devolução: {returnConditionLabel[ret.condition]}{ret.note ? ` — ${ret.note}` : ""}</p>}
                    </div>
                    <InventoryStatusBadge status={i.inventoryItem.status} />
                  </li>
                );
              })}
            </ul>
          </Card>

          {waitingPickup && (
            <Card className="border-gold/50">
              <CardHeader title={<span className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-gold" /> {r.deliveryMethod === "DELIVERY" ? "Confirmar entrega" : "Confirmar retirada"}</span>} description="Confira os itens. Ao confirmar, as peças são baixadas automaticamente como ALUGADAS." />
              <div className="p-5">
                <SimpleForm action={confirmPickupAction.bind(null, r.id)} submitLabel={r.deliveryMethod === "DELIVERY" ? "Confirmar entrega" : "Confirmar retirada"}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CHECKLIST.map((c) => (
                      <label key={c} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                        <input type="hidden" name="checklistLabel" value={c} />
                        <input type="checkbox" name="checklist" value={c} className="h-4 w-4 accent-[var(--color-gold-dark)]" /> {c}
                      </label>
                    ))}
                  </div>
                  <Field label="Observação"><Input name="notes" maxLength={300} /></Field>
                </SimpleForm>
              </div>
            </Card>
          )}

          {out && (
            <Card className="border-gold/50">
              <CardHeader title={<span className="flex items-center gap-2"><Undo2 className="h-4 w-4 text-gold" /> Registrar devolução</span>} description="Confira cada peça. Suja vai para lavanderia, danificada para manutenção, e o estoque é atualizado na hora." />
              <div className="p-5">
                <SimpleForm action={registerReturnAction.bind(null, r.id)} submitLabel="Registrar devolução">
                  <div className="space-y-3">
                    {r.items.map((i) => (
                      <div key={i.id} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[1fr_220px]">
                        <input type="hidden" name="rentalItemId" value={i.id} />
                        <div className="text-sm"><span className="font-mono text-xs font-semibold">{i.inventoryItem.code}</span> · {i.inventoryItem.product.name} · tam. {i.inventoryItem.size}</div>
                        <Select name={`condition_${i.id}`} defaultValue="RECEIVED" className="h-9 text-xs">
                          {Object.entries(returnConditionLabel).filter(([c]) => c !== "NOT_RECEIVED").map(([c, label]) => <option key={c} value={c}>{label}</option>)}
                        </Select>
                        <Input name={`note_${i.id}`} placeholder="Observação (opcional)" className="h-9 text-xs sm:col-span-2" maxLength={200} />
                      </div>
                    ))}
                  </div>
                  {late > 0 && <p className="rounded-md bg-red-50 p-3 text-xs text-red-800">Devolução com {late} dia(s) de atraso: a multa é calculada pela política em Configurações → Locação.</p>}
                </SimpleForm>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Cliente" action={<Link href={`/admin/clientes/${r.customerId}`} className="text-xs font-semibold text-gold-dark hover:underline">Ver ficha</Link>} />
            <div className="p-5 text-sm">
              <p className="text-base font-semibold">{r.customer.name}</p>
              <p className="text-muted-foreground">{formatPhone(r.customer.whatsapp)}</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Financeiro" description={r.paymentStatus === "PAID" ? "Quitado" : r.paymentStatus === "PARTIAL" ? "Pagamento parcial" : "Pendente"} />
            <dl className="space-y-2 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd>{formatCurrency(Number(r.total))}</dd></div>
              {Number(r.discount) > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Desconto</dt><dd>− {formatCurrency(Number(r.discount))}</dd></div>}
              {fees > 0 && <div className="flex justify-between text-red-700"><dt>Multa por atraso</dt><dd>+ {formatCurrency(fees)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Pago</dt><dd className="text-emerald-700">{formatCurrency(Number(r.paid))}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Restante</dt><dd>{formatCurrency(remaining)}</dd></div>
            </dl>
            {r.payments.length > 0 && (
              <ul className="border-t border-line px-5 py-3 text-xs text-muted-foreground">
                {r.payments.map((p) => <li key={p.id} className="flex justify-between py-0.5"><span>{formatDateTime(p.paidAt, tz)} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method}</span><span>{formatCurrency(Number(p.amount))}</span></li>)}
              </ul>
            )}
            {remaining > 0 && r.status !== "CANCELLED" && (
              <div className="border-t border-line p-5">
                <InlineForm action={addPaymentAction.bind(null, r.id)} submitLabel="Registrar pagamento" variant="outline">
                  <Input name="amount" type="number" step="0.01" min={0.01} defaultValue={remaining.toFixed(2)} className="h-9 w-28 text-xs" aria-label="Valor" />
                  <Select name="method" defaultValue="PIX" className="h-9 w-32 text-xs" aria-label="Forma">
                    <option value="PIX">PIX</option><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option><option value="TRANSFER">Transferência</option>
                  </Select>
                </InlineForm>
              </div>
            )}
          </Card>
          {r.notes && <Card className="whitespace-pre-wrap p-5 text-sm">{r.notes}</Card>}
        </div>
      </div>
    </>
  );
}
