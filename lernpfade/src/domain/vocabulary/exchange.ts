import { checkTags, checkText, hasOnlyKeys, isIsoTimestamp, isValidId } from './fields.ts';
import {
  LIMITS,
  emptyStore,
  fail,
  ok,
  type DeckOrigin,
  type Result,
  type VocabCard,
  type VocabDeck,
  type VocabError,
  type VocabStore,
} from './model.ts';

/**
 * JSON-Import und -Export von Decks (Format `lernpfade-vokabeln`, Schema 1).
 *
 * Der Export enthält Inhalte und Herkunft — **keinen Lernfortschritt**. Das
 * steht maschinenlesbar (`progressIncluded: false`) und als Klartext
 * (`hinweis`) in jeder Datei.
 *
 * Der Import ist zweistufig: `previewImport` prüft vollständig und liefert
 * eine Vorschau, `applyImport` übernimmt erst nach Bestätigung — atomar:
 * entweder alle Decks und Karten der Datei oder nichts.
 *
 * Roundtrip-Garantie: Jede Exportdatei ist so groß, wie sie tatsächlich
 * heruntergeladen wird (`serializeExport`, kompakt), und wird nur erzeugt,
 * wenn sie die Importgrenze einhält (`prepareExport`). Damit das für jedes
 * einzelne Deck immer möglich ist, darf kein Deck größer werden, als eine
 * Exportdatei sein darf (`checkDeckExportSize`).
 */

export const EXCHANGE_FORMAT = 'lernpfade-vokabeln';
export const EXCHANGE_SCHEMA_VERSION = 1;
export const EXPORT_NOTICE =
  'Enthält nur Decks und Karten, keinen Lernfortschritt. Wiederholungsstände bleiben in dem Browser, in dem sie entstanden sind.';

export type ExchangeOrigin = { kind: 'self' | 'starter' | 'import'; label: string };

export type ExchangeCard = {
  id: string;
  term: string;
  translation: string;
  context?: string;
  tags: string[];
};

export type ExchangeDeck = {
  id: string;
  name: string;
  description?: string;
  sourceLanguage: 'en';
  targetLanguage: 'de';
  origin: ExchangeOrigin;
  cards: ExchangeCard[];
};

export type ExchangeFile = {
  format: typeof EXCHANGE_FORMAT;
  schemaVersion: typeof EXCHANGE_SCHEMA_VERSION;
  exportedAt: string;
  progressIncluded: false;
  hinweis: string;
  decks: ExchangeDeck[];
};

export const SELF_ORIGIN_LABEL = 'Selbst erstellt';

function exchangeOrigin(origin: DeckOrigin): ExchangeOrigin {
  return origin.kind === 'self' ? { kind: 'self', label: SELF_ORIGIN_LABEL } : { kind: origin.kind, label: origin.label };
}

function exchangeCard(card: VocabCard): ExchangeCard {
  return {
    id: card.id,
    term: card.term,
    translation: card.translation,
    ...(card.context ? { context: card.context } : {}),
    tags: card.tags.slice(),
  };
}

/** Exportiert die angegebenen Decks (oder alle). Enthält keinen Lernfortschritt. */
export function exportDecks(store: VocabStore, deckIds: readonly string[] | null, now: Date): ExchangeFile {
  const wanted = deckIds ? new Set(deckIds) : null;
  return {
    format: EXCHANGE_FORMAT,
    schemaVersion: EXCHANGE_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    progressIncluded: false,
    hinweis: EXPORT_NOTICE,
    decks: store.decks
      .filter((deck) => !wanted || wanted.has(deck.id))
      .map((deck) => ({
        id: deck.id,
        name: deck.name,
        ...(deck.description ? { description: deck.description } : {}),
        sourceLanguage: deck.sourceLanguage,
        targetLanguage: deck.targetLanguage,
        origin: exchangeOrigin(deck.origin),
        cards: store.cards.filter((card) => card.deckId === deck.id).map(exchangeCard),
      })),
  };
}

/**
 * Genau der Text, der als Datei heruntergeladen wird: kompaktes JSON plus
 * Zeilenende. Eingerücktes JSON wäre bis zu ~10 % größer und könnte die
 * Importgrenze überschreiten, obwohl der Inhalt hineinpasst.
 */
export function serializeExport(file: ExchangeFile): string {
  return `${JSON.stringify(file)}\n`;
}

export type PreparedExport = {
  fileName: string;
  text: string;
  /** UTF-8-Bytes von `text` — die Größe der heruntergeladenen Datei. */
  bytes: number;
  deckCount: number;
  cardCount: number;
};

