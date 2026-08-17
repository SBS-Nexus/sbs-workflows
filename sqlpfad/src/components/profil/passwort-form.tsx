'use client';

import { useActionState } from 'react';
import { aenderePasswort, type KontoState } from '@/server/actions/konto-actions';
import { Button, Callout, inputClass } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';

/**
 * Passwort ändern.
 *
 * Das aktuelle Passwort wird verlangt, auch wenn man angemeldet ist – sonst
 * könnte jemand an einem unbeaufsichtigten Rechner die Besitzerin aussperren.
 *
 * Nach dem Ändern werden alle Sitzungen beendet, auch diese. Das steht als
 * Satz über dem Knopf und nicht als Überraschung danach.
 */
export function PasswortForm(): React.ReactElement {
  const [zustand, aktion, laeuft] = useActionState<KontoState, FormData>(aenderePasswort, {
    ok: false,
  });

  return (
    <form action={aktion} className="space-y-4">
      <div>
        <label htmlFor="aktuell" className="block text-sm font-semibold">
          Aktuelles Passwort
        </label>
        <input
          id="aktuell"
          name="aktuell"
          type="password"
          autoComplete="current-password"
          required
          className={`${inputClass} mt-1.5 max-w-md`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="neu" className="block text-sm font-semibold">
            Neues Passwort
          </label>
          <input
            id="neu"
            name="neu"
            type="password"
            autoComplete="new-password"
            required
            className={`${inputClass} mt-1.5`}
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Mindestens 10 Zeichen. Eine Wortfolge, die du dir merken kannst, ist besser als ein
            kurzes Kunstwort mit Sonderzeichen.
          </p>
        </div>

        <div>
          <label htmlFor="wiederholung" className="block text-sm font-semibold">
            Neues Passwort wiederholen
          </label>
          <input
            id="wiederholung"
            name="wiederholung"
            type="password"
            autoComplete="new-password"
            required
            className={`${inputClass} mt-1.5`}
          />
        </div>
      </div>

      <p className="text-sm text-[var(--text-muted)]">
        Nach dem Ändern wirst du überall abgemeldet – auch hier. Wer sein Passwort ändert, will
        meist genau die Sitzung loswerden, die sonst weiterliefe.
      </p>

      <Button type="submit" disabled={laeuft}>
        <Icon name="schloss" size={18} />
        {laeuft ? 'Wird geändert …' : 'Passwort ändern'}
      </Button>

      <div aria-live="polite" className="empty:hidden">
        {zustand.meldung ? <Callout tone="caution">{zustand.meldung}</Callout> : null}
      </div>
    </form>
  );
}
