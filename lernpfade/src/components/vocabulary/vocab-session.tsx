'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReviewRating } from '@/domain/review/model';
import { DIRECTION_LABELS, LIMITS, type VocabStore } from '@/domain/vocabulary/model';
import {
  applyRating,
  buildQueue,
  currentTask,
  isFinished,
  recordResult,
  reveal,
  sessionFollowUp,
  startSession,
  type ReviewTask,
  type Session,
  type SessionSelection,
} from '@/domain/vocabulary/session';
import { formatDateTime, plural } from './format';
import type { VocabActions } from './vocab-app';

const RATINGS: { rating: ReviewRating; label: string; hint: string }[] = [
  { rating: 'again', label: 'Nochmal', hint: 'nicht gewusst – morgen wieder' },
  { rating: 'hard', label: 'Schwer', hint: 'mit Mühe' },
  { rating: 'good', label: 'Gut', hint: 'gewusst' },
  { rating: 'easy', label: 'Leicht', hint: 'sofort gewusst' },
];

function languageOf(task: ReviewTask, side: 'prompt' | 'answer'): 'en' | 'de' {
  const [from, to] = task.direction.split('-') as ['en' | 'de', 'en' | 'de'];
  return side === 'prompt' ? from : to;
}

/**
 * Eine Session über eine beim Start festgelegte Liste von Abfragen. Die Liste
 * schrumpft nicht beim Bewerten; die Position rückt je Bewertung genau um
 * eins vor. Ein Ref-Wächter verhindert, dass ein schneller Doppelklick
 * zweimal plant oder zählt, solange das Speichern noch läuft.
 */
