import { readFileSync } from 'node:fs';
import { emptyStore, type VocabStore } from './model.ts';
import { addCard, createDeck, type CardInput } from './operations.ts';
import type { VocabBackend } from './storage.ts';

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

/**
 * Speicher im Arbeitsspeicher mit eingeschleusbaren Fehlern. `compareAndWrite`
 * ist atomar wie eine IndexedDB-`readwrite`-Transaktion: Prüfen und Schreiben
 * geschehen ohne Unterbrechung.
 */
export class MemoryBackend implements VocabBackend {
  raw: string | null = null;
  failNextWrite: Error | null = null;
  failRead = false;
  /** Simuliert einen Browser, der Schreibvorgänge stillschweigend verwirft. */
  swallowWrites = false;

  async read(): Promise<string | null> {
    if (this.failRead) throw new Error('SecurityError');
    return this.raw;
  }

  async compareAndWrite(isCurrent: (raw: string | null) => boolean, serialized: string): Promise<'written' | 'conflict'> {
    if (!isCurrent(this.raw)) return 'conflict';
    if (this.failNextWrite) {
      const error = this.failNextWrite;
      this.failNextWrite = null;
      throw error;
    }
    if (!this.swallowWrites) this.raw = serialized;
    return 'written';
  }

  async remove(): Promise<void> {
    this.raw = null;
  }
}

export function quotaError(): Error {
  const error = new Error('The quota has been exceeded.');
  error.name = 'QuotaExceededError';
  return error;
}
