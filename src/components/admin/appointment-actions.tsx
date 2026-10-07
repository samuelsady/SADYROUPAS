import type { AppointmentStatus } from "@prisma/client";
import { ActionButton } from "./action-button";
import { changeAppointmentStatusAction } from "@/app/admin/(panel)/_actions/appointments";

/** Ações rápidas de status conforme o status atual. */
export function AppointmentActions({ id, status, size = "sm" }: { id: string; status: AppointmentStatus; size?: "sm" | "md" }) {
  const btn = (to: AppointmentStatus, label: string, variant: "outline" | "primary" | "danger-outline" = "outline", extra?: { confirm?: string; prompt?: { field: string; message: string } }) => (
    <ActionButton key={to} action={changeAppointmentStatusAction} fields={{ id, status: to }} variant={variant} size={size} {...extra}>
      {label}
    </ActionButton>
  );
  const actions: React.ReactNode[] = [];
  if (status === "SCHEDULED") actions.push(btn("CONFIRMED", "Confirmar", "primary"));
  if (status === "SCHEDULED" || status === "CONFIRMED") {
    actions.push(btn("COMPLETED", "Concluir"));
    actions.push(btn("NO_SHOW", "Não compareceu", "outline", { confirm: "Marcar que o cliente não compareceu?" }));
    actions.push(btn("CANCELLED", "Cancelar", "danger-outline", { prompt: { field: "reason", message: "Motivo do cancelamento (opcional). O cliente será avisado pelo WhatsApp." } }));
  }
  if (status === "CANCELLED" || status === "NO_SHOW") actions.push(btn("SCHEDULED", "Reabrir", "outline", { confirm: "Reabrir este agendamento no mesmo horário?" }));
  if (status === "COMPLETED") actions.push(btn("CONFIRMED", "Desfazer conclusão"));
  return <div className="flex flex-wrap gap-2">{actions}</div>;
}