export type ExportRefusal = {
  /**
   * `too_large`: Die Datei selbst läge über der Importgrenze.
   * `roundtrip`: Die Datei passt, aber mindestens ein Deck wäre nach dem
   * Import (Herkunft wird dort zu „import") als Export zu groß — der Import
   * würde es deshalb ablehnen. Nur bei Grenzbeständen möglich.
   */
  reason: 'too_large' | 'roundtrip';
  /** Größe der Datei, die entstanden wäre. */
  bytes: number;
  /** Decks, deren Roundtrip-Größe (`deckRoundtripBytes`) über der Grenze liegt. */
  oversizedDecks: { id: string; name: string; bytes: number }[];
};

/**
 * Gemeinsamer Exportweg für ein Deck und für alle Decks. Liefert die Datei
 * nur, wenn ihr Import in einem leeren VokabelPfad gelingt: Die Datei hält
 * die Importgrenze ein UND jedes Deck darin bleibt auch in der Form, die der
 * Import speichert, als Export innerhalb der Grenze (`deckRoundtripBytes`).
 * Sonst eine Begründung — nie eine gekürzte oder umgeschriebene Datei.
 */
export function prepareExport(
  store: VocabStore,
  deckIds: readonly string[] | null,
  now: Date,
): Result<PreparedExport, ExportRefusal> {
  const file = exportDecks(store, deckIds, now);
  const text = serializeExport(file);
  const bytes = utf8Bytes(text);
  const oversizedDecks = file.decks
    .map((deck) => ({ id: deck.id, name: deck.name, bytes: deckRoundtripBytes(store, deck.id) }))
    .filter((deck) => deck.bytes > LIMITS.importBytes);
  if (bytes > LIMITS.importBytes || oversizedDecks.length > 0) {
    return fail({ reason: bytes > LIMITS.importBytes ? 'too_large' : 'roundtrip', bytes, oversizedDecks });
  }
  return ok({
    fileName: exportFileName(file),
    text,
    bytes,
    deckCount: file.decks.length,
    cardCount: file.decks.reduce((sum, deck) => sum + deck.cards.length, 0),
  });
}

/** Karten sind unveränderliche Objekte; ihre serialisierte Größe wird einmal berechnet. */
const cardBytes = new WeakMap<VocabCard, number>();

function cardExportBytes(card: VocabCard): number {
  let bytes = cardBytes.get(card);
  if (bytes === undefined) {
    bytes = utf8Bytes(JSON.stringify(exchangeCard(card)));
    cardBytes.set(card, bytes);
  }
  return bytes;
}

/**
 * Exakte Größe der Exportdatei, die dieses eine Deck ergäbe — ohne das ganze
 * Deck zu serialisieren. Kompaktes JSON setzt sich lückenlos zusammen:
 * Datei mit leerer Kartenliste + jede Karte + ein Komma zwischen zwei Karten.
 * `exportedAt` hat stets dieselbe Länge; der Zeitpunkt spielt keine Rolle.
 */
export function deckExportBytes(store: VocabStore, deckId: string): number {
  const deck = store.decks.find((entry) => entry.id === deckId);
  return deck ? exportBytesOf(store, deck) : 0;
}

function exportBytesOf(store: VocabStore, deck: VocabDeck): number {
  let bytes = utf8Bytes(serializeExport(exportDecks({ ...store, decks: [deck], cards: [] }, null, new Date(0))));
  let count = 0;
  for (const card of store.cards) {
    if (card.deckId !== deck.id) continue;
    bytes += cardExportBytes(card);
    count += 1;
  }
  return count > 1 ? bytes + count - 1 : bytes;
}

/**
 * Das Deck so, wie der Import es speichert: Jede Herkunft wird zu „import"
 * mit der Bezeichnung aus der Datei (`importedOrigin`). Alles andere bleibt
 * gleich — Texte und Tags sind im Bestand schon normalisiert.
 */
function asImported(deck: VocabDeck): VocabDeck {
  return { ...deck, origin: { kind: 'import', label: exchangeOrigin(deck.origin).label } };
}

/**
 * Größe, die für die Roundtrip-Garantie zählt: die Exportdatei dieses Decks
 * heute UND die Exportdatei desselben Decks nach einem Import. Der Import
 * ändert die Herkunft (z. B. `"self"` → `"import"`, +2 Bytes); ohne diesen
 * Anteil könnte ein Export genau an der Grenze gelingen und der eigene
 * Import ihn dann ablehnen.
 */
