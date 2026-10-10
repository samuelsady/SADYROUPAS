import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { OCCASIONS } from "@/lib/occasions";

type P = { occasions: string[]; name: string; slug: string; categoryId: string; description: string | null; model: string | null; colors: string[]; sizes: string[]; details: string | null; featured: boolean; active: boolean; sortOrder: number };

export function ProductFields({ p, categories }: { p?: P; categories: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome" required className="sm:col-span-2"><Input name="name" defaultValue={p?.name} required maxLength={120} /></Field>
      <Field label="Categoria" required>
        <Select name="categoryId" defaultValue={p?.categoryId} required>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Modelo / corte" hint="Ex.: Slim, Smoking, Tradicional"><Input name="model" defaultValue={p?.model ?? ""} maxLength={80} /></Field>
      <Field label="Cores" hint="Separe por vírgula"><Input name="colors" defaultValue={p?.colors.join(", ")} /></Field>
      <Field label="Tamanhos" hint="Separe por vírgula: 46, 48, 50"><Input name="sizes" defaultValue={p?.sizes.join(", ")} /></Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-[13px] font-semibold text-ink/80">Ocasiões <span className="font-normal text-muted-foreground">(organizam o catálogo do site)</span></legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {OCCASIONS.map((o) => (
            <Checkbox key={o.slug} name="occasions" value={o.slug} label={o.name} defaultChecked={p?.occasions.includes(o.slug)} />
          ))}
        </div>
      </fieldset>
      <Field label="Descrição" className="sm:col-span-2"><Textarea name="description" defaultValue={p?.description ?? ""} rows={3} maxLength={4000} /></Field>
      <Field label="Informações adicionais" hint="Tecido, composição, ajustes…" className="sm:col-span-2"><Textarea name="details" defaultValue={p?.details ?? ""} rows={2} maxLength={4000} /></Field>
      <Field label="Endereço (slug)" hint="Gerado a partir do nome se vazio"><Input name="slug" defaultValue={p?.slug ?? ""} maxLength={80} /></Field>
      <Field label="Ordem"><Input name="sortOrder" type="number" min={0} defaultValue={p?.sortOrder ?? 0} /></Field>
      <div className="flex gap-6 sm:col-span-2">
        <Checkbox name="active" label="Ativo no catálogo" defaultChecked={p?.active ?? true} />
        <Checkbox name="featured" label="Destaque na página inicial" defaultChecked={p?.featured ?? false} />
      </div>
    </div>
  );
}
