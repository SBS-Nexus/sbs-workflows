'use client';

import { useState } from 'react';
import { Button, Callout } from '@/components/ui/primitives';

/**
 * Abschluss-Knopf der Labs mit fester Interaktion (Terminal, Tokenizer,
 * Context-Window).
 *
 * Der Abschluss gilt erst dann als erreicht, wenn die Server Action ihn
 * tatsächlich gespeichert hat. Vorher setzten die Labs ihren Zustand auf
 * "fertig" und meldeten "✓ Lab abgeschlossen", noch bevor die Anfrage
 * beantwortet war — der zurückgegebene Promise wurde gar nicht erst
 * betrachtet. Schlug das Speichern fehl (kurzer Netzausfall, Ratenbegrenzung,
 * Datenbankfehler), sah die lernende Person eine Erfolgsmeldung, während das
 * Lab in `/labs` unverändert als offen geführt wurde und es keinen Weg zurück
 * gab (Code-Review auf PR #29).
 */
export function LabCompleteButton({
  onCompleteAction,
  label,
  size,
  disabled = false,
}: {
  /** Speichert den Abschluss und meldet, ob das gelungen ist. */
  onCompleteAction: () => Promise<boolean>;
  label: string;
  size?: 'sm';
  disabled?: boolean;
}): React.ReactElement {
  const [state, setState] = useState<'offen' | 'laeuft' | 'gespeichert' | 'fehler'>('offen');

  async function complete(): Promise<void> {
    setState('laeuft');
    setState((await onCompleteAction()) ? 'gespeichert' : 'fehler');
  }

  if (state === 'gespeichert') {
    return (
      <p
        role="status"
        aria-live="polite"
        className="font-mono text-sm text-success-700 dark:text-success-100"
      >
        ✓ Lab abgeschlossen.
      </p>
    );
  }

  return (
    <div>
      {state === 'fehler' ? (
        <Callout tone="alert" title="Abschluss nicht gespeichert" live className="mb-3">
          Der Lab-Abschluss konnte nicht gespeichert werden. Bitte versuch es noch einmal.
        </Callout>
      ) : null}
      <Button size={size} disabled={disabled || state === 'laeuft'} onClick={complete}>
        {state === 'laeuft'
          ? 'Wird gespeichert …'
          : state === 'fehler'
            ? 'Erneut versuchen'
            : label}
      </Button>
    </div>
  );
}