export function deckRoundtripBytes(store: VocabStore, deckId: string): number {
  const deck = store.decks.find((entry) => entry.id === deckId);
  if (!deck) return 0;
  return Math.max(exportBytesOf(store, deck), exportBytesOf(store, asImported(deck)));
}

/**
 * Hält die Invariante „jedes Deck bleibt als einzelne Datei exportier- und
 * wieder importierbar — auch nach dem Import erneut" ein.
 */
export function checkDeckExportSize(store: VocabStore, deckId: string): VocabError | null {
  const bytes = deckRoundtripBytes(store, deckId);
  if (bytes <= LIMITS.importBytes) return null;
  const name = store.decks.find((entry) => entry.id === deckId)?.name ?? deckId;
  return {
    code: 'limit_deck_size',
    message: `„${name}" läge damit ${formatBytes(bytes - LIMITS.importBytes)} über der Größengrenze: Als Exportdatei – auch nach einem erneuten Import – wäre es mehr als die Importgrenze von 2 MiB. Damit sich jedes Deck sichern und wieder importieren lässt, wird die Änderung nicht übernommen. Lege für weitere Karten ein neues Deck an oder kürze lange Texte.`,
  };
}

/** Bytezahl mit deutschem Tausendertrennzeichen, z. B. „1.234 Byte". */
export function formatBytes(bytes: number): string {
  return `${bytes.toLocaleString('de-DE')} Byte`;
}

/** Lesbare Größe mit einer Nachkommastelle, ohne die Grenze schönzurunden (aufgerundet). */
export function formatMiB(bytes: number): string {
  const mib = Math.ceil((bytes / (1024 * 1024)) * 10) / 10;
  return `${mib.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MiB`;
}

export function exportFileName(file: ExchangeFile): string {
  const day = file.exportedAt.slice(0, 10);
  return file.decks.length === 1
    ? `vokabeln-${file.decks[0].id}-${day}.json`
    : `vokabeln-${file.decks.length}-decks-${day}.json`;
}

export type ImportErrorCode =
  | 'too_large'
  | 'invalid_json'
  | 'wrong_format'
  | 'unsupported_version'
  | 'progress_not_supported'
  | 'invalid_content'
  | 'duplicate_id'
  | 'collision'
  | 'limit_exceeded'
  | 'empty';

export type ImportError = { code: ImportErrorCode; message: string };

export type ImportPreview = {
  decks: VocabDeck[];
  cards: VocabCard[];
  deckCount: number;
  cardCount: number;
  /** Lesbar, z. B. „Englisch → Deutsch". */
  languages: string;
  /** Herkunft laut Datei, je Deck. */
  origins: string[];
  exportedAt: string | null;
};

class ImportFailure extends Error {
  readonly importError: ImportError;

  constructor(importError: ImportError) {
    super(importError.message);
    this.importError = importError;
  }
}

function reject(code: ImportErrorCode, message: string): never {
  throw new ImportFailure({ code, message });
}

function importedText(
  value: unknown,
  field: Parameters<typeof checkText>[1],
  max: number,
  required: boolean,
  where: string,
): string {
  const checked = checkText(value, field, max, required);
  if (!checked.ok) reject('invalid_content', `${where}: ${checked.error.message}`);
  return checked.value;
}

function importedOrigin(value: unknown, where: string): DeckOrigin {
  if (!hasOnlyKeys(value, ['kind', 'label']) || !['self', 'starter', 'import'].includes(value.kind as string)) {
    reject('invalid_content', `${where}: Die Herkunftsangabe („origin") fehlt oder ist ungültig.`);
  }
  const label = importedText(value.label, 'description', LIMITS.originLabel, true, `${where} (Herkunft)`);
  // Nach dem Import ist jedes Deck ein importiertes Deck; die deklarierte Quelle bleibt sichtbar.
  return { kind: 'import', label };
}

/** UTF-8-Bytelänge, um die Importgrenze auch unabhängig von der Dateigröße zu prüfen. */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Prüft einen Dateiinhalt vollständig gegen Format, Inhaltsgrenzen und den
 * aktuellen Bestand. Ändert nichts.
 */
