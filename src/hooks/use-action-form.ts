"use client";

import { startTransition, useActionState } from "react";
import type { ActionState } from "@/lib/action";

/**
 * Liga um formulário a uma Server Action SEM o reset automático do React 19
 * (que apagaria o que o usuário digitou quando a ação retorna erro).
 */
export function useActionForm(action: (prev: ActionState, fd: FormData) => Promise<ActionState>) {
  const [state, formAction, pending] = useActionState(action, null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(fd));
  };
  return { state, pending, onSubmit };
}
