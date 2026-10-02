'use client';

import { Button, Callout, Field, inputClass } from '@/components/ui/primitives';
import { createOrganisationAction } from '@/server/actions/organisation-actions';

import { useOrganisationForm } from './use-organisation-form';

export function CreateOrganisationForm(): React.ReactElement {
  const { state, action, pending, onSubmit } = useOrganisationForm(createOrganisationAction);

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Name der Organisation"
        htmlFor="org-name"
        hint="Zum Beispiel der Name der Schule, des Kurses oder des Teams."
        error={state.error}
      >
        <input
          id="org-name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          className={inputClass}
          autoComplete="organization"
        />
      </Field>

      <Field
        label="Kurze Beschreibung"
        htmlFor="org-description"
        hint="Freiwillig. Steht auf der Startseite der Organisation."
      >
        <textarea
          id="org-description"
          name="description"
          rows={2}
          maxLength={500}
          className={inputClass}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Wird angelegt …' : 'Organisation anlegen'}
      </Button>

      {state.ok && state.message ? (
        <Callout tone="success" title="Angelegt" live>
          {state.message}
        </Callout>
      ) : null}
    </form>
  );
}
