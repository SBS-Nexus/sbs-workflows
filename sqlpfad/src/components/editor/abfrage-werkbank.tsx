'use client';

import { useState, useTransition } from 'react';
import { SqlEditor } from '@/components/editor/sql-editor';
import { ErgebnisTabelle } from '@/components/sql/ergebnis-tabelle';
import { FehlerAnzeige } from '@/components/sql/fehler-anzeige';
import { Button, Callout, Kbd } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { fuehreAbfrageAus, type AbfrageErgebnis } from '@/server/actions/abfrage-actions';
import type { UebungsDatensatz } from '@/domain/sql/schema';

/**
 * Editor, Ausführen-Knopf und Ergebnis in einem.
 *
 * Der Ergebnisbereich sitzt unter dem Editor und nicht daneben: Beim Schreiben
 * einer Abfrage wandert der Blick von oben nach unten, und ein Ergebnis rechts
 * daneben zwingt zum Springen. Auf schmalen Geräten wäre die Frage ohnehin
 * entschieden.
 *
 * Der Bereich trägt `aria-live="polite"`. Ohne das bliebe das Ergebnis für
 * jemanden, der einen Screenreader benutzt, unbemerkt – der Knopf sagt dann
 * nichts, und die Seite scheint nicht zu reagieren.
 */
export function AbfrageWerkbank({
  datensatz,
  startSql = '',
  erlaubteKlassen = ['SELECT'],
}: {
  datensatz: UebungsDatensatz;
  startSql?: string;
  erlaubteKlassen?: string[];
}): React.ReactElement {
  const [sql, setSql] = useState(startSql);
  const [ergebnis, setErgebnis] = useState<AbfrageErgebnis | null>(null);
  const [laeuft, starte] = useTransition();

  function ausfuehren(): void {
    // Kein Ausführen ohne Inhalt: Der Server würde es ablehnen, und die
    // Ablehnung wäre eine Antwort auf eine Frage, die niemand gestellt hat.
    if (sql.trim() === '') return;
    starte(async () => {
      setErgebnis(await fuehreAbfrageAus({ sql, erlaubteKlassen }));
    });
  }

  return (
    <div className="space-y-4">
      <SqlEditor
        wert={sql}
        beiAenderung={setSql}
        beiAusfuehren={ausfuehren}
        datensatz={datensatz}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={ausfuehren} disabled={laeuft || sql.trim() === ''}>
          <Icon name="abspielen" size={18} />
          {laeuft ? 'Läuft …' : 'Ausführen'}
        </Button>
        <p className="text-sm text-[var(--text-muted)]">
          oder <Kbd>Strg</Kbd> + <Kbd>Enter</Kbd>
        </p>
        {sql !== startSql ? (
          <button
            type="button"
            onClick={() => setSql(startSql)}
            className="ml-auto text-sm font-medium text-[var(--text-muted)] underline hover:text-[var(--text)]"
          >
            Auf Anfang zurücksetzen
          </button>
        ) : null}
      </div>

      <div aria-live="polite" aria-busy={laeuft}>
        {ergebnis === null ? null : ergebnis.art === 'erfolg' ? (
          <ErgebnisTabelle
            resultset={ergebnis.resultset}
            abgeschnitten={ergebnis.abgeschnitten}
            gelieferteZeilen={ergebnis.gelieferteZeilen}
            dauerMs={ergebnis.dauerMs}
          />
        ) : ergebnis.art === 'fehler' ? (
          <FehlerAnzeige erklaerung={ergebnis.erklaerung} />
        ) : ergebnis.art === 'abgelehnt' ? (
          /*
           * Ton: „Diese Lektion übt das Lesen von Daten" statt „nicht
           * erlaubt". Wer in einer SELECT-Lektion ein UPDATE schreibt, hat die
           * Aufgabe missverstanden und nichts Böses vor.
           */
          <Callout tone="caution" title="Das führen wir hier nicht aus">
            {ergebnis.begruendung}
          </Callout>
        ) : ergebnis.art === 'zeitlimit' ? (
          <Callout tone="caution" title="Die Abfrage lief zu lange">
            {ergebnis.hinweis}
          </Callout>
        ) : (
          <Callout tone="info" title="Ausführen ist gerade nicht möglich">
            {ergebnis.hinweis}
          </Callout>
        )}
      </div>
    </div>
  );
}
