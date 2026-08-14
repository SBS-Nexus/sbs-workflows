'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction, type FormState } from '@/server/actions/auth-actions';
import { Button, Callout, Field, inputClass } from '@/components/ui/primitives';

const initialState: FormState = { ok: false };

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Anmeldung läuft …' : 'Anmelden'}
    </Button>
  );
}

export function LoginForm(): React.ReactElement {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? (
        <Callout tone="alert" title="Anmeldung nicht möglich" live>
          {state.error}
        </Callout>
      ) : null}

      <Field label="E-Mail-Adresse" htmlFor="email" error={state.fieldErrors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </Field>

      <Field label="Passwort" htmlFor="password" error={state.fieldErrors?.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
