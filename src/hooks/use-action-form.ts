"use client";

import { startTransition, useActionState } from "react";
import type { ActionState } from "@/lib/action";
import { toast } from "@/lib/toast";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Envolve a Server Action para avisar o resultado (toast) assim que ela
 * responde — mesmo que o componente desapareça com a atualização da página.
 * `errors: false` deixa o erro só no formulário (sem aviso flutuante).
 */
export function withToast(action: Action, opts: { errors?: boolean; success?: boolean } = {}): Action {
  return async (prev, fd) => {
    const result = await action(prev, fd);
    if (result && !result.ok && opts.errors !== false) toast(result.error, "error");
    if (result?.ok && result.message && opts.success !== false) toast(result.message);
    return result;
  };
}

/**
 * Liga um formulário a uma Server Action SEM o reset automático do React 19
 * (que apagaria o que o usuário digitou quando a ação retorna erro).
 */
export function useActionForm(action: Action, notify?: { errors?: boolean; success?: boolean }) {
  const [state, formAction, pending] = useActionState(notify ? withToast(action, notify) : action, null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(fd));
  };
  return { state, pending, onSubmit };
}
