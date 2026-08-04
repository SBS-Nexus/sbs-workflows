'use client';

import { useActionState } from 'react';
import {
  Button,
  Callout,
  Card,
  Field,
  SectionHeading,
  inputClass,
} from '@/components/ui/primitives';
import {
  createCohortAction,
  createInvitationAction,
  type ActionState,
} from '@/server/actions/organisation-actions';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/domain/organisation/permissions';

const INITIAL: ActionState = { ok: false };

export function CohortAndInviteForms({
  organizationSlug,
  cohorts,
  mayInviteOwners,
}: {
  organizationSlug: string;
  cohorts: Array<{ slug: string; name: string }>;
  mayInviteOwners: boolean;
}): React.ReactElement {
  return (
    <>
      <section aria-labelledby="neue-kohorte">
        <SectionHeading id="neue-kohorte">Kohorte anlegen</SectionHeading>
        <Card>
          <CohortForm organizationSlug={organizationSlug} />
        </Card>
      </section>

      <section aria-labelledby="einladen">
        <SectionHeading
          id="einladen"
          description="Der Link gilt vierzehn Tage und wird nur einmal angezeigt."
        >
          Jemanden einladen
        </SectionHeading>
        <Card>
          <InviteForm
            organizationSlug={organizationSlug}
            cohorts={cohorts}
            mayInviteOwners={mayInviteOwners}
          />
        </Card>
      </section>
    </>
  );
}

function CohortForm({ organizationSlug }: { organizationSlug: string }): React.ReactElement {
  const [state, action, pending] = useActionState(createCohortAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />

      <Field label="Name der Kohorte" htmlFor="kohorte-name" error={state.error}>
        <input
          id="kohorte-name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          className={inputClass}
        />
      </Field>

      <Field
        label="Beschreibung"
        htmlFor="kohorte-beschreibung"
        hint="Freiwillig, etwa der Zeitraum oder das Ziel des Kurses."
      >
        <textarea
          id="kohorte-beschreibung"
          name="description"
          rows={2}
          maxLength={500}
          className={inputClass}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Wird angelegt …' : 'Kohorte anlegen'}
      </Button>

      {state.ok && state.message ? (
        <Callout tone="success" title="Angelegt" live>
          {state.message}
        </Callout>
      ) : null}
    </form>
  );
}

function InviteForm({
  organizationSlug,
  cohorts,
  mayInviteOwners,
}: {
  organizationSlug: string;
  cohorts: Array<{ slug: string; name: string }>;
  mayInviteOwners: boolean;
}): React.ReactElement {
  const [state, action, pending] = useActionState(createInvitationAction, INITIAL);

  const rollen: Array<'MEMBER' | 'TEACHER' | 'OWNER'> = mayInviteOwners
    ? ['MEMBER', 'TEACHER', 'OWNER']
    : ['MEMBER', 'TEACHER'];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />

      <fieldset>
        <legend className="text-sm font-semibold">Rolle</legend>
        <div className="mt-2 space-y-2">
          {rollen.map((rolle, index) => (
            <label
              key={rolle}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-3 has-checked:border-[var(--accent)] has-checked:bg-[var(--accent-soft)] has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-[var(--focus-ring)]"
            >
              <input
                type="radio"
                name="role"
                value={rolle}
                defaultChecked={index === 0}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">{ROLE_LABELS[rolle]}</span>
                <span className="block text-sm text-[var(--text-muted)]">
                  {ROLE_DESCRIPTIONS[rolle]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {cohorts.length > 0 ? (
        <Field
          label="Direkt in eine Kohorte aufnehmen"
          htmlFor="einladung-kohorte"
          hint="Freiwillig. Ohne Auswahl tritt die Person nur der Organisation bei."
        >
          <select id="einladung-kohorte" name="cohortSlug" className={inputClass}>
            <option value="">keine Kohorte</option>
            {cohorts.map((cohort) => (
              <option key={cohort.slug} value={cohort.slug}>
                {cohort.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field
        label="An eine bestimmte E-Mail-Adresse binden"
        htmlFor="einladung-email"
        hint="Freiwillig. Ohne Angabe kann jede Person mit dem Link beitreten."
        error={state.error}
      >
        <input
          id="einladung-email"
          name="email"
          type="email"
          className={inputClass}
          autoComplete="off"
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Wird erstellt …' : 'Einladungslink erstellen'}
      </Button>

      {state.ok && state.invitationUrl ? (
        <Callout tone="success" title="Einladungslink" live>
          <p>{state.message}</p>
          <p className="mt-2 break-all rounded-lg bg-[var(--surface-sunken)] p-2 font-mono text-sm">
            {state.invitationUrl}
          </p>
        </Callout>
      ) : null}
    </form>
  );
}
