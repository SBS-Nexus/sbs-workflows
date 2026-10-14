import type { ReviewRating, ReviewResult, ReviewState } from './model';

const DAY_MS = 86_400_000;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

function addDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

function normalizedDays(value: number): number {
  return Math.max(1, Math.round(value));
}

export function initialReviewState(itemId: string, now = new Date()): ReviewState {
  return {
    itemId,
    dueAt: now.toISOString(),
    intervalDays: 0,
    ease: DEFAULT_EASE,
    repetitions: 0,
  };
}

export function isDue(state: ReviewState, now = new Date()): boolean {
  return Date.parse(state.dueAt) <= now.getTime();
}

export function scheduleReview(
  previous: ReviewState,
  rating: ReviewRating,
  now = new Date(),
): ReviewResult {
  if (!Number.isFinite(previous.ease) || previous.ease < MIN_EASE) {
    throw new TypeError('review ease must be finite and >= 1.3');
  }

  let ease = previous.ease;
  let repetitions = previous.repetitions;
  let intervalDays = previous.intervalDays;

  if (rating === 'again') {
    repetitions = 0;
    intervalDays = 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
  } else if (rating === 'hard') {
    repetitions = Math.max(1, repetitions + 1);
    intervalDays = normalizedDays(Math.max(1, intervalDays || 1) * 1.2);
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else if (rating === 'good') {
    repetitions += 1;
    intervalDays =
      repetitions === 1
        ? 1
        : repetitions === 2
          ? 3
          : normalizedDays(Math.max(1, intervalDays) * ease);
  } else {
    repetitions += 1;
    ease += 0.15;
    intervalDays =
      repetitions === 1
        ? 3
        : repetitions === 2
          ? 7
          : normalizedDays(Math.max(1, intervalDays) * ease * 1.3);
  }

  const dueAt = addDays(now, intervalDays);

  return {
    state: {
      ...previous,
      dueAt: dueAt.toISOString(),
      intervalDays,
      ease: Number(ease.toFixed(2)),
      repetitions,
      lastRating: rating,
    },
    nextDueLabel: intervalDays === 1 ? 'morgen' : `in ${intervalDays} Tagen`,
  };
}
