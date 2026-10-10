import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { requirePageUser } from "@/lib/auth/session";
import { appointmentStatusLabel, inventoryStatusLabel, rentalStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { SettingsService } from "@/services/settings.service";
import { defaultPeriod, isSheetKey, SHEETS, SpreadsheetService, type Cell, type Column } from "@/services/spreadsheet.service";
import { formatDateKey } from "@/utils/datetime";
import { formatCurrency } from "@/utils/text";

export const metadata: Metadata = { title: "Planilha" };

const STATUS_OPTIONS: Record<string, [string, string][]> = {
  agendamentos: Object.entries(appointmentStatusLabel),
  locacoes: [["ATRASADAS", "Atrasadas"], ...Object.entries(rentalStatusLabel)],
  estoque: Object.entries(inventoryStatusLabel),
  clientes: [],
};
const HAS_PERIOD = new Set(["agendamentos", "locacoes"]);
const DESCRIPTIONS: Record<string, string> = {
  agendamentos: "Quem agendou, quando, para qual atendimento e quais roupas quer provar.",
  locacoes: "Quem alugou, quais roupas, retirada, devolução, entrega e pagamento.",
  estoque: "Cada peça com status atual e com quem está (ou para quem está reservada).",
  clientes: "Contatos com quantidade de agendamentos e locações.",
};

function show(c: Column, v: Cell) {
  if (v === null || v === "") return <span className="text-muted-foreground/50">—</span>;
  if (c.type === "date" && typeof v === "string") return formatDateKey(v);
  if (c.type === "money") return formatCurrency(v);
  if (c.key === "status") return <Badge tone={/Atras/.test(String(v)) ? "red" : "neutral"}>{v}</Badge>;
  return v;
}

export default async function SpreadsheetPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageUser("inventory.manage");
  const sp = await searchParams;
  const tab = isSheetKey(sp.aba) ? sp.aba : "agendamentos";
  const filters = { de: sp.de, ate: sp.ate, status: sp.status, q: sp.q };
  const sheet = await SpreadsheetService.sheet(tab, filters);
  const def = defaultPeriod((await SettingsService.get()).timezone);

  const query = new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => !!e[1])).toString();
  const exportHref = `/api/admin/export/${tab}${query ? `?${query}` : ""}`;

  return (
    <>
      <PageHeader
        title="Planilha"
        description="Controle completo da loja em formato de planilha — veja aqui ou baixe no Excel."
        actions={
          <>
            <a href={exportHref} className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:border-gold">
              <Download className="h-4 w-4" /> Baixar esta aba
            </a>
            {/* Download de arquivo (rota de API), não navegação de página */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/admin/export/completa" className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-ivory hover:bg-ink-3">
              <FileSpreadsheet className="h-4 w-4 text-gold-light" /> Planilha completa (.xlsx)
            </a>
          </>
        }
      />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {SHEETS.map((s) => (
          <Link key={s.key} href={`/admin/planilha?aba=${s.key}`} className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold", tab === s.key ? "border-gold text-ink" : "border-transparent text-muted-foreground hover:text-ink")}>
            {s.label}
          </Link>
        ))}
      </div>

      <Card>
        <form className="flex flex-wrap items-end gap-2 border-b border-line p-3">
          <input type="hidden" name="aba" value={tab} />
          {HAS_PERIOD.has(tab) && (
            <>
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                De
                <Input type="date" name="de" defaultValue={sp.de ?? def.de} className="w-40" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                Até
                <Input type="date" name="ate" defaultValue={sp.ate ?? def.ate} className="w-40" />
              </label>
            </>
          )}
          {STATUS_OPTIONS[tab].length > 0 && (
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Status
              <Select name="status" defaultValue={sp.status ?? ""} className="w-44">
                <option value="">Todos</option>
                {STATUS_OPTIONS[tab].map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </Select>
            </label>
          )}
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Buscar
            <Input name="q" defaultValue={sp.q} placeholder={tab === "estoque" ? "Código, roupa, cor ou cliente" : "Nome, WhatsApp ou código"} />
          </label>
          <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-ivory">Filtrar</button>
          {query && (
            <Link href={`/admin/planilha?aba=${tab}`} className="h-11 px-2 text-sm leading-[2.75rem] text-muted-foreground underline-offset-4 hover:underline">
              Limpar
            </Link>
          )}
        </form>
        <p className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-ivory/40 px-4 py-2 text-xs text-muted-foreground">
          <span>{DESCRIPTIONS[tab]}</span>
          <span className="font-semibold text-ink">
            {sheet.total} {sheet.total === 1 ? "linha" : "linhas"}
            {sheet.rows.length < sheet.total && ` (mostrando ${sheet.rows.length})`}
          </span>
        </p>
        {sheet.rows.length === 0 ? (
          <EmptyState title="Nada encontrado" description="Ajuste o período ou os filtros." />
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-left text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 w-10 border-b border-r border-line bg-sand px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground">#</th>
                  {sheet.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap border-b border-r border-line bg-sand px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink/80">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, i) => (
                  <tr key={i} className={cn("group", row._tone === "late" && "text-red-700", row._tone === "muted" && "text-muted-foreground")}>
                    <td className="sticky left-0 border-b border-r border-line/70 bg-ivory px-2 py-2 text-center text-[11px] tabular-nums text-muted-foreground group-hover:bg-sand">{i + 1}</td>
                    {sheet.columns.map((c, j) => (
                      <td
                        key={c.key}
                        className={cn(
                          "border-b border-r border-line/70 bg-white px-3 py-2 align-top group-hover:bg-ivory",
                          c.wide ? "min-w-64 max-w-sm" : "whitespace-nowrap",
                          (c.type === "money" || c.type === "int") && "text-right tabular-nums",
                          (c.type === "date" || c.type === "time") && "tabular-nums",
                        )}
                      >
                        {j === 0 && row._href ? (
                          <Link href={row._href} className="font-semibold underline-offset-4 hover:text-gold-dark hover:underline">
                            {show(c, row[c.key])}
                          </Link>
                        ) : (
                          show(c, row[c.key])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Dica: o arquivo Excel já vem com filtros no cabeçalho, datas no formato brasileiro e valores em R$. A planilha completa traz todas as abas.
      </p>
    </>
  );
}
