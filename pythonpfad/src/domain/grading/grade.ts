import type { ExercisePayload, Submission, TestCase } from '@/domain/content/exercise-payload';
import type { ErrorCategoryName } from '@/domain/errors/python-errors';

/**
 * Bewertung einer eingereichten Lösung.
 *
 * Die Bewertung ist eine reine Funktion ohne Datenbank- oder Netzwerkzugriff.
 * Sie läuft ausschließlich auf dem Server: Bei Auswahl-, Text-, Parsons-,
 * Lücken- und Fehlersuchaufgaben liegen die richtigen Antworten damit nie im
 * Browser vor.
 *
 * Bei Code-Aufgaben führt der Browser die Tests aus (Pyodide). Der Server
 * bewertet die gemeldeten Testergebnisse und prüft zusätzlich die
 * Quelltextregeln (`sourceChecks`) selbst nach – siehe SICHERHEIT.md zu den
 * Grenzen dieses Modells.
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
  passedTests: number;
  totalTests: number;
  errorType: ErrorCategoryName;
  feedback: FeedbackItem[];
  /**
   * Kennzeichnungen für das UI, z. B. welche Lücke falsch war.
   * Enthält bewusst keine richtigen Antworten.
   */
  marks: Record<string, boolean>;
}

/** Vergleichsnormalisierung für Programmausgaben. */
export function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
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
  /** Alle Tests (sichtbar + versteckt) – nur für Code-Aufgaben relevant. */
  allTests?: TestCase[];
}

