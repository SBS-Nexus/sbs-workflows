/**
 * Lerntutor – Vertrag und Leitplanken.
 *
 * Der Tutor ist ausdrücklich KEIN Lösungsgenerator. Er stellt Fragen, übersetzt
 * Fehlermeldungen und erinnert an Konzepte. Die Musterlösung bleibt in jedem
 * Fall der Hinweisleiter vorbehalten (src/domain/hints/hint-ladder.ts) und wird
 * niemals über den Tutor freigegeben.
 *
 * Standardbetrieb ist regelbasiert und läuft vollständig auf dem eigenen Server.
 * Ein externer KI-Anbieter ist optional und wird nur nach ausdrücklicher
 * Einwilligung angesprochen.
 */

export const TUTOR_MODES = [
  'simpler',
  'impulse',
  'error-help',
  'check-approach',
  'control-question',
  'similar-example',
  'explain-error-message',
  'verify-understanding',
] as const;

export type TutorMode = (typeof TUTOR_MODES)[number];

export const TUTOR_MODE_LABELS: Record<TutorMode, string> = {
  simpler: 'Erkläre es einfacher',
  impulse: 'Gib mir einen Denkimpuls',
  'error-help': 'Hilf mir beim Fehler',
  'check-approach': 'Prüfe meinen Lösungsansatz',
  'control-question': 'Stelle mir eine Kontrollfrage',
  'similar-example': 'Zeige mir ein ähnliches Beispiel',
  'explain-error-message': 'Erkläre diese Fehlermeldung',
  'verify-understanding': 'Prüfe, ob ich es wirklich verstanden habe',
};

export const TUTOR_MODE_DESCRIPTIONS: Record<TutorMode, string> = {
  simpler: 'Dieselbe Sache noch einmal, mit weniger Fachbegriffen.',
  impulse: 'Eine Frage, die dich zum nächsten eigenen Schritt führt.',
  'error-help': 'Systematisch eingrenzen, woran es liegt – ohne die Lösung.',
  'check-approach': 'Rückmeldung, ob dein Weg trägt, bevor du ihn zu Ende gehst.',
  'control-question': 'Eine Frage, an der du selbst merkst, ob es sitzt.',
  'similar-example': 'Ein Beispiel mit derselben Struktur, aber anderem Inhalt.',
  'explain-error-message': 'Die Meldung von Python auf Deutsch übersetzt.',
  'verify-understanding': 'Eine Anwendungsfrage statt einer Wissensfrage.',
};

export interface TutorRequest {
  mode: TutorMode;
  /** Aufgabe, auf die sich die Frage bezieht. */
  exerciseSlug?: string;
  /** Frei formulierte Frage der lernenden Person. */
  question?: string;
  /** Aktueller Code im Editor – wird nur mit Einwilligung extern gesendet. */
  code?: string;
  /** Letzte Fehlerausgabe. */
  traceback?: string;
}

export interface TutorContext {
  exerciseTitle: string;
  exercisePrompt: string;
  /** Konzepte der Aufgabe – Namen und Kurzbeschreibungen. */
  concepts: Array<{ slug: string; name: string; description: string }>;
  /** Kompetenzstand je Konzept, 0–100. */
  masteryByConcept: Record<string, number>;
  attempts: number;
  hintsRevealed: number;
  /** Höchste verfügbare Hinweisstufe. */
  maxHintLevel: number;
  /** Anzahl bestandener Tests beim letzten Versuch. */
  lastPassedTests: number;
  lastTotalTests: number;
}

export interface TutorReply {
  /** Antworttext in Absätzen. */
  paragraphs: string[];
  /** Nächster empfohlener Schritt für die lernende Person. */
  nextStep: string;
  /** Woher die Antwort stammt – wird im UI ausgewiesen. */
  provider: 'rule-based' | 'anthropic' | 'openai-compatible';
  /** Offen benannte Unsicherheit, falls vorhanden. */
  caveat?: string;
  /** Verweis auf die offizielle Dokumentation, wo sinnvoll. */
  documentation?: { label: string; url: string };
}

export interface TutorProvider {
  readonly name: TutorReply['provider'];
  reply(request: TutorRequest, context: TutorContext): Promise<TutorReply>;
}

/**
 * Verbotene Muster in Tutor-Antworten.
 *
 * Diese Prüfung läuft auf JEDER Antwort – auch auf denen eines externen
 * Anbieters. Fällt eine Antwort durch, wird sie verworfen und durch die
 * regelbasierte Antwort ersetzt.
 */
export interface GuardrailResult {
  ok: boolean;
  violations: string[];
}

export function checkTutorGuardrails(
  reply: TutorReply,
  context: { solution?: string | null; maxHintLevel: number; hintsRevealed: number },
): GuardrailResult {
  const violations: string[] = [];
  const text = [...reply.paragraphs, reply.nextStep].join('\n');

  // 1. Die Musterlösung darf nicht durchgereicht werden.
  if (context.solution) {
    const normalizedSolution = normalizeCode(context.solution);
    const normalizedText = normalizeCode(text);
    if (normalizedSolution.length > 20 && normalizedText.includes(normalizedSolution)) {
      violations.push('Die Antwort enthält die hinterlegte Musterlösung im Wortlaut.');
    }
  }

  // 2. Kein umfangreicher Codeblock, solange die Hinweisleiter nicht
  //    durchlaufen ist. Kurze Ausschnitte sind erlaubt.
  const codeLines = countCodeLines(text);
  if (codeLines > 4 && context.hintsRevealed < context.maxHintLevel) {
    violations.push(
      `Die Antwort enthält ${codeLines} Codezeilen, obwohl die Hinweisleiter noch nicht durchlaufen ist.`,
    );
  }

  // 3. Keine Anmaßung von Gewissheit ohne Prüfung.
  if (/\bgarantiert\b|\bauf jeden fall korrekt\b|\bzu 100\s?%\b/i.test(text)) {
    violations.push('Die Antwort behauptet eine Gewissheit, die nicht belegt ist.');
  }

  // 4. Länge: Ein Tutor, der lange Texte schreibt, wird nicht gelesen.
  if (text.length > 2200) {
    violations.push('Die Antwort ist zu lang für eine Zwischenfrage.');
  }

  return { ok: violations.length === 0, violations };
}

function normalizeCode(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function countCodeLines(text: string): number {
  const blocks = [...text.matchAll(/```[\s\S]*?```/g)].map((m) => m[0]);
  return blocks.reduce((sum, block) => {
    const lines = block
      .split('\n')
      .slice(1, -1)
      .filter((line) => line.trim().length > 0);
    return sum + lines.length;
  }, 0);
}
