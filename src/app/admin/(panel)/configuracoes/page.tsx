import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleForm } from "@/components/admin/simple-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { notificationEventLabel, roleLabel } from "@/lib/labels";
import { parseRentalPolicy } from "@/services/rental.service";
import { SettingsService } from "@/services/settings.service";
import { V1_WHATSAPP_EVENTS } from "@/services/notification/templates";
import { formatDateTime, weekdayName } from "@/utils/datetime";
import { formatPhone } from "@/utils/phone";
import { cn } from "@/utils/cn";
import {
  addBlockedPeriodAction, changePasswordAction, createUserAction, removeBlockedPeriodAction, saveCompanyAction, savePrinterAction, saveRentalPolicyAction, saveScheduleAction, saveServiceAction, saveTemplateAction, saveWhatsAppAction, toggleUserAction,
} from "../_actions/settings";

export const metadata: Metadata = { title: "Configurações" };

const TABS = [
  ["empresa", "Empresa"],
  ["horarios", "Horários"],
  ["servicos", "Serviços"],
  ["bloqueios", "Bloqueios"],
  ["whatsapp", "WhatsApp"],
  ["impressora", "Impressora"],
  ["locacao", "Locação (V2)"],
  ["usuarios", "Usuários"],
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const me = await requirePageUser("settings.manage");
  const aba = (await searchParams).aba ?? "empresa";
  const tab = TABS.some(([k]) => k === aba) ? aba : "empresa";
  const settings = await SettingsService.get();
  const tz = settings.timezone;

  return (
    <>
      <PageHeader title="Configurações" description="Ajustes da loja, agenda, mensagens e impressão." />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/configuracoes?aba=${k}`} className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold", tab === k ? "border-gold text-ink" : "border-transparent text-muted-foreground hover:text-ink")}>{label}</Link>
        ))}
      </div>

      {tab === "empresa" && (
        <Card className="max-w-3xl p-5 sm:p-7">
          <SimpleForm action={saveCompanyAction}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" required className="sm:col-span-2"><Input name="companyName" defaultValue={settings.companyName} required /></Field>
              <Field label="Telefone"><Input name="phone" defaultValue={formatPhone(settings.phone)} /></Field>
              <Field label="WhatsApp" hint="Usado nos botões do site"><Input name="whatsapp" defaultValue={formatPhone(settings.whatsapp)} /></Field>
              <Field label="E-mail"><Input name="email" type="email" defaultValue={settings.email ?? ""} /></Field>
              <Field label="Instagram" hint="Somente o usuário"><Input name="instagram" defaultValue={settings.instagram ?? ""} /></Field>
              <Field label="Facebook" hint="Somente o usuário"><Input name="facebook" defaultValue={settings.facebook ?? ""} /></Field>
              <Field label="Endereço" className="sm:col-span-2"><Input name="address" defaultValue={settings.address ?? ""} /></Field>
              <Field label="Mapa (link de incorporação do Google Maps)" className="sm:col-span-2"><Input name="mapsEmbedUrl" defaultValue={settings.mapsEmbedUrl ?? ""} /></Field>
            </div>
          </SimpleForm>
        </Card>
      )}

      {tab === "horarios" && <ScheduleTab />}
      {tab === "servicos" && <ServicesTab />}
      {tab === "bloqueios" && <BlockedTab tz={tz} />}

      {tab === "whatsapp" && (
        <div className="space-y-6">
          <Card className="max-w-3xl p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge tone={env.whatsapp.configured ? "green" : "gray"}>{env.whatsapp.configured ? "Credenciais da API configuradas" : "Credenciais da API não configuradas"}</Badge>
            </div>
            <SimpleForm action={saveWhatsAppAction}>
              <Checkbox name="whatsappEnabled" label="Enviar mensagens automáticas" defaultChecked={settings.whatsappEnabled} />
              <Checkbox name="ownerAlertWhatsapp" label={`Avisar a loja no WhatsApp (${formatPhone(settings.whatsapp) || "configure o WhatsApp em Empresa"}) a cada agendamento pelo site`} defaultChecked={settings.ownerAlertWhatsapp} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Modo" hint="SIMULADO registra a mensagem sem enviar. PRODUÇÃO usa a WhatsApp Business Platform.">
                  <Select name="whatsappMode" defaultValue={settings.whatsappMode}>
                    <option value="SIMULATED">Simulado (desenvolvimento)</option>
                    <option value="PRODUCTION">Produção (API oficial)</option>
                  </Select>
                </Field>
                <Field label="Lembrete (horas antes)"><Input name="reminderHoursBefore" type="number" min={1} max={168} defaultValue={settings.reminderHoursBefore} /></Field>
              </div>
            </SimpleForm>
          </Card>
          <TemplatesTab />
        </div>
      )}

      {tab === "impressora" && (
        <Card className="max-w-3xl p-5 sm:p-7">
          <SimpleForm action={savePrinterAction}>
            <Checkbox name="autoPrintOnCreate" label="Imprimir comprovante automaticamente ao criar agendamento" defaultChecked={settings.autoPrintOnCreate} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Formato">
                <Select name="printFormat" defaultValue={settings.printFormat}>
                  <option value="THERMAL_80MM">Térmica 80mm (48 colunas)</option>
                  <option value="THERMAL_58MM">Térmica 58mm (32 colunas)</option>
                  <option value="A4">A4</option>
                </Select>
              </Field>
              <Field label="Impressora padrão" hint="Nome da impressora no computador da loja (informativo; o agente usa PRINTER_NAME)"><Input name="printerName" defaultValue={settings.printerName ?? ""} /></Field>
            </div>
            <p className="text-xs text-muted-foreground">Status e fila: <Link href="/admin/impressoes" className="font-semibold text-gold-dark">Impressões</Link>. Instalação do serviço local: veja <code>print-agent/README.md</code>.</p>
          </SimpleForm>
        </Card>
      )}

      {tab === "locacao" && <RentalTab policyJson={settings.rentalPolicy} />}
      {tab === "usuarios" && <UsersTab meId={me.id} tz={tz} />}
    </>
  );
}

async function ScheduleTab() {
  const [settings, hours] = await Promise.all([SettingsService.get(), SettingsService.businessHours()]);
  return (
    <Card className="max-w-4xl p-5 sm:p-7">
      <SimpleForm action={saveScheduleAction}>
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="Duração (min)"><Input name="slotDurationMin" type="number" min={10} max={240} defaultValue={settings.slotDurationMin} /></Field>
          <Field label="Intervalo (min)"><Input name="slotBufferMin" type="number" min={0} max={120} defaultValue={settings.slotBufferMin} /></Field>
          <Field label="Simultâneos" hint="Atendentes"><Input name="simultaneousSlots" type="number" min={1} max={10} defaultValue={settings.simultaneousSlots} /></Field>
          <Field label="Antecedência (min)" hint="Site"><Input name="minLeadMinutes" type="number" min={0} defaultValue={settings.minLeadMinutes} /></Field>
          <Field label="Até (dias)" hint="Site"><Input name="maxAdvanceDays" type="number" min={1} max={365} defaultValue={settings.maxAdvanceDays} /></Field>
          <Field label="Cliente altera até (h)" hint="Remarcar/cancelar"><Input name="selfServiceCutoffHours" type="number" min={0} max={168} defaultValue={settings.selfServiceCutoffHours} /></Field>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2">Dia</th><th>Aberto</th><th>Abre</th><th>Fecha</th><th>Pausa início</th><th>Pausa fim</th></tr></thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h.weekday} className="border-t border-line">
                  <td className="py-2 font-medium capitalize">{weekdayName(h.weekday)}</td>
                  <td><input type="checkbox" name={`open_${h.weekday}`} defaultChecked={h.isOpen} className="h-4 w-4 accent-[var(--color-gold-dark)]" aria-label={`Aberto ${weekdayName(h.weekday)}`} /></td>
                  <td className="pr-2"><Input type="time" name={`from_${h.weekday}`} defaultValue={h.openTime} className="h-9" /></td>
                  <td className="pr-2"><Input type="time" name={`to_${h.weekday}`} defaultValue={h.closeTime} className="h-9" /></td>
                  <td className="pr-2"><Input type="time" name={`bs_${h.weekday}`} defaultValue={h.breakStart ?? ""} className="h-9" /></td>
                  <td><Input type="time" name={`be_${h.weekday}`} defaultValue={h.breakEnd ?? ""} className="h-9" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Exemplo: 08:00–18:00, duração 30 min e intervalo 10 min geram 08:00, 08:40, 09:20… Mudanças não alteram agendamentos já feitos.</p>
      </SimpleForm>
    </Card>
  );
}

async function ServicesTab() {
  const services = await db.service.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { appointments: true } } } });
  const fields = (s?: (typeof services)[number]) => (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_80px]">
      <Field label="Nome"><Input name="name" defaultValue={s?.name} required maxLength={80} /></Field>
      <Field label="Duração (min)" hint="Vazio = padrão"><Input name="durationMin" type="number" min={5} max={480} defaultValue={s?.durationMin ?? ""} /></Field>
      <Field label="Ordem"><Input name="sortOrder" type="number" min={0} defaultValue={s?.sortOrder ?? 0} /></Field>
      <Field label="Descrição" className="sm:col-span-3"><Input name="description" defaultValue={s?.description ?? ""} maxLength={300} /></Field>
      <div className="flex gap-5 sm:col-span-3">
        <Checkbox name="active" label="Ativo" defaultChecked={s?.active ?? true} />
        <Checkbox name="publicBooking" label="Disponível no site" defaultChecked={s?.publicBooking ?? true} />
      </div>
    </div>
  );
  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
      {services.map((s) => (
        <Card key={s.id} className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{s.name}</p>
            <span className="flex gap-1.5">{!s.active && <Badge tone="gray">Inativo</Badge>}{!s.publicBooking && <Badge tone="amber">Só painel</Badge>}<Badge>{s._count.appointments} agend.</Badge></span>
          </div>
          <SimpleForm action={saveServiceAction.bind(null, s.id)}>{fields(s)}</SimpleForm>
        </Card>
      ))}
      <Card className="border-dashed p-5">
        <p className="mb-3 text-sm font-semibold">Novo serviço</p>
        <SimpleForm action={saveServiceAction.bind(null, null)} submitLabel="Criar serviço">{fields()}</SimpleForm>
      </Card>
    </div>
  );
}

async function BlockedTab({ tz }: { tz: string }) {
  const blocked = await db.blockedPeriod.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } });
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold">Bloquear período</p>
        <SimpleForm action={addBlockedPeriodAction} submitLabel="Bloquear">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data inicial" required><Input type="date" name="date" required /></Field>
            <Field label="Data final" hint="Vazio = mesmo dia"><Input type="date" name="endDate" /></Field>
            <Field label="Das" hint="Vazio = dia todo"><Input type="time" name="from" /></Field>
            <Field label="Até"><Input type="time" name="to" /></Field>
            <Field label="Motivo" className="col-span-2"><Input name="reason" placeholder="Feriado, inventário, evento…" maxLength={200} /></Field>
          </div>
        </SimpleForm>
      </Card>
      <Card>
        <CardHeader title="Bloqueios ativos e futuros" />
        {blocked.length === 0 ? <p className="px-5 py-5 text-sm text-muted-foreground">Nenhum bloqueio.</p> : (
          <ul className="divide-y divide-line">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>{formatDateTime(b.startsAt, tz)} → {formatDateTime(b.endsAt, tz)}<span className="block text-xs text-muted-foreground">{b.reason ?? "Sem motivo"}</span></span>
                <ActionButton action={removeBlockedPeriodAction} fields={{ id: b.id }} variant="danger-outline" confirm="Remover este bloqueio?">Remover</ActionButton>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function TemplatesTab() {
  const templates = await db.notificationTemplate.findMany({ orderBy: { event: "asc" } });
  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
      {templates.map((t) => (
        <Card key={t.id} className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{notificationEventLabel[t.event]}</p>
            {!V1_WHATSAPP_EVENTS.includes(t.event) && <Badge tone="gray">V2</Badge>}
          </div>
          <SimpleForm action={saveTemplateAction.bind(null, t.event)}>
            <Field label="Mensagem" hint="Variáveis: {nome} {data} {horario} {servico} {codigo} {loja} {link} (página para o cliente remarcar/cancelar)"><Textarea name="body" defaultValue={t.body} rows={6} maxLength={1500} /></Field>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Field label="Template aprovado na Meta" hint="Obrigatório em produção para iniciar conversa"><Input name="waTemplateName" defaultValue={t.waTemplateName ?? ""} placeholder="confirmacao_agendamento" /></Field>
              <Field label="Idioma"><Input name="waLanguage" defaultValue={t.waLanguage} /></Field>
              <Field label="Ordem das variáveis no template" className="col-span-2"><Input name="waParams" defaultValue={t.waParams.join(", ")} /></Field>
            </div>
            <Checkbox name="active" label="Ativo" defaultChecked={t.active} />
          </SimpleForm>
        </Card>
      ))}
    </div>
  );
}

function RentalTab({ policyJson }: { policyJson: unknown }) {
  const p = parseRentalPolicy(policyJson);
  return (
    <Card className="max-w-3xl p-5 sm:p-7">
      <p className="mb-5 rounded-md bg-ivory p-3 text-xs text-muted-foreground">Estas regras serão usadas pelos módulos de locação e devolução da V2. O termo usado é <strong>multa por atraso</strong>, conforme a política contratual da loja.</p>
      <SimpleForm action={saveRentalPolicyAction}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prazo padrão de locação (dias)"><Input name="defaultRentalDays" type="number" min={1} defaultValue={p.defaultRentalDays} /></Field>
          <Field label="Dias de conferência/lavanderia após devolução"><Input name="turnaroundDays" type="number" min={0} defaultValue={p.turnaroundDays} /></Field>
        </div>
        <Checkbox name="lateFeeEnabled" label="Multa por atraso habilitada" defaultChecked={p.lateFee.enabled} />
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Tolerância (dias)"><Input name="graceDays" type="number" min={0} defaultValue={p.lateFee.graceDays} /></Field>
          <Field label="Valor fixo por dia (R$)"><Input name="fixedPerDay" type="number" step="0.01" min={0} defaultValue={p.lateFee.fixedPerDay} /></Field>
          <Field label="Percentual por dia (%)"><Input name="percentPerDay" type="number" step="0.1" min={0} defaultValue={p.lateFee.percentPerDay} /></Field>
          <Field label="Valor máximo (R$)" hint="Vazio = sem teto"><Input name="maxAmount" type="number" step="0.01" min={0} defaultValue={p.lateFee.maxAmount ?? ""} /></Field>
        </div>
      </SimpleForm>
    </Card>
  );
}

async function UsersTab({ meId, tz }: { meId: string; tz: string }) {
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader title="Equipe" />
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{u.name} {u.id === meId && <span className="text-xs text-muted-foreground">(você)</span>}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · último acesso {u.lastLoginAt ? formatDateTime(u.lastLoginAt, tz) : "nunca"}</p>
                </div>
                <span className="flex gap-1.5"><Badge tone={u.role === "ADMIN" ? "gold" : "neutral"}>{roleLabel[u.role]}</Badge>{!u.active && <Badge tone="red">Inativo</Badge>}</span>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {u.id !== meId && <ActionButton action={toggleUserAction} fields={{ id: u.id }} variant={u.active ? "danger-outline" : "outline"} confirm={u.active ? "Desativar este acesso?" : undefined}>{u.active ? "Desativar" : "Reativar"}</ActionButton>}
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Redefinir senha</summary>
                  <div className="mt-2 w-64"><SimpleForm action={changePasswordAction} submitLabel="Redefinir"><input type="hidden" name="id" value={u.id} /><Input name="password" type="password" minLength={8} required placeholder="Nova senha" autoComplete="new-password" /></SimpleForm></div>
                </details>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="h-fit p-5">
        <p className="mb-3 text-sm font-semibold">Novo usuário</p>
        <SimpleForm action={createUserAction} submitLabel="Criar usuário">
          <Field label="Nome"><Input name="name" required /></Field>
          <Field label="E-mail"><Input name="email" type="email" required autoComplete="off" /></Field>
          <Field label="Senha inicial"><Input name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <Field label="Papel">
            <Select name="role" defaultValue="STAFF"><option value="STAFF">Atendente</option><option value="ADMIN">Administrador</option></Select>
          </Field>
        </SimpleForm>
      </Card>
    </div>
  );
}