export function gradeSubmission({ payload, submission, allTests = [] }: GradeInput): GradingResult {
  if (payload.kind !== submission.kind) {
    return {
      outcome: 'FAILED',
      score: 0,
      passedTests: 0,
      totalTests: 1,
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
    case 'freeText':
      return gradeFreeText(payload, submission as Extract<Submission, { kind: 'freeText' }>);
    case 'predictOutput':
      return gradePredictOutput(
        payload,
        submission as Extract<Submission, { kind: 'predictOutput' }>,
      );
    case 'parsons':
      return gradeParsons(payload, submission as Extract<Submission, { kind: 'parsons' }>);
    case 'codeCompletion':
      return gradeCodeCompletion(
        payload,
        submission as Extract<Submission, { kind: 'codeCompletion' }>,
      );
    case 'findError':
      return gradeFindError(payload, submission as Extract<Submission, { kind: 'findError' }>);
    case 'code':
      return gradeCode(payload, submission as Extract<Submission, { kind: 'code' }>, allTests);
  }
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
    passedTests: correct ? 1 : 0,
    totalTests: 1,
    errorType: correct ? 'NONE' : 'CONCEPT',
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
  // Jede Option zählt einzeln: richtig ausgewählt bzw. richtig nicht ausgewählt.
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

  return {
    outcome: allRight ? 'PASSED' : correctDecisions > total / 2 ? 'PARTIAL' : 'FAILED',
    score: allRight ? 1 : Math.max(0, (correctDecisions - total / 2) / (total / 2)) * 0.6,
    passedTests: correctDecisions,
    totalTests: total,
    errorType: allRight ? 'NONE' : 'CONCEPT',
    feedback,
    marks,
  };
}

function gradeFreeText(
  payload: Extract<ExercisePayload, { kind: 'freeText' }>,
  submission: Extract<Submission, { kind: 'freeText' }>,
): GradingResult {
  const text = normalizeText(submission.text);
  const raw = submission.text.trim();

  if (raw.length === 0) {
    return {
      outcome: 'FAILED',
      score: 0,
      passedTests: 0,
      totalTests: payload.requiredKeywordGroups.length,
      errorType: 'EMPTY_SUBMISSION',
      feedback: [
        {
          tone: 'issue',
          message:
            'Es wurde nichts eingegeben. Formuliere ruhig in eigenen Worten – die Formulierung muss nicht perfekt sein.',
        },
      ],
      marks: {},
    };
  }

  const marks: Record<string, boolean> = {};
  const missing: string[] = [];
  let hit = 0;

  for (const group of payload.requiredKeywordGroups) {
    const matched = group.anyOf.some((keyword) => text.includes(normalizeText(keyword)));
    marks[group.id] = matched;
    if (matched) hit += 1;
    else missing.push(group.missingHint);
  }

  const tooShort = raw.length < payload.minLength;
  const total = payload.requiredKeywordGroups.length;
  const allHit = hit === total && !tooShort;

  const feedback: FeedbackItem[] = [];
  if (allHit) {
    feedback.push({
      tone: 'success',
      message: 'Die Erklärung enthält die wesentlichen Punkte.',
    });
  } else {
    if (tooShort) {
      feedback.push({
        tone: 'issue',
        message: `Die Antwort ist sehr knapp (${raw.length} Zeichen). Erwartet werden mindestens ${payload.minLength}. Erkläre auch das Warum, nicht nur das Was.`,
      });
    }
    for (const hint of missing) {
      feedback.push({ tone: 'issue', message: hint });
    }
  }

  return {
    outcome: allHit ? 'PASSED' : hit > 0 ? 'PARTIAL' : 'FAILED',
    score: allHit ? 1 : (hit / total) * 0.6,
    passedTests: hit,
    totalTests: total,
    errorType: allHit ? 'NONE' : 'CONCEPT',
    feedback,
    marks,
  };
}

function gradePredictOutput(
  payload: Extract<ExercisePayload, { kind: 'predictOutput' }>,
  submission: Extract<Submission, { kind: 'predictOutput' }>,
): GradingResult {
  const expected = normalizeOutput(payload.expectedOutput);
  const actual = normalizeOutput(submission.output);
  const correct = expected === actual;

  const feedback: FeedbackItem[] = [];
  if (correct) {
    feedback.push({ tone: 'success', message: 'Die Vorhersage stimmt genau.' });
    feedback.push({ tone: 'info', message: payload.explanation });
  } else {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');

    if (expectedLines.length !== actualLines.length) {
      feedback.push({
        tone: 'issue',
        message: `Die Anzahl der Ausgabezeilen weicht ab: erwartet werden ${expectedLines.length}, vorhergesagt wurden ${actualLines.length}. Zähle nach, wie oft print() tatsächlich ausgeführt wird.`,
      });
    } else {
      const firstDiff = expectedLines.findIndex((line, i) => line !== actualLines[i]);
      if (firstDiff >= 0) {
        feedback.push({
          tone: 'issue',
          message: `Bis Zeile ${firstDiff} stimmt die Vorhersage. Ab Zeile ${firstDiff + 1} weicht sie ab. Gehe den Code ab dieser Stelle Schritt für Schritt durch und notiere die Werte der beteiligten Variablen.`,
        });
      }
    }
    feedback.push({
      tone: 'info',
      message:
        'Führe den Code danach aus und vergleiche. Der Unterschied zwischen Erwartung und Ergebnis ist die eigentliche Lernstelle.',
    });
  }

  return {
    outcome: correct ? 'PASSED' : 'FAILED',
    score: correct ? 1 : 0,
    passedTests: correct ? 1 : 0,
    totalTests: 1,
    errorType: correct ? 'NONE' : 'LOGIC',
    feedback,
    marks: {},
  };
}

function gradeParsons(
  payload: Extract<ExercisePayload, { kind: 'parsons' }>,
  submission: Extract<Submission, { kind: 'parsons' }>,
): GradingResult {
  const expected = payload.correctOrder;
  const given = submission.orderedLineIds;
  const distractorIds = new Set(payload.lines.filter((l) => l.distractor).map((l) => l.id));

  const usedDistractors = given.filter((id) => distractorIds.has(id));
  const orderCorrect =
    given.length === expected.length && given.every((id, index) => id === expected[index]);

  let indentCorrect = true;
  if (payload.checkIndentation && orderCorrect) {
    indentCorrect = expected.every((id, index) => {
      const line = payload.lines.find((l) => l.id === id);
      return line ? submission.indents[index] === line.indent : false;
    });
  }

  const correct = orderCorrect && indentCorrect && usedDistractors.length === 0;
  const feedback: FeedbackItem[] = [];

  if (correct) {
    feedback.push({ tone: 'success', message: 'Reihenfolge und Einrückung sind korrekt.' });
  } else {
    if (usedDistractors.length > 0) {
      feedback.push({
        tone: 'issue',
        message: `${usedDistractors.length === 1 ? 'Eine Zeile gehört' : `${usedDistractors.length} Zeilen gehören`} nicht in die Lösung. Prüfe für jede Zeile: Welchen Beitrag leistet sie zum Ziel?`,
      });
    }
    if (given.length < expected.length) {
      feedback.push({
        tone: 'issue',
        message: `Es fehlen noch ${expected.length - given.length} Zeile(n) in der Lösung.`,
      });
    }
    if (orderCorrect && !indentCorrect) {
      feedback.push({
        tone: 'issue',
        message:
          'Die Reihenfolge stimmt, die Einrückung noch nicht. Überlege bei jeder Zeile: Soll sie in jedem Durchlauf ausgeführt werden oder nur einmal danach?',
      });
    } else if (!orderCorrect && usedDistractors.length === 0) {
      const firstWrong = given.findIndex((id, index) => id !== expected[index]);
      feedback.push({
        tone: 'issue',
        message:
          firstWrong <= 0
            ? 'Schon die erste Zeile passt noch nicht. Frage dich: Was muss existieren, bevor irgendetwas anderes passieren kann?'
            : `Die ersten ${firstWrong} Zeilen stehen richtig. Ab Position ${firstWrong + 1} stimmt die Reihenfolge nicht.`,
      });
    }
  }

  const matchingPositions = expected.filter((id, index) => given[index] === id).length;

  return {
    outcome: correct ? 'PASSED' : matchingPositions > 0 ? 'PARTIAL' : 'FAILED',
    score: correct ? 1 : (matchingPositions / expected.length) * 0.5,
    passedTests: matchingPositions,
    totalTests: expected.length,
    errorType: correct ? 'NONE' : 'LOGIC',
    feedback,
    marks: {},
  };
}

function gradeCodeCompletion(
  payload: Extract<ExercisePayload, { kind: 'codeCompletion' }>,
  submission: Extract<Submission, { kind: 'codeCompletion' }>,
): GradingResult {
  const marks: Record<string, boolean> = {};
  const feedback: FeedbackItem[] = [];
  let hit = 0;

  for (const blank of payload.blanks) {
    const value = (submission.values[blank.id] ?? '').trim();
    const candidate = blank.caseSensitive ? value : value.toLocaleLowerCase('de-DE');
    const matched = blank.accepted.some((accepted) => {
      const target = blank.caseSensitive ? accepted : accepted.toLocaleLowerCase('de-DE');
      return normalizeCode(candidate) === normalizeCode(target);
    });

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
    passedTests: hit,
    totalTests: total,
    errorType: correct ? 'NONE' : 'CONCEPT',
    feedback,
    marks,
  };
}

/** Entfernt Leerraum-Unterschiede, die für Python bedeutungslos sind. */
function normalizeCode(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),:=<>+\-*/])\s*/g, '$1')
    .trim();
}