export function previewImport(text: string, store: VocabStore, now: Date): Result<ImportPreview, ImportError> {
  try {
    if (utf8Bytes(text) > LIMITS.importBytes) {
      reject('too_large', 'Die Datei ist größer als 2 MiB und wird nicht importiert.');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      reject('invalid_json', 'Die Datei ist kein gültiges JSON.');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      reject('wrong_format', 'Die Datei ist kein VokabelPfad-Deck (Format „lernpfade-vokabeln").');
    }
    const root = parsed as Record<string, unknown>;
    if (root.format !== EXCHANGE_FORMAT) {
      reject('wrong_format', 'Die Datei ist kein VokabelPfad-Deck (Format „lernpfade-vokabeln").');
    }
    if (root.schemaVersion !== EXCHANGE_SCHEMA_VERSION) {
      reject(
        'unsupported_version',
        typeof root.schemaVersion === 'number' && root.schemaVersion > EXCHANGE_SCHEMA_VERSION
          ? `Die Datei nutzt Schema-Version ${root.schemaVersion}. Diese Version von VokabelPfad kennt nur Version 1.`
          : 'Die Schema-Version der Datei fehlt oder ist ungültig.',
      );
    }
    if (root.progressIncluded !== false && root.progressIncluded !== undefined) {
      reject('progress_not_supported', 'Lernfortschritt kann nicht importiert werden – nur Decks und Karten.');
    }
    if (!hasOnlyKeys(root, ['format', 'schemaVersion', 'decks'], ['exportedAt', 'progressIncluded', 'hinweis'])) {
      reject('invalid_content', 'Die Datei enthält unerwartete Felder auf oberster Ebene.');
    }
    if (root.exportedAt !== undefined && !isIsoTimestamp(root.exportedAt)) {
      reject('invalid_content', 'Das Exportdatum („exportedAt") ist ungültig.');
    }
    if (root.hinweis !== undefined) importedText(root.hinweis, 'description', LIMITS.deckDescription, false, 'Hinweis');
    if (!Array.isArray(root.decks)) reject('invalid_content', 'Die Liste der Decks („decks") fehlt.');
    if (root.decks.length === 0) reject('empty', 'Die Datei enthält kein Deck.');
    if (root.decks.length > LIMITS.decks) reject('limit_exceeded', `Eine Datei darf höchstens ${LIMITS.decks} Decks enthalten.`);

    const createdAt = now.toISOString();
    const decks: VocabDeck[] = [];
    const cards: VocabCard[] = [];
    const deckIds = new Set<string>();
    const cardIds = new Set<string>();

    root.decks.forEach((rawDeck: unknown, deckIndex: number) => {
      const where = `Deck ${deckIndex + 1}`;
      if (
        !hasOnlyKeys(rawDeck, ['id', 'name', 'sourceLanguage', 'targetLanguage', 'origin', 'cards'], ['description'])
      ) {
        reject('invalid_content', `${where}: fehlende oder unerwartete Felder.`);
      }
      if (!isValidId(rawDeck.id)) reject('invalid_content', `${where}: ungültige ID.`);
      if (deckIds.has(rawDeck.id)) reject('duplicate_id', `${where}: Die Deck-ID „${rawDeck.id}" kommt doppelt vor.`);
      deckIds.add(rawDeck.id);
      if (rawDeck.sourceLanguage !== 'en' || rawDeck.targetLanguage !== 'de') {
        reject('invalid_content', `${where}: Unterstützt wird nur Englisch → Deutsch.`);
      }
      const deck: VocabDeck = {
        id: rawDeck.id,
        name: importedText(rawDeck.name, 'name', LIMITS.deckName, true, where),
        description: importedText(rawDeck.description ?? '', 'description', LIMITS.deckDescription, false, where),
        sourceLanguage: 'en',
        targetLanguage: 'de',
        origin: importedOrigin(rawDeck.origin, where),
        createdAt,
      };
      decks.push(deck);

      if (!Array.isArray(rawDeck.cards)) reject('invalid_content', `${where}: Die Kartenliste („cards") fehlt.`);
      rawDeck.cards.forEach((rawCard: unknown, cardIndex: number) => {
        const at = `${where}, Karte ${cardIndex + 1}`;
        if (!hasOnlyKeys(rawCard, ['id', 'term', 'translation', 'tags'], ['context'])) {
          reject('invalid_content', `${at}: fehlende oder unerwartete Felder.`);
        }
        if (!isValidId(rawCard.id)) reject('invalid_content', `${at}: ungültige ID.`);
        if (cardIds.has(rawCard.id)) reject('duplicate_id', `${at}: Die Karten-ID „${rawCard.id}" kommt doppelt vor.`);
        cardIds.add(rawCard.id);
        if (cardIds.size > LIMITS.cards) {
          reject('limit_exceeded', `Eine Datei darf höchstens ${LIMITS.cards} Karten enthalten.`);
        }
        const tags = checkTags(rawCard.tags);
        if (!tags.ok) reject('invalid_content', `${at}: ${tags.error.message}`);
        cards.push({
          id: rawCard.id,
          deckId: deck.id,
          term: importedText(rawCard.term, 'term', LIMITS.term, true, at),
          translation: importedText(rawCard.translation, 'translation', LIMITS.translation, true, at),
          context: importedText(rawCard.context ?? '', 'context', LIMITS.context, false, at),
          tags: tags.value,
          createdAt,
        });
      });
    });

    checkAgainstStore(store, decks, cards);
    checkImportedDeckSizes(decks, cards);

    return ok({
      decks,
      cards,
      deckCount: decks.length,
      cardCount: cards.length,
      languages: 'Englisch → Deutsch',
      origins: decks.map((deck) => (deck.origin.kind === 'self' ? SELF_ORIGIN_LABEL : deck.origin.label)),
      exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : null,
    });
  } catch (error) {
    if (error instanceof ImportFailure) return fail(error.importError);
    throw error;
  }
}

