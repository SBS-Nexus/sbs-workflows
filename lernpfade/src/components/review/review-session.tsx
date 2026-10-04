'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEMO_REVIEW_ITEMS } from '@/domain/review/deck';
import { initialReviewState, isDue, scheduleReview } from '@/domain/review/scheduler';
import type { ReviewDomain, ReviewRating, ReviewState } from '@/domain/review/model';

const STORAGE_KEY = 'lernpfade-review-state-v1';

const DOMAIN_LABELS: Record<ReviewDomain, string> = {
  language: 'Vokabeln',
  python: 'Python',
  sql: 'SQL',
  git: 'Git & GitHub',
  ai: 'AI',
};

function readStoredStates(): Record<string, ReviewState> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return parsed as Record<string, ReviewState>;
  } catch {
    return {};
  }
}

export function ReviewSession(): React.ReactElement {
  const [states, setStates] = useState<Record<string, ReviewState>>({});
  const [hydrated, setHydrated] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    setStates(readStoredStates());
    setHydrated(true);
  }, []);

  const queue = useMemo(() => {
    if (!hydrated) return [...DEMO_REVIEW_ITEMS];

    const now = new Date();
    const due = DEMO_REVIEW_ITEMS.filter((item) => {
      const state = states[item.id] ?? initialReviewState(item.id, now);
      return isDue(state, now);
    });

    return due.length > 0 ? due : [...DEMO_REVIEW_ITEMS];
  }, [hydrated, states]);

  const current = queue[index % queue.length];

  function rate(rating: ReviewRating): void {
    const now = new Date();
    const previous = states[current.id] ?? initialReviewState(current.id, now);
    const result = scheduleReview(previous, rating, now);
    const next = { ...states, [current.id]: result.state };

    setStates(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setLastMessage(`Nächste Wiederholung: ${result.nextDueLabel}`);
    setRevealed(false);
    setIndex((value) => (value + 1) % Math.max(queue.length, 1));
  }

  function resetDemo(): void {
    window.localStorage.removeItem(STORAGE_KEY);
    setStates({});
    setIndex(0);
    setRevealed(false);
    setLastMessage('Lokaler Demo-Fortschritt zurückgesetzt.');
  }

  return (
    <section className="review-shell demo-review" aria-labelledby="review-title">
      <div className="review-toolbar">
        <div>
          <p className="eyebrow">
            <span className="demo-badge">DEMO · Beispiel</span>
          </p>
          <h2 id="review-title">Beispiel-Deck</h2>
        </div>
        <button className="review-reset" type="button" onClick={resetDemo}>
          Demo zurücksetzen
        </button>
      </div>

      <p className="review-intro">
        Beispielkarten für Sprache und Technik. Deine Bewertungen hier ändern nur diese lokale
        Demo in deinem Browser — nicht PythonPfad, SQLPfad oder AIPfad. Es werden keine Lerndaten
        an einen Server gesendet.
      </p>

      <div className="review-card">
        <div className="review-card-meta">
          <span className={`review-domain domain-${current.domain}`}>
            DEMO · {DOMAIN_LABELS[current.domain]}
          </span>
          <span>
            Karte {(index % queue.length) + 1} / {queue.length}
          </span>
        </div>

        <p className="review-prompt">{current.prompt}</p>

        {revealed ? (
          <div className="review-answer" aria-live="polite">
            <strong>{current.answer}</strong>
            {current.example ? <p>{current.example}</p> : null}
          </div>
        ) : (
          <button
            className="button button-primary review-reveal"
            type="button"
            onClick={() => setRevealed(true)}
          >
            Antwort zeigen
          </button>
        )}

        {revealed ? (
          <div className="review-ratings" aria-label="Wie gut wusstest du die Antwort?">
            <button type="button" onClick={() => rate('again')}>
              Nochmal
            </button>
            <button type="button" onClick={() => rate('hard')}>
              Schwer
            </button>
            <button type="button" onClick={() => rate('good')}>
              Gut
            </button>
            <button type="button" onClick={() => rate('easy')}>
              Leicht
            </button>
          </div>
        ) : null}
      </div>

      <div className="review-status" aria-live="polite">
        {lastMessage ?? 'Bewerte nach dem Aufdecken ehrlich — nicht nach Gefühl vor dem Abruf.'}
      </div>

      <div className="review-domains" aria-label="Im Demo-Deck enthalten">
        {Object.entries(DOMAIN_LABELS).map(([domain, label]) => (
          <span key={domain}>{label}</span>
        ))}
      </div>
    </section>
  );
}
