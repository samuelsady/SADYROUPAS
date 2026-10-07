"use client";

import { Field, FormAlert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, onSubmit } = useActionForm(loginAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormAlert state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
