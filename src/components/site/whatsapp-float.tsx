import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/utils/phone";

export function WhatsAppFloat({ phone }: { phone: string | null }) {
  const href = whatsappLink(phone, "Olá! Vim pelo site da Sady Roupas e gostaria de mais informações.");
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Falar com a Sady Roupas no WhatsApp" className="no-print fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f9d55] text-white shadow-lg shadow-black/20 transition hover:scale-105">
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
