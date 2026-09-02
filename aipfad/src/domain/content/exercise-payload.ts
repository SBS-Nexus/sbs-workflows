import { z } from 'zod';

/**
 * Aufgaben-Nutzlasten.
 *
 * Zwei Achsen werden bewusst getrennt (Muster aus PythonPfad/SQLPfad, siehe
 * docs/ARCHITEKTUR.md §2.6):
 *
 *  - `ExerciseType` (Prisma-Enum) beschreibt die *didaktische Rolle* einer
 *    Aufgabe: Ist das eine Transferaufgabe? Eine verzögerte Wiederholung?
 *    Diese Rolle steuert die Gewichtung im Kompetenzmodell.
 *  - `payload.kind` beschreibt die *Interaktionsform*: Wie wird die Aufgabe
 *    dargestellt und wie wird sie bewertet?
 *
 * Diese Ausbaustufe führt keinen Code aus – alle Interaktionsformen sind
 * deterministisch und werden vollständig serverseitig bewertet.
 */

const choiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  /** Rückmeldung speziell zu dieser Option – auch bei richtigen Optionen. */
  feedback: z.string().min(1),
});

export const singleChoicePayloadSchema = z.object({
  kind: z.literal('singleChoice'),
  /** Optionaler Kontext, auf den sich die Frage bezieht (z. B. ein Beispieltext). */
  context: z.string().optional(),
  options: z.array(choiceOptionSchema).min(2),
  correctOptionId: z.string().min(1),
});

export const multipleChoicePayloadSchema = z.object({
  kind: z.literal('multipleChoice'),
  context: z.string().optional(),
  options: z.array(choiceOptionSchema).min(3),
  correctOptionIds: z.array(z.string().min(1)).min(1),
});

/** Elemente in die richtige Reihenfolge bringen (z. B. Arbeitsschritte). */
export const orderingPayloadSchema = z.object({
  kind: z.literal('ordering'),
  instruction: z.string().min(1),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .min(3),
  /** IDs in korrekter Reihenfolge. */
  correctOrder: z.array(z.string().min(1)).min(3),
});

/** Lückentext – Begriffe in eine Vorlage einsetzen. */
export const fillInPayloadSchema = z.object({
  kind: z.literal('fillIn'),
  /** Vorlage mit Platzhaltern der Form {{blank:id}}. */
  template: z.string().min(1),
  blanks: z
    .array(
      z.object({
        id: z.string().min(1),
        /** Akzeptierte Eingaben (nach Normalisierung: klein geschrieben, getrimmt). */
        accepted: z.array(z.string().min(1)).min(1),
        /** Was diese Lücke fachlich leisten muss. */
        description: z.string().min(1),
        /** Rückmeldung, wenn die Lücke falsch gefüllt ist. */
        wrongHint: z.string().min(1),
      }),
    )
    .min(1),
});

/** Entscheidung in einem beschriebenen Szenario, mit abgestufter Qualität. */
export const scenarioDecisionPayloadSchema = z.object({
  kind: z.literal('scenarioDecision'),
  scenario: z.string().min(30),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
        quality: z.enum(['optimal', 'acceptable', 'problematic']),
        feedback: z.string().min(1),
      }),
    )
    .min(3),
});

/** Deterministischer Terminal-Simulator: ein Dateibaum plus erwartete Befehlsfolge. */
export const terminalSimulationPayloadSchema = z.object({
  kind: z.literal('terminalSimulation'),
  goalDescription: z.string().min(20),
  startingDirectory: z.string().min(1),
  /** Verzeichnisbaum als Pfad -> Dateiinhalt (Ordner: Inhalt `null`). */
  fileSystem: z.record(z.string(), z.string().nullable()),
  /** Im Simulator verfügbare Befehle (Namen ohne Argumente). */
  allowedCommands: z.array(z.string().min(1)).min(1),
  /** Befehle, die eine Warnung auslösen, bevor sie ausgeführt werden. */
  dangerousCommands: z.array(z.string().min(1)).default([]),
  /** Erwartete Befehlszeilen in Reihenfolge (exakter Text nach Trimmen). */
  expectedCommands: z.array(z.string().min(1)).min(1),
});

