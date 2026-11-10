import {
  EXCHANGE_FORMAT,
  EXCHANGE_SCHEMA_VERSION,
  EXPORT_NOTICE,
  applyImport,
  previewImport,
  type ExchangeDeck,
  type ImportError,
} from './exchange.ts';
import { ok, type Result, type VocabStore } from './model.ts';

/**
 * Zwei kleine, redaktionell erstellte Starterdecks. Sie werden NICHT
 * automatisch angelegt: erst wenn die lernende Person ein Deck ausdrücklich
 * übernimmt, entsteht daraus ein eigenes, frei bearbeitbares Deck. Die festen
 * IDs verhindern, dass dasselbe Starterdeck zweimal übernommen wird.
 *
 * Das technische Deck nutzt dieselbe Kartenlogik wie Sprachdecks. Es ist eine
 * eigene lokale Sammlung und übernimmt keine Identität und keinen Fortschritt
 * aus PythonPfad, SQLPfad oder AIPfad.
 */

const STARTER_LABEL = 'Lernpfade-Starterdeck (redaktionell erstellt)';

export const STARTER_DECKS: readonly ExchangeDeck[] = [
  {
    id: 'starter-en-alltag',
    name: 'Englisch: Alltag & Arbeit',
    description: 'Häufige Wörter aus Alltag und Büro mit Beispielsatz.',
    sourceLanguage: 'en',
    targetLanguage: 'de',
    origin: { kind: 'starter', label: STARTER_LABEL },
    cards: [
      { id: 'starter-en-appointment', term: 'appointment', translation: 'Termin', context: 'I have an appointment with the dentist at ten.', tags: ['alltag'] },
      { id: 'starter-en-deadline', term: 'deadline', translation: 'Frist · Abgabetermin', context: 'The deadline for the report is Friday.', tags: ['arbeit'] },
      { id: 'starter-en-reliable', term: 'reliable', translation: 'zuverlässig', context: 'She is a reliable colleague.', tags: ['arbeit', 'adjektiv'] },
      { id: 'starter-en-improve', term: 'to improve', translation: 'verbessern', context: 'Practice will improve your pronunciation.', tags: ['verb'] },
      { id: 'starter-en-receipt', term: 'receipt', translation: 'Quittung · Beleg', context: 'Please keep the receipt.', tags: ['alltag'] },
      { id: 'starter-en-meanwhile', term: 'meanwhile', translation: 'inzwischen · unterdessen', context: 'Meanwhile, the guests had arrived.', tags: ['adverb'] },
      { id: 'starter-en-to-borrow', term: 'to borrow', translation: 'sich (etwas) leihen', context: 'Can I borrow your pen?', tags: ['verb', 'alltag'] },
      { id: 'starter-en-to-lend', term: 'to lend', translation: '(jemandem etwas) leihen', context: 'I can lend you my bike.', tags: ['verb', 'alltag'] },
      { id: 'starter-en-eventually', term: 'eventually', translation: 'schließlich · letztendlich', context: 'Eventually, we found the right solution.', tags: ['adverb', 'falscher-freund'] },
      { id: 'starter-en-become', term: 'to become', translation: 'werden', context: 'He wants to become a teacher.', tags: ['verb', 'falscher-freund'] },
      { id: 'starter-en-colleague', term: 'colleague', translation: 'Kollege · Kollegin', context: 'My colleague helped me with the presentation.', tags: ['arbeit'] },
      { id: 'starter-en-weather', term: 'weather forecast', translation: 'Wettervorhersage', context: 'The weather forecast says it will rain.', tags: ['alltag'] },
    ],
  },
  {
    id: 'starter-tech-begriffe',
    name: 'Technik: Englische Fachbegriffe',
    description: 'Begriffe aus Git, SQL, Python und AI – Englisch mit deutscher Erklärung.',
    sourceLanguage: 'en',
    targetLanguage: 'de',
    origin: { kind: 'starter', label: STARTER_LABEL },
    cards: [
      { id: 'starter-tech-commit', term: 'commit', translation: 'gespeicherter Stand im Versionsverlauf', context: 'Write a clear message for every commit.', tags: ['git'] },
      { id: 'starter-tech-branch', term: 'branch', translation: 'Zweig · eigene Entwicklungslinie', context: 'Create a branch for the new feature.', tags: ['git'] },
      { id: 'starter-tech-merge-conflict', term: 'merge conflict', translation: 'Zusammenführungskonflikt', context: 'Two people changed the same line, which caused a merge conflict.', tags: ['git'] },
      { id: 'starter-tech-query', term: 'query', translation: 'Abfrage', context: 'The query returns all customers from Berlin.', tags: ['sql'] },
      { id: 'starter-tech-join', term: 'join', translation: 'Verknüpfung von Tabellen', context: 'A join combines rows from two tables.', tags: ['sql'] },
      { id: 'starter-tech-loop', term: 'loop', translation: 'Schleife', context: 'The loop runs once for every item in the list.', tags: ['python'] },
      { id: 'starter-tech-exception', term: 'exception', translation: 'Ausnahme · Laufzeitfehler', context: 'The program raised an exception when the file was missing.', tags: ['python'] },
      { id: 'starter-tech-token', term: 'token', translation: 'Texteinheit, die ein Sprachmodell verarbeitet', context: 'Long prompts use more tokens.', tags: ['ai'] },
      { id: 'starter-tech-embedding', term: 'embedding', translation: 'numerische Repräsentation von Bedeutung', context: 'Similar sentences have similar embeddings.', tags: ['ai'] },
      { id: 'starter-tech-retrieval', term: 'retrieval', translation: 'Abruf · Wiederauffinden von Informationen', context: 'Retrieval selects relevant documents before the model answers.', tags: ['ai'] },
    ],
  },
];

export function starterAdopted(store: VocabStore, starterId: string): boolean {
  return store.decks.some((deck) => deck.id === starterId);
}

/**
 * Übernimmt ein Starterdeck als eigenes Deck — über dieselbe Prüfung wie ein
 * Dateiimport. Danach ist es ein normales Deck mit sichtbarer Herkunft.
 */
export function adoptStarterDeck(store: VocabStore, starterId: string, now: Date): Result<VocabStore, ImportError> {
  const starter = STARTER_DECKS.find((deck) => deck.id === starterId);
  if (!starter) return { ok: false, error: { code: 'invalid_content', message: 'Dieses Starterdeck gibt es nicht.' } };
  const file = {
    format: EXCHANGE_FORMAT,
    schemaVersion: EXCHANGE_SCHEMA_VERSION,
    progressIncluded: false,
    hinweis: EXPORT_NOTICE,
    decks: [starter],
  };
  const preview = previewImport(JSON.stringify(file), store, now);
  if (!preview.ok) return preview;
  const decks = preview.value.decks.map((deck) => ({ ...deck, origin: { kind: 'starter' as const, label: STARTER_LABEL } }));
  const applied = applyImport(store, { ...preview.value, decks });
  return applied.ok ? ok(applied.value) : applied;
}
