'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { submitExerciseAction, revealHintAction } from '@/server/actions/exercise-actions';
import { Button, Callout, Badge, inputClass } from '@/components/ui/primitives';
import { CommitGraph, DiffAnsicht, GitStatusAnsicht } from '@/components/git/git-views';
import type { DateiStatus } from '@/domain/git/working-tree';
import type { PublicExercise } from '@/server/services/exercise-service';
import type { Hint, Submission } from '@/domain/content/exercise-payload';
import { hintLevelLabel } from '@/domain/hints/hint-ladder';
import { fuehreBefehlAus, type SimuliertesDateisystem } from '@/domain/labs/terminal';

/**
 * Rendert eine Aufgabe anhand ihrer Interaktionsform (`payload.kind`) und
 * reicht die Antwort über die Server Action ein. Eine Komponente für alle
 * sieben Formen dieser Ausbaustufe — jede Form braucht wenig genug
 * Darstellungslogik, dass eine Aufspaltung in sieben Dateien nur Umwege
 * erzeugen würde (vgl. ARCHITEKTUR.md §2.6: die Interaktionsform steuert nur
 * Darstellung und Bewertung, nicht die didaktische Rolle).
 */

interface PublicChoiceOption {
  id: string;
  text: string;
}

type PublicPayload =
  | { kind: 'singleChoice'; context?: string; options: PublicChoiceOption[] }
  | { kind: 'multipleChoice'; context?: string; options: PublicChoiceOption[] }
  | { kind: 'ordering'; instruction: string; items: PublicChoiceOption[] }
  | { kind: 'fillIn'; template: string; blanks: { id: string; description: string }[] }
  | { kind: 'scenarioDecision'; scenario: string; options: PublicChoiceOption[] }
  | {
      kind: 'terminalSimulation';
      goalDescription: string;
      startingDirectory: string;
      fileSystem: Record<string, string | null>;
      allowedCommands: string[];
      dangerousCommands: string[];
    }
  | { kind: 'promptRepair'; flawedPrompt: string; flaws: string[]; options: PublicChoiceOption[] }
  | {
      kind: 'interpretation';
      ansicht: PublicAnsicht;
      frage: string;
      options: PublicChoiceOption[];
    }
  | {
      kind: 'classification';
      instruction: string;
      categories: { id: string; label: string; description?: string }[];
      items: { id: string; text: string }[];
    }
  | {
      kind: 'conflictResolution';
      pfad: string;
      unserLabel: string;
      ihrLabel: string;
      abschnitte: (
        | { art: 'gemeinsam'; zeilen: string[] }
        | { art: 'konflikt'; id: string; unsere: string[]; ihre: string[] }
      )[];
    };

/** Was eine Interpretationsaufgabe zeigt — ohne jede Lösungsangabe. */
type PublicAnsicht =
  | { art: 'diff'; pfad: string; zeilen: { marke: 'kontext' | 'hinzu' | 'weg'; text: string }[] }
  | {
      art: 'branchGraph';
      commits: { id: string; nachricht: string; eltern: string[] }[];
      branches: Record<string, string>;
      aktuellerBranch: string;
    }
  | {
      art: 'gitStatus';
      eintraege: { pfad: string; status: DateiStatus; auchUngestagt: boolean }[];
    };

