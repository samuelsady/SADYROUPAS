import type { Metadata } from "next";
import Link from "next/link";
import type { PrintJobStatus } from "@prisma/client";
import { Printer } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { PrintStatusBadge } from "@/components/admin/status-badges";
import { Table, Td, Th } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { printStatusLabel } from "@/lib/labels";
import { PrintService } from "@/services/print/print.service";
import { SettingsService } from "@/services/settings.service";
import { formatDateTime } from "@/utils/datetime";
import { cn } from "@/utils/cn";
import { cancelPrintAction, retryPrintAction } from "../_actions/print";

export const metadata: Metadata = { title: "Impressões" };
const STATUSES = Object.keys(printStatusLabel) as PrintJobStatus[];
const STATE_TONE = { CONECTADA: "green", AGUARDANDO: "amber", DESCONECTADA: "gray", ERRO: "red" } as const;

export default async function PrintsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePageUser("print.manage");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as PrintJobStatus) ? sp.status : undefined;
  const [jobs, printer, settings] = await Promise.all([PrintService.queue({ status }), PrintService.printerState(), SettingsService.get()]);
  const tz = settings.timezone;

  return (
    <>
      <PageHeader title="Impressões" description="Fila de comprovantes. Uma falha de impressão nunca cancela o agendamento." />
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-gold-light"><Printer className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-semibold">Impressora{printer.agent?.printerName ? ` · ${printer.agent.printerName}` : settings.printerName ? ` · ${settings.printerName}` : ""}</p>
                <p className="text-xs text-muted">{printer.agent ? `Último sinal: ${formatDateTime(printer.agent.lastSeenAt, tz)}${printer.agent.hostname ? ` (${printer.agent.hostname})` : ""}` : "Nenhum serviço de impressão conectou ainda."}</p>
              </div>
            </div>
            <Badge tone={STATE_TONE[printer.state]} dot className="text-xs">{printer.state}</Badge>
          </div>
          {printer.agent?.message && <p className="mt-3 rounded-md bg-ivory p-2 text-xs">{printer.agent.message}</p>}
        </Card>
        <Card className="p-5 text-xs leading-relaxed text-muted">
          <p className="text-sm font-semibold text-ink">Como funciona</p>
          <p className="mt-1">Sistema → fila (banco) → <strong>serviço local de impressão</strong> no computador da loja → impressora. O serviço local busca os comprovantes pendentes a cada poucos segundos, imprime e informa o resultado.</p>
          <p className="mt-2">Formato atual: <strong>{settings.printFormat}</strong> · Impressão automática: <strong>{settings.autoPrintOnCreate ? "ligada" : "desligada"}</strong> · Token do agente: <strong>{env.printAgentToken ? "configurado" : "NÃO configurado (PRINT_AGENT_TOKEN)"}</strong></p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Fila" action={
          <div className="flex flex-wrap gap-1 text-xs font-semibold">
            {[undefined, ...STATUSES].map((s) => (
              <Link key={s ?? "all"} href={s ? `/admin/impressoes?status=${s}` : "/admin/impressoes"} className={cn("rounded-md px-2.5 py-1", status === s ? "bg-ink text-ivory" : "text-muted hover:bg-ivory")}>{s ? printStatusLabel[s] : "Todos"}</Link>
            ))}
          </div>
        } />
        {jobs.length === 0 ? <EmptyState title="Fila vazia" /> : (
          <Table>
            <thead><tr><Th>Criado em</Th><Th>Agendamento</Th><Th>Cliente</Th><Th>Status</Th><Th>Tentativas</Th><Th>Erro</Th><Th className="text-right">Ações</Th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <Td className="text-xs">{formatDateTime(j.createdAt, tz)}{j.printedAt && <span className="block text-muted">impresso {formatDateTime(j.printedAt, tz)}</span>}</Td>
                  <Td>{j.appointment ? <Link href={`/admin/agendamentos/${j.appointment.id}`} className="font-mono text-xs font-semibold hover:text-gold-dark">{j.appointment.code}</Link> : "—"}</Td>
                  <Td className="text-sm">{j.appointment?.customer.name ?? "—"}</Td>
                  <Td><PrintStatusBadge status={j.status} /></Td>
                  <Td className="tabular-nums">{j.attempts}</Td>
                  <Td className="max-w-56 text-xs text-red-700">{j.error ?? ""}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {(j.status === "PRINT_FAILED" || j.status === "PRINTED" || j.status === "CANCELLED") && <ActionButton action={retryPrintAction} fields={{ id: j.id }}>{j.status === "PRINTED" ? "Reimprimir" : "Tentar de novo"}</ActionButton>}
                      {(j.status === "PRINT_PENDING" || j.status === "PRINT_FAILED") && <ActionButton action={cancelPrintAction} fields={{ id: j.id }} variant="danger-outline" confirm="Cancelar esta impressão?">Cancelar</ActionButton>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
