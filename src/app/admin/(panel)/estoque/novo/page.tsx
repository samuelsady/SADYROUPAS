import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleForm } from "@/components/admin/simple-form";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { db } from "@/database/client";
import { requirePageUser } from "@/lib/auth/session";
import { createItemsAction } from "../../_actions/inventory";

export const metadata: Metadata = { title: "Cadastrar peças" };

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  await requirePageUser("inventory.manage");
  const { produto } = await searchParams;
  const products = await db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, colors: true } });
  const selected = products.find((p) => p.id === produto);
  return (
    <>
      <PageHeader title="Cadastrar peças físicas" description="O código é gerado automaticamente: CATEGORIA-COR-TAMANHO-SEQUÊNCIA (ex.: TER-PRE-042-001)." back={{ href: "/admin/estoque", label: "Estoque" }} />
      <Card className="max-w-2xl p-5 sm:p-7">
        <SimpleForm action={createItemsAction} submitLabel="Cadastrar">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Produto" required className="sm:col-span-2">
              <Select name="productId" defaultValue={produto ?? ""} required>
                <option value="" disabled>Selecione…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Tamanho" required><Input name="size" required maxLength={10} placeholder="42" /></Field>
            <Field label="Cor" required><Input name="color" required maxLength={40} defaultValue={selected?.colors[0] ?? ""} /></Field>
            <Field label="Quantidade" hint="Cria várias peças com códigos em sequência"><Input name="quantity" type="number" min={1} max={50} defaultValue={1} /></Field>
            <Field label="Localização"><Input name="location" maxLength={80} placeholder="Arara A" /></Field>
            <Field label="Código manual (opcional)" hint="Só para peças que já têm etiqueta" className="sm:col-span-2"><Input name="code" maxLength={40} className="font-mono uppercase" /></Field>
            <Field label="Observações" className="sm:col-span-2"><Textarea name="notes" rows={2} maxLength={1000} /></Field>
          </div>
        </SimpleForm>
      </Card>
    </>
  );
}
