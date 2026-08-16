import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { istSqlRunnerVerfuegbar } from '@/server/env';
import { AbfrageWerkbank } from '@/components/editor/abfrage-werkbank';
import { SchemaExplorer } from '@/components/sql/schema-explorer';
import { HANDWERK } from '@/content/uebungsdaten/handwerk';
import { Callout } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Abfrage schreiben' };

const START_SQL = `-- Deine Übungsdatenbank: ein Handwerksbetrieb.
-- Fang klein an und sieh nach, was drinsteht:

SELECT Name, Stadt
FROM Kunden
ORDER BY Name;`;

/**
 * Die freie Werkbank.
 *
 * Hier gibt es keine Aufgabe und keine Bewertung – nur die Tabellen, einen
 * Editor und einen Ausführen-Knopf. Das ist Absicht: Zwischen zwei Lektionen
 * will man Dinge ausprobieren, die niemand gefragt hat, und dafür braucht es
 * einen Ort ohne richtig und falsch.
 *
 * Der Schema-Explorer steht daneben und nicht in einem Aufklapper. Wer die
 * Daten nicht kennt, rät beim Abfragen; ein Explorer, den man erst öffnen
 * muss, wird genau dann nicht geöffnet, wenn er gebraucht würde.
 */
export default async function AbfrageSeite(): Promise<React.ReactElement> {
  await requireUser();
  const ausfuehrbar = istSqlRunnerVerfuegbar();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">
          Abfrage schreiben
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-[var(--text-muted)]">
          Deine eigene Übungsdatenbank. Hier wird nichts bewertet – probier aus, was dich
          interessiert. Kaputt machen kannst du nichts, was sich nicht zurücksetzen ließe.
        </p>
      </div>

      {!ausfuehrbar ? (
        <Callout tone="caution" title="Ausführen ist auf dieser Installation abgeschaltet">
          Du kannst Abfragen schreiben und die Tabellen ansehen. Ausgeführt wird nichts, und es wird
          auch kein Ergebnis erfunden – warum, steht in{' '}
          <span className="font-mono text-sm">docs/SQL-RUNNER.md</span>.
        </Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <AbfrageWerkbank datensatz={HANDWERK} startSql={START_SQL} erlaubteKlassen={['SELECT']} />
        </div>

        <div className="min-w-0">
          <SchemaExplorer datensatz={HANDWERK} />
        </div>
      </div>
    </div>
  );
}
