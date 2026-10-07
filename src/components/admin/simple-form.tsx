"use client";

import type { ActionState } from "@/lib/action";
import { FormAlert } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";


/** Formulário genérico ligado a uma Server Action, com mensagem de sucesso/erro. */
export function SimpleForm({
  action, children, submitLabel = "Salvar", className,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  // Sucesso vira aviso flutuante; erro continua visível junto ao formulário
  const { state, pending, onSubmit } = useActionForm(action, { errors: false });
  return (
    <form onSubmit={onSubmit} className={className ?? "space-y-4"}>
      {children}
      <div className="col-span-full space-y-3">
        {state && !state.ok && <FormAlert state={state} />}
        <div className="flex justify-end">
          <SubmitButton pending={pending} pendingText="Salvando…">{submitLabel}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
