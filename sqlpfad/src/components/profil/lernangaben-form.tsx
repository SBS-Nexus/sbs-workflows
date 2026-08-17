'use client';

import { useActionState } from 'react';
import { speichereLernangaben, type ProfilState } from '@/server/actions/profil-actions';
import { Button, Callout, inputClass } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';

/**
 * Die Angaben aus dem Einstieg – später änderbar.
 *
 * Sie waren bisher einmalig. Wer nach vier Wochen keine Anfängerin mehr ist,
 * stand im Profil trotzdem dauerhaft als solche. Der Text unter dem Knopf sagt
 * ausdrücklich, dass nichts zurückgesetzt wird: Sonst traut sich niemand, hier
 * ehrlich zu antworten – und dann ist die Angabe wertlos.
 */

const ERFAHRUNG: ReadonlyArray<readonly [string, string]> = [
  ['NONE', 'Noch nie mit Datenbanken gearbeitet'],
  ['SPREADSHEETS_ONLY', 'Tabellenkalkulation, kein SQL'],
  ['READS_QUERIES', 'Ich lese fremde Abfragen'],
  ['WRITES_SIMPLE_QUERIES', 'Ich schreibe einfache Abfragen'],
  ['OTHER_SQL_DIALECT', 'SQL aus einem anderen System'],
];

const ZIEL: ReadonlyArray<readonly [string, string]> = [
  ['GENERAL', 'Allgemein verstehen, wie Datenbanken arbeiten'],
  ['REPORTING', 'Auswertungen und Berichte selbst erstellen'],
  ['DATA_ANALYSIS', 'Daten analysieren'],
  ['APPLICATION_DEVELOPMENT', 'Anwendungen entwickeln'],
  ['DATABASE_ADMINISTRATION', 'Datenbanken betreuen'],
  ['CAREER_CHANGE', 'Beruflich umsteigen'],
];

const TEMPO: ReadonlyArray<readonly [string, string]> = [
  ['RELAXED', 'In Ruhe'],
  ['STEADY', 'Gleichmäßig'],
  ['FOCUSED', 'Zügig'],
];

export function LernangabenForm({
  experience,
  learningGoal,
  dailyTimeBudget,
  pace,
}: {
  experience: string;
  learningGoal: string;
  dailyTimeBudget: number;
  pace: string;
}): React.ReactElement {
  const [zustand, aktion, laeuft] = useActionState<ProfilState, FormData>(speichereLernangaben, {
    ok: false,
  });

  return (
    <form action={aktion} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="experience" className="block text-sm font-semibold">
            Vorkenntnisse
          </label>
          <select
            id="experience"
            name="experience"
            defaultValue={experience}
            className={`${inputClass} mt-1.5`}
          >
            {ERFAHRUNG.map(([wert, text]) => (
              <option key={wert} value={wert}>
                {text}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="learningGoal" className="block text-sm font-semibold">
            Wofür brauchst du SQL?
          </label>
          <select
            id="learningGoal"
            name="learningGoal"
            defaultValue={learningGoal}
            className={`${inputClass} mt-1.5`}
          >
            {ZIEL.map(([wert, text]) => (
              <option key={wert} value={wert}>
                {text}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dailyTimeBudget" className="block text-sm font-semibold">
            Geplante Zeit am Tag (Minuten)
          </label>
          <input
            id="dailyTimeBudget"
            name="dailyTimeBudget"
            type="number"
            min={5}
            max={180}
            step={5}
            defaultValue={dailyTimeBudget}
            className={`${inputClass} mt-1.5`}
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Eine Planung, kein Soll. Es gibt nichts zu verfehlen.
          </p>
        </div>

        <div>
          <label htmlFor="pace" className="block text-sm font-semibold">
            Tempo
          </label>
          <select id="pace" name="pace" defaultValue={pace} className={`${inputClass} mt-1.5`}>
            {TEMPO.map(([wert, text]) => (
              <option key={wert} value={wert}>
                {text}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={laeuft}>
          <Icon name="haken" size={18} />
          {laeuft ? 'Wird gespeichert …' : 'Angaben speichern'}
        </Button>
        <p className="text-sm text-[var(--text-muted)]">
          Ändern setzt nichts zurück – dein Fortschritt bleibt.
        </p>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {zustand.meldung ? (
          <Callout tone={zustand.ok ? 'success' : 'caution'}>{zustand.meldung}</Callout>
        ) : null}
      </div>
    </form>
  );
}
