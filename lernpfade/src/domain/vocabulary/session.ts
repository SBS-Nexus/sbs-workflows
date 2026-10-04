import type { ReviewRating, ReviewState } from '../review/model.ts';
import { initialReviewState, isDue, scheduleReview } from '../review/scheduler.ts';
import { localDayKey, reviewKey } from './fields.ts';
import {
  DIRECTIONS,
  LIMITS,
  fail,
  ok,
  type Direction,
  type Result,
  type VocabCard,
  type VocabStore,
} from './model.ts';

/**
 * Daily Review für VokabelPfad.
 *
 * Geplant wird ausschließlich mit dem gemeinsamen Review-Core
 * (`initialReviewState`, `isDue`, `scheduleReview`) — unverändert. Auch
 * „Nochmal" setzt die nächste Fälligkeit dort auf einen Tag; eine
 * Wiederholung innerhalb derselben Session gibt es deshalb nicht.
 *
 * Die Warteschlange wird beim Start EINMAL als feste Liste gebildet. Die
 * Session läuft mit einer Position über diese Liste — nie über eine Liste,
 * die beim Bewerten schrumpft. Dadurch wird keine Abfrage übersprungen und
 * jede genau einmal bewertet.
 */

export type ReviewTask = {
  key: string;
  deckId: string;
  cardId: string;
  direction: Direction;
  deckName: string;
  /** Wird vor dem Aufdecken gezeigt. */
  prompt: string;
  /** Erst nach aktivem Aufdecken sichtbar. */
  answer: string;
  /** Satzkontext und Tags können die Lösung verraten — ebenfalls erst nach dem Aufdecken. */
  context: string;
  tags: string[];
  /** Fälligkeit; bei neuen Abfragen der Zeitpunkt, an dem die Karte angelegt wurde. */
  dueAt: string;
  isNew: boolean;
};

export type QueueOptions = {
  /** `null` = alle Decks. */
  deckIds: ReadonlySet<string> | null;
  directions: readonly Direction[];
  now: Date;
  limit?: number;
};

function promptAndAnswer(card: VocabCard, direction: Direction): { prompt: string; answer: string } {
  // Decks sind heute immer Englisch → Deutsch: `term` ist Englisch, `translation` Deutsch.
  return direction === 'en-de'
    ? { prompt: card.term, answer: card.translation }
    : { prompt: card.translation, answer: card.term };
}

function stateIndex(store: VocabStore): Map<string, ReviewState> {
  return new Map(store.reviews.map((review) => [review.state.itemId, review.state]));
}

/** Alle neuen oder tatsächlich fälligen Abfragen, geordnet nach Fälligkeit, dann Schlüssel. */
export function dueTasks(store: VocabStore, options: Omit<QueueOptions, 'limit'>): ReviewTask[] {
  const states = stateIndex(store);
  const deckNames = new Map(store.decks.map((deck) => [deck.id, deck.name]));
  const wanted = DIRECTIONS.filter((direction) => options.directions.includes(direction));
  const tasks: ReviewTask[] = [];

  for (const card of store.cards) {
    if (options.deckIds && !options.deckIds.has(card.deckId)) continue;
    const deckName = deckNames.get(card.deckId);
    if (deckName === undefined) continue;
    for (const direction of wanted) {
      const key = reviewKey(card.deckId, card.id, direction);
      const state = states.get(key);
      if (state && !isDue(state, options.now)) continue;
      tasks.push({
        key,
        deckId: card.deckId,
        cardId: card.id,
        direction,
        deckName,
        ...promptAndAnswer(card, direction),
        context: card.context,
        tags: card.tags.slice(),
        dueAt: state ? state.dueAt : card.createdAt,
        isNew: !state,
      });
    }
  }

  return tasks.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || compareKeys(a.key, b.key));
}

function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function buildQueue(store: VocabStore, options: QueueOptions): ReviewTask[] {
  const limit = options.limit ?? LIMITS.sessionSize;
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  return dueTasks(store, options).slice(0, limit);
}

/** Nächste künftige Fälligkeit der gewählten Decks/Richtungen (für „nichts fällig"). */
export function nextDueAt(store: VocabStore, options: Omit<QueueOptions, 'limit'>): string | null {
  let next: number | null = null;
  for (const review of store.reviews) {
    if (options.deckIds && !options.deckIds.has(review.deckId)) continue;
    if (!options.directions.includes(review.direction)) continue;
    const due = Date.parse(review.state.dueAt);
    if (due > options.now.getTime() && (next === null || due < next)) next = due;
  }
  return next === null ? null : new Date(next).toISOString();
}

export type SessionResult = { key: string; rating: ReviewRating; nextDueAt: string; nextDueLabel: string };

export type Session = {
  tasks: readonly ReviewTask[];
  position: number;
  revealed: boolean;
  results: readonly SessionResult[];
};

