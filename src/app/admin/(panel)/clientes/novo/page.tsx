import type { Metadata } from "next";
import { CustomerFields } from "@/components/admin/customer-fields";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleForm } from "@/components/admin/simple-form";
import { Card } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { createCustomerAction } from "../../_actions/customers";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewCustomerPage() {
  await requirePageUser("customers.manage");
  return (
    <>
      <PageHeader title="Novo cliente" back={{ href: "/admin/clientes", label: "Clientes" }} />
      <Card className="max-w-2xl p-5 sm:p-7">
        <SimpleForm action={createCustomerAction} submitLabel="Cadastrar cliente"><CustomerFields /></SimpleForm>
      </Card>
    </>
  );
}
