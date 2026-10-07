import type { Metadata } from "next";
import type { InventoryStatus } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleForm } from "@/components/admin/simple-form";
import { InventoryStatusBadge } from "@/components/admin/status-badges";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { requirePageUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { inventoryStatusLabel, V1_INVENTORY_STATUSES } from "@/lib/labels";
import { InventoryService } from "@/services/inventory.service";
import { SettingsService } from "@/services/settings.service";
import { formatDateTime } from "@/utils/datetime";
import { changeItemStatusAction, deactivateItemAction, quickStatusAction, updateItemAction } from "../../_actions/inventory";
import { PrintLabelButton } from "./print-label-button";

export const metadata: Metadata = { title: "Peça" };

const ACTION_LABEL: Record<string, string> = {
  CREATED: "Cadastrada",
  STATUS_CHANGED: "Status alterado",
  UPDATED: "Dados alterados",
  DEACTIVATED: "Baixada do estoque",
  RESERVED_FOR_APPOINTMENT: "Separada para atendimento",
  RELEASED: "Liberada",
};

const QUICK: { status: InventoryStatus; label: string }[] = [
  { status: "AVAILABLE", label: "Disponível" },
  { status: "RESERVED", label: "Reservar" },
  { status: "RENTED", label: "Alugar / saiu" },
  { status: "UNAVAILABLE", label: "Indisponível" },
];

export default async function ItemPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ balcao?: string }> }) {
  await requirePageUser("inventory.manage");
  const [{ code }, { balcao }] = await Promise.all([params, searchParams]);
  const [item, settings] = await Promise.all([InventoryService.getByCode(decodeURIComponent(code)), SettingsService.get()]);
  const tz = settings.timezone;
  // QR Code aponta para esta ficha (V2: leitura no balcão para retirada/devolução)
  const qr = await QRCode.toString(`${env.appUrl}/admin/estoque/${item.code}`, { type: "svg", margin: 1, width: 160, color: { dark: "#13110f", light: "#ffffff" } });

  return (
    <>
      <PageHeader back={{ href: "/admin/estoque", label: "Estoque" }} title={<span className="flex items-center gap-3"><span className="font-mono">{item.code}</span><InventoryStatusBadge status={item.status} /></span>} description={<Link href={`/admin/catalogo/${item.product.id}`} className="hover:text-ink">{item.product.name} · {item.product.category.name}</Link>} />
      <Card className={`mb-6 p-4 ${balcao ? "pop-in ring-2 ring-gold/60" : ""}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-semibold">Ações rápidas</p>
            <p className="text-xs text-muted">{balcao ? "Peça lida pelo QR Code. " : ""}Um toque muda o status e registra no histórico.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {QUICK.filter((q) => q.status !== item.status).map((q) => (
              <ActionButton key={q.status} action={quickStatusAction} fields={{ code: item.code, status: q.status }} variant={q.status === "AVAILABLE" ? "primary" : "outline"} size="md">{q.label}</ActionButton>
            ))}
          </div>
        </div>
        {balcao && <Link href="/admin/estoque/leitor" className="mt-3 inline-block text-xs font-semibold text-gold-dark hover:underline">← Ler outra peça</Link>}
      </Card>

      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card className="flex gap-5 p-5">
            <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-md bg-ink">
              {item.product.images[0] && <Image src={item.product.images[0].url} alt="" fill sizes="112px" className="object-cover" />}
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted">Tamanho</dt><dd className="text-lg font-semibold">{item.size}</dd></div>
              <div><dt className="text-xs text-muted">Cor</dt><dd className="font-semibold">{item.color}</dd></div>
              <div><dt className="text-xs text-muted">Locações</dt><dd className="text-lg font-semibold tabular-nums">{item.rentalCount}</dd></div>
              <div><dt className="text-xs text-muted">Localização</dt><dd className="font-semibold">{item.location ?? "—"}</dd></div>
              {item.notes && <div className="col-span-2"><dt className="text-xs text-muted">Observações</dt><dd>{item.notes}</dd></div>}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Alterar status" description="Na V1 a equipe atualiza manualmente; na V2 as locações fazem isso automaticamente." />
            <div className="p-5">
              <SimpleForm action={changeItemStatusAction.bind(null, item.code)} submitLabel="Atualizar status">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Novo status">
                    <Select name="status" defaultValue={item.status}>
                      {V1_INVENTORY_STATUSES.map((s) => <option key={s} value={s}>{inventoryStatusLabel[s]}</option>)}
                    </Select>
                  </Field>
                  <Field label="Cliente (se reservado/alugado)"><Input name="customerName" maxLength={120} /></Field>
                  <Field label="Nova localização"><Input name="location" maxLength={80} placeholder={item.location ?? ""} /></Field>
                  <Field label="Observação"><Input name="note" maxLength={500} /></Field>
                </div>
              </SimpleForm>
            </div>
          </Card>

          <Card>
            <CardHeader title="Dados da peça" />
            <div className="p-5">
              <SimpleForm action={updateItemAction.bind(null, item.code)}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tamanho"><Input name="size" defaultValue={item.size} required maxLength={10} /></Field>
                  <Field label="Cor"><Input name="color" defaultValue={item.color} required maxLength={40} /></Field>
                  <Field label="Localização" className="sm:col-span-2"><Input name="location" defaultValue={item.location ?? ""} maxLength={80} /></Field>
                  <Field label="Observações" className="sm:col-span-2"><Textarea name="notes" defaultValue={item.notes ?? ""} rows={2} maxLength={1000} /></Field>
                </div>
              </SimpleForm>
              <div className="mt-4 border-t border-line pt-4">
                <ActionButton action={deactivateItemAction} fields={{ code: item.code }} variant="danger-outline" confirm="Dar baixa nesta peça? Ela sai do estoque ativo, mas o histórico é mantido.">Dar baixa na peça</ActionButton>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="flex items-center gap-5 p-5">
            <div className="shrink-0 rounded-md border border-line p-1" dangerouslySetInnerHTML={{ __html: qr }} aria-label={`QR Code da peça ${item.code}`} />
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Etiqueta com QR Code</p>
              <p className="text-xs text-muted">Ao escanear, abre esta ficha (status, produto, tamanho, cor, locações e histórico).</p>
              <PrintLabelButton code={item.code} product={item.product.name} size={item.size} qrSvg={qr} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Histórico da peça" description={`${item.history.length} movimentação(ões)`} />
            <ol className="relative space-y-0 px-5 py-4">
              {item.history.map((h) => (
                <li key={h.id} className="relative border-l border-line pb-5 pl-5 last:pb-0">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold" />
                  <p className="text-xs text-muted">{formatDateTime(h.createdAt, tz)}{h.user ? ` · ${h.user.name}` : ""}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {ACTION_LABEL[h.action] ?? h.action}
                    {h.fromStatus && h.toStatus && h.fromStatus !== h.toStatus && (<><InventoryStatusBadge status={h.fromStatus} /> → <InventoryStatusBadge status={h.toStatus} /></>)}
                  </p>
                  {(h.customerName || h.note) && <p className="mt-0.5 text-xs text-ink/70">{[h.customerName, h.note].filter(Boolean).join(" — ")}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