function gradeFindError(
  payload: Extract<ExercisePayload, { kind: 'findError' }>,
  submission: Extract<Submission, { kind: 'findError' }>,
): GradingResult {
  const expected = new Set(payload.faultyLineNumbers);
  const given = new Set(submission.lineNumbers);

  const found = [...expected].filter((line) => given.has(line));
  const falsePositives = [...given].filter((line) => !expected.has(line));
  const correct = found.length === expected.size && falsePositives.length === 0;

  const feedback: FeedbackItem[] = [];
  if (correct) {
    feedback.push({ tone: 'success', message: 'Die fehlerhafte Stelle ist richtig eingegrenzt.' });
    feedback.push({ tone: 'info', message: payload.explanation });
  } else {
    if (found.length === 0) {
      feedback.push({
        tone: 'issue',
        message:
          'Die markierte Stelle ist nicht die Ursache. Gehe den Code Zeile für Zeile durch und notiere, welchen Wert jede Variable an dieser Stelle hat.',
      });
    } else if (found.length < expected.size) {
      feedback.push({
        tone: 'issue',
        message: `Eine fehlerhafte Zeile ist gefunden, ${expected.size - found.length} weitere noch nicht.`,
      });
    }
    if (falsePositives.length > 0) {
      feedback.push({
        tone: 'issue',
        message: `${falsePositives.length === 1 ? 'Eine markierte Zeile ist' : `${falsePositives.length} markierte Zeilen sind`} in Ordnung. Prüfe bei jeder Markierung: Was genau ginge hier schief?`,
      });
    }
  }

  return {
    outcome: correct ? 'PASSED' : found.length > 0 ? 'PARTIAL' : 'FAILED',
    score: correct ? 1 : (found.length / expected.size) * 0.5,
    passedTests: found.length,
    totalTests: expected.size,
    errorType: correct ? 'NONE' : 'LOGIC',
    feedback,
    marks: Object.fromEntries([...given].map((line) => [String(line), expected.has(line)])),
  };
}