export function ExerciseRunner({
  exercise,
  isReview = false,
  onPassedAction,
  initialRevealedHints = [],
}: {
  exercise: PublicExercise;
  isReview?: boolean;
  /**
   * Wird genau einmal aufgerufen, sobald diese Aufgabe bestanden wurde —
   * z. B. um einen zugehörigen Lab-Abschluss zu speichern (siehe
   * `app/labs/[slug]/page.tsx`, Prompt-Reparatur-Lab). Bewusst generisch statt
   * Lab-spezifischer Logik in dieser Komponente oder in der Grading-
   * Domainlogik (Codex-Review auf PR #29).
   */
  onPassedAction?: () => void | Promise<void>;
  /**
   * Bereits freigegebene Hinweise aus früheren Besuchen (serverseitig aus
   * `HintReveal` geladen). Ohne sie begänne die Leiter nach jedem Neuladen
   * wieder bei null, während der Server bereits weiter ist — der zuletzt
   * gelesene Hinweis wäre dann nicht mehr erreichbar (Codex-Review auf PR #29).
   */
  initialRevealedHints?: Hint[];
}): React.ReactElement {
  const payload = exercise.payload as PublicPayload;
  const [startedAt] = useState(() => Date.now());
  const [revealedHints, setRevealedHints] = useState<Hint[]>(initialRevealedHints);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitExerciseAction>> | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passedCallbackFired = useRef(false);
  const [passedCallbackDone, setPassedCallbackDone] = useState(false);
  const [passedCallbackError, setPassedCallbackError] = useState(false);

  // Bewusst abgewartet statt "fire and forget": ohne das könnte ein
  // sofortiger Seitenwechsel (Klick auf einen Navigationslink) die noch
  // laufende Anfrage abbrechen, bevor der Lab-Abschluss gespeichert ist.
  // Die kurze Bestätigung unten macht den abgeschlossenen Speichervorgang
  // zusätzlich sichtbar, statt sich stillschweigend darauf zu verlassen.
  //
  // Schlägt das Speichern fehl (kurzzeitiger Netz- oder Datenbankfehler), darf
  // die Anzeige nicht dauerhaft auf "wird gespeichert …" stehen bleiben: die
  // Sperre wird zurückgenommen und ein sichtbarer Wiederholen-Knopf angeboten,
  // sonst bliebe das Lab trotz richtiger Antwort unabgeschlossen
  // (Codex-Review auf PR #29).
  const runPassedAction = useCallback(() => {
    if (!onPassedAction || passedCallbackFired.current) return;
    passedCallbackFired.current = true;
    setPassedCallbackError(false);
    Promise.resolve(onPassedAction())
      .then(() => setPassedCallbackDone(true))
      .catch(() => {
        passedCallbackFired.current = false;
        setPassedCallbackError(true);
      });
  }, [onPassedAction]);

  useEffect(() => {
    if (result?.outcome === 'PASSED') runPassedAction();
  }, [result, runPassedAction]);

  async function submit(submission: Submission): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const outcome = await submitExerciseAction({
        exerciseSlug: exercise.slug,
        submission,
        durationMs: Date.now() - startedAt,
        isReview,
        // Was hier gerade sichtbar ist. Der Server nimmt den Wert nur als
        // Untergrenze — er kann die Hilfe erhöhen, nie kleinrechnen.
        visibleHints: revealedHints.length,
      });
      setResult(outcome);
    } catch {
      setError('Die Antwort konnte nicht übermittelt werden. Bitte versuch es noch einmal.');
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Callout
          tone={
            result.outcome === 'PASSED'
              ? 'success'
              : result.outcome === 'PARTIAL'
                ? 'caution'
                : 'alert'
          }
          title={
            result.outcome === 'PASSED'
              ? 'Richtig'
              : result.outcome === 'PARTIAL'
                ? 'Teilweise richtig'
                : 'Noch nicht'
          }
          live
        >
          <ul className="space-y-1.5">
            {result.feedback.map((item, index) => (
              <li key={index}>{item.message}</li>
            ))}
          </ul>
        </Callout>
        {result.masteryUpdates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.masteryUpdates.map((update) => (
              <Badge key={update.conceptSlug} tone={update.delta >= 0 ? 'success' : 'neutral'}>
                {update.conceptSlug}: {update.delta >= 0 ? '+' : ''}
                {update.delta}
              </Badge>
            ))}
          </div>
        ) : null}
        {result.outcome !== 'PASSED' ? (
          <Button variant="secondary" onClick={() => setResult(null)}>
            Erneut versuchen
          </Button>
        ) : null}
        {onPassedAction && result.outcome === 'PASSED' ? (
          passedCallbackError ? (
            <Callout tone="alert" title="Lab-Fortschritt nicht gespeichert" live>
              <p className="mb-2">
                Deine Antwort war richtig, aber der Abschluss konnte nicht gespeichert werden.
              </p>
              <Button size="sm" variant="secondary" onClick={runPassedAction}>
                Erneut speichern
              </Button>
            </Callout>
          ) : (
            <p role="status" aria-live="polite" className="text-sm text-[var(--fg-muted)]">
              {passedCallbackDone
                ? '✓ Lab-Fortschritt gespeichert.'
                : 'Lab-Fortschritt wird gespeichert …'}
            </p>
          )
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <Callout tone="alert" title="Das hat nicht geklappt" live className="mb-4">
          {error}
        </Callout>
      ) : null}
      <ExerciseForm payload={payload} pending={pending} onSubmit={submit} />
      {exercise.hintLevels.length > 0 ? (
        <HintLadder
          exerciseSlug={exercise.slug}
          hintLevels={exercise.hintLevels}
          revealedHints={revealedHints}
          onRevealAction={(hint) =>
            // Nach Stufe ersetzen statt blind anhängen: Wurde der
            // gemeinsame Hilfestand zwischenzeitlich geräumt (z. B. weil
            // dieselbe Aufgabe in einem anderen Tab bestanden wurde), liefert
            // der Server dieselbe Stufe erneut. Blindes Anhängen zählte sie
            // dann doppelt (Codex-Review auf PR #29).
            setRevealedHints((prev) =>
              [...prev.filter((h) => h.level !== hint.level), hint].sort(
                (a, b) => a.level - b.level,
              ),
            )
          }
        />
      ) : null}
    </div>
  );
}

