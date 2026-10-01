'use client';

import { useEffect, useMemo, useState } from 'react';
import { REVIEW_ITEMS, type ReviewItem } from '@/lib/review-data';

type Rating = 'again' | 'unsure' | 'confident';

type ReviewState = {
  dueAt: number;
  intervalDays: number;
  successes: number;
  lastRating: Rating;
};

type ReviewStore = Record<string, ReviewState>;

const STORAGE_KEY = 'lernpfade-review-v1';
const SESSION_SIZE = 5;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function loadStore(): ReviewStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as ReviewStore;
  } catch {
    return {};
  }
}

function nextState(previous: ReviewState | undefined, rating: Rating): ReviewState {
  const now = Date.now();

  if (rating === 'again') {
    return {
      dueAt: now + 10 * MINUTE,
      intervalDays: 0,
      successes: previous?.successes ?? 0,
      lastRating: rating,
    };
  }

  if (rating === 'unsure') {
    const intervalDays = Math.max(1, Math.min(previous?.intervalDays ?? 1, 2));
    return {
      dueAt: now + intervalDays * DAY,
      intervalDays,
      successes: previous?.successes ?? 0,
      lastRating: rating,
    };
  }

  const prior = Math.max(previous?.intervalDays ?? 1, 1);
  const intervalDays = Math.min(Math.max(3, Math.round(prior * 2.2)), 60);
  return {
    dueAt: now + intervalDays * DAY,
    intervalDays,
    successes: (previous?.successes ?? 0) + 1,
    lastRating: rating,
  };
}

function domainClass(item: ReviewItem): string {
  return 'review-domain review-domain-' + item.domain;
}

export function ReviewSession(): React.ReactElement {
  const [store, setStore] = useState<ReviewStore>({});
  const [ready, setReady] = useState(false);
  const [sessionIds, setSessionIds] = useState<readonly string[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const loaded = loadStore();
    setStore(loaded);

    const now = Date.now();
    const due = REVIEW_ITEMS.filter((item) => !loaded[item.id] || loaded[item.id].dueAt <= now)
      .slice(0, SESSION_SIZE)
      .map((item) => item.id);

    setSessionIds(due);
    setReady(true);
  }, []);

  const itemById = useMemo(
    () => new Map(REVIEW_ITEMS.map((item) => [item.id, item] as const)),
    [],
  );

  const current = sessionIds[index] ? itemById.get(sessionIds[index]) : undefined;
  const dueCount = REVIEW_ITEMS.filter(
    (item) => !store[item.id] || store[item.id].dueAt <= Date.now(),
  ).length;
  const completed = Math.min(index, sessionIds.length);

  function rate(rating: Rating): void {
    if (!current) return;

    const next = {
      ...store,
      [current.id]: nextState(store[current.id], rating),
    };

    setStore(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setIndex((value) => value + 1);
    setRevealed(false);
  }

  function startFreshFive(): void {
    const now = Date.now();
    const due = REVIEW_ITEMS.filter((item) => !store[item.id] || store[item.id].dueAt <= now)
      .slice(0, SESSION_SIZE)
      .map((item) => item.id);

    setSessionIds(due);
    setIndex(0);
    setRevealed(false);
  }

  if (!ready) {
    return (
      <div className="review-card" aria-live="polite">
        <p className="review-muted">Wiederholungen werden vorbereitet …</p>
      </div>
    );
  }

  if (sessionIds.length === 0) {
    return (
      <div className="review-card review-complete">
        <span className="review-check" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Für heute erledigt</p>
        <h2>Aktuell ist nichts fällig.</h2>
        <p className="review-muted">
          Neue Karten werden automatisch wieder fällig. Unsichere Begriffe kommen früher zurück als
          sichere.
        </p>
        <button className="button button-secondary" type="button" onClick={startFreshFive}>
          Fälligkeit erneut prüfen
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="review-card review-complete">
        <span className="review-check" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Daily 5 abgeschlossen</p>
        <h2>{sessionIds.length} Begriffe aktiv abgerufen.</h2>
        <p className="review-muted">
          Dein Browser merkt sich die nächsten Fälligkeiten. Später wandert derselbe Mechanismus in
          das gemeinsame Lernkonto.
        </p>
        <div className="review-summary">
          <span>
            <strong>{sessionIds.length}</strong>
            heute
          </span>
          <span>
            <strong>{dueCount}</strong>
            aktuell fällig
          </span>
        </div>
        <a className="button button-primary" href="/">
          Zurück zu den Lernpfaden
        </a>
      </div>
    );
  }

  return (
    <section className="review-shell" aria-labelledby="review-question">
      <div
        className="review-progress"
        aria-label={'Karte ' + (index + 1) + ' von ' + sessionIds.length}
      >
        <div className="review-progress-copy">
          <span>Daily 5</span>
          <span>
            {completed}/{sessionIds.length}
          </span>
        </div>
        <div className="review-progress-track" aria-hidden="true">
          <span style={{ width: String((completed / sessionIds.length) * 100) + '%' }} />
        </div>
      </div>

      <article className="review-card">
        <div className="review-card-head">
          <span className={domainClass(current)}>{current.label}</span>
          <span className="review-muted">
            Karte {index + 1} von {sessionIds.length}
          </span>
        </div>

        <p className="review-kicker">Aktiv erinnern, dann aufdecken</p>
        <h2 id="review-question">{current.prompt}</h2>

        {revealed ? (
          <div className="review-answer" aria-live="polite">
            <span>Antwort</span>
            <p>{current.answer}</p>
            {current.example ? <code>{current.example}</code> : null}
          </div>
        ) : (
          <button
            className="button button-primary review-reveal"
            type="button"
            onClick={() => setRevealed(true)}
          >
            Antwort aufdecken
          </button>
        )}

        {revealed ? (
          <div className="review-ratings" aria-label="Wie sicher war deine Erinnerung?">
            <button type="button" className="rating rating-again" onClick={() => rate('again')}>
              <strong>Nochmal</strong>
              <span>in 10 Min.</span>
            </button>
            <button type="button" className="rating rating-unsure" onClick={() => rate('unsure')}>
              <strong>Unsicher</strong>
              <span>morgen</span>
            </button>
            <button
              type="button"
              className="rating rating-confident"
              onClick={() => rate('confident')}
            >
              <strong>Sicher</strong>
              <span>Intervall erhöhen</span>
            </button>
          </div>
        ) : null}
      </article>

      <p className="review-footnote">
        Diese erste Version speichert ausschließlich Fälligkeiten im Browser. Keine Übertragung,
        keine AI-Auswertung, kein Konto-Zwang.
      </p>
    </section>
  );
}
