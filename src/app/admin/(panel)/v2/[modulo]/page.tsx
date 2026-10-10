import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Em breve" };

const MODULES: Record<string, { title: string; description: string; ready: string[] }> = {
  lavanderia: { title: "Lavanderia", description: "Entrada e saída de peças da lavanderia, com responsável e observações.", ready: ["Tabela Laundry", "Status LAVANDERIA nas peças", "Histórico por peça"] },
  manutencao: { title: "Manutenção", description: "Problema, descrição, foto, custo e status de cada conserto.", ready: ["Tabela Maintenance", "Status MANUTENÇÃO nas peças", "Histórico para identificar peças com problemas recorrentes"] },
  financeiro: { title: "Financeiro", description: "Valor total, desconto, pago, restante, multa e forma de pagamento — sem virar um ERP.", ready: ["Tabelas Payment e LateFee", "Status PENDENTE / PARCIAL / PAGO (testado)", "Campo para integração futura (Mercado Pago, Asaas, PIX)"] },
  relatorios: { title: "Relatórios", description: "Locações por período, faturamento, pendências, peças mais alugadas e com mais manutenção.", ready: ["Contador de locações por peça", "Histórico completo de movimentações", "Auditoria desde a V1"] },
};

export default async function FutureModulePage({ params }: { params: Promise<{ modulo: string }> }) {
  await requirePageUser();
  const m = MODULES[(await params).modulo];
  if (!m) notFound();
  return (
    <>
      <PageHeader title={m.title} description="Módulo previsto para a V2." />
      <Card className="max-w-2xl p-8">
        <Construction className="h-8 w-8 text-gold" />
        <p className="mt-4 text-sm leading-relaxed text-ink/80">{m.description}</p>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Já preparado na base da V1</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{m.ready.map((r) => <li key={r}>{r}</li>)}</ul>
      </Card>
    </>
  );
}