function gradeCode(
  payload: Extract<ExercisePayload, { kind: 'code' }>,
  submission: Extract<Submission, { kind: 'code' }>,
  allTests: TestCase[],
): GradingResult {
  const code = submission.code.trim();
  const feedback: FeedbackItem[] = [];

  if (code.length === 0) {
    return {
      outcome: 'FAILED',
      score: 0,
      passedTests: 0,
      totalTests: Math.max(1, allTests.length),
      errorType: 'EMPTY_SUBMISSION',
      feedback: [
        {
          tone: 'issue',
          message:
            'Der Editor ist leer. Fange mit dem an, was du sicher weißt – auch eine unvollständige Zeile ist ein Anfang.',
        },
      ],
      marks: {},
    };
  }

  // --- Quelltextregeln serverseitig prüfen ---------------------------------
  const violatedChecks: string[] = [];
  for (const check of payload.sourceChecks) {
    if (check.mustMatch && !new RegExp(check.mustMatch, 'm').test(code)) {
      violatedChecks.push(check.message);
    }
    if (check.mustNotMatch && new RegExp(check.mustNotMatch, 'm').test(code)) {
      violatedChecks.push(check.message);
    }
  }

  // --- Testergebnisse auswerten -------------------------------------------
  const expectedIds = new Set(allTests.map((t) => t.id));
  const reported = submission.testResults.filter((r) => expectedIds.has(r.id));
  const totalTests = allTests.length;
  const passedTests = reported.filter((r) => r.passed).length;
  const missingReports = totalTests - reported.length;

  const marks: Record<string, boolean> = {};
  for (const result of reported) marks[result.id] = result.passed;

  if (submission.runtimeError) {
    feedback.push({
      tone: 'issue',
      message: `Das Programm bricht mit ${submission.runtimeError.type} ab${
        submission.runtimeError.line ? ` (Zeile ${submission.runtimeError.line})` : ''
      }. Die Erklärung zum Fehlertyp findest du im Ausgabebereich.`,
    });
  }

  for (const result of reported) {
    if (!result.passed) {
      const test = allTests.find((t) => t.id === result.id);
      feedback.push({
        tone: 'issue',
        message: test?.failureHint
          ? `${result.name}: ${test.failureHint}`
          : `${result.name} schlägt fehl.${result.message ? ` ${result.message}` : ''}`,
      });
    }
  }

  for (const message of violatedChecks) {
    feedback.push({ tone: 'issue', message });
  }

  const testsAllPass = totalTests > 0 && passedTests === totalTests && missingReports === 0;
  const correct = testsAllPass && violatedChecks.length === 0;

  if (correct) {
    feedback.unshift({
      tone: 'success',
      message:
        totalTests === 1 ? 'Der Test ist bestanden.' : `Alle ${totalTests} Tests sind bestanden.`,
    });
  } else if (testsAllPass && violatedChecks.length > 0) {
    feedback.unshift({
      tone: 'info',
      message:
        'Das Programm rechnet richtig. Es erfüllt aber noch nicht alle Anforderungen dieser Aufgabe.',
    });
  }

  const errorType: ErrorCategoryName = correct
    ? 'NONE'
    : submission.runtimeError
      ? mapRuntimeErrorType(submission.runtimeError.type)
      : 'LOGIC';

  return {
    outcome: correct ? 'PASSED' : passedTests > 0 ? 'PARTIAL' : 'FAILED',
    score: correct ? 1 : totalTests > 0 ? (passedTests / totalTests) * 0.5 : 0,
    passedTests,
    totalTests,
    errorType,
    feedback,
    marks,
  };
}

function mapRuntimeErrorType(type: string): ErrorCategoryName {
  const map: Record<string, ErrorCategoryName> = {
    SyntaxError: 'SYNTAX',
    IndentationError: 'INDENTATION',
    TabError: 'INDENTATION',
    NameError: 'NAME',
    UnboundLocalError: 'NAME',
    TypeError: 'TYPE',
    IndexError: 'INDEX',
    KeyError: 'KEY',
    ValueError: 'VALUE',
    AttributeError: 'ATTRIBUTE',
    ZeroDivisionError: 'ZERO_DIVISION',
    Zeitüberschreitung: 'TIMEOUT',
  };
  return map[type] ?? 'RUNTIME_OTHER';
}
