import { checkTags, checkText, hasOnlyKeys, isIsoTimestamp, isValidId } from './fields.ts';
import {
  LIMITS,
  fail,
  ok,
  type DeckOrigin,
  type Result,
  type VocabCard,
  type VocabDeck,
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
        cards: store.cards
          .filter((card) => card.deckId === deck.id)
          .map((card) => ({
            id: card.id,
            term: card.term,
            translation: card.translation,
            ...(card.context ? { context: card.context } : {}),
            tags: card.tags.slice(),
          })),
      })),
  };
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
