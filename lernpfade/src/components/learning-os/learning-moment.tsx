'use client';

import { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';

const responses = [
  { id: 'a', text: 'Zwei Tabellen zu einer neuen verbinden' },
  { id: 'b', text: 'Zusammengehörige Datensätze verknüpfen' },
  { id: 'c', text: 'Alle Zeilen einer Tabelle löschen' },
] as const;

type Choice = (typeof responses)[number]['id'];

/**
 * Isolierte Interaktionsstudie: arbeitet ausschließlich im React-State.
 * Keine echten Nutzerdaten, keine API, keine Lernstatistik oder Persistenz.
 */
export function LearningMoment(): React.ReactElement {
  const [choice, setChoice] = useState<Choice | null>(null);
  const correct = choice === 'b';

  return (
    <div className="los-lesson-surface" aria-label="Interaktives SQL-Lernbeispiel">
      <div className="los-lesson-heading">
        <span className="los-lesson-step"><i aria-hidden="true" /> SQL / MINI-LEKTION</span>
        <span>01 — 01</span>
      </div>
      <h3 className="los-lesson-question">Was passiert bei einem JOIN?</h3>
      <p className="los-lesson-context">Wähle die Antwort, die du für richtig hältst.</p>
      <div className="los-lesson-options" role="group" aria-label="Antwortmöglichkeiten">
        {responses.map((response) => (
          <button
            className="los-lesson-choice"
            key={response.id}
            type="button"
            aria-pressed={choice === response.id}
            disabled={choice !== null}
            onClick={() => setChoice(response.id)}
          >
            <span>{response.text}</span>
            <span aria-hidden="true">{String.fromCharCode(65 + responses.indexOf(response))}</span>
          </button>
        ))}
      </div>
      <div className="los-lesson-outcome" aria-live="polite" aria-atomic="true">
        {choice === null ? (
          <span>Deine Antwort macht aus Information ein Verständnis.</span>
        ) : (
          <>
            <strong>{correct ? 'Genau. Du hast es verstanden.' : 'Fast. Hier steckt der Unterschied.'}</strong>
            <div>Ein JOIN verknüpft passende Zeilen aus verschiedenen Tabellen anhand einer Bedingung.</div>
            <button type="button" className="los-lesson-try-again" onClick={() => setChoice(null)}>
              Noch einmal versuchen <RotateCcw size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
