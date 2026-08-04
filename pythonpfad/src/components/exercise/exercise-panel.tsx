'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CodeBlock,
  cx,
  ProgressBar,
} from '@/components/ui/primitives';
import { PythonWorkbench } from '@/components/editor/python-workbench';
import { TutorPanel } from '@/components/tutor/tutor-panel';
import { Icon } from '@/components/ui/icon';
import {
  CodeCompletionInput,
  FindErrorInput,
  FreeTextInput,
  MultipleChoiceInput,
  ParsonsInput,
  PredictOutputInput,
  SingleChoiceInput,
} from './exercise-inputs';
import {
  getGradingTestsAction,
  revealHintAction,
  revealSolutionAction,
  saveDraftAction,
  submitExerciseAction,
} from '@/server/actions/exercise-actions';
import {
  canRevealSolution,
  evaluateHintAvailability,
  hintLevelLabel,
  type HintLevelRef,
} from '@/domain/hints/hint-ladder';
import type { PublicExercise } from '@/server/services/exercise-service';
import type { Submission, Hint, TestCase } from '@/domain/content/exercise-payload';
import type { GradingResult } from '@/domain/grading/grade';
import type { ConfidenceLevel } from '@/domain/mastery/mastery';
import type { RunResult } from '@/lib/runner/types';

/**
 * Vollständige Bearbeitungsoberfläche für eine einzelne Aufgabe.
 *
 * Ablauf:
 *  1. Optional: Selbsteinschätzung vor der Bearbeitung (Metakognition).
 *  2. Bearbeitung – je nach Aufgabenform.
 *  3. Einreichen; die Bewertung erfolgt auf dem Server.
 *  4. Rückmeldung, Kompetenzveränderung, geplante Wiederholung.
 *
 * Hinweise werden einzeln vom Server angefordert. Nicht freigegebene Hinweise
 * liegen dem Browser nicht vor.
 */

const CONFIDENCE_OPTIONS: Array<{ value: ConfidenceLevel; label: string }> = [
  { value: 'UNSURE', label: 'unsicher' },
  { value: 'RATHER_UNSURE', label: 'eher unsicher' },
  { value: 'RATHER_SURE', label: 'eher sicher' },
  { value: 'VERY_SURE', label: 'sehr sicher' },
];

export interface ExercisePanelProps {
  exercise: PublicExercise;
  lessonSlug?: string | null;
  isReview?: boolean;
  /** Wird nach einer bestandenen Abgabe aufgerufen. */
  onPassed?: () => void;
  /** Selbsteinschätzung abfragen? Bei kurzen Aufwärmaufgaben nicht sinnvoll. */
  askConfidence?: boolean;
}

interface FeedbackState {
  grading: GradingResult;
  masteryChanges: Array<{
    conceptSlug: string;
    conceptName: string;
    before: number;
    after: number;
    reasons: string[];
  }>;
  nextReview: { dueAt: string; reason: string } | null;
  attemptNumber: number;
}

