"use client";

import { Select } from "@/components/ui/form";

/** Select que envia o formulário GET ao mudar (o botão "Filtrar" continua para quem está sem JS). */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <Select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
