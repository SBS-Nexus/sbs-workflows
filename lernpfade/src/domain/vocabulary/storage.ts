import { VOCAB_STORAGE_KEY, emptyStore, type VocabStore } from './model.ts';
import { validateStore } from './validate.ts';

/**
 * Browser-Speicheradapter für VokabelPfad.
 *
 * Technik: `localStorage` unter genau einem eigenen, versionierten Schlüssel
 * (`lernpfade-vokabeln-v1`). Begründung: Die Datenmenge ist klein und hart
 * begrenzt (≤ 50 Decks, ≤ 1.000 Karten), Lesen und Schreiben sind synchron
 * und damit ohne Zwischenzustände prüfbar, und das `storage`-Ereignis meldet
 * Änderungen aus anderen Tabs. IndexedDB brächte Asynchronität und
 * Transaktionsverwaltung ohne Nutzen für diese Größenordnung.
 *
 * Garantien:
 * - Gelesen wird als `unknown` und vollständig geprüft (`validateStore`).
 * - Beschädigte Daten oder eine künftige Version werden NIE automatisch
 *   überschrieben; Zurücksetzen gibt es nur ausdrücklich (`resetVocabStorage`)
 *   und nur für diesen einen Schlüssel — kein `localStorage.clear()`.
 * - Jeder Schreibvorgang prüft vorher die Revision im Speicher
 *   (Konfliktsperre zwischen Tabs) und hinterher durch Zurücklesen, dass
 *   wirklich gespeichert wurde. Ein Fehlschlag (z. B. Speicher voll) wird als
 *   Fehler gemeldet, nie als Erfolg.
 */

/** Ausschnitt der Web-Storage-API, den der Adapter braucht (testbar ohne Browser). */
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type LoadOutcome =
  /** Noch nichts gespeichert: leerer Anfangszustand, noch nicht geschrieben. */
  | { status: 'empty'; store: VocabStore }
  | { status: 'ok'; store: VocabStore }
  /** Gespeicherte Daten sind beschädigt oder ungültig — unverändert gelassen. */
  | { status: 'corrupt'; raw: string; detail: string }
  /** Daten einer neueren VokabelPfad-Version — unverändert gelassen. */
  | { status: 'future'; raw: string; version: number }
  /** Der Browser verweigert den Zugriff (z. B. Speicher deaktiviert). */
  | { status: 'unavailable' };

export function loadVocabStorage(storage: StorageLike | null): LoadOutcome {
  if (!storage) return { status: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(VOCAB_STORAGE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty', store: emptyStore() };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', raw, detail: 'kein gültiges JSON' };
  }
  const checked = validateStore(parsed);
  if (checked.ok) return { status: 'ok', store: checked.store };
  if (checked.reason === 'future_version') return { status: 'future', raw, version: checked.version };
  return { status: 'corrupt', raw, detail: checked.detail };
}

export type SaveFailure =
  /** In einem anderen Tab wurde inzwischen gespeichert. Nichts geschrieben. */
  | 'conflict'
  /** Speicher voll. Nichts geschrieben; vorhandene Daten unverändert. */
  | 'quota'
  /** Zugriff verweigert oder Zurücklesen ergab nicht das Geschriebene. */
  | 'unavailable'
  /** Der neue Zustand ist ungültig (Programmfehler) — wird nicht gespeichert. */
  | 'invalid';

export type SaveOutcome = { ok: true; store: VocabStore } | { ok: false; reason: SaveFailure };

/** Revision des gespeicherten Zustands; `null` = nicht lesbar/gültig. */
function storedRevision(raw: string | null): number | null {
  if (raw === null) return 0;
  try {
    const checked = validateStore(JSON.parse(raw));
    return checked.ok ? checked.store.revision : null;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const named = error as { name?: unknown; code?: unknown };
  return (
    named.name === 'QuotaExceededError' ||
    named.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    named.code === 22 ||
    named.code === 1014
  );
}

/**
 * Speichert `next`, sofern im Speicher noch die Revision liegt, auf der die
 * Änderung beruht (`basedOnRevision`). Erfolgreich gespeichert wird mit
 * Revision + 1.
 */
export function saveVocabStorage(
  storage: StorageLike | null,
  next: VocabStore,
  basedOnRevision: number,
): SaveOutcome {
  if (!storage) return { ok: false, reason: 'unavailable' };
  const candidate: VocabStore = { ...next, revision: basedOnRevision + 1 };
  const checked = validateStore(candidate);
  if (!checked.ok) return { ok: false, reason: 'invalid' };

  let current: string | null;
  try {
    current = storage.getItem(VOCAB_STORAGE_KEY);
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  if (storedRevision(current) !== basedOnRevision) return { ok: false, reason: 'conflict' };

  const serialized = JSON.stringify(checked.store);
  try {
    storage.setItem(VOCAB_STORAGE_KEY, serialized);
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unavailable' };
  }
  try {
    if (storage.getItem(VOCAB_STORAGE_KEY) !== serialized) return { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  return { ok: true, store: checked.store };
}

/**
 * Entfernt ausschließlich die VokabelPfad-Daten dieses Browsers. Nur nach
 * ausdrücklicher Bestätigung aufrufen.
 */
export function resetVocabStorage(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(VOCAB_STORAGE_KEY);
    return storage.getItem(VOCAB_STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

/** Revision aus einem `storage`-Ereignis eines anderen Tabs (`null` = gelöscht/ungültig). */
export function revisionOf(raw: string | null): number | null {
  return raw === null ? null : storedRevision(raw);
}

/** Zugriff auf `window.localStorage`, der in gesperrten Kontexten nicht wirft. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