export function startSession(tasks: readonly ReviewTask[]): Session {
  return { tasks: tasks.slice(), position: 0, revealed: false, results: [] };
}

export function currentTask(session: Session): ReviewTask | null {
  return session.tasks[session.position] ?? null;
}

export function isFinished(session: Session): boolean {
  return session.position >= session.tasks.length;
}

export function reveal(session: Session): Session {
  if (isFinished(session) || session.revealed) return session;
  return { ...session, revealed: true };
}

/**
 * Hält eine Bewertung in der Session fest und rückt genau eine Position vor.
 * Ohne vorheriges Aufdecken, für eine andere als die aktuelle Abfrage oder
 * für eine bereits bewertete Abfrage passiert nichts — ein Doppelklick
 * plant und zählt also nie doppelt.
 */
export function recordResult(session: Session, result: SessionResult): Session {
  const task = currentTask(session);
  if (!task || !session.revealed || task.key !== result.key) return session;
  if (session.results.some((entry) => entry.key === result.key)) return session;
  return {
    ...session,
    position: session.position + 1,
    revealed: false,
    results: [...session.results, result],
  };
}

export type RatingOutcome = { store: VocabStore; result: SessionResult };

/**
 * Wendet eine Bewertung auf den gespeicherten Zustand an: Scheduling über den
 * gemeinsamen Review-Core und Zähler für „heute bewertet" (lokaler Tag).
 * Gibt es die Karte nicht mehr, wird abgelehnt statt einen verwaisten
 * Eintrag anzulegen.
 */
export function applyRating(
  store: VocabStore,
  task: Pick<ReviewTask, 'key' | 'deckId' | 'cardId' | 'direction'>,
  rating: ReviewRating,
  now: Date,
  timeZone?: string,
): Result<RatingOutcome> {
  const card = store.cards.find((entry) => entry.id === task.cardId && entry.deckId === task.deckId);
  if (!card) {
    return fail({ code: 'not_found', message: 'Diese Karte gibt es nicht mehr – sie wurde inzwischen gelöscht.' });
  }
  const key = reviewKey(task.deckId, task.cardId, task.direction);
  if (key !== task.key) throw new TypeError('task key does not match its parts');

  const index = store.reviews.findIndex((review) => review.state.itemId === key);
  const previous = index >= 0 ? store.reviews[index].state : initialReviewState(key, now);
  const scheduled = scheduleReview(previous, rating, now);

  const reviews = store.reviews.slice();
  const record = { deckId: task.deckId, cardId: task.cardId, direction: task.direction, state: scheduled.state };
  if (index >= 0) reviews[index] = record;
  else reviews.push(record);

  const day = localDayKey(now, timeZone);
  const ratings = store.activity?.day === day ? store.activity.ratings.slice() : [];
  const counted = ratings.findIndex((entry) => entry.key === key);
  if (counted >= 0) {
    ratings[counted] = { key, count: Math.min(LIMITS.ratingsPerDay, ratings[counted].count + 1) };
  } else {
    ratings.push({ key, count: 1 });
  }

  return ok({
    store: { ...store, reviews, activity: { day, ratings } },
    result: { key, rating, nextDueAt: scheduled.state.dueAt, nextDueLabel: scheduled.nextDueLabel },
  });
}

export type VocabStats = {
  decks: number;
  /** Vokabeleinträge. */
  cards: number;
  /** Abfragen = Karten × 2 Richtungen. */
  queries: number;
  /** Neue oder fällige Abfragen je Richtung. */
  dueByDirection: Record<Direction, number>;
  /** Abgegebene Bewertungen am heutigen lokalen Kalendertag. */
  ratedToday: number;
  nextDueAt: string | null;
};

export function vocabStats(store: VocabStore, now: Date, timeZone?: string): VocabStats {
  const all = { deckIds: null, directions: DIRECTIONS, now } as const;
  const due = dueTasks(store, all);
  const today = localDayKey(now, timeZone);
  return {
    decks: store.decks.length,
    cards: store.cards.length,
    queries: store.cards.length * DIRECTIONS.length,
    dueByDirection: {
      'en-de': due.filter((task) => task.direction === 'en-de').length,
      'de-en': due.filter((task) => task.direction === 'de-en').length,
    },
    ratedToday:
      store.activity?.day === today ? store.activity.ratings.reduce((sum, entry) => sum + entry.count, 0) : 0,
    nextDueAt: nextDueAt(store, all),
  };
}

export type DeckStats = { cards: number; due: number };

export function deckStats(store: VocabStore, deckId: string, now: Date): DeckStats {
  return {
    cards: store.cards.filter((card) => card.deckId === deckId).length,
    due: dueTasks(store, { deckIds: new Set([deckId]), directions: DIRECTIONS, now }).length,
  };
}
