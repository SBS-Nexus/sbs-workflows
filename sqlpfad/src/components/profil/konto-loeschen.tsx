'use client';

import { useActionState, useState } from 'react';
import { loescheKonto, type KontoState } from '@/server/actions/konto-actions';
import { Button, Callout, inputClass } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';

/**
 * Das Konto löschen.
 *
 * Drei Entscheidungen stecken darin:
 *
 * **Das Formular ist zugeklappt.** Nicht versteckt – es steht unter einer
 * eigenen Überschrift und ist mit einem Klick da. Aber es liegt nicht offen
 * neben „Passwort ändern", wo man versehentlich hineingerät.
 *
 * **Es steht, was verschwindet, bevor man etwas eingibt.** Eine Aufzählung
 * nach dem Klick wäre eine Warnung an jemanden, der schon entschieden hat.
 *
 * **Kein Papierkorb und keine Frist.** Das ist unbequemer und ehrlicher: Wer
 * „gelöscht" liest, soll sich darauf verlassen können. Genau deshalb kostet es
 * das Passwort und ein getipptes Wort – nicht als Schikane, sondern damit ein
 * Fehlgriff nicht reicht.
 */
export function KontoLoeschen(): React.ReactElement {
  const [offen, setOffen] = useState(false);
  const [zustand, aktion, laeuft] = useActionState<KontoState, FormData>(loescheKonto, {
    ok: false,
  });

  return (
    <div className="space-y-4">
      <div className="text-[0.95rem]">
        <p>Gelöscht wird alles, was zu deinem Konto gehört:</p>
        <ul className="mt-2 space-y-1.5">
          {[
            'Name und E-Mail-Adresse',
            'Dein Fortschritt, deine Versuche und deine Lernzeiten',
            'Deine Projektstände und Notizen',
            'Deine Übungsdatenbank, falls es eine gibt',
          ].map((zeile) => (
            <li key={zeile} className="flex gap-2.5 text-[var(--text-muted)]">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--text-muted)]"
              />
              <span>{zeile}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-medium">
          Es gibt keinen Papierkorb und keine Frist. Danach ist es weg.
        </p>
      </div>

      {offen ? (
        <form action={aktion} className="space-y-4 border-t border-[var(--border)] pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="loesch-passwort" className="block text-sm font-semibold">
                Dein Passwort
              </label>
              <input
                id="loesch-passwort"
                name="passwort"
                type="password"
                autoComplete="current-password"
                required
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label htmlFor="bestaetigung" className="block text-sm font-semibold">
                Tippe zur Bestätigung: löschen
              </label>
              <input
                id="bestaetigung"
                name="bestaetigung"
                type="text"
                autoComplete="off"
                required
                className={`${inputClass} mt-1.5`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="danger" disabled={laeuft}>
              <Icon name="achtung" size={18} />
              {laeuft ? 'Wird gelöscht …' : 'Konto endgültig löschen'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOffen(false)}>
              Doch nicht
            </Button>
          </div>

          <div aria-live="polite" className="empty:hidden">
            {zustand.meldung ? <Callout tone="alert">{zustand.meldung}</Callout> : null}
          </div>
        </form>
      ) : (
        <Button type="button" variant="ghost" onClick={() => setOffen(true)}>
          Konto löschen
        </Button>
      )}
    </div>
  );
}
