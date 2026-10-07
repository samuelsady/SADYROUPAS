import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { ProductFields } from "@/components/admin/product-fields";
import { SimpleForm } from "@/components/admin/simple-form";
import { Card } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { CatalogService } from "@/services/catalog.service";
import { saveProductAction } from "../../_actions/catalog";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requirePageUser("catalog.manage");
  const categories = await CatalogService.categories();
  return (
    <>
      <PageHeader title="Novo produto" description="Depois de salvar, envie as fotos e cadastre as peças físicas." back={{ href: "/admin/catalogo", label: "Catálogo" }} />
      <Card className="max-w-3xl p-5 sm:p-7">
        <SimpleForm action={saveProductAction.bind(null, null)} submitLabel="Criar produto"><ProductFields categories={categories} /></SimpleForm>
      </Card>
    </>
  );
}