function ExerciseForm({
  payload,
  pending,
  onSubmit,
}: {
  payload: PublicPayload;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
}): React.ReactElement {
  switch (payload.kind) {
    case 'singleChoice':
    case 'scenarioDecision':
      return <ChoiceForm payload={payload} pending={pending} onSubmit={onSubmit} multi={false} />;
    case 'multipleChoice':
      return <ChoiceForm payload={payload} pending={pending} onSubmit={onSubmit} multi />;
    case 'promptRepair':
      return <PromptRepairForm payload={payload} pending={pending} onSubmit={onSubmit} />;
    case 'ordering':
      return <OrderingForm payload={payload} pending={pending} onSubmit={onSubmit} />;
    case 'fillIn':
      return <FillInForm payload={payload} pending={pending} onSubmit={onSubmit} />;
    case 'terminalSimulation':
      return <TerminalForm payload={payload} pending={pending} onSubmit={onSubmit} />;
    case 'interpretation':
      return <InterpretationForm payload={payload} pending={pending} onSubmit={onSubmit} />;
    case 'classification':
      return <ClassificationForm payload={payload} pending={pending} onSubmit={onSubmit} />;
    case 'conflictResolution':
      return <ConflictResolutionForm payload={payload} pending={pending} onSubmit={onSubmit} />;
  }
}

/** Zeigt die Ansicht einer Interpretationsaufgabe. */
function AnsichtDarstellung({ ansicht }: { ansicht: PublicAnsicht }): React.ReactElement {
  switch (ansicht.art) {
    case 'diff':
      return <DiffAnsicht pfad={ansicht.pfad} zeilen={ansicht.zeilen} />;
    case 'branchGraph':
      return (
        <CommitGraph
          commits={ansicht.commits}
          branches={ansicht.branches}
          aktuellerBranch={ansicht.aktuellerBranch}
        />
      );
    case 'gitStatus':
      return <GitStatusAnsicht eintraege={ansicht.eintraege} />;
  }
}

/**
 * Erst ansehen, dann schließen. Die Ansicht steht oben, die Frage darunter —
 * die Reihenfolge ist Absicht: Es geht um das Ablesen, nicht um das Erinnern.
 */
function InterpretationForm({
  payload,
  pending,
  onSubmit,
}: {
  payload: Extract<PublicPayload, { kind: 'interpretation' }>;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
}): React.ReactElement {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4">
        <AnsichtDarstellung ansicht={payload.ansicht} />
      </div>
      <fieldset className="space-y-2.5">
        <legend className="mb-2 text-sm font-semibold">{payload.frage}</legend>
        {payload.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30"
          >
            <input
              type="radio"
              name="interpretation"
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
              className="mt-1"
            />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
      <Button
        className="mt-5"
        disabled={pending || !selected}
        onClick={() => selected && onSubmit({ kind: 'interpretation', optionId: selected })}
      >
        {pending ? 'Wird geprüft …' : 'Antwort abgeben'}
      </Button>
    </div>
  );
}

/**
 * Einsortieren über Auswahllisten statt Ziehen-und-Ablegen: Das ist mit der
 * Tastatur bedienbar, funktioniert auf dem Telefon und braucht keine
 * Ersatzbedienung nebenher.
 */