/** Einen mangelhaften Prompt verbessern – Auswahl unter vorformulierten Varianten. */
export const promptRepairPayloadSchema = z.object({
  kind: z.literal('promptRepair'),
  flawedPrompt: z.string().min(10),
  /** Was an diesem Prompt konkret verbessert werden muss. */
  flaws: z.array(z.string().min(5)).min(1),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(10),
        quality: z.enum(['optimal', 'acceptable', 'problematic']),
        feedback: z.string().min(1),
      }),
    )
    .min(3),
});

// ---------------------------------------------------------------------------
// Interaktionsformen für Git und GitHub
// ---------------------------------------------------------------------------

/**
 * Drei neue Formen decken die Aufgabentypen dieser Ausbaustufe ab, ohne eine
 * zweite Aufgaben-Architektur aufzumachen:
 *
 *  - `interpretation`      etwas Fachliches ANSEHEN und daraus schließen
 *                          (Diff, Commit-Graph, git-status-Ausgabe)
 *  - `classification`      mehrere Dinge in Kategorien einsortieren
 *                          (Dateizustände, Gefährlichkeit von Befehlen)
 *  - `conflictResolution`  je Konfliktstelle bewusst entscheiden
 *
 * Alles andere — Befehlsauswahl, Merge-Entscheidung, Rettungsszenario,
 * Reihenfolge im PR-Ablauf — kommt mit den vorhandenen Formen `singleChoice`,
 * `scenarioDecision` und `ordering` aus.
 */

/** Eine Diff-Zeile in der üblichen Schreibweise mit + und -. */
const diffZeileSchema = z.object({
  marke: z.enum(['kontext', 'hinzu', 'weg']),
  text: z.string(),
});

const diffAnsichtSchema = z.object({
  art: z.literal('diff'),
  pfad: z.string().min(1),
  zeilen: z.array(diffZeileSchema).min(1),
});

const branchGraphAnsichtSchema = z.object({
  art: z.literal('branchGraph'),
  commits: z
    .array(
      z.object({
        id: z.string().min(1),
        nachricht: z.string().min(1),
        eltern: z.array(z.string().min(1)).default([]),
      }),
    )
    .min(2),
  /** Branchname -> Commit-Kennung. */
  branches: z.record(z.string().min(1), z.string().min(1)),
  /** Auf welchem Branch HEAD steht. */
  aktuellerBranch: z.string().min(1),
});

const gitStatusAnsichtSchema = z.object({
  art: z.literal('gitStatus'),
  eintraege: z
    .array(
      z.object({
        pfad: z.string().min(1),
        status: z.enum(['untracked', 'modified', 'staged', 'committed']),
        auchUngestagt: z.boolean().default(false),
      }),
    )
    .min(1),
});

export const ansichtSchema = z.discriminatedUnion('art', [
  diffAnsichtSchema,
  branchGraphAnsichtSchema,
  gitStatusAnsichtSchema,
]);

export type Ansicht = z.infer<typeof ansichtSchema>;

export const interpretationPayloadSchema = z.object({
  kind: z.literal('interpretation'),
  /** Was zu sehen ist. */
  ansicht: ansichtSchema,
  /** Die Frage dazu. */
  frage: z.string().min(10),
  options: z.array(choiceOptionSchema).min(2),
  correctOptionId: z.string().min(1),
});

export const classificationPayloadSchema = z.object({
  kind: z.literal('classification'),
  instruction: z.string().min(10),
  categories: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .min(2),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
        correctCategoryId: z.string().min(1),
        feedback: z.string().min(1),
      }),
    )
    .min(2),
});

/** Ein Abschnitt einer Konfliktdatei — unstrittig oder umkämpft. */
const konfliktAbschnittSchema = z.discriminatedUnion('art', [
  z.object({ art: z.literal('gemeinsam'), zeilen: z.array(z.string()).min(1) }),
  z.object({
    art: z.literal('konflikt'),
    id: z.string().min(1),
    unsere: z.array(z.string()).min(1),
    ihre: z.array(z.string()).min(1),
    /** Welche Auflösung hier fachlich richtig ist. */
    korrekt: z.enum(['unsere', 'ihre', 'beide']),
    feedback: z.string().min(1),
  }),
]);

