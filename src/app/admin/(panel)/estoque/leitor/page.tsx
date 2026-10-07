import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { QrScanner } from "@/components/admin/qr-scanner";
import { Card } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Leitor de QR Code" };

export default async function ScannerPage() {
  await requirePageUser("inventory.manage");
  return (
    <>
      <PageHeader title="Leitor de QR Code" description="Modo balcão: leia a etiqueta e mude o status da peça em um toque." back={{ href: "/admin/estoque", label: "Estoque" }} />
      <Card className="mx-auto max-w-xl p-5 sm:p-8">
        <QrScanner />
      </Card>
    </>
  );
}
