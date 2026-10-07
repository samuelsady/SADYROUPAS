"use client";

import { useActionState, useRef } from "react";
import { withToast } from "@/hooks/use-action-form";
import type { ActionState } from "@/lib/action";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button";

/**
 * Botão que dispara uma Server Action com campos ocultos (ex.: mudar status).
 * Mostra o erro abaixo quando a ação falha; `confirm` pede confirmação antes.
 */
export function ActionButton({
  action, fields, children, variant = "outline", size = "sm", confirm, className, prompt,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  confirm?: string;
  className?: string;
  /** Pede um texto ao usuário (ex.: motivo do cancelamento) e envia no campo indicado */
  prompt?: { field: string; message: string };
}) {
  const [, formAction] = useActionState(withToast(action), null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) return e.preventDefault();
        if (prompt && ref.current) {
          const v = window.prompt(prompt.message);
          if (v === null) return e.preventDefault();
          ref.current.value = v;
        }
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {prompt && <input ref={ref} type="hidden" name={prompt.field} />}
      <SubmitButton variant={variant} size={size}>{children}</SubmitButton>
    </form>
  );
}
