"use client";

import type { ActionState } from "@/lib/action";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button";
import { useActionForm } from "@/hooks/use-action-form";
import { cn } from "@/utils/cn";

/** Formulário de uma linha (campos + botão) com retorno em aviso flutuante. */
export function InlineForm({
  action, fields = {}, children, submitLabel, variant = "primary", size = "sm", className,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  fields?: Record<string, string>;
  children?: React.ReactNode;
  submitLabel: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending, onSubmit } = useActionForm(action, {});
  return (
    <form onSubmit={onSubmit} className={cn("flex flex-wrap items-center gap-2", className)}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <SubmitButton pending={pending} variant={variant} size={size}>{submitLabel}</SubmitButton>
    </form>
  );
}
