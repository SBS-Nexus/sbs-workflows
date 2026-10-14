import { emptyStore, type VocabStore } from './model.ts';
import { validateStore } from './validate.ts';

/**
 * Speicherlogik für VokabelPfad — unabhängig von der konkreten Browser-API.
 *
 * Im Browser liegt der Zustand als EIN serialisierter Datensatz in einer
 * eigenen IndexedDB-Datenbank (`idb-backend.ts`). Begründung: Nur eine
 * IndexedDB-`readwrite`-Transaktion macht „Revision prüfen und schreiben"
 * über alle Tabs derselben Origin atomar. `localStorage` kann das nicht —
 * zwei Tabs könnten beide prüfen, bevor einer schreibt, und der spätere
 * Schreibvorgang würde den früheren still verwerfen.
 *
 * Garantien:
 * - Gelesen wird als `unknown` und vollständig geprüft (`validateStore`).
 * - Beschädigte Daten oder eine künftige Version werden NIE automatisch
 *   überschrieben; Zurücksetzen gibt es nur ausdrücklich
 *   (`resetVocabStorage`) und nur für diesen einen Datensatz.
 * - Jeder Schreibvorgang prüft atomar die Revision im Speicher
 *   (Konfliktsperre zwischen Tabs) und liest danach zurück, ob wirklich
 *   gespeichert wurde. Ein Fehlschlag (z. B. Speicher voll) wird als Fehler
 *   gemeldet, nie als Erfolg.
 */

/** Die Speicherschnittstelle, die der Adapter braucht (testbar ohne Browser). */
export type VocabBackend = {
  /** Gespeicherter Rohtext; `null` = noch nichts gespeichert. */
  read(): Promise<string | null>;
  /**
   * Atomar: liest den aktuellen Rohtext und schreibt `serialized` nur, wenn
   * `isCurrent(roh)` zutrifft. Kein anderer Schreibvorgang darf dazwischen
   * liegen — auch nicht aus einem anderen Tab.
   */
  compareAndWrite(isCurrent: (raw: string | null) => boolean, serialized: string): Promise<'written' | 'conflict'>;
  remove(): Promise<void>;
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

export function parseStoredVocab(raw: string | null): LoadOutcome {
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

export async function loadVocabStorage(backend: VocabBackend | null): Promise<LoadOutcome> {
  if (!backend) return { status: 'unavailable' };
  let raw: string | null;
  try {
    raw = await backend.read();
  } catch {
    return { status: 'unavailable' };
  }
  return parseStoredVocab(raw);
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

/** Revision eines gespeicherten Rohtexts; `0` = leer, `null` = nicht lesbar/gültig. */
export function storedRevision(raw: string | null): number | null {
  if (raw === null) return 0;
  try {
    const checked = validateStore(JSON.parse(raw));
    return checked.ok ? checked.store.revision : null;
  } catch {
    return null;
  }
}

export function isQuotaError(error: unknown): boolean {
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
export async function saveVocabStorage(
  backend: VocabBackend | null,
  next: VocabStore,
  basedOnRevision: number,
): Promise<SaveOutcome> {
  if (!backend) return { ok: false, reason: 'unavailable' };
  const candidate: VocabStore = { ...next, revision: basedOnRevision + 1 };
  const checked = validateStore(candidate);
  if (!checked.ok) return { ok: false, reason: 'invalid' };
  const serialized = JSON.stringify(checked.store);

  try {
    const written = await backend.compareAndWrite((raw) => storedRevision(raw) === basedOnRevision, serialized);
    if (written === 'conflict') return { ok: false, reason: 'conflict' };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unavailable' };
  }
  try {
    if ((await backend.read()) !== serialized) return { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  return { ok: true, store: checked.store };
}

/**
 * Entfernt ausschließlich den VokabelPfad-Datensatz dieses Browsers. Nur nach
 * ausdrücklicher Bestätigung aufrufen.
 */
export async function resetVocabStorage(backend: VocabBackend | null): Promise<boolean> {
  if (!backend) return false;
  try {
    await backend.remove();
    return (await backend.read()) === null;
  } catch {
    return false;
  }
}