export function ExercisePanel({
  exercise,
  lessonSlug,
  isReview = false,
  onPassed,
  askConfidence = true,
}: ExercisePanelProps): React.ReactElement {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [code, setCode] = useState(exercise.draftCode ?? exercise.starterCode ?? '');
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [confidenceAfter, setConfidenceAfter] = useState<ConfidenceLevel | null>(null);
  const [hints, setHints] = useState<Hint[]>(exercise.revealedHints);
  const [hintError, setHintError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState<{
    code: string;
    notes: string | null;
    reason: string;
  } | null>(null);
  const [attempts, setAttempts] = useState(exercise.attempts);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [passed, setPassed] = useState(exercise.lastResult === 'PASSED');
  // Startzeit erst nach dem Rendern setzen: Date.now() im Render wäre nicht
  // idempotent und würde bei jedem erneuten Rendern abweichen.
  const startedAtRef = useRef<number>(0);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const revealedLevel = hints.reduce((max, h) => Math.max(max, h.level), 0);

  // Die Verfügbarkeit der Hinweisstufen wird hier laufend neu berechnet statt
  // die serverseitig gerenderte Fassung zu behalten. Sonst bliebe der nächste
  // Hinweis nach einem Versuch oder nach dem Aufdecken der Vorstufe bis zum
  // Neuladen der Seite gesperrt.
  //
  // Es ist dieselbe reine Funktion wie auf dem Server, und sie verrät nichts:
  // Sie kennt nur Stufennummern, keine Hinweistexte. Die Texte kommen
  // weiterhin einzeln vom Server – und nur, wenn die Stufe dort ebenfalls als
  // frei gilt.
  const hintLevels = useMemo<HintLevelRef[]>(
    () => exercise.hintAvailability.map((entry) => ({ level: entry.level })),
    [exercise.hintAvailability],
  );

  const hintAvailability = useMemo(
    () => evaluateHintAvailability(hintLevels, { attempts, revealedLevel }),
    [hintLevels, attempts, revealedLevel],
  );

  const solutionUnlocked = useMemo(
    () => canRevealSolution({ attempts, revealedLevel }, hintLevels),
    [hintLevels, attempts, revealedLevel],
  );

  // Zwischenstand regelmäßig sichern, damit auf einem anderen Gerät
  // weitergearbeitet werden kann.
  useEffect(() => {
    if (exercise.payload.kind !== 'code' || !lessonSlug) return;
    const timer = setTimeout(() => {
      void saveDraftAction({ lessonSlug, exerciseSlug: exercise.slug, code });
    }, 1500);
    return () => clearTimeout(timer);
  }, [code, exercise.payload.kind, exercise.slug, lessonSlug]);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [exercise.slug]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const handleReveal = useCallback(
    async (level: number) => {
      setHintError(null);
      const result = await revealHintAction({ exerciseSlug: exercise.slug, level });
      if (!result.ok) {
        setHintError(result.error);
        return;
      }
      setHints((previous) =>
        previous.some((h) => h.level === result.hint.level)
          ? previous
          : [...previous, result.hint].sort((a, b) => a.level - b.level),
      );
    },
    [exercise.slug],
  );

  const handleRevealSolution = useCallback(async () => {
    const result = await revealSolutionAction(exercise.slug);
    if (!result.ok) {
      setHintError(result.error);
      return;
    }
    setSolution({ code: result.solution, notes: result.notes, reason: result.followUp.reason });
  }, [exercise.slug]);

  const buildSubmission = useCallback(async (): Promise<Submission | null> => {
    if (exercise.payload.kind !== 'code') return submission;

    // Für Code-Aufgaben werden beim Einreichen alle Tests geholt – auch die
    // versteckten – und im Browser ausgeführt.
    const bundle = await getGradingTestsAction(exercise.slug);
    if (!bundle.ok) return null;

    const runner = await import('@/lib/runner/pyodide-runner');
    const result = await runner.getSharedRunner().run({
      code,
      tests: bundle.tests as TestCase[],
      timeoutMs: 15_000,
    });
    setLastRun(result);

    return {
      kind: 'code',
      code,
      testResults: result.testResults.map((t) => ({
        id: t.id,
        name: t.name,
        passed: t.passed,
        ...(t.message !== undefined ? { message: t.message } : {}),
      })),
      runtimeError: result.error
        ? { type: result.error.type, message: result.error.message, line: result.error.line }
        : null,
    };
  }, [code, exercise.payload.kind, exercise.slug, submission]);

  const handleSubmit = useCallback(async () => {
    setBusy(true);
    setHintError(null);
    try {
      const finalSubmission = await buildSubmission();
      if (!finalSubmission) {
        setHintError('Die Abgabe konnte nicht vorbereitet werden. Bitte versuche es noch einmal.');
        return;
      }

      const response = await submitExerciseAction({
        exerciseSlug: exercise.slug,
        lessonSlug: lessonSlug ?? null,
        submission: finalSubmission,
        hintsUsed: revealedLevel,
        durationMs: Math.min(
          Math.max(0, Date.now() - (startedAtRef.current || Date.now())),
          6 * 60 * 60 * 1000,
        ),
        confidenceBefore: confidence,
        confidenceAfter,
        isReview,
      });

      if (!response.ok) {
        setHintError(response.error);
        return;
      }

      setFeedback({
        grading: response.grading,
        masteryChanges: response.masteryChanges,
        nextReview: response.nextReview
          ? {
              dueAt: new Date(response.nextReview.dueAt).toISOString(),
              reason: response.nextReview.reason,
            }
          : null,
        attemptNumber: response.attemptNumber,
      });
      setAttempts(response.attemptNumber);

      if (response.grading.outcome === 'PASSED') {
        setPassed(true);
        onPassed?.();
      }
      startedAtRef.current = Date.now();
    } finally {
      setBusy(false);
    }
  }, [
    buildSubmission,
    confidence,
    confidenceAfter,
    exercise.slug,
    isReview,
    lessonSlug,
    onPassed,
    revealedLevel,
  ]);

  const canSubmit = exercise.payload.kind === 'code' ? code.trim().length > 0 : submission !== null;

  const inputElement = useMemo(() => {
    // Innerhalb des Memos gebildet, damit ein neues leeres Objekt nicht bei
    // jedem Rendern eine Neuberechnung auslöst.
    const marks = feedback?.grading.marks ?? {};
    const shared = { marks, disabled: busy };
    switch (exercise.payload.kind) {
      case 'singleChoice':
        return (
          <SingleChoiceInput
            payload={exercise.payload}
            value={submission?.kind === 'singleChoice' ? submission : null}
            onChange={setSubmission}
            {...shared}
          />
        );
      case 'multipleChoice':
        return (
          <MultipleChoiceInput
            payload={exercise.payload}
            value={submission?.kind === 'multipleChoice' ? submission : null}
            onChange={setSubmission}
            {...shared}
          />
        );
      case 'freeText':
        return (
          <FreeTextInput
            payload={exercise.payload}
            value={submission?.kind === 'freeText' ? submission : null}
            onChange={setSubmission}
            {...shared}
          />
        );
      case 'predictOutput':
        return (
          <PredictOutputInput
            payload={exercise.payload}
            value={submission?.kind === 'predictOutput' ? submission : null}
            onChange={setSubmission}
            {...shared}
          />
        );
      case 'parsons':
        return (
          <ParsonsInput
            payload={exercise.payload}
            value={submission?.kind === 'parsons' ? submission : null}
            onChange={setSubmission}
            {...shared}
          />
        );
      case 'codeCompletion':
        return (
          <CodeCompletionInput
            payload={exercise.payload}
            value={submission?.kind === 'codeCompletion' ? submission : null}
            onChange={setSubmission}
            {...shared}
          />
        );
      case 'findError':
        return (
          <FindErrorInput
            payload={exercise.payload}
            value={submission?.kind === 'findError' ? submission : null}
            onChange={setSubmission}
            {...shared}
          />
        );
      case 'code':
        return (
          <div className="space-y-3">
            {exercise.payload.expectedSignature ? (
              <p className="text-sm text-[var(--text-muted)]">
                Erwartete Form:{' '}
                <code className="font-mono">{exercise.payload.expectedSignature}</code>
              </p>
            ) : null}
            {exercise.payload.sourceChecks.length > 0 ? (
              <ul className="ml-5 list-disc space-y-1 text-sm text-[var(--text-muted)]">
                {exercise.payload.sourceChecks.map((check) => (
                  <li key={check.id}>{check.description}</li>
                ))}
              </ul>
            ) : null}
            <PythonWorkbench
              code={code}
              onCodeChange={setCode}
              ariaLabel={`Python-Editor für die Aufgabe: ${exercise.title}`}
              starterCode={exercise.starterCode ?? ''}
              visibleTests={exercise.publicTests}
              hiddenTestCount={exercise.hiddenTestCount}
              onRunComplete={setLastRun}
            />
          </div>
        );
    }
  }, [busy, code, exercise, feedback, submission]);

  return (
    <Card
      as="section"
      className={cx(
        'space-y-5 transition-colors duration-500',
        passed && 'border-2 border-[var(--success)] bg-[var(--success-soft)]',
      )}
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={passed ? 'success' : 'neutral'}>
            {passed ? 'Bestanden' : `Versuch ${attempts + 1}`}
          </Badge>
          <Badge tone="neutral">{exerciseTypeLabel(exercise.type)}</Badge>
          <Badge tone="neutral">Schwierigkeit {exercise.difficulty} von 5</Badge>
          {exercise.scaffoldLevel >= 5 ? <Badge tone="info">ohne Vorlage</Badge> : null}
        </div>
        <h3 className="text-lg font-bold tracking-tight sm:text-xl">{exercise.title}</h3>
        {exercise.transferContext ? (
          <p className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-sm">
            <strong>Neuer Zusammenhang:</strong> {exercise.transferContext}
          </p>
        ) : null}
        <p className="whitespace-pre-line text-[0.95rem]">{exercise.prompt}</p>
      </header>

      {askConfidence && !feedback && !passed ? (
        <fieldset className="rounded-lg border border-[var(--border)] p-3">
          <legend className="px-1 text-sm font-semibold">
            Wie sicher fühlst du dich bei dieser Aufgabe?
          </legend>
          <p className="mb-2 text-sm text-[var(--text-muted)]">
            Freiwillig. Der Vergleich zwischen Gefühl und Ergebnis zeigt dir später, wo du dich
            besonders gut oder besonders schlecht einschätzt.
          </p>
          <div className="flex flex-wrap gap-2">
            {CONFIDENCE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cx(
                  'min-h-10 cursor-pointer rounded-full border-2 px-4 py-1.5 text-sm font-semibold',
                  'inline-flex items-center transition-colors duration-150',
                  // Das Radio ist visuell versteckt. Ohne diese Regel wäre bei
                  // Tastaturbedienung nicht erkennbar, wo der Fokus steht.
                  'has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus-ring)]',
                  confidence === option.value
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--text-inverse)]'
                    : 'border-[var(--border)] hover:border-[var(--accent)]',
                )}
              >
                <input
                  type="radio"
                  name={`confidence-${exercise.slug}`}
                  value={option.value}
                  checked={confidence === option.value}
                  onChange={() => setConfidence(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {inputElement}

      {/* --- Hinweise ---------------------------------------------------- */}
      <section aria-labelledby={`hints-${exercise.slug}`} className="space-y-2">
        <h4 id={`hints-${exercise.slug}`} className="text-sm font-semibold">
          Hilfe – in Stufen
        </h4>

        {hints.length > 0 ? (
          <ul className="space-y-2">
            {hints.map((hint) => (
              <li
                key={hint.level}
                className="animate-enter rounded-xl border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5"
              >
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                  <span
                    aria-hidden="true"
                    className="flex size-5 items-center justify-center rounded-full bg-[var(--accent)] text-[0.6875rem] text-[var(--text-inverse)]"
                  >
                    {hint.level}
                  </span>
                  Stufe {hint.level}: {hintLevelLabel(hint.level)}
                </p>
                <p className="mt-1.5 text-[0.95rem]">{hint.text}</p>
                {hint.code ? (
                  <div className="mt-2">
                    <CodeBlock code={hint.code} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {hintAvailability.map((entry) => {
            if (entry.level <= revealedLevel) return null;
            return (
              <Button
                key={entry.level}
                type="button"
                variant="secondary"
                disabled={!entry.available || busy}
                onClick={() => void handleReveal(entry.level)}
                title={entry.blockedReason}
              >
                <Icon name={entry.available ? 'gluehbirne' : 'schloss'} size={16} />
                Hinweis {entry.level}: {hintLevelLabel(entry.level)}
              </Button>
            );
          })}

          {solutionUnlocked && !solution ? (
            <Button type="button" variant="ghost" onClick={() => void handleRevealSolution()}>
              Musterlösung ansehen
            </Button>
          ) : null}
        </div>

        {hintAvailability.some((e) => !e.available && e.level > revealedLevel) ? (
          <p className="text-xs text-[var(--text-muted)]">
            {hintAvailability.find((e) => !e.available && e.level > revealedLevel)?.blockedReason}
          </p>
        ) : null}

        {hintError ? (
          <Callout tone="caution" title="Noch nicht möglich" live>
            {hintError}
          </Callout>
        ) : null}

        {solution ? (
          <div className="space-y-2">
            <Callout tone="caution" title="Musterlösung angesehen">
              {solution.reason}
            </Callout>
            <CodeBlock code={solution.code} label="Musterlösung" />
            {solution.notes ? <p className="text-sm">{solution.notes}</p> : null}
          </div>
        ) : null}
      </section>

      {/* --- Tutor ------------------------------------------------------- */}
      <TutorPanel
        exerciseSlug={exercise.slug}
        code={exercise.payload.kind === 'code' ? code : undefined}
        traceback={lastRun?.error?.traceback}
      />

      {/* --- Abgabe ------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
        <Button
          type="button"
          size="lg"
          onClick={() => void handleSubmit()}
          disabled={busy || !canSubmit}
        >
          {busy ? (
            'Wird geprüft …'
          ) : (
            <>
              <Icon name="abspielen" size={18} />
              Lösung einreichen
            </>
          )}
        </Button>
        {!canSubmit ? (
          <p className="text-sm text-[var(--text-muted)]">
            {exercise.payload.kind === 'code'
              ? 'Schreibe zuerst etwas in den Editor.'
              : 'Wähle oder schreibe zuerst eine Antwort.'}
          </p>
        ) : null}
      </div>

      {/* --- Rückmeldung -------------------------------------------------- */}
      {feedback ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className={cx(
            'animate-enter space-y-3 rounded-xl border-2 p-4',
            feedback.grading.outcome === 'PASSED'
              ? 'border-[var(--success)] bg-[var(--success-soft)]'
              : feedback.grading.outcome === 'PARTIAL'
                ? 'border-[var(--caution)] bg-[var(--caution-soft)]'
                : 'border-[var(--border-strong)] bg-[var(--surface-sunken)]',
          )}
        >
          <h4 className="flex items-center gap-2.5 text-base font-semibold">
            {/*
             * Das Zeichen springt kurz auf, wenn es erscheint – aber nur bei
             * einer bestandenen Aufgabe und nur einmal. Eine Rückmeldung, die
             * auch beim Misslingen hüpft, wirkt wie Hohn.
             */}
            <span
              aria-hidden="true"
              className={cx(
                'flex size-8 shrink-0 items-center justify-center rounded-full',
                feedback.grading.outcome === 'PASSED'
                  ? 'animate-pop bg-[var(--success)] text-[var(--surface-raised)]'
                  : feedback.grading.outcome === 'PARTIAL'
                    ? 'bg-[var(--caution)] text-[var(--surface-raised)]'
                    : 'bg-[var(--border-strong)] text-[var(--text)]',
              )}
            >
              <Icon
                name={
                  feedback.grading.outcome === 'PASSED'
                    ? 'haken'
                    : feedback.grading.outcome === 'PARTIAL'
                      ? 'halbmond'
                      : 'gluehbirne'
                }
                size={18}
              />
            </span>
            {feedback.grading.outcome === 'PASSED'
              ? 'Bestanden'
              : feedback.grading.outcome === 'PARTIAL'
                ? 'Teilweise richtig'
                : 'Noch nicht richtig'}
          </h4>

          {feedback.grading.totalTests > 1 ? (
            <div className="space-y-1">
              <p className="text-sm">
                {feedback.grading.passedTests} von {feedback.grading.totalTests} Prüfungen erfüllt
              </p>
              <ProgressBar
                value={feedback.grading.passedTests}
                max={feedback.grading.totalTests}
                label="Erfüllte Prüfungen"
                tone={feedback.grading.outcome === 'PASSED' ? 'success' : 'caution'}
              />
            </div>
          ) : null}

          <ul className="space-y-2">
            {feedback.grading.feedback.map((item, index) => (
              <li
                key={index}
                className={cx(
                  'flex items-start gap-2 text-[0.95rem]',
                  item.tone === 'success' && 'text-[var(--success)]',
                  item.tone === 'issue' && 'text-[var(--alert)]',
                )}
              >
                <span aria-hidden="true" className="mt-0.5 shrink-0">
                  <Icon
                    name={item.tone === 'success' ? 'haken' : item.tone === 'issue' ? 'vor' : 'info'}
                    size={16}
                  />
                </span>
                <span className={item.tone === 'info' ? 'text-[var(--text)]' : undefined}>
                  {item.message}
                </span>
              </li>
            ))}
          </ul>

          {feedback.masteryChanges.length > 0 ? (
            <details className="rounded border border-[var(--border)] px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">
                Wie sich das auf deinen Lernstand auswirkt
              </summary>
              <ul className="mt-2 space-y-2 text-sm">
                {feedback.masteryChanges.map((change) => (
                  <li key={change.conceptSlug}>
                    <p className="font-medium">
                      {change.conceptName}: {change.before} → {change.after}
                      <span className="ml-1 font-normal text-[var(--text-muted)]">
                        (Orientierungswert, keine Messung)
                      </span>
                    </p>
                    <ul className="ml-4 mt-1 list-disc text-[var(--text-muted)]">
                      {change.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {feedback.nextReview ? (
            <p className="text-sm text-[var(--text-muted)]">
              <Icon name="wiederholen" size={14} className="mr-1 inline align-[-2px]" />
              {feedback.nextReview.reason}
            </p>
          ) : null}

          {feedback.grading.outcome === 'PASSED' && askConfidence ? (
            <fieldset className="rounded border border-[var(--border)] p-3">
              <legend className="px-1 text-sm font-semibold">
                Und jetzt – wie sicher fühlst du dich?
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONFIDENCE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cx(
                      'min-h-10 cursor-pointer rounded-full border-2 px-4 py-1.5 text-sm font-semibold',
                      'inline-flex items-center transition-colors duration-150',
                      'has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus-ring)]',
                      confidenceAfter === option.value
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--text-inverse)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)]',
                    )}
                  >
                    <input
                      type="radio"
                      name={`confidence-after-${exercise.slug}`}
                      value={option.value}
                      checked={confidenceAfter === option.value}
                      onChange={() => setConfidenceAfter(option.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function exerciseTypeLabel(type: PublicExercise['type']): string {
  const labels: Record<string, string> = {
    SINGLE_CHOICE: 'Einfachauswahl',
    MULTIPLE_CHOICE: 'Mehrfachauswahl',
    FREE_TEXT: 'Freie Erklärung',
    PREDICT_OUTPUT: 'Ausgabe vorhersagen',
    PARSONS: 'Zeilen ordnen',
    CODE_COMPLETION: 'Code ergänzen',
    FIND_ERROR: 'Fehler finden',
    EXPLAIN_ERROR: 'Fehler erklären',
    WRITE_CODE: 'Selbst schreiben',
    REFACTOR: 'Code verbessern',
    WRITE_TEST: 'Test schreiben',
    COMPARE_SOLUTION: 'Lösungen vergleichen',
    MINI_PROJECT: 'Mini-Projekt',
    SPACED_REVIEW: 'Wiederholung',
    TRANSFER: 'Transfer',
  };
  return labels[type] ?? type;
}
