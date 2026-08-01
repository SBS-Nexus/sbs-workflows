import { z } from 'zod';

/**
 * Aufgaben-Nutzlasten.
 *
 * Zwei Achsen werden bewusst getrennt:
 *
 *  - `ExerciseType` (Prisma-Enum) beschreibt die *didaktische Rolle* einer
 *    Aufgabe: Ist das eine Transferaufgabe? Eine verzögerte Wiederholung? Ein
 *    Mini-Projekt? Diese Rolle steuert die Gewichtung im Kompetenzmodell.
 *
 *  - `payload.kind` beschreibt die *Interaktionsform*: Wie wird die Aufgabe
 *    dargestellt und wie wird sie bewertet?
 *
 * Dadurch braucht eine Transferaufgabe keine eigene Bewertungslogik – sie ist
 * z. B. eine `code`-Aufgabe mit anderer didaktischer Rolle.
 */

// ---------------------------------------------------------------------------
// Testfälle für ausführbaren Python-Code
// ---------------------------------------------------------------------------

export const testCaseSchema = z.object({
  id: z.string().min(1),
  /** Für Menschen lesbarer Name, z. B. "Leere Liste ergibt 0". */
  name: z.string().min(1),
  /** Python-Code, der VOR dem Code der lernenden Person läuft. */
  setup: z.string().optional(),
  /** Zeilen, die nacheinander von input() zurückgegeben werden. */
  stdin: z.array(z.string()).optional(),
  /**
   * Erwartete Standardausgabe. Der Vergleich normalisiert Zeilenenden und
   * schneidet Leerraum am Zeilenende ab – Einrückung innerhalb der Zeile
   * bleibt relevant.
   */
  expectedStdout: z.string().optional(),
  /**
   * Python-Code, der NACH dem Code der lernenden Person läuft und mit `assert`
   * arbeitet. Wird für Funktionstests verwendet.
   */
  assertion: z.string().optional(),
  /** Erklärung, die bei Fehlschlag angezeigt wird – konkret und ohne Lösung. */
  failureHint: z.string().optional(),
});

export type TestCase = z.infer<typeof testCaseSchema>;

// ---------------------------------------------------------------------------
// Interaktionsformen
// ---------------------------------------------------------------------------

const choiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  /** Rückmeldung speziell zu dieser Option – auch bei richtigen Optionen. */
  feedback: z.string().min(1),
});

export const singleChoicePayloadSchema = z.object({
  kind: z.literal('singleChoice'),
  /** Optionaler Codeausschnitt, auf den sich die Frage bezieht. */
  code: z.string().optional(),
  options: z.array(choiceOptionSchema).min(2),
  correctOptionId: z.string().min(1),
});

export const multipleChoicePayloadSchema = z.object({
  kind: z.literal('multipleChoice'),
  code: z.string().optional(),
  options: z.array(choiceOptionSchema).min(3),
  correctOptionIds: z.array(z.string().min(1)).min(1),
});

export const freeTextPayloadSchema = z.object({
  kind: z.literal('freeText'),
  code: z.string().optional(),
  /**
   * Jede Gruppe muss durch mindestens eines ihrer Stichwörter erfüllt sein.
   * So lässt sich "erkläre den Unterschied" prüfen, ohne exakten Wortlaut zu
   * verlangen.
   */
  requiredKeywordGroups: z
    .array(
      z.object({
        id: z.string().min(1),
        anyOf: z.array(z.string().min(1)).min(1),
        /** Was fehlt, wenn diese Gruppe nicht erfüllt ist? */
        missingHint: z.string().min(1),
      }),
    )
    .min(1),
  minLength: z.number().int().min(0).default(20),
  /** Musterantwort – wird erst nach der Bewertung gezeigt. */
  sampleAnswer: z.string().min(1),
});

export const predictOutputPayloadSchema = z.object({
  kind: z.literal('predictOutput'),
  code: z.string().min(1),
  /** Erwartete Ausgabe, zeilenweise verglichen. */
  expectedOutput: z.string(),
  /** Erklärung, wie die Ausgabe zustande kommt. */
  explanation: z.string().min(1),
});

export const parsonsPayloadSchema = z.object({
  kind: z.literal('parsons'),
  lines: z
    .array(
      z.object({
        id: z.string().min(1),
        code: z.string(),
        /** Einrückungstiefe in Ebenen (nicht Leerzeichen). */
        indent: z.number().int().min(0).max(4),
        /** true = Ablenker, gehört nicht in die Lösung. */
        distractor: z.boolean().default(false),
      }),
    )
    .min(3),
  /** IDs in korrekter Reihenfolge (ohne Ablenker). */
  correctOrder: z.array(z.string().min(1)).min(3),
  /** Muss die Einrückung ebenfalls stimmen? */
  checkIndentation: z.boolean().default(true),
});

