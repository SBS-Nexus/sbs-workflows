'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { onboardingAction, type OnboardingState } from '@/server/actions/onboarding-actions';
import { Button, Callout } from '@/components/ui/primitives';

const initial: OnboardingState = { ok: false };

/*
 * Vier Fragen, alle mit einer unverfänglichen Voreinstellung.
 *
 * Radiogruppen statt Auswahllisten: Wer alle Möglichkeiten nebeneinander
 * sieht, kann sich einordnen. Eine zugeklappte Liste zwingt dagegen zum
 * Suchen und legt die erste Zeile als „normal" nahe.
 */

const ERFAHRUNG = [
  ['NONE', 'Ich hatte mit Datenbanken noch nie zu tun.'],
  ['SPREADSHEETS_ONLY', 'Ich arbeite mit Tabellenkalkulationen, nicht mit SQL.'],
  ['READS_QUERIES', 'Ich kann fremde Abfragen lesen, aber keine eigenen schreiben.'],
  ['WRITES_SIMPLE_QUERIES', 'Einfache SELECT-Abfragen schreibe ich selbst.'],
  ['OTHER_SQL_DIALECT', 'Ich kenne SQL, aber aus einem anderen System.'],
] as const;

const ZIEL = [
  ['GENERAL', 'Einfach verstehen, wie das funktioniert'],
  ['REPORTING', 'Auswertungen und Berichte selbst erstellen'],
  ['DATA_ANALYSIS', 'Daten analysieren'],
  ['APPLICATION_DEVELOPMENT', 'Datenbanken in eigener Software nutzen'],
  ['DATABASE_ADMINISTRATION', 'Datenbanken betreuen'],
  ['CAREER_CHANGE', 'Beruflich umsteigen'],
] as const;

const TEMPO = [
  ['RELAXED', 'In Ruhe', 'Mehr Erklärung, kleinere Schritte.'],
  ['STEADY', 'Gleichmäßig', 'Der übliche Weg.'],
  ['FOCUSED', 'Zügig', 'Weniger Wiederholung, mehr eigene Aufgaben.'],
] as const;

function Absenden(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Einen Moment …' : 'Los geht’s'}
    </Button>
  );
}

function Gruppe({
  legende,
  hinweis,
  name,
  optionen,
  vorauswahl,
}: {
  legende: string;
  hinweis?: string;
  name: string;
  optionen: ReadonlyArray<readonly [string, string, string?]>;
  vorauswahl: string;
}): React.ReactElement {
  return (
    <fieldset className="karte-flaeche rounded-2xl border p-5 sm:p-6">
      <legend className="px-1 text-lg font-bold tracking-tight">{legende}</legend>
      {hinweis ? <p className="mt-1 text-sm text-[var(--text-muted)]">{hinweis}</p> : null}
      <div className="mt-4 space-y-2">
        {optionen.map(([wert, beschriftung, zusatz]) => (
          <label
            key={wert}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2 hover:bg-[var(--surface-sunken)] has-checked:border-[var(--accent)] has-checked:bg-[var(--accent-soft)]"
          >
            <input
              type="radio"
              name={name}
              value={wert}
              defaultChecked={wert === vorauswahl}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="font-medium">{beschriftung}</span>
              {zusatz ? (
                <span className="block text-sm text-[var(--text-muted)]">{zusatz}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function OnboardingForm(): React.ReactElement {
  const [state, formAction] = useActionState(onboardingAction, initial);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <Callout tone="alert" title="Da fehlt noch etwas" live>
          {state.error}
        </Callout>
      ) : null}

      <Gruppe
        legende="Wie viel SQL hattest du bisher?"
        hinweis="Selbstauskunft, kein Test. Es wird nichts gesperrt – die Reihenfolge richtet sich danach."
        name="experience"
        optionen={ERFAHRUNG}
        vorauswahl="NONE"
      />

      <Gruppe
        legende="Wofür brauchst du SQL?"
        hinweis="Danach richten sich die Beispiele. Eine Controllerin stellt andere Fragen an dieselbe Tabelle als eine Entwicklerin."
        name="learningGoal"
        optionen={ZIEL}
        vorauswahl="GENERAL"
      />

      <Gruppe legende="In welchem Tempo?" name="pace" optionen={TEMPO} vorauswahl="STEADY" />

      <fieldset className="karte-flaeche rounded-2xl border p-5 sm:p-6">
        <legend className="px-1 text-lg font-bold tracking-tight">
          Wie viel Zeit hast du am Tag?
        </legend>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Nur zur Planung der Portionen. Es gibt kein Tagesziel, das reißen kann, und keine
          Nachricht, wenn du einen Tag auslässt.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[10, 15, 20, 30, 45].map((minuten) => (
            <label
              key={minuten}
              /*
               * Der Radioknopf selbst ist `sr-only`, die Schaltfläche ist das
               * Etikett. Damit Tastaturbedienung sichtbar bleibt, muss der
               * Fokusring auf das Etikett wandern: Ohne diese Zeile wandert der
               * Fokus zwar korrekt weiter, man sieht aber nicht, wo er steht
               * (WCAG 2.4.7).
               */
              className="cursor-pointer rounded-xl border border-[var(--border)] px-4 py-2 font-medium hover:bg-[var(--surface-sunken)] has-checked:border-[var(--accent)] has-checked:bg-[var(--accent-soft)] has-checked:text-[var(--accent)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]"
            >
              <input
                type="radio"
                name="dailyTimeBudget"
                value={minuten}
                defaultChecked={minuten === 20}
                className="sr-only"
              />
              {minuten} Minuten
            </label>
          ))}
        </div>
      </fieldset>

      <Absenden />
    </form>
  );
}
