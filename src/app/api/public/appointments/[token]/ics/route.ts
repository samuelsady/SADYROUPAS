import { SettingsService } from "@/services/settings.service";
import { AppointmentService } from "@/services/appointment.service";
import { buildIcs } from "@/utils/ics";

/** Arquivo .ics ("Adicionar ao calendário") — acessível só com o token aleatório do agendamento. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await AppointmentService.getByPublicToken(token);
  if (!appointment || appointment.status === "CANCELLED") return new Response("Não encontrado", { status: 404 });
  const settings = await SettingsService.get();
  const ics = buildIcs({
    uid: `${appointment.code}@sadyroupas`,
    start: appointment.startsAt,
    end: appointment.endsAt,
    title: `${appointment.service.name} — ${settings.companyName}`,
    description: `Código: ${appointment.code}`,
    location: settings.address ?? settings.companyName,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${appointment.code}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
