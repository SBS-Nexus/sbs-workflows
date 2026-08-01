import type { ExercisePayload } from './exercise-payload';

/**
 * Öffentliche Sicht auf eine Aufgabe.
 *
 * Alles, was die Lösung verrät, wird hier entfernt, BEVOR die Daten den Server
 * verlassen: richtige Optionen, akzeptierte Lückenfüllungen, erwartete
 * Ausgaben, Musterlösungen, Erklärungen. Die Bewertung findet ausschließlich
 * serverseitig statt (siehe src/domain/grading/grade.ts).
 *
 * Ausnahme mit Ansage: Bei Code-Aufgaben führt der Browser die Tests aus. Die
 * Testfälle müssen dafür beim Absenden ausgeliefert werden. Was das für das
 * Vertrauensmodell bedeutet, steht in docs/SICHERHEIT.md.
 */

export type PublicExercisePayload =
  | {
      kind: 'singleChoice';
      code?: string;
      options: Array<{ id: string; text: string }>;
    }
  | {
      kind: 'multipleChoice';
      code?: string;
      options: Array<{ id: string; text: string }>;
      /** Wie viele Aussagen zutreffen – hilft beim Verständnis der Aufgabe. */
      correctCount: number;
    }
  | { kind: 'freeText'; code?: string; minLength: number; expectedPoints: number }
  | { kind: 'predictOutput'; code: string }
  | {
      kind: 'parsons';
      lines: Array<{ id: string; code: string; indent: number }>;
      checkIndentation: boolean;
      /** Anzahl der Zeilen, die tatsächlich zur Lösung gehören. */
      solutionLength: number;
    }
  | {
      kind: 'codeCompletion';
      template: string;
      blanks: Array<{ id: string; description: string }>;
    }
  | { kind: 'findError'; codeLines: string[]; traceback?: string; expectedCount: number }
  | {
      kind: 'code';
      sourceChecks: Array<{ id: string; description: string }>;
      expectedSignature?: string;
    };

/** Deterministische Durchmischung, damit Parsons-Zeilen nicht in Lösungsreihenfolge stehen. */
function shuffleDeterministic<T>(items: T[], seed: string): T[] {
  const result = [...items];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  // Lineare Kongruenz – reicht für "sieht gemischt aus" und ist reproduzierbar.
  let state = Math.abs(hash) || 1;
  const next = (): number => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const a = result[i];
    const b = result[j];
    if (a !== undefined && b !== undefined) {
      result[i] = b;
      result[j] = a;
    }
  }
  return result;
}

export function toPublicPayload(payload: ExercisePayload, seed: string): PublicExercisePayload {
  switch (payload.kind) {
    case 'singleChoice':
      return {
        kind: 'singleChoice',
        ...(payload.code !== undefined ? { code: payload.code } : {}),
        options: shuffleDeterministic(
          payload.options.map((o) => ({ id: o.id, text: o.text })),
          seed,
        ),
      };

    case 'multipleChoice':
      return {
        kind: 'multipleChoice',
        ...(payload.code !== undefined ? { code: payload.code } : {}),
        options: shuffleDeterministic(
          payload.options.map((o) => ({ id: o.id, text: o.text })),
          seed,
        ),
        correctCount: payload.correctOptionIds.length,
      };

    case 'freeText':
      return {
        kind: 'freeText',
        ...(payload.code !== undefined ? { code: payload.code } : {}),
        minLength: payload.minLength,
        expectedPoints: payload.requiredKeywordGroups.length,
      };

    case 'predictOutput':
      return { kind: 'predictOutput', code: payload.code };

    case 'parsons':
      return {
        kind: 'parsons',
        lines: shuffleDeterministic(
          // Die Einrückung wird zurückgesetzt: Sie ist Teil der Aufgabe.
          payload.lines.map((l) => ({ id: l.id, code: l.code, indent: 0 })),
          seed,
        ),
        checkIndentation: payload.checkIndentation,
        solutionLength: payload.correctOrder.length,
      };

    case 'codeCompletion':
      return {
        kind: 'codeCompletion',
        template: payload.template,
        blanks: payload.blanks.map((b) => ({ id: b.id, description: b.description })),
      };

    case 'findError':
      return {
        kind: 'findError',
        codeLines: payload.codeLines,
        ...(payload.traceback !== undefined ? { traceback: payload.traceback } : {}),
        expectedCount: payload.faultyLineNumbers.length,
      };

    case 'code':
      return {
        kind: 'code',
        sourceChecks: payload.sourceChecks.map((c) => ({ id: c.id, description: c.description })),
        ...(payload.expectedSignature !== undefined
          ? { expectedSignature: payload.expectedSignature }
          : {}),
      };
  }
}
