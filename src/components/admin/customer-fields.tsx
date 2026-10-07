import { Field, Input, Textarea } from "@/components/ui/form";
import { formatPhone } from "@/utils/phone";

export function CustomerFields({ c }: { c?: { name: string; whatsapp: string; email: string | null; notes: string | null; preferences: string | null } }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome completo" required className="sm:col-span-2"><Input name="name" defaultValue={c?.name} required minLength={3} maxLength={120} /></Field>
      <Field label="WhatsApp" required hint="DDD + número. Identifica o cliente."><Input name="whatsapp" type="tel" defaultValue={c ? formatPhone(c.whatsapp) : ""} required /></Field>
      <Field label="E-mail"><Input name="email" type="email" defaultValue={c?.email ?? ""} /></Field>
      <Field label="Observações" className="sm:col-span-2"><Textarea name="notes" defaultValue={c?.notes ?? ""} rows={3} maxLength={2000} /></Field>
      <Field label="Preferências" hint="Estilo, cores, cortes preferidos…" className="sm:col-span-2"><Textarea name="preferences" defaultValue={c?.preferences ?? ""} rows={2} maxLength={2000} /></Field>
    </div>
  );
}
