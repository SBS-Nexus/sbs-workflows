import type { ExercisePayload, Submission } from '@/domain/content/exercise-payload';
import type { ErrorCategoryName } from '@/domain/mastery/mastery';

/**
 * Bewertung einer eingereichten Lösung. Muster aus PythonPfad/SQLPfad (siehe
 * docs/ARCHITEKTUR.md §2.7): eine reine Funktion ohne Datenbank- oder
 * Netzwerkzugriff, die ausschließlich auf dem Server läuft. Die richtigen
 * Antworten liegen dadurch nie im Browser vor – siehe `toPublicPayload()`
 * unten für die Funktion, die das technisch erzwingt.
 *
 * Diese Ausbaustufe führt keinen Code aus; alle Interaktionsformen sind
 * deterministisch (Auswahl, Reihenfolge, Lückentext, Szenario, Terminal,
 * Prompt-Reparatur).
 */

export type GradeOutcome = 'PASSED' | 'PARTIAL' | 'FAILED';

export interface FeedbackItem {
  /** Steuert Symbol und Farbe – aber nie Farbe allein (Barrierefreiheit). */
  tone: 'success' | 'issue' | 'info';
  message: string;
}

export interface GradingResult {
  outcome: GradeOutcome;
  /** 0.0 bis 1.0 – Grundlage für die Kompetenzberechnung. */
  score: number;
  errorType: ErrorCategoryName;
  feedback: FeedbackItem[];
  /** Kennzeichnungen für das UI. Enthält bewusst keine richtigen Antworten. */
  marks: Record<string, boolean>;
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('de-DE')
    .replace(/[.,;:!?"'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface GradeInput {
  payload: ExercisePayload;
  submission: Submission;
}

export function gradeSubmission({ payload, submission }: GradeInput): GradingResult {
  if (payload.kind !== submission.kind) {
    return {
      outcome: 'FAILED',
      score: 0,
      errorType: 'NONE',
      feedback: [
        {
          tone: 'issue',
          message:
            'Die eingereichte Antwort passt nicht zur Aufgabenform. Bitte lade die Aufgabe neu.',
        },
      ],
      marks: {},
    };
  }

  switch (payload.kind) {
    case 'singleChoice':
      return gradeSingleChoice(
        payload,
        submission as Extract<Submission, { kind: 'singleChoice' }>,
      );
    case 'multipleChoice':
      return gradeMultipleChoice(
        payload,
        submission as Extract<Submission, { kind: 'multipleChoice' }>,
      );
    case 'ordering':
      return gradeOrdering(payload, submission as Extract<Submission, { kind: 'ordering' }>);
    case 'fillIn':
      return gradeFillIn(payload, submission as Extract<Submission, { kind: 'fillIn' }>);
    case 'scenarioDecision':
      return gradeQualityChoice(
        payload.options,
        (submission as Extract<Submission, { kind: 'scenarioDecision' }>).optionId,
      );
    case 'promptRepair':
      return gradeQualityChoice(
        payload.options,
        (submission as Extract<Submission, { kind: 'promptRepair' }>).optionId,
      );
    case 'terminalSimulation':
      return gradeTerminalSimulation(
        payload,
        submission as Extract<Submission, { kind: 'terminalSimulation' }>,
      );
    case 'interpretation':
      return gradeInterpretation(
        payload,
        submission as Extract<Submission, { kind: 'interpretation' }>,
      );
    case 'classification':
      return gradeClassification(
        payload,
        submission as Extract<Submission, { kind: 'classification' }>,
      );
    case 'conflictResolution':
      return gradeConflictResolution(
        payload,
        submission as Extract<Submission, { kind: 'conflictResolution' }>,
      );
  }
}

/**
 * Eine Interpretationsaufgabe wird wie eine Einfachauswahl bewertet — der
 * Unterschied liegt nicht in der Bewertung, sondern in dem, was zu sehen ist.
 */
function gradeInterpretation(
  payload: Extract<ExercisePayload, { kind: 'interpretation' }>,
  submission: Extract<Submission, { kind: 'interpretation' }>,
): GradingResult {
  const chosen = payload.options.find((o) => o.id === submission.optionId);
  const correct = submission.optionId === payload.correctOptionId;

  return {
    outcome: correct ? 'PASSED' : 'FAILED',
    score: correct ? 1 : 0,
    errorType: correct ? 'NONE' : 'MISCONCEPTION',
    feedback: [
      chosen
        ? { tone: correct ? 'success' : 'issue', message: chosen.feedback }
        : { tone: 'issue', message: 'Es wurde keine Antwort ausgewählt.' },
    ],
    marks: { [submission.optionId]: correct },
  };
}

/**
 * Einsortieren: Jedes Element zählt einzeln. Teilweise richtig ist hier eine
 * ehrliche Zwischenstufe — wer vier von fünf Dateizuständen trifft, hat das
 * Modell im Kern verstanden und an einer Stelle danebengegriffen.
 */
function gradeClassification(
  payload: Extract<ExercisePayload, { kind: 'classification' }>,
  submission: Extract<Submission, { kind: 'classification' }>,
): GradingResult {
  const marks: Record<string, boolean> = {};
  const feedback: FeedbackItem[] = [];
  let richtig = 0;

  for (const item of payload.items) {
    const gewaehlt = submission.zuordnung[item.id];
    const trifftZu = gewaehlt === item.correctCategoryId;
    marks[item.id] = trifftZu;
    if (trifftZu) richtig += 1;
    else feedback.push({ tone: 'issue', message: `${item.text}: ${item.feedback}` });
  }

  const alleRichtig = richtig === payload.items.length;
  if (alleRichtig) {
    feedback.unshift({ tone: 'success', message: 'Alle Zuordnungen stimmen.' });
  } else {
    feedback.unshift({
      tone: 'info',
      message: `${richtig} von ${payload.items.length} richtig zugeordnet.`,
    });
  }

  const anteil = richtig / payload.items.length;
  const teilweise = anteil >= 0.5;

  return {
    outcome: alleRichtig ? 'PASSED' : teilweise ? 'PARTIAL' : 'FAILED',
    score: alleRichtig ? 1 : teilweise ? anteil * 0.6 : 0,
    errorType: alleRichtig ? 'NONE' : teilweise ? 'INCOMPLETE' : 'MISCONCEPTION',
    feedback,
    marks,
  };
}

/**
 * Konfliktauflösung: je Konfliktstelle eine bewusste Entscheidung. Bewertet
 * wird, ob die fachlich richtige Fassung gewählt wurde — nicht, ob überhaupt
 * etwas gewählt wurde.
 */
function gradeConflictResolution(
  payload: Extract<ExercisePayload, { kind: 'conflictResolution' }>,
  submission: Extract<Submission, { kind: 'conflictResolution' }>,
): GradingResult {
  const konflikte = payload.abschnitte.filter(
    (a): a is Extract<(typeof payload.abschnitte)[number], { art: 'konflikt' }> =>
      a.art === 'konflikt',
  );

  const marks: Record<string, boolean> = {};
  const feedback: FeedbackItem[] = [];
  let richtig = 0;

  for (const konflikt of konflikte) {
    const gewaehlt = submission.entscheidungen[konflikt.id];
    const trifftZu = gewaehlt === konflikt.korrekt;
    marks[konflikt.id] = trifftZu;
    if (trifftZu) richtig += 1;
    else feedback.push({ tone: 'issue', message: konflikt.feedback });
  }

  const alleRichtig = richtig === konflikte.length;
  if (alleRichtig) {
    feedback.unshift({
      tone: 'success',
      message: 'Jede Konfliktstelle ist bewusst und richtig entschieden.',
    });
  }

  const anteil = konflikte.length === 0 ? 0 : richtig / konflikte.length;
  const teilweise = !alleRichtig && anteil >= 0.5;

  return {
    outcome: alleRichtig ? 'PASSED' : teilweise ? 'PARTIAL' : 'FAILED',
    score: alleRichtig ? 1 : teilweise ? anteil * 0.6 : 0,
    errorType: alleRichtig ? 'NONE' : teilweise ? 'INCOMPLETE' : 'MISCONCEPTION',
    feedback,
    marks,
  };
}

// ---------------------------------------------------------------------------

function gradeSingleChoice(
  payload: Extract<ExercisePayload, { kind: 'singleChoice' }>,
  submission: Extract<Submission, { kind: 'singleChoice' }>,
): GradingResult {
  const chosen = payload.options.find((o) => o.id === submission.optionId);
  const correct = submission.optionId === payload.correctOptionId;

  const feedback: FeedbackItem[] = [];
  if (chosen) {
    feedback.push({ tone: correct ? 'success' : 'issue', message: chosen.feedback });
  } else {
    feedback.push({ tone: 'issue', message: 'Es wurde keine Antwort ausgewählt.' });
  }

  return {
    outcome: correct ? 'PASSED' : 'FAILED',
    score: correct ? 1 : 0,
    errorType: correct ? 'NONE' : 'MISCONCEPTION',
    feedback,
    marks: { [submission.optionId]: correct },
  };
}

function gradeMultipleChoice(
  payload: Extract<ExercisePayload, { kind: 'multipleChoice' }>,
  submission: Extract<Submission, { kind: 'multipleChoice' }>,
): GradingResult {
  const correctSet = new Set(payload.correctOptionIds);
  const chosenSet = new Set(submission.optionIds);

  const missed = payload.correctOptionIds.filter((id) => !chosenSet.has(id));
  const wrong = submission.optionIds.filter((id) => !correctSet.has(id));

  const total = payload.options.length;
  const correctDecisions = payload.options.filter(
    (o) => correctSet.has(o.id) === chosenSet.has(o.id),
  ).length;

  const allRight = missed.length === 0 && wrong.length === 0;
  const feedback: FeedbackItem[] = [];

  if (allRight) {
    feedback.push({ tone: 'success', message: 'Alle zutreffenden Aussagen sind ausgewählt.' });
    for (const id of payload.correctOptionIds) {
      const option = payload.options.find((o) => o.id === id);
      if (option) feedback.push({ tone: 'info', message: option.feedback });
    }
  } else {
    for (const id of wrong) {
      const option = payload.options.find((o) => o.id === id);
      if (option) feedback.push({ tone: 'issue', message: option.feedback });
    }
    if (missed.length > 0) {
      feedback.push({
        tone: 'issue',
        message:
          missed.length === 1
            ? 'Eine zutreffende Aussage fehlt noch. Gehe die Optionen einzeln durch und prüfe jede für sich.'
            : `Es fehlen noch ${missed.length} zutreffende Aussagen. Gehe die Optionen einzeln durch und prüfe jede für sich.`,
      });
    }
  }

  const marks: Record<string, boolean> = {};
  for (const option of payload.options) {
    if (chosenSet.has(option.id)) marks[option.id] = correctSet.has(option.id);
  }

  const partial = correctDecisions > total / 2;

  return {
    outcome: allRight ? 'PASSED' : partial ? 'PARTIAL' : 'FAILED',
    score: allRight ? 1 : Math.max(0, (correctDecisions - total / 2) / (total / 2)) * 0.6,
    errorType: allRight ? 'NONE' : partial ? 'INCOMPLETE' : 'MISCONCEPTION',
    feedback,
    marks,
  };
}

function gradeOrdering(
  payload: Extract<ExercisePayload, { kind: 'ordering' }>,
  submission: Extract<Submission, { kind: 'ordering' }>,
): GradingResult {
  const expected = payload.correctOrder;
  const given = submission.orderedItemIds;
  const correct =
    given.length === expected.length && given.every((id, index) => id === expected[index]);
  const matchingPositions = expected.filter((id, index) => given[index] === id).length;

  const feedback: FeedbackItem[] = [];
  if (correct) {
    feedback.push({ tone: 'success', message: 'Die Reihenfolge ist korrekt.' });
  } else if (given.length < expected.length) {
    feedback.push({
      tone: 'issue',
      message: `Es fehlen noch ${expected.length - given.length} Element(e) in der Reihenfolge.`,
    });
  } else {
    const firstWrong = given.findIndex((id, index) => id !== expected[index]);
    feedback.push({
      tone: 'issue',
      message:
        firstWrong <= 0
          ? 'Schon der erste Schritt passt noch nicht. Frage dich: Was muss zuerst feststehen, bevor alles andere folgen kann?'
          : `Die ersten ${firstWrong} Schritte stehen richtig. Ab Position ${firstWrong + 1} stimmt die Reihenfolge nicht.`,
    });
  }

  return {
    outcome: correct ? 'PASSED' : matchingPositions > 0 ? 'PARTIAL' : 'FAILED',
    score: correct ? 1 : (matchingPositions / expected.length) * 0.5,
    errorType: correct ? 'NONE' : matchingPositions > 0 ? 'INCOMPLETE' : 'MISCONCEPTION',
    feedback,
    marks: {},
  };
}

function gradeFillIn(
  payload: Extract<ExercisePayload, { kind: 'fillIn' }>,
  submission: Extract<Submission, { kind: 'fillIn' }>,
): GradingResult {
  const marks: Record<string, boolean> = {};
  const feedback: FeedbackItem[] = [];
  let hit = 0;

  for (const blank of payload.blanks) {
    const value = (submission.values[blank.id] ?? '').trim();
    const matched = blank.accepted.some(
      (accepted) => normalizeText(value) === normalizeText(accepted),
    );

    marks[blank.id] = matched;
    if (matched) {
      hit += 1;
    } else if (value.length === 0) {
      feedback.push({ tone: 'issue', message: `Lücke "${blank.description}" ist noch leer.` });
    } else {
      feedback.push({ tone: 'issue', message: blank.wrongHint });
    }
  }

  const total = payload.blanks.length;
  const correct = hit === total;
  if (correct) {
    feedback.push({ tone: 'success', message: 'Alle Lücken sind sinnvoll gefüllt.' });
  }

  return {
    outcome: correct ? 'PASSED' : hit > 0 ? 'PARTIAL' : 'FAILED',
    score: correct ? 1 : (hit / total) * 0.5,
    errorType: correct ? 'NONE' : hit > 0 ? 'INCOMPLETE' : 'MISCONCEPTION',
    feedback,
    marks,
  };
}

/** Gemeinsame Bewertung für Szenario- und Prompt-Reparatur-Aufgaben: eine
 * Auswahl unter abgestuften Optionen (optimal/acceptable/problematic). */
function gradeQualityChoice(
  options: ReadonlyArray<{ id: string; feedback: string; quality: string }>,
  chosenId: string,
): GradingResult {
  const chosen = options.find((o) => o.id === chosenId);

  if (!chosen) {
    return {
      outcome: 'FAILED',
      score: 0,
      errorType: 'MISCONCEPTION',
      feedback: [{ tone: 'issue', message: 'Es wurde keine Option ausgewählt.' }],
      marks: {},
    };
  }

  const outcome: GradeOutcome =
    chosen.quality === 'optimal'
      ? 'PASSED'
      : chosen.quality === 'acceptable'
        ? 'PARTIAL'
        : 'FAILED';
  const score = chosen.quality === 'optimal' ? 1 : chosen.quality === 'acceptable' ? 0.6 : 0;
  const errorType: ErrorCategoryName =
    chosen.quality === 'optimal'
      ? 'NONE'
      : chosen.quality === 'acceptable'
        ? 'INCOMPLETE'
        : 'MISCONCEPTION';

  return {
    outcome,
    score,
    errorType,
    feedback: [
      {
        tone: outcome === 'PASSED' ? 'success' : outcome === 'PARTIAL' ? 'info' : 'issue',
        message: chosen.feedback,
      },
    ],
    marks: { [chosenId]: outcome === 'PASSED' },
  };
}

function gradeTerminalSimulation(
  payload: Extract<ExercisePayload, { kind: 'terminalSimulation' }>,
  submission: Extract<Submission, { kind: 'terminalSimulation' }>,
): GradingResult {
  const expected = payload.expectedCommands.map((c) => c.trim());
  const given = submission.commands.map((c) => c.trim());

  const correct =
    given.length === expected.length && given.every((cmd, index) => cmd === expected[index]);
  const matchingPrefix = expected.findIndex((cmd, index) => given[index] !== cmd);
  const matched = matchingPrefix === -1 ? expected.length : matchingPrefix;

  const feedback: FeedbackItem[] = [];
  if (correct) {
    feedback.push({
      tone: 'success',
      message: 'Das Ziel ist mit den richtigen Befehlen erreicht.',
    });
  } else if (matched === 0) {
    feedback.push({
      tone: 'issue',
      message:
        'Schon der erste Befehl führt nicht zum Ziel. Lies die Aufgabenstellung noch einmal und prüfe, in welchem Verzeichnis du startest.',
    });
  } else if (matched < expected.length) {
    feedback.push({
      tone: 'issue',
      message: `Die ersten ${matched} Befehle sind richtig. Danach weicht die Befehlsfolge vom Ziel ab.`,
    });
  } else {
    feedback.push({
      tone: 'issue',
      message:
        'Die richtigen Befehle sind dabei, aber es kommen zusätzliche oder fehlende Schritte vor.',
    });
  }

  return {
    outcome: correct ? 'PASSED' : matched > 0 ? 'PARTIAL' : 'FAILED',
    score: correct ? 1 : (matched / expected.length) * 0.5,
    errorType: correct ? 'NONE' : matched > 0 ? 'INCOMPLETE' : 'MISCONCEPTION',
    feedback,
    marks: {},
  };
}

// ---------------------------------------------------------------------------
// Öffentliche Nutzlast – entfernt alles, was die Lösung verrät
// ---------------------------------------------------------------------------

/**
 * Entfernt aus einer Aufgaben-Nutzlast alles, was die Lösung verrät, bevor sie
 * den Server verlässt: richtige Optionen, korrekte Reihenfolge, akzeptierte
 * Lückenfüllungen, Qualitätsbewertungen und Rückmeldungstexte der Optionen
 * (die werden erst NACH der Bewertung über `gradeSubmission()`s Ergebnis
 * ausgeliefert), sowie die erwartete Befehlsfolge im Terminal-Simulator.
 */
export function toPublicPayload(payload: ExercisePayload): unknown {
  switch (payload.kind) {
    case 'singleChoice':
      return {
        kind: payload.kind,
        context: payload.context,
        options: payload.options.map((o) => ({ id: o.id, text: o.text })),
      };
    case 'multipleChoice':
      return {
        kind: payload.kind,
        context: payload.context,
        options: payload.options.map((o) => ({ id: o.id, text: o.text })),
      };
    case 'ordering':
      return {
        kind: payload.kind,
        instruction: payload.instruction,
        items: praesentationsReihenfolge(
          payload.items.map((i) => ({ id: i.id, text: i.text })),
          payload.correctOrder,
        ),
      };
    case 'fillIn':
      return {
        kind: payload.kind,
        template: payload.template,
        blanks: payload.blanks.map((b) => ({ id: b.id, description: b.description })),
      };
    case 'scenarioDecision':
      return {
        kind: payload.kind,
        scenario: payload.scenario,
        options: payload.options.map((o) => ({ id: o.id, text: o.text })),
      };
    case 'terminalSimulation':
      return {
        kind: payload.kind,
        goalDescription: payload.goalDescription,
        startingDirectory: payload.startingDirectory,
        fileSystem: payload.fileSystem,
        allowedCommands: payload.allowedCommands,
        dangerousCommands: payload.dangerousCommands,
      };
    case 'promptRepair':
      return {
        kind: payload.kind,
        flawedPrompt: payload.flawedPrompt,
        flaws: payload.flaws,
        options: payload.options.map((o) => ({ id: o.id, text: o.text })),
      };
    case 'interpretation':
      return {
        kind: payload.kind,
        ansicht: payload.ansicht,
        frage: payload.frage,
        options: payload.options.map((o) => ({ id: o.id, text: o.text })),
      };
    case 'classification':
      return {
        kind: payload.kind,
        instruction: payload.instruction,
        categories: payload.categories.map((c) => ({
          id: c.id,
          label: c.label,
          description: c.description,
        })),
        // `correctCategoryId` und `feedback` bleiben ausdrücklich hier.
        items: payload.items.map((i) => ({ id: i.id, text: i.text })),
      };
    case 'conflictResolution':
      return {
        kind: payload.kind,
        pfad: payload.pfad,
        unserLabel: payload.unserLabel,
        ihrLabel: payload.ihrLabel,
        abschnitte: payload.abschnitte.map((a) =>
          a.art === 'gemeinsam'
            ? { art: a.art, zeilen: a.zeilen }
            : // `korrekt` und `feedback` verlassen den Server nicht.
              { art: a.art, id: a.id, unsere: a.unsere, ihre: a.ihre },
        ),
      };
    default:
      // Erzwingt, dass jede neue Interaktionsform hier bewusst behandelt wird.
      // Der Rückgabetyp ist `unknown`, deshalb würde ein vergessener Fall sonst
      // stillschweigend `undefined` liefern — und im Browser eine leere Aufgabe.
      return unbehandelteForm(payload);
  }
}

function unbehandelteForm(payload: never): never {
  throw new Error(
    `Interaktionsform ohne öffentliche Fassung: ${JSON.stringify(payload).slice(0, 80)}`,
  );
}

/**
 * Deterministisch gemischt (kein `Math.random` – Testbarkeit).
 *
 * Früher wurde schlicht nach ID sortiert. Die Reihenfolge hing damit
 * vollständig an den von der Redaktion vergebenen IDs: Wer die Elemente in
 * Lösungsreihenfolge benennt (`s1`, `s2`, `s3` … – die naheliegende
 * Konvention), lieferte dem Browser die bereits richtig sortierte Liste aus
 * und gab damit die Lösung preis, ohne dass irgendetwas es bemerkt hätte
 * (Sicherheitsprüfung zu PR #29). Jetzt bestimmt ein aus den IDs abgeleiteter
 * Streuwert die Reihenfolge: weiterhin für dieselbe Aufgabe stets identisch,
 * aber ohne sichtbaren Zusammenhang zur Reihenfolge der Vorlage.
 */
function shuffle<T extends { id: string }>(items: T[]): T[] {
  const saat = items.map((i) => i.id).join('|');
  return [...items]
    .map((item) => ({ item, rang: hashCode(`${saat}#${item.id}`) }))
    .sort((a, b) => a.rang - b.rang || a.item.id.localeCompare(b.item.id))
    .map(({ item }) => item);
}

/**
 * Die tatsächlich ausgelieferte Reihenfolge einer `ordering`-Aufgabe.
 *
 * Ein Mischverfahren allein genügt nicht: Es kann zufällig genau die
 * Lösungsreihenfolge treffen, und dann läge die Antwort offen im Browser.
 * Trifft es zu, wird um eine Position rotiert — bei mindestens zwei Elementen
 * ist das Ergebnis dadurch garantiert verschieden von der Lösung und bleibt
 * für dieselbe Aufgabe stabil. `tests/unit/content-validation.test.ts` prüft
 * diese Zusicherung gegen den echten Kursinhalt.
 */
function praesentationsReihenfolge<T extends { id: string }>(
  items: T[],
  correctOrder: string[],
): T[] {
  const gemischt = shuffle(items);
  const istLoesung =
    gemischt.length === correctOrder.length &&
    gemischt.every((item, index) => item.id === correctOrder[index]);

  if (!istLoesung || gemischt.length < 2) return gemischt;

  const [erstes, ...rest] = gemischt;
  return erstes === undefined ? gemischt : [...rest, erstes];
}

/** Kleiner, stabiler Streuwert (FNV-1a) – gleiche Eingabe, gleicher Wert. */
function hashCode(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}
