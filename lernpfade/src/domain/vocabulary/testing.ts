import { readFileSync } from 'node:fs';
import { emptyStore, type VocabStore } from './model.ts';
import { addCard, createDeck, type CardInput } from './operations.ts';
import type { StorageLike } from './storage.ts';

/** Nur für Tests: kleine Bausteine, damit jeder Test seinen Zustand explizit aufbaut. */

export const NOW = new Date('2026-10-04T10:00:00.000Z');
export const DAY = 86_400_000;

export function must<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`unexpected failure: ${JSON.stringify(result.error)}`);
  return result.value;
}

export function card(term: string, translation: string, extra: Partial<CardInput> = {}): CardInput {
  return { term, translation, context: '', tags: [], ...extra };
}

/** Ein Deck mit den angegebenen Karten; IDs sind vorhersagbar (`<deck>-c<i>`). */
export function withDeck(
  store: VocabStore,
  deckId: string,
  cards: readonly CardInput[],
  now: Date = NOW,
  name = `Deck ${deckId}`,
): VocabStore {
  let next = must(createDeck(store, { name, description: '' }, deckId, now));
  cards.forEach((input, index) => {
    next = must(addCard(next, deckId, input, `${deckId}-c${index + 1}`, new Date(now.getTime() + index)));
  });
  return next;
}

export function sampleStore(): VocabStore {
  return withDeck(emptyStore(), 'deck-a', [card('house', 'Haus'), card('tree', 'Baum'), card('river', 'Fluss')]);
}

export function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

/** Speicher im Arbeitsspeicher mit optional eingeschleusten Fehlern. */
export class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  failNextSet: Error | null = null;
  failGet = false;

  getItem(key: string): string | null {
    if (this.failGet) throw new Error('SecurityError');
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    if (this.failNextSet) {
      const error = this.failNextSet;
      this.failNextSet = null;
      throw error;
    }
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

export function quotaError(): Error {
  const error = new Error('The quota has been exceeded.');
  error.name = 'QuotaExceededError';
  return error;
}
