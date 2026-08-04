'use client';

import { useActionState } from 'react';
import { Button, Callout, Card, cx } from '@/components/ui/primitives';
import { setConsentAction, type ActionState } from '@/server/actions/organisation-actions';

const INITIAL: ActionState = { ok: false };

export interface CohortConsent {
  cohortId: string;
  cohortName: string;
  organizationName: string;
  shareProgressWithTeachers: boolean;
}

/**
 * Steuerung der Einwilligung zur namentlichen Anzeige.
 *
 * Bewusst im Profil und nicht im Organisationsbereich: Die Entscheidung gehört
 * der lernenden Person und steht deshalb dort, wo sie ihre übrigen Datenrechte
 * findet – neben Export und Löschung.
 *
 * Standard ist „aus". Eine Einwilligung, die man erst suchen und abwählen
 * müsste, wäre keine.
 */
export function ConsentControls({ cohorts }: { cohorts: CohortConsent[] }): React.ReactElement {
  const [state, action, pending] = useActionState(setConsentAction, INITIAL);

  if (cohorts.length === 0) {
    return (
      <Card>
        <p className="text-[var(--text-muted)]">
          Du gehörst zu keiner Kohorte. Sobald dich jemand einlädt, kannst du hier entscheiden, was
          Lehrkräfte sehen dürfen.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {cohorts.map((cohort) => (
        <Card key={cohort.cohortId}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{cohort.cohortName}</p>
              <p className="text-sm text-[var(--text-muted)]">{cohort.organizationName}</p>
              <p
                className={cx(
                  'mt-2 text-sm',
                  cohort.shareProgressWithTeachers
                    ? 'text-[var(--text)]'
                    : 'text-[var(--text-muted)]',
                )}
              >
                {cohort.shareProgressWithTeachers
                  ? 'Lehrkräfte sehen deinen Namen mit der Anzahl abgeschlossener Lektionen und gelöster Aufgaben.'
                  : 'Du fließt ausschließlich in Summenwerte ein. Dein Name erscheint in keiner Ansicht.'}
              </p>
            </div>

            <form action={action} className="shrink-0">
              <input type="hidden" name="cohortId" value={cohort.cohortId} />
              <input
                type="hidden"
                name="consent"
                value={cohort.shareProgressWithTeachers ? 'false' : 'true'}
              />
              <Button type="submit" variant="secondary" disabled={pending}>
                {cohort.shareProgressWithTeachers ? 'Zurücknehmen' : 'Namentlich freigeben'}
              </Button>
            </form>
          </div>
        </Card>
      ))}

      <p className="text-sm text-[var(--text-muted)]">
        Unabhängig von dieser Einstellung sieht niemand deine einzelnen Versuche, deine
        Bearbeitungszeiten oder deine Fehlermeldungen. Diese Daten verlassen dein Konto nicht.
      </p>

      {state.message ? (
        <Callout tone={state.ok ? 'success' : 'alert'} live>
          {state.message}
        </Callout>
      ) : null}
      {state.error ? (
        <Callout tone="alert" title="Das hat nicht geklappt" live>
          {state.error}
        </Callout>
      ) : null}
    </div>
  );
}