export function VocabSession({
  store,
  tasks,
  selection,
  actions,
}: {
  store: VocabStore;
  tasks: ReviewTask[];
  selection: SessionSelection;
  actions: VocabActions;
}): React.ReactElement {
  const [session, setSession] = useState<Session>(() => startSession(tasks));
  const sessionRef = useRef(session);
  const storeRef = useRef(store);
  storeRef.current = store;
  const busy = useRef(false);
  const revealRef = useRef<HTMLButtonElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const task = currentTask(session);
  const finished = isFinished(session);

  function update(next: Session): void {
    sessionRef.current = next;
    setSession(next);
  }

  useEffect(() => {
    if (finished) doneRef.current?.focus();
    else if (session.revealed) answerRef.current?.focus();
    else revealRef.current?.focus();
  }, [finished, session.revealed, session.position]);

  function onReveal(): void {
    update(reveal(sessionRef.current));
  }

  async function onRate(rating: ReviewRating): Promise<void> {
    if (busy.current) return;
    const current = sessionRef.current;
    const active = currentTask(current);
    if (!active || !current.revealed) return;
    busy.current = true;
    try {
      const outcome = applyRating(storeRef.current, active, rating, new Date(), actions.timeZone);
      if (!outcome.ok) {
        actions.notify({ tone: 'error', text: outcome.error.message });
        return;
      }
      // Erst wenn wirklich gespeichert wurde, rückt die Session vor.
      if (!(await actions.commit(outcome.value.store, ''))) return;
      // Den gespeicherten Stand (mit neuer Revision) liefert der nächste Render über `store`.
      update(recordResult(current, outcome.value.result));
    } finally {
      busy.current = false;
    }
  }

  if (finished) {
    const followUp = sessionFollowUp(store, selection, actions.now);
    return (
      <section className="vocab-panel vocab-session-done" aria-labelledby="session-done-title">
        <p className="eyebrow">Daily Review</p>
        <h1 id="session-done-title" ref={doneRef} tabIndex={-1}>
          Session abgeschlossen
        </h1>
        <p>
          {session.results.length === tasks.length
            ? `Alle ${plural(tasks.length, 'Abfrage', 'Abfragen')} dieser Session bewertet und gespeichert.`
            : `${plural(session.results.length, 'Abfrage', 'Abfragen')} bewertet und gespeichert.`}
        </p>
        {followUp.remainingDue > 0 ? (
          <p className="vocab-followup">
            {followUp.remainingDue === 1
              ? 'Für deine Auswahl ist noch 1 Abfrage fällig.'
              : `Für deine Auswahl sind noch ${followUp.remainingDue} Abfragen fällig.`}{' '}
            Eine Session umfasst höchstens {LIMITS.sessionSize} Abfragen.
          </p>
        ) : (
          <p>
            {followUp.nextDueAt
              ? `Nichts mehr fällig. Nächste Fälligkeit: ${formatDateTime(followUp.nextDueAt)}.`
              : 'Nichts mehr fällig und keine weiteren Fälligkeiten geplant.'}
          </p>
        )}
        <div className="vocab-actions">
          {followUp.remainingDue > 0 ? (
            <button
              className="button button-primary"
              type="button"
              disabled={actions.locked}
              onClick={() => {
                const next = buildQueue(store, { ...selection, now: new Date() });
                if (next.length > 0) actions.startSession(next, selection);
                else actions.openOverview();
              }}
            >
              Nächste Session starten
            </button>
          ) : null}
          <button
            className={followUp.remainingDue > 0 ? 'button button-secondary' : 'button button-primary'}
            type="button"
            onClick={() => actions.openOverview()}
          >
            Zur Übersicht
          </button>
        </div>
      </section>
    );
  }

  if (!task) return <></>;
  const last = session.results[session.results.length - 1];

  return (
    <section className="vocab-panel vocab-session" aria-labelledby="session-title">
      <div className="vocab-panel-head">
        <div>
          <p className="eyebrow">Daily Review · {task.deckName}</p>
          <h1 id="session-title">
            Abfrage {session.position + 1} von {session.tasks.length}
          </h1>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() =>
            actions.openOverview({
              tone: 'success',
              text: `Session beendet. ${plural(session.results.length, 'Bewertung', 'Bewertungen')} gespeichert.`,
            })
          }
        >
          Session beenden
        </button>
      </div>

      <progress
        className="vocab-progress"
        max={session.tasks.length}
        value={session.position}
        aria-label={`${session.position} von ${session.tasks.length} Abfragen bewertet`}
      />

      <div className="review-card vocab-review-card">
        <div className="review-card-meta">
          <span className="review-domain domain-language">EIGENES DECK · {DIRECTION_LABELS[task.direction]}</span>
          <span>{task.isNew ? 'neu' : 'fällig'}</span>
        </div>
        <p className="review-prompt" lang={languageOf(task, 'prompt')}>
          {task.prompt}
        </p>

        {session.revealed ? (
          <div className="review-answer" ref={answerRef} tabIndex={-1} aria-label="Antwort">
            <strong lang={languageOf(task, 'answer')}>{task.answer}</strong>
            {task.context ? <p lang="en">{task.context}</p> : null}
            {task.tags.length > 0 ? (
              <ul className="vocab-tags" aria-label="Tags">
                {task.tags.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <button ref={revealRef} className="button button-primary review-reveal" type="button" onClick={onReveal}>
            Antwort zeigen
          </button>
        )}

        {session.revealed ? (
          <div className="review-ratings" role="group" aria-label="Wie gut wusstest du die Antwort?">
            {RATINGS.map((entry) => (
              <button
                key={entry.rating}
                type="button"
                onClick={() => void onRate(entry.rating)}
                // Nicht während des Speicherns deaktivieren: Der Fokus bliebe sonst bei einem
                // Fehler auf einem deaktivierten Knopf hängen. Doppelte Bewertungen hält `busy` ab.
                disabled={actions.locked}
              >
                {entry.label}
                <small>{entry.hint}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="review-status" aria-live="polite">
        {last
          ? `Gespeichert. Nächste Wiederholung der letzten Abfrage: ${last.nextDueLabel}.`
          : 'Erst erinnern, dann aufdecken und ehrlich bewerten.'}
      </p>
    </section>
  );
}