/** Kollisionen mit vorhandenen IDs und Gesamtgrenzen nach dem Import. */
function checkAgainstStore(store: VocabStore, decks: readonly VocabDeck[], cards: readonly VocabCard[]): void {
  const existingDecks = new Set(store.decks.map((deck) => deck.id));
  const existingCards = new Set(store.cards.map((card) => card.id));
  const deckCollisions = decks.filter((deck) => existingDecks.has(deck.id)).map((deck) => deck.name);
  const cardCollisions = cards.filter((card) => existingCards.has(card.id)).length;
  if (deckCollisions.length > 0 || cardCollisions > 0) {
    reject(
      'collision',
      deckCollisions.length > 0
        ? `Bereits vorhanden: ${deckCollisions.map((name) => `„${name}"`).join(', ')}. Ein erneuter Import würde Duplikate erzeugen; vorhandene Decks und ihr Lernfortschritt bleiben unverändert. Lösche das vorhandene Deck zuerst, wenn du es ersetzen möchtest.`
        : `${cardCollisions} Karte(n) der Datei sind bereits in einem anderen Deck vorhanden. Der Import wird nicht übernommen, damit keine Duplikate entstehen.`,
    );
  }
  if (store.decks.length + decks.length > LIMITS.decks) {
    reject(
      'limit_exceeded',
      `Nach dem Import wären es ${store.decks.length + decks.length} Decks; erlaubt sind höchstens ${LIMITS.decks}.`,
    );
  }
  if (store.cards.length + cards.length > LIMITS.cards) {
    reject(
      'limit_exceeded',
      `Nach dem Import wären es ${store.cards.length + cards.length} Karten; erlaubt sind höchstens ${LIMITS.cards}.`,
    );
  }
}

/**
 * Ein importiertes Deck muss sich auch wieder exportieren lassen. Die Datei
 * selbst hält die Grenze ein; als Export kann dasselbe Deck dennoch etwas
 * größer werden (z. B. ergänzter Hinweistext, Herkunft „import").
 */
function checkImportedDeckSizes(decks: readonly VocabDeck[], cards: readonly VocabCard[]): void {
  const imported: VocabStore = { ...emptyStore(), decks: decks.slice(), cards: cards.slice() };
  for (const deck of decks) {
    const tooLarge = checkDeckExportSize(imported, deck.id);
    if (tooLarge) {
      reject(
        'too_large',
        `„${deck.name}" ergäbe nach dem Import eine Exportdatei über 2 MiB und ließe sich nicht wieder sichern. Teile das Deck in der Datei auf mehrere Decks auf.`,
      );
    }
  }
}

/**
 * Übernimmt eine geprüfte Vorschau. Prüft Kollisionen und Grenzen erneut
 * gegen den AKTUELLEN Bestand (er kann sich seit der Vorschau geändert
 * haben) und hängt entweder alles oder nichts an.
 */
export function applyImport(store: VocabStore, preview: ImportPreview): Result<VocabStore, ImportError> {
  try {
    checkAgainstStore(store, preview.decks, preview.cards);
  } catch (error) {
    if (error instanceof ImportFailure) return fail(error.importError);
    throw error;
  }
  return ok({ ...store, decks: [...store.decks, ...preview.decks], cards: [...store.cards, ...preview.cards] });
}