function ClassificationForm({
  payload,
  pending,
  onSubmit,
}: {
  payload: Extract<PublicPayload, { kind: 'classification' }>;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
}): React.ReactElement {
  const [zuordnung, setZuordnung] = useState<Record<string, string>>({});
  const vollstaendig = payload.items.every((item) => zuordnung[item.id]);

  return (
    <div>
      <p className="mb-4 text-[var(--fg-muted)]">{payload.instruction}</p>

      <ul className="space-y-2.5">
        {payload.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-mono text-sm">{item.text}</span>
            <select
              aria-label={`Kategorie für ${item.text}`}
              value={zuordnung[item.id] ?? ''}
              onChange={(e) => setZuordnung((prev) => ({ ...prev, [item.id]: e.target.value }))}
              className={inputClass}
            >
              <option value="">Bitte wählen …</option>
              {payload.categories.map((kategorie) => (
                <option key={kategorie.id} value={kategorie.id}>
                  {kategorie.label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      {payload.categories.some((k) => k.description) ? (
        <dl className="mt-4 space-y-1 text-xs text-[var(--fg-muted)]">
          {payload.categories
            .filter((k) => k.description)
            .map((k) => (
              <div key={k.id} className="flex gap-2">
                <dt className="font-medium">{k.label}:</dt>
                <dd>{k.description}</dd>
              </div>
            ))}
        </dl>
      ) : null}

      <Button
        className="mt-5"
        disabled={pending || !vollstaendig}
        onClick={() => onSubmit({ kind: 'classification', zuordnung })}
      >
        {pending ? 'Wird geprüft …' : 'Antwort abgeben'}
      </Button>
    </div>
  );
}

/** Je Konfliktstelle bewusst entscheiden — dieselbe Frage wie im Lab, nur bewertet. */
function ConflictResolutionForm({
  payload,
  pending,
  onSubmit,
}: {
  payload: Extract<PublicPayload, { kind: 'conflictResolution' }>;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
}): React.ReactElement {
  const [entscheidungen, setEntscheidungen] = useState<Record<string, 'unsere' | 'ihre' | 'beide'>>(
    {},
  );
  const konflikte = payload.abschnitte.filter(
    (a): a is Extract<(typeof payload.abschnitte)[number], { art: 'konflikt' }> =>
      a.art === 'konflikt',
  );
  const vollstaendig = konflikte.every((k) => entscheidungen[k.id]);

  const wahlen = [
    { wert: 'unsere' as const, text: `Meine behalten (${payload.unserLabel})` },
    { wert: 'ihre' as const, text: `Ihre übernehmen (${payload.ihrLabel})` },
    { wert: 'beide' as const, text: 'Beide behalten' },
  ];

  return (
    <div>
      <p className="mb-3 font-mono text-xs text-[var(--fg-muted)]">{payload.pfad}</p>

      <div className="mb-4 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-ink-900 p-4">
        <pre className="min-w-max font-mono text-xs leading-relaxed text-ink-50">
          {payload.abschnitte.map((abschnitt, index) =>
            abschnitt.art === 'gemeinsam' ? (
              <span key={index} className="block">
                {abschnitt.zeilen.join('\n') || ' '}
              </span>
            ) : (
              <span key={index} className="block text-alert-100">
                {[
                  `<<<<<<< ${payload.unserLabel}`,
                  ...abschnitt.unsere,
                  '=======',
                  ...abschnitt.ihre,
                  `>>>>>>> ${payload.ihrLabel}`,
                ].join('\n')}
              </span>
            ),
          )}
        </pre>
      </div>

      <div className="space-y-3">
        {konflikte.map((konflikt) => (
          <fieldset
            key={konflikt.id}
            className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
          >
            <legend className="px-1 text-xs font-semibold">Konfliktstelle {konflikt.id}</legend>
            <div className="space-y-2">
              {wahlen.map((wahl) => (
                <label key={wahl.wert} className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name={`konflikt-${konflikt.id}`}
                    checked={entscheidungen[konflikt.id] === wahl.wert}
                    onChange={() =>
                      setEntscheidungen((prev) => ({ ...prev, [konflikt.id]: wahl.wert }))
                    }
                    className="mt-1"
                  />
                  <span>{wahl.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <Button
        className="mt-5"
        disabled={pending || !vollstaendig}
        onClick={() => onSubmit({ kind: 'conflictResolution', entscheidungen })}
      >
        {pending ? 'Wird geprüft …' : 'Antwort abgeben'}
      </Button>
    </div>
  );
}

/**
 * Progressive Hinweisleiter (docs/LERNMODELL.md §4). Bewusst kompakt: eine
 * einzelne Zeile pro bereits aufgedecktem Hinweis, ein Knopf für den
 * nächsten. Die eigentliche Freigabe-Entscheidung trifft ausschließlich der
 * Server (`revealHintAction` → `revealNextHint()`, echte Versuchszahl aus der
 * Datenbank) — diese Komponente zeigt nur an, was er zurückgibt.
 */
function HintLadder({
  exerciseSlug,
  hintLevels,
  revealedHints,
  onRevealAction,
}: {
  exerciseSlug: string;
  hintLevels: number[];
  revealedHints: Hint[];
  onRevealAction: (hint: Hint) => void;
}): React.ReactElement {
  const [pending, setPending] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  // Die nächste Stufe ergibt sich aus der höchsten bereits gesehenen STUFE,
  // nicht aus der Anzahl der lokal angezeigten Hinweise. Über den Index
  // liefen Client und Server auseinander, sobald schon Hinweise aus einem
  // früheren Besuch vorlagen (Codex-Review auf PR #29); maßgeblich für die
  // Freigabe bleibt ohnehin allein der Server.
  const highestRevealed = revealedHints.reduce((max, hint) => Math.max(max, hint.level), 0);
  const nextLevel = hintLevels.find((level) => level > highestRevealed);

  async function reveal(): Promise<void> {
    if (nextLevel === undefined) return;
    setPending(true);
    setBlockedReason(null);
    try {
      const result = await revealHintAction(exerciseSlug);
      if ('hint' in result) {
        onRevealAction(result.hint);
      } else {
        setBlockedReason(result.reason);
      }
    } catch {
      // Ohne diesen Zweig verschluckte die Leiter jeden Fehler: bei erreichter
      // Ratenbegrenzung sprang der Knopf nur von "Wird geladen …" zurück und
      // sonst geschah nichts (Code-Review auf PR #29). `submit()` oben macht
      // es richtig — hier fehlte es.
      setBlockedReason('Der Hinweis konnte nicht geladen werden. Bitte versuch es noch einmal.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      {revealedHints.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {revealedHints.map((hint) => (
            <li
              key={hint.level}
              className="rounded-[var(--radius-md)] bg-ink-100 p-3 text-sm dark:bg-ink-800"
            >
              <span className="font-mono text-xs font-semibold text-[var(--fg-muted)]">
                {hintLevelLabel(hint.level)}
              </span>
              <p className="mt-0.5">{hint.text}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {nextLevel !== undefined ? (
        <button
          type="button"
          onClick={reveal}
          disabled={pending}
          className="font-mono text-sm text-signal-600 underline underline-offset-4 hover:text-signal-700 disabled:opacity-50 dark:text-signal-300"
        >
          {pending
            ? 'Wird geladen …'
            : revealedHints.length === 0
              ? 'Hinweis anzeigen'
              : 'Weiteren Hinweis anzeigen'}
        </button>
      ) : null}

      {blockedReason ? (
        <p role="status" aria-live="polite" className="mt-2 text-sm text-[var(--fg-muted)]">
          {blockedReason}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceForm({
  payload,
  pending,
  onSubmit,
  multi,
}: {
  payload: Extract<PublicPayload, { kind: 'singleChoice' | 'multipleChoice' | 'scenarioDecision' }>;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
  multi: boolean;
}): React.ReactElement {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const context =
    'context' in payload ? payload.context : 'scenario' in payload ? payload.scenario : undefined;

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(multi ? prev : []);
      if (multi && prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(): void {
    if (selected.size === 0) return;
    if (payload.kind === 'multipleChoice') {
      onSubmit({ kind: 'multipleChoice', optionIds: [...selected] });
    } else {
      const optionId = [...selected][0];
      if (!optionId) return;
      onSubmit(
        payload.kind === 'scenarioDecision'
          ? { kind: 'scenarioDecision', optionId }
          : { kind: 'singleChoice', optionId },
      );
    }
  }

  return (
    <div>
      {context ? <p className="mb-4 text-[var(--fg-muted)]">{context}</p> : null}
      <fieldset className="space-y-2.5">
        <legend className="sr-only">Antwortmöglichkeiten</legend>
        {payload.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30"
          >
            <input
              type={multi ? 'checkbox' : 'radio'}
              name="option"
              checked={selected.has(option.id)}
              onChange={() => toggle(option.id)}
              className="mt-1"
            />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
      <Button className="mt-5" disabled={pending || selected.size === 0} onClick={handleSubmit}>
        {pending ? 'Wird geprüft …' : 'Antwort abgeben'}
      </Button>
    </div>
  );
}

function PromptRepairForm({
  payload,
  pending,
  onSubmit,
}: {
  payload: Extract<PublicPayload, { kind: 'promptRepair' }>;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
}): React.ReactElement {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <figure className="mb-4 rounded-[var(--radius-md)] border border-alert-500 bg-alert-100 p-4 font-mono text-sm dark:bg-alert-900/30">
        <figcaption className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.1em] text-alert-700 dark:text-alert-100">
          Mangelhafter Prompt
        </figcaption>
        {payload.flawedPrompt}
      </figure>
      <ul className="mb-4 space-y-1 text-sm text-[var(--fg-muted)]">
        {payload.flaws.map((flaw, index) => (
          <li key={index}>• {flaw}</li>
        ))}
      </ul>
      <fieldset className="space-y-2.5">
        <legend className="text-sm font-semibold">Welche Version behebt das am besten?</legend>
        {payload.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 font-mono text-sm has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30"
          >
            <input
              type="radio"
              name="option"
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
              className="mt-1"
            />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
      <Button
        className="mt-5"
        disabled={pending || !selected}
        onClick={() => selected && onSubmit({ kind: 'promptRepair', optionId: selected })}
      >
        {pending ? 'Wird geprüft …' : 'Antwort abgeben'}
      </Button>
    </div>
  );
}

function OrderingForm({
  payload,
  pending,
  onSubmit,
}: {
  payload: Extract<PublicPayload, { kind: 'ordering' }>;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
}): React.ReactElement {
  const [order, setOrder] = useState(payload.items.map((item) => item.id));
  const byId = new Map(payload.items.map((item) => [item.id, item.text]));

  function move(index: number, direction: -1 | 1): void {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const currentId = next[index];
      const targetId = next[target];
      if (currentId === undefined || targetId === undefined) return prev;
      next[index] = targetId;
      next[target] = currentId;
      return next;
    });
  }

  return (
    <div>
      <p className="mb-4 text-[var(--fg-muted)]">{payload.instruction}</p>
      <ol className="space-y-2">
        {order.map((id, index) => (
          <li
            key={id}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] p-3"
          >
            <span className="font-mono text-xs text-[var(--fg-muted)]">{index + 1}</span>
            <span className="flex-1">{byId.get(id)}</span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Nach oben"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="rounded border border-[var(--border-strong)] px-2 py-1 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Nach unten"
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
                className="rounded border border-[var(--border-strong)] px-2 py-1 text-xs disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
      <Button
        className="mt-5"
        disabled={pending}
        onClick={() => onSubmit({ kind: 'ordering', orderedItemIds: order })}
      >
        {pending ? 'Wird geprüft …' : 'Reihenfolge abgeben'}
      </Button>
    </div>
  );
}

function FillInForm({
  payload,
  pending,
  onSubmit,
}: {
  payload: Extract<PublicPayload, { kind: 'fillIn' }>;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
}): React.ReactElement {
  const [values, setValues] = useState<Record<string, string>>({});
  const parts = payload.template.split(/(\{\{blank:[a-zA-Z0-9_-]+\}\})/g);

  return (
    <div>
      <p className="mb-4 leading-relaxed">
        {parts.map((part, index) => {
          const match = /\{\{blank:([a-zA-Z0-9_-]+)\}\}/.exec(part);
          if (!match) return <span key={index}>{part}</span>;
          const blankId = match[1] ?? '';
          const blank = payload.blanks.find((b) => b.id === blankId);
          return (
            <input
              key={index}
              type="text"
              aria-label={blank?.description ?? 'Lücke'}
              value={values[blankId] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [blankId]: e.target.value }))}
              className="mx-1 w-32 rounded border-b-2 border-[var(--border-strong)] bg-transparent px-1 font-mono text-inherit focus:border-signal-500 focus:outline-none"
            />
          );
        })}
      </p>
      <Button
        disabled={pending || payload.blanks.some((b) => !(values[b.id] ?? '').trim())}
        onClick={() => onSubmit({ kind: 'fillIn', values })}
      >
        {pending ? 'Wird geprüft …' : 'Antwort abgeben'}
      </Button>
    </div>
  );
}

function TerminalForm({
  payload,
  pending,
  onSubmit,
}: {
  payload: Extract<PublicPayload, { kind: 'terminalSimulation' }>;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
}): React.ReactElement {
  // Die eingegebenen Befehle für die Bewertung — bewusst getrennt vom
  // sichtbaren Verlauf, damit ein `clear` die Abgabe nicht verwirft.
  const [befehle, setBefehle] = useState<string[]>([]);
  const [sichtbar, setSichtbar] = useState<{ command: string; output: string }[]>([]);
  const [cwd, setCwd] = useState(payload.startingDirectory);
  const [dateisystem, setDateisystem] = useState<SimuliertesDateisystem>(payload.fileSystem);
  const [current, setCurrent] = useState('');
  const [confirmDanger, setConfirmDanger] = useState<string | null>(null);

  /**
   * Die Befehle werden hier wirklich ausgeführt — mit demselben Simulator wie
   * im Terminal-Lab. Zuvor wurde die Eingabe nur in eine Liste geschrieben:
   * `cd` änderte die Eingabeaufforderung nicht, `ls` und `cat` gaben nichts
   * aus, obwohl der Aufgabe ein Dateibaum mitgegeben wird. Die lernende
   * Person konnte die Befehlsfolge nur raten oder abschreiben, statt sich
   * im Dateibaum zu orientieren (Codex-Review auf PR #29).
   */
  function runCommand(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;
    const commandName = trimmed.split(/\s+/)[0] ?? '';
    if (payload.dangerousCommands.includes(commandName) && confirmDanger !== trimmed) {
      setConfirmDanger(trimmed);
      return;
    }

    const ergebnis = fuehreBefehlAus(
      { cwd, fileSystem: dateisystem },
      trimmed,
      payload.allowedCommands,
    );
    setCwd(ergebnis.cwd);
    setDateisystem(ergebnis.fileSystem);
    setBefehle((prev) => [...prev, trimmed]);
    setSichtbar((prev) =>
      ergebnis.clearHistory ? [] : [...prev, { command: trimmed, output: ergebnis.output }],
    );
    setCurrent('');
    setConfirmDanger(null);
  }

  function zuruecksetzen(): void {
    setBefehle([]);
    setSichtbar([]);
    setCwd(payload.startingDirectory);
    setDateisystem(payload.fileSystem);
  }

  return (
    <div>
      <p className="mb-2 text-[var(--fg-muted)]">{payload.goalDescription}</p>
      <p className="mb-4 font-mono text-xs text-[var(--fg-muted)]">
        Verfügbar: {payload.allowedCommands.join(', ')}
      </p>
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-ink-900 p-4 font-mono text-sm text-ink-50">
        <p className="mb-2 text-ink-300">{payload.startingDirectory} $</p>
        {sichtbar.map((entry, index) => (
          <div key={index}>
            <p>
              <span className="text-signal-300">$</span> {entry.command}
            </p>
            {entry.output ? (
              <p className="whitespace-pre-wrap text-ink-200">{entry.output}</p>
            ) : null}
          </div>
        ))}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-signal-300">{cwd} $</span>
          <input
            type="text"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runCommand(current);
            }}
            className="flex-1 bg-transparent outline-none"
            aria-label="Befehl eingeben"
          />
        </div>
      </div>
      {confirmDanger ? (
        <Callout tone="alert" title="Dieser Befehl ist nicht rückgängig zu machen" className="mt-3">
          <p className="mb-2">
            <code className="font-mono">{confirmDanger}</code> wirklich ausführen?
          </p>
          <Button size="sm" variant="danger" onClick={() => runCommand(confirmDanger)}>
            Ja, ausführen
          </Button>
        </Callout>
      ) : null}
      <div className="mt-5 flex gap-3">
        <Button
          disabled={pending || befehle.length === 0}
          onClick={() => onSubmit({ kind: 'terminalSimulation', commands: befehle })}
        >
          {pending ? 'Wird geprüft …' : 'Fertig — Befehle einreichen'}
        </Button>
        {befehle.length > 0 ? (
          <Button variant="secondary" onClick={zuruecksetzen}>
            Zurücksetzen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
