'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerAction, type FormState } from '@/server/actions/auth-actions';
import { Button, Callout, Field, inputClass } from '@/components/ui/primitives';

const initialState: FormState = { ok: false };

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Konto wird angelegt …' : 'Konto anlegen'}
    </Button>
  );
}

export function RegisterForm(): React.ReactElement {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? (
        <Callout tone="alert" title="Das hat nicht geklappt" live>
          {state.error}
        </Callout>
      ) : null}

      <Field
        label="Name"
        htmlFor="name"
        hint="So wirst du in der App angesprochen."
        error={state.fieldErrors?.name}
      >
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className={inputClass}
          aria-describedby="name-hint"
          {...(state.fieldErrors?.name
            ? { 'aria-invalid': true, 'aria-errormessage': 'name-error' }
            : {})}
        />
      </Field>

      <Field label="E-Mail-Adresse" htmlFor="email" error={state.fieldErrors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          {...(state.fieldErrors?.email
            ? { 'aria-invalid': true, 'aria-errormessage': 'email-error' }
            : {})}
        />
      </Field>

      <Field
        label="Passwort"
        htmlFor="password"
        hint="Mindestens 10 Zeichen. Eine Wortfolge, die du dir merken kannst, ist sicherer als ein kurzes Passwort mit Sonderzeichen."
        error={state.fieldErrors?.password}
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className={inputClass}
          aria-describedby="password-hint"
          {...(state.fieldErrors?.password
            ? { 'aria-invalid': true, 'aria-errormessage': 'password-error' }
            : {})}
        />
      </Field>

      <SubmitButton />

      <p className="text-sm text-[var(--text-muted)]">
        Gespeichert werden nur dein Name, deine E-Mail-Adresse und dein Lernfortschritt. Du kannst
        beides jederzeit exportieren und dein Konto vollständig löschen.
      </p>
    </form>
  );
}
