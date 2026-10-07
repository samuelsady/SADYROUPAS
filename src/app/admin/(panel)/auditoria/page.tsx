import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Table, Td, Th } from "@/components/admin/table";
import { Card, EmptyState } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { SettingsService } from "@/services/settings.service";
import { formatDateTime } from "@/utils/datetime";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePageUser("audit.view");
  const { q } = await searchParams;
  const [logs, settings] = await Promise.all([
    db.auditLog.findMany({
      where: q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { actorLabel: { contains: q, mode: "insensitive" } }] } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    SettingsService.get(),
  ]);
  return (
    <>
      <PageHeader title="Auditoria" description="Quem fez, o quê, quando e em qual registro. Os 200 eventos mais recentes." />
      <Card>
        <form className="flex gap-2 border-b border-line p-3">
          <Input name="q" defaultValue={q} placeholder="Filtrar por ação, resumo ou pessoa" className="max-w-md" />
          <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-ivory">Filtrar</button>
        </form>
        {logs.length === 0 ? <EmptyState title="Nenhum evento" /> : (
          <Table>
            <thead><tr><Th>Quando</Th><Th>Quem</Th><Th>Ação</Th><Th>Resumo</Th><Th>Registro</Th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt, settings.timezone)}</Td>
                  <Td className="text-xs">{l.actorLabel ?? "—"}{l.ip && <span className="block text-muted">{l.ip}</span>}</Td>
                  <Td><code className="rounded bg-ivory px-1.5 py-0.5 text-[11px]">{l.action}</code></Td>
                  <Td className="text-sm">{l.summary}</Td>
                  <Td className="text-xs text-muted">{l.entity}{l.entityId ? ` · ${l.entityId.slice(-8)}` : ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