export const conflictResolutionPayloadSchema = z.object({
  kind: z.literal('conflictResolution'),
  pfad: z.string().min(1),
  /** Beschriftung der Marker, z. B. "HEAD" und "feature/preise". */
  unserLabel: z.string().min(1),
  ihrLabel: z.string().min(1),
  abschnitte: z.array(konfliktAbschnittSchema).min(2),
});

export const exercisePayloadSchema = z.discriminatedUnion('kind', [
  singleChoicePayloadSchema,
  multipleChoicePayloadSchema,
  orderingPayloadSchema,
  fillInPayloadSchema,
  scenarioDecisionPayloadSchema,
  terminalSimulationPayloadSchema,
  promptRepairPayloadSchema,
  interpretationPayloadSchema,
  classificationPayloadSchema,
  conflictResolutionPayloadSchema,
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
});

export type Hint = z.infer<typeof hintSchema>;

// ---------------------------------------------------------------------------
// Antwortformate (was die lernende Person einreicht)
// ---------------------------------------------------------------------------

/**
 * Obergrenzen für eingereichte Antworten.
 *
 * Die eingereichte Antwort wird bewertet UND unverändert in
 * `Attempt.submittedAnswer` gespeichert. Ohne Grenzen kann eine angemeldete
 * Person beliebig lange Zeichenketten und beliebig große Listen schicken —
 * bis zur Transportgrenze, viele Male pro Stunde — und damit Rechenzeit und
 * Speicherplatz unangemessen belegen (Codex-Review auf PR #29, b41d724).
 *
 * Die Werte liegen weit über allem, was die Oberfläche je erzeugt: Kennungen
 * sind kurze Slugs, Lückentexte kurze Wörter, Terminal-Eingaben einzelne
 * Befehlszeilen.
 */
const MAX_KENNUNG = 200;
const MAX_LISTE = 100;
const MAX_EINGABETEXT = 1_000;

const kennung = z.string().min(1).max(MAX_KENNUNG);

export const submissionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('singleChoice'), optionId: kennung }),
  z.object({ kind: z.literal('multipleChoice'), optionIds: z.array(kennung).max(MAX_LISTE) }),
  z.object({ kind: z.literal('ordering'), orderedItemIds: z.array(kennung).max(MAX_LISTE) }),
  z.object({
    kind: z.literal('fillIn'),
    // Auch die ANZAHL der Lücken wird begrenzt: Schlüssel und Werte einzeln
    // zu beschränken lässt sonst noch immer beliebig viele Einträge zu
    // (Codex-Review auf PR #29, 43c8a17).
    values: z
      .record(kennung, z.string().max(MAX_EINGABETEXT))
      .refine((werte) => Object.keys(werte).length <= MAX_LISTE, {
        message: `Höchstens ${MAX_LISTE} Lücken je Antwort.`,
      }),
  }),
  z.object({ kind: z.literal('scenarioDecision'), optionId: kennung }),
  z.object({
    kind: z.literal('terminalSimulation'),
    commands: z.array(z.string().max(MAX_EINGABETEXT)).max(MAX_LISTE),
  }),
  z.object({ kind: z.literal('promptRepair'), optionId: kennung }),
  z.object({ kind: z.literal('interpretation'), optionId: kennung }),
  z.object({
    kind: z.literal('classification'),
    /** Element-Kennung -> gewählte Kategorie. */
    zuordnung: z
      .record(kennung, kennung)
      .refine((werte) => Object.keys(werte).length <= MAX_LISTE, {
        message: `Höchstens ${MAX_LISTE} Zuordnungen je Antwort.`,
      }),
  }),
  z.object({
    kind: z.literal('conflictResolution'),
    /** Konflikt-Kennung -> gewählte Auflösung. */
    entscheidungen: z
      .record(kennung, z.enum(['unsere', 'ihre', 'beide']))
      .refine((werte) => Object.keys(werte).length <= MAX_LISTE, {
        message: `Höchstens ${MAX_LISTE} Konfliktstellen je Antwort.`,
      }),
  }),
]);

export type Submission = z.infer<typeof submissionSchema>;
