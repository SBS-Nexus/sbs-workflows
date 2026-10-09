import { vocabStats } from '../vocabulary/session.ts';
import type { LoadOutcome } from '../vocabulary/storage.ts';
import {
  PROGRESS_SOURCES,
  ProgressContractError,
  parseSourceProgress,
  type ProgressSource,
  type SourceProgress,
} from './contract.ts';
import type { ProgressFetchOutcome } from './fetch-progress.ts';

/**
 * LP-07 — Plattformfortschritt im Hub: Zustand je Quelle und die eine
 * Summe, die ehrlich bleiben muss.
 *
 * ```text
 * Python Progress ─┐
 * SQL Progress ────┼──> Browser im Lernpfade-Hub ──> /fortschritt
 * AIPfad Progress ─┘
 * VokabelPfad local IndexedDB ────────────────┘
 * ```
 *
 * Die Apps bleiben Systeme der Wahrheit; der Hub liest, prüft und zeigt an.
 * Reine Logik ohne Netzwerk, Speicher und React.
 *
 * Bewusst NICHT hier: ein Gesamtprozent, ein „Mastery Score", ein Ranking,
 * Lernminuten. Die Pfade messen Verschiedenes; ihre Zahlen werden nicht
 * verrechnet.
 */

export type SourceStatus = 'ok' | 'unauthenticated' | 'unavailable' | 'not_configured';

/** Zustand einer entfernten Quelle in der Oberfläche. */
export type SourceState =
  | { status: 'loading' }
  | { status: 'ok'; progress: SourceProgress }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' }
  | { status: 'not_configured' };

/**
 * Übersetzt das Abrufergebnis in einen Zustand. Eine vertragswidrige Antwort
 * wird `unavailable` — nie „0 Fortschritt", nie still uminterpretiert.
 */
export function resolveSourceOutcome(outcome: ProgressFetchOutcome): SourceState {
  if (outcome.status !== 'ok') return { status: outcome.status };
  try {
    return { status: 'ok', progress: parseSourceProgress(outcome.body, outcome.source) };
  } catch (error) {
    if (!(error instanceof ProgressContractError)) throw error;
    return { status: 'unavailable' };
  }
}

/** Anfangszustand: freigeschaltete Quellen laden, die übrigen sind nicht verbunden. */
export function initialSourceStates(enabled: readonly ProgressSource[]): Record<ProgressSource, SourceState> {
  return Object.fromEntries(
    PROGRESS_SOURCES.map((source) => [
      source,
      enabled.includes(source) ? { status: 'loading' } : { status: 'not_configured' },
    ]),
  ) as Record<ProgressSource, SourceState>;
}

// ---------------------------------------------------------------------------
// VokabelPfad — lokal, aus der vorhandenen, geprüften Statistik
// ---------------------------------------------------------------------------

export type VocabularySummary = {
  decks: number;
  cards: number;
  dueEnDe: number;
  dueDeEn: number;
  ratedToday: number;
};

export type VocabularyState =
  | { status: 'loading' }
  | { status: 'ok'; summary: VocabularySummary }
  /** Gespeicherte Daten unlesbar, aus einer neueren Version oder der Speicher gesperrt — nie als 0 zeigen. */
  | { status: 'error'; reason: 'corrupt' | 'future' | 'unavailable' };

/**
 * Fasst den lokalen VokabelPfad-Stand zusammen — mit `vocabStats`, derselben
 * Statistik wie `/vokabeln`. „Noch nichts gespeichert" ist ein echter,
 * geprüfter Nullstand; beschädigte oder künftige Daten bleiben ein Fehler.
 */
export function summarizeVocabulary(outcome: LoadOutcome, now: Date, timeZone?: string): VocabularyState {
  if (outcome.status !== 'ok' && outcome.status !== 'empty') return { status: 'error', reason: outcome.status };
  const stats = vocabStats(outcome.store, now, timeZone);
  return {
    status: 'ok',
    summary: {
      decks: stats.decks,
      cards: stats.cards,
      dueEnDe: stats.dueByDirection['en-de'],
      dueDeEn: stats.dueByDirection['de-en'],
      ratedToday: stats.ratedToday,
    },
  };
}

// ---------------------------------------------------------------------------
// Fällig insgesamt — nur, wenn er vollständig ist
// ---------------------------------------------------------------------------

export type BacklogPart = { key: ProgressSource | 'vocabulary'; due: number };

export type BacklogTotal =
  /** Mindestens eine verbundene Quelle lädt noch. */
  | { status: 'pending' }
  /** Alle verbundenen Quellen und die lokalen Vokabeln haben geantwortet. */
  | { status: 'complete'; due: number; parts: BacklogPart[] }
  /** Mindestens eine verbundene Quelle fehlt — es gibt bewusst keine Zahl. */
  | { status: 'incomplete'; missing: Array<ProgressSource | 'vocabulary'> };

/**
 * Die einzige Summe auf `/fortschritt`: fällige Wiederholungen bzw.
 * Vokabelabfragen, je Quelle gezählt und je Quelle ausgewiesen.
 *
 * Fehlt eine VERBUNDENE Quelle (nicht angemeldet, nicht erreichbar,
 * vertragswidrig) oder sind die lokalen Vokabeln unlesbar, gibt es keine
 * Gesamtzahl — eine Teilsumme sähe vollständig aus. Nicht verbundene Quellen
 * gehören nicht zur Summe und werden in `parts` nicht aufgeführt.
 *
 * Die Reihenfolge ist fest (Python, SQL, AI, Vokabeln), unabhängig davon, in
 * welcher Reihenfolge die Antworten eintrafen.
 */
export function backlogTotal(
  sources: Readonly<Record<ProgressSource, SourceState>>,
  vocabulary: VocabularyState,
): BacklogTotal {
  const parts: BacklogPart[] = [];
  const missing: Array<ProgressSource | 'vocabulary'> = [];
  let pending = vocabulary.status === 'loading';

  for (const source of PROGRESS_SOURCES) {
    const state = sources[source];
    if (state.status === 'not_configured') continue;
    if (state.status === 'loading') pending = true;
    else if (state.status === 'ok') parts.push({ key: source, due: state.progress.reviewsDue });
    else missing.push(source);
  }

  if (vocabulary.status === 'ok') {
    parts.push({ key: 'vocabulary', due: vocabulary.summary.dueEnDe + vocabulary.summary.dueDeEn });
  } else if (vocabulary.status === 'error') {
    missing.push('vocabulary');
  }

  if (pending) return { status: 'pending' };
  if (missing.length > 0) return { status: 'incomplete', missing };
  return { status: 'complete', due: parts.reduce((sum, part) => sum + part.due, 0), parts };
}
