'use client';

import { useState } from 'react';
import { submitExerciseAction } from '@/server/actions/exercise-actions';
import { Button, Callout, Badge } from '@/components/ui/primitives';
import type { PublicExercise } from '@/server/services/exercise-service';
import type { Submission } from '@/domain/content/exercise-payload';

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
  | { kind: 'promptRepair'; flawedPrompt: string; flaws: string[]; options: PublicChoiceOption[] };

export function ExerciseRunner({
  exercise,
  isReview = false,
}: {
  exercise: PublicExercise;
  isReview?: boolean;
}): React.ReactElement {
  const payload = exercise.payload as PublicPayload;
  const [startedAt] = useState(() => Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitExerciseAction>> | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(submission: Submission): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const outcome = await submitExerciseAction({
        exerciseSlug: exercise.slug,
        submission,
        hintsUsed,
        durationMs: Date.now() - startedAt,
        isReview,
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
      <ExerciseForm
        payload={payload}
        pending={pending}
        onSubmit={submit}
        onUseHint={() => setHintsUsed((h) => h + 1)}
      />
    </div>
  );
}

function ExerciseForm({
  payload,
  pending,
  onSubmit,
  onUseHint: _onUseHint,
}: {
  payload: PublicPayload;
  pending: boolean;
  onSubmit: (submission: Submission) => void;
  onUseHint: () => void;
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
  }
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
  const [history, setHistory] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [confirmDanger, setConfirmDanger] = useState<string | null>(null);

  function runCommand(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;
    const commandName = trimmed.split(' ')[0] ?? '';
    if (payload.dangerousCommands.includes(commandName) && confirmDanger !== trimmed) {
      setConfirmDanger(trimmed);
      return;
    }
    setHistory((prev) => [...prev, trimmed]);
    setCurrent('');
    setConfirmDanger(null);
  }

  return (
    <div>
      <p className="mb-2 text-[var(--fg-muted)]">{payload.goalDescription}</p>
      <p className="mb-4 font-mono text-xs text-[var(--fg-muted)]">
        Verfügbar: {payload.allowedCommands.join(', ')}
      </p>
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-ink-900 p-4 font-mono text-sm text-ink-50">
        <p className="mb-2 text-ink-300">{payload.startingDirectory} $</p>
        {history.map((cmd, index) => (
          <p key={index}>
            <span className="text-signal-300">$</span> {cmd}
          </p>
        ))}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-signal-300">$</span>
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
          disabled={pending || history.length === 0}
          onClick={() => onSubmit({ kind: 'terminalSimulation', commands: history })}
        >
          {pending ? 'Wird geprüft …' : 'Fertig — Befehle einreichen'}
        </Button>
        {history.length > 0 ? (
          <Button variant="secondary" onClick={() => setHistory([])}>
            Zurücksetzen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
