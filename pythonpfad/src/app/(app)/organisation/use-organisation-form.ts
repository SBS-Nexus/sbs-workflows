'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useRef, useState, type FormEvent } from 'react';
import type { ActionState } from '@/server/actions/organisation-actions';

const INITIAL: ActionState = { ok: false };
type OrganisationAction = (previous: ActionState, data: FormData) => Promise<ActionState>;

/**
 * Server Actions können erfolgreich antworten, während ihre Router-Transition
 * hängen bleibt (Issue #51). Rückmeldungen werden deshalb unabhängig davon
 * gesetzt. Nach einer erfolgreichen Mutation laden wir auch die Serveransicht
 * ausdrücklich neu, damit Kohorten und Prüfprotokoll aktuell werden.
 *
 * Die formAction erhält die bisherige serverseitige Formularverarbeitung.
 */
export function useOrganisationForm(serverAction: OrganisationAction) {
  const router = useRouter();
  const [serverState, formAction, serverPending] = useActionState(serverAction, INITIAL);
  const [clientState, setClientState] = useState<ActionState | null>(null);
  const [clientPending, setClientPending] = useState(false);
  const inFlight = useRef(false);
  const state = clientState ?? serverState;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (inFlight.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    inFlight.current = true;
    setClientPending(true);

    try {
      const result = await serverAction(state, data);
      // Eine Sitzungsweiterleitung kann den Aufruf ohne Formulardaten beenden.
      if (result) {
        setClientState(result);
        if (result.ok) {
          form.reset();
          router.refresh();
        }
      }
    } catch {
      setClientState({
        ok: false,
        error:
          'Die Rückmeldung konnte nicht geladen werden. Bitte prüfe den Stand vor einem erneuten Versuch.',
      });
    } finally {
      inFlight.current = false;
      setClientPending(false);
    }
  }

  return { state, action: formAction, pending: clientPending || serverPending, onSubmit };
}
