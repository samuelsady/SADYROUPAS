import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CalendarPlus, Check, FileSignature, PhoneCall, Sparkles, X } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import Image from "@/components/ui/sady-image";
import { requirePageUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { InterestService, type InterestPiece } from "@/services/interest.service";
import { SettingsService } from "@/services/settings.service";
import { formatRentalNumber } from "@/utils/codes";
import { formatDate, formatDateKey, toTimeKey } from "@/utils/datetime";
import { formatPhone, whatsappLink } from "@/utils/phone";
import { closeInterestAction, followUpDoneAction, markInterestContactedAction } from "../_actions/interests";

export const metadata: Metadata = { title: "Interessados" };

type Person = { id: string; name: string; whatsapp: string };

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

function Pieces({ pieces }: { pieces: (InterestPiece & { code?: string })[] }) {
  if (pieces.length === 0) return <p className="text-xs text-muted-foreground">Sem peças escolhidas</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {pieces.map((p, i) => (
        <li key={`${p.slug}-${p.size}-${i}`} className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3">
          <span className="relative h-8 w-8 overflow-hidden rounded-full bg-sand">{p.image && <Image src={p.image} alt="" fill sizes="32px" className="object-cover object-top" />}</span>
          <span className="text-xs">
            <Link href={`/catalogo/${p.slug}`} target="_blank" className="font-semibold hover:text-gold-dark">{p.name}</Link>
            {(p.size || p.code) && <span className="text-muted-foreground"> · {[p.size && `tam. ${p.size}`, p.code].filter(Boolean).join(" · ")}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WhatsButton({ customer, text }: { customer: Person; text: string }) {
  const href = whatsappLink(customer.whatsapp, text);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md bg-[#25D366] px-3 text-xs font-bold text-white transition hover:bg-[#1ebe5b]">
      <WhatsAppIcon className="h-4 w-4" /> WhatsApp
    </a>
  );
}

function Row({ customer, when, children, pieces, note, actions, tone }: { customer: Person; when: React.ReactNode; children?: React.ReactNode; pieces: InterestPiece[]; note?: string | null; actions: React.ReactNode; tone?: "new" }) {
  return (
    <li className={cn("grid gap-3 p-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-5", tone === "new" && "bg-gold/5")}>
      <div className="min-w-0">
        <Link href={`/admin/clientes/${customer.id}`} className="block truncate font-semibold hover:text-gold-dark">{customer.name}</Link>
        <p className="text-xs text-muted-foreground">{formatPhone(customer.whatsapp)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{when}</p>
        {children}
      </div>
      <div className="min-w-0 space-y-2">
        <Pieces pieces={pieces} />
        {note && <p className="text-xs italic text-muted-foreground">“{note}”</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
    </li>
  );
}

function Section({ id, title, hint, count, icon: Icon, children, empty }: { id: string; title: string; hint: string; count: number; icon: React.ElementType; children: React.ReactNode; empty: string }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Icon className="h-5 w-5 text-gold-dark" /> {title} <span className="rounded-full bg-sand px-2 py-0.5 text-xs tabular-nums">{count}</span></h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Card>{count === 0 ? <EmptyState title={empty} /> : <ul className="divide-y divide-line">{children}</ul>}</Card>
    </section>
  );
}

export default async function InterestsPage() {
  await requirePageUser("customers.manage");
  const [board, settings] = await Promise.all([InterestService.board(), SettingsService.get()]);
  const tz = settings.timezone;
  const when = (d: Date) => `${formatDate(d, tz)} às ${toTimeKey(d, tz)}`;
  const summary = [
    { id: "novos", label: "Pediram contato", n: board.novos.length, tone: "gold" as const },
    { id: "agendados", label: "Vão provar", n: board.agendados.length, tone: "neutral" as const },
    { id: "retornar", label: "Provaram e não alugaram", n: board.semLocacao.length, tone: "amber" as const },
    { id: "alugaram", label: "Alugaram (30 dias)", n: board.alugaram.length, tone: "green" as const },
  ];

  return (
    <>
      <PageHeader title="Interessados" description="Quem mostrou interesse nas roupas e o que precisa de retorno. Comece pelos que pediram contato." />

      <nav className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo">
        {summary.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-xl border border-line bg-card p-4 transition hover:border-ink/25">
            <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 text-3xl font-semibold tabular-nums", s.tone === "gold" && "text-gold-dark", s.tone === "amber" && "text-amber-700", s.tone === "green" && "text-emerald-700")}>{s.n}</p>
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        <Section id="novos" title="Pediram contato" hint="Deixaram nome e WhatsApp com a lista de provas no site, sem marcar horário." count={board.novos.length} icon={Sparkles} empty="Ninguém aguardando contato.">
          {board.novos.map((i) => (
            <Row
              key={i.id}
              tone={i.status === "NEW" ? "new" : undefined}
              customer={i.customer}
              pieces={i.pieces}
              note={i.message}
              when={<>Pediu em {when(i.createdAt)}</>}
              actions={
                <>
                  <WhatsButton customer={i.customer} text={`Olá, ${firstName(i.customer.name)}! Aqui é da Sady Roupas. Recebemos sua lista de provas (${i.pieces.map((p) => p.name).join(", ")}). Quer agendar um horário para provar?`} />
                  <Link href={`/admin/agendamentos/novo?cliente=${i.customer.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-xs font-semibold hover:border-ink"><CalendarPlus className="h-3.5 w-3.5" /> Agendar</Link>
                  {i.status === "NEW" && <ActionButton action={markInterestContactedAction} fields={{ id: i.id }} size="sm" variant="outline"><Check className="h-3.5 w-3.5" /> Já falei</ActionButton>}
                  <ActionButton action={closeInterestAction} fields={{ id: i.id }} size="sm" variant="ghost" confirm="Encerrar este interesse? Ele sai da lista."><X className="h-3.5 w-3.5" /> Encerrar</ActionButton>
                </>
              }
            >
              {i.status === "CONTACTED" && i.contactedAt && <Badge tone="blue" className="mt-1.5">Contatado em {formatDate(i.contactedAt, tz)}</Badge>}
              {i.status === "NEW" && <Badge tone="gold" className="mt-1.5">Novo</Badge>}
            </Row>
          ))}
        </Section>

        <Section id="agendados" title="Vão provar" hint="Atendimentos marcados, com as roupas que querem experimentar — separe as peças antes." count={board.agendados.length} icon={CalendarCheck} empty="Nenhum atendimento marcado.">
          {board.agendados.map((a) => (
            <Row
              key={a.id}
              customer={a.customer}
              pieces={a.pieces}
              when={<>{a.service} · <span className="font-semibold text-ink">{when(a.startsAt)}</span></>}
              actions={
                <>
                  <WhatsButton customer={a.customer} text={`Olá, ${firstName(a.customer.name)}! Aqui é da Sady Roupas. Passando para confirmar seu atendimento em ${when(a.startsAt)}.`} />
                  <Link href={`/admin/agendamentos/${a.id}`} className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold hover:border-ink">Abrir</Link>
                </>
              }
            />
          ))}
        </Section>

        <Section id="retornar" title="Provaram e não alugaram" hint="Atendimentos concluídos nos últimos 60 dias sem locação depois. Vale um retorno." count={board.semLocacao.length} icon={PhoneCall} empty="Nenhum retorno pendente.">
          {board.semLocacao.map((a) => (
            <Row
              key={a.id}
              customer={a.customer}
              pieces={a.pieces}
              when={<>Provou em {formatDate(a.startsAt, tz)}</>}
              actions={
                <>
                  <WhatsButton customer={a.customer} text={`Olá, ${firstName(a.customer.name)}! Aqui é da Sady Roupas. Gostou dos trajes que provou? Podemos reservar para você.`} />
                  <Link href={`/admin/locacoes/nova?agendamento=${a.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-3 text-xs font-semibold text-ivory hover:bg-ink-3"><FileSignature className="h-3.5 w-3.5" /> Criar locação</Link>
                  <ActionButton action={followUpDoneAction} fields={{ id: a.id }} size="sm" variant="outline"><Check className="h-3.5 w-3.5" /> Retorno feito</ActionButton>
                </>
              }
            />
          ))}
        </Section>

        <Section id="alugaram" title="Alugaram" hint="Locações dos últimos 30 dias." count={board.alugaram.length} icon={FileSignature} empty="Nenhuma locação nos últimos 30 dias.">
          {board.alugaram.map((r) => (
            <Row
              key={r.id}
              customer={r.customer}
              pieces={r.pieces}
              when={<>Locação {formatRentalNumber(r.number)} · retirada {formatDateKey(r.pickupDate.toISOString().slice(0, 10))}</>}
              actions={<Link href={`/admin/locacoes/${r.id}`} className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold hover:border-ink">Abrir locação</Link>}
            />
          ))}
        </Section>
      </div>
    </>
  );
}
