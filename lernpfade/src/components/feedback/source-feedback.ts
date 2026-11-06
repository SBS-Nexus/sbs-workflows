import type { CalloutTone } from '../../lib/learning-feedback.ts';

/**
 * LP-03B — welche Rückmeldung zeigt `/fortschritt` für welchen Zustand einer
 * Quelle? Nur Darstellung: Ermittelt werden die Zustände unverändert in
 * `@/domain/progress/federation` (LP-07).
 *
 * Grundsätze:
 *  - Fehler, fehlende Anmeldung oder Verbindung sind nie ein Erfolg und nie
 *    „kein Fortschritt": Sie erscheinen als Hinweis/Warnung, nicht als Zahl.
 *  - Ein Ausfall einer Quelle ist eine Warnung, kein Fehler der Seite — die
 *    anderen Pfade bleiben nutzbar.
 *  - Nur ein unlesbarer lokaler Vokabelstand ist ein Fehler (`danger`): Dort
 *    stimmt etwas mit Daten in diesem Browser nicht.
 *  - Eine gültige, leere Antwort ist neutral: Sie ist ein echter Stand.
 */

export type FeedbackMessage = {
  tone: CalloutTone;
  title: string;
  /** Laden wird höflich angesagt (wie bisher `role="status"`), sonst still. */
  live: boolean;
};

export type SourceDisplayStatus = 'loading' | 'not_configured' | 'unauthenticated' | 'unavailable';

export function sourceFeedback(status: SourceDisplayStatus): FeedbackMessage {
  switch (status) {
    case 'loading':
      return { tone: 'neutral', title: 'Wird geladen', live: true };
    case 'not_configured':
      return { tone: 'neutral', title: 'Nicht verbunden', live: false };
    case 'unauthenticated':
      return { tone: 'info', title: 'Nicht angemeldet', live: false };
    case 'unavailable':
      return { tone: 'warning', title: 'Nicht erreichbar', live: false };
  }
}

export type VocabularyErrorReason = 'corrupt' | 'future' | 'unavailable';

export function vocabularyFeedback(status: 'loading' | VocabularyErrorReason): FeedbackMessage {
  switch (status) {
    case 'loading':
      return { tone: 'neutral', title: 'Wird gelesen', live: true };
    case 'corrupt':
      return { tone: 'danger', title: 'Vokabeldaten nicht lesbar', live: false };
    case 'future':
      return { tone: 'warning', title: 'Neuere Version', live: false };
    case 'unavailable':
      return { tone: 'warning', title: 'Speicher nicht zugänglich', live: false };
  }
}

/** Gültige, aber leere Antwort: echter Stand, keine Störung. */
export const EMPTY_SOURCE: FeedbackMessage = { tone: 'neutral', title: 'Noch nichts erfasst', live: false };
export const EMPTY_VOCABULARY: FeedbackMessage = { tone: 'neutral', title: 'Noch keine Vokabeln', live: false };