export const codeCompletionPayloadSchema = z.object({
  kind: z.literal('codeCompletion'),
  /** Vorlage mit Platzhaltern der Form {{blank:id}}. */
  template: z.string().min(1),
  blanks: z
    .array(
      z.object({
        id: z.string().min(1),
        /** Akzeptierte Eingaben (nach Normalisierung, ohne Groß-/Kleinschreibung bei Bedarf). */
        accepted: z.array(z.string().min(1)).min(1),
        caseSensitive: z.boolean().default(true),
        /** Was diese Lücke fachlich leisten muss. */
        description: z.string().min(1),
        /** Rückmeldung, wenn die Lücke falsch gefüllt ist. */
        wrongHint: z.string().min(1),
      }),
    )
    .min(1),
});

export const findErrorPayloadSchema = z.object({
  kind: z.literal('findError'),
  /** Zeilen des fehlerhaften Programms, 1-basiert nummeriert dargestellt. */
  codeLines: z.array(z.string()).min(2),
  /** 1-basierte Zeilennummern, die fehlerhaft sind. */
  faultyLineNumbers: z.array(z.number().int().min(1)).min(1),
  /** Erklärung des Fehlers (erst nach Bewertung sichtbar). */
  explanation: z.string().min(1),
  /** Optional zusätzlich der reale Traceback zum Mitlesen. */
  traceback: z.string().optional(),
});

export const codePayloadSchema = z.object({
  kind: z.literal('code'),
  /**
   * Zusätzliche Qualitätsprüfungen auf dem Quelltext (kein Ersatz für Tests).
   * Wird z. B. für Refactoring-Aufgaben genutzt ("keine globale Variable mehr").
   */
  sourceChecks: z
    .array(
      z.object({
        id: z.string().min(1),
        description: z.string().min(1),
        /** Regulärer Ausdruck, der vorkommen MUSS. */
        mustMatch: z.string().optional(),
        /** Regulärer Ausdruck, der NICHT vorkommen darf. */
        mustNotMatch: z.string().optional(),
        /** Rückmeldung bei Verstoß. */
        message: z.string().min(1),
      }),
    )
    .default([]),
  /** Hinweis auf die erwartete Signatur, z. B. "def summe(zahlen: list[int]) -> int". */
  expectedSignature: z.string().optional(),
});

export const exercisePayloadSchema = z.discriminatedUnion('kind', [
  singleChoicePayloadSchema,
  multipleChoicePayloadSchema,
  freeTextPayloadSchema,
  predictOutputPayloadSchema,
  parsonsPayloadSchema,
  codeCompletionPayloadSchema,
  findErrorPayloadSchema,
  codePayloadSchema,
]);

export type ExercisePayload = z.infer<typeof exercisePayloadSchema>;
export type ExercisePayloadKind = ExercisePayload['kind'];

// ---------------------------------------------------------------------------
// Hinweisleiter
// ---------------------------------------------------------------------------

export const HINT_LEVELS = ['impulse', 'concept', 'structure', 'partial', 'explanation'] as const;

export type HintLevel = (typeof HINT_LEVELS)[number];

export const hintSchema = z.object({
  /** 1 = Denkimpuls … 5 = vollständige Erklärung. */
  level: z.number().int().min(1).max(5),
  kind: z.enum(HINT_LEVELS),
  text: z.string().min(1),
  /** Nur bei Stufe 4 (Teilcode) sinnvoll. */
  code: z.string().optional(),
});

export type Hint = z.infer<typeof hintSchema>;

// ---------------------------------------------------------------------------
// Antwortformate (was die lernende Person einreicht)
// ---------------------------------------------------------------------------

export const submissionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('singleChoice'), optionId: z.string() }),
  z.object({ kind: z.literal('multipleChoice'), optionIds: z.array(z.string()) }),
  z.object({ kind: z.literal('freeText'), text: z.string() }),
  z.object({ kind: z.literal('predictOutput'), output: z.string() }),
  z.object({
    kind: z.literal('parsons'),
    orderedLineIds: z.array(z.string()),
    indents: z.array(z.number().int().min(0).max(4)),
  }),
  z.object({ kind: z.literal('codeCompletion'), values: z.record(z.string(), z.string()) }),
  z.object({ kind: z.literal('findError'), lineNumbers: z.array(z.number().int().min(1)) }),
  z.object({
    kind: z.literal('code'),
    code: z.string(),
    /** Vom Browser-Runner gemeldete Testergebnisse. */
    testResults: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        passed: z.boolean(),
        message: z.string().optional(),
      }),
    ),
    /** Fehlerklasse, die der Runner erkannt hat. */
    runtimeError: z
      .object({
        type: z.string(),
        message: z.string(),
        line: z.number().int().nullable(),
      })
      .nullable()
      .default(null),
  }),
]);

export type Submission = z.infer<typeof submissionSchema>;
