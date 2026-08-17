'use client';

import { useState, useTransition } from 'react';
import { speichereDarstellung } from '@/server/actions/profil-actions';
import { setReduceMotion, setTheme, THEME_LABELS, type Theme } from '@/lib/preferences/appearance';
import { Callout } from '@/components/ui/primitives';

/**
 * Farbschema und Bewegungsreduktion – am Konto, nicht nur im Browser.
 *
 * Jede Änderung wirkt sofort auf dieser Seite (localStorage und das Attribut am
 * html-Element) **und** wird am Konto gespeichert. Ein „Speichern"-Knopf wäre
 * hier eine Falle: Man sieht die Wirkung sofort, hält es für erledigt und geht
 * weg – und auf dem nächsten Gerät ist wieder alles auf Anfang.
 */
export function DarstellungForm({
  theme,
  reduceMotion,
}: {
  theme: Theme;
  reduceMotion: boolean;
}): React.ReactElement {
  const [gewaehltesTheme, setGewaehltesTheme] = useState<Theme>(theme);
  const [ruhig, setRuhig] = useState(reduceMotion);
  const [gespeichert, setGespeichert] = useState(false);
  const [, starte] = useTransition();

  function uebernimm(neuesTheme: Theme, neueRuhe: boolean): void {
    setGewaehltesTheme(neuesTheme);
    setRuhig(neueRuhe);
    setTheme(neuesTheme);
    setReduceMotion(neueRuhe);
    starte(async () => {
      const antwort = await speichereDarstellung({
        theme: neuesTheme,
        reduceMotion: neueRuhe,
      });
      setGespeichert(antwort.gespeichert);
    });
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-sm font-semibold">Farbschema</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['system', 'light', 'dark'] as const).map((wert) => (
            <label
              key={wert}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--accent)]"
            >
              <input
                type="radio"
                name="theme"
                value={wert}
                checked={gewaehltesTheme === wert}
                onChange={() => uebernimm(wert, ruhig)}
                className="size-4 accent-[var(--accent)]"
              />
              <span className="text-[0.95rem]">{THEME_LABELS[wert]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--accent)]">
          <input
            type="checkbox"
            checked={ruhig}
            onChange={() => uebernimm(gewaehltesTheme, !ruhig)}
            className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Bewegung reduzieren</span>
            <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
              Übergänge werden ruhiger. Diese Einstellung kann die Systemeinstellung nur
              verschärfen, nie aufheben – wer im Betriebssystem &bdquo;Bewegung reduzieren&ldquo;
              gewählt hat, bekommt in jedem Fall ruhige Übergänge.
            </span>
          </span>
        </label>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {gespeichert ? (
          <Callout tone="success">
            Am Konto gespeichert – die Einstellung gilt auch auf anderen Geräten.
          </Callout>
        ) : null}
      </div>
    </div>
  );
}
