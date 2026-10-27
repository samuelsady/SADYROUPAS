import { redirect } from "next/navigation";
import { bookingWhatsapp } from "@/lib/whatsapp-messages";
import { SettingsService } from "@/services/settings.service";

/** O agendamento agora é feito pelo WhatsApp da Sady (atendido pelo agente de IA). */
export default async function BookingPage() {
  const settings = await SettingsService.get();
  redirect(bookingWhatsapp(settings.whatsapp) ?? "/#contato");
}
