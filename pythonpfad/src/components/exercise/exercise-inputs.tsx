'use client';

import { useId, useState } from 'react';
import { Callout, CodeBlock, cx, inputClass } from '@/components/ui/primitives';
import type { PublicExercisePayload } from '@/domain/content/public-view';
import type { Submission } from '@/domain/content/exercise-payload';

/**
 * Eingabeformen für die verschiedenen Aufgabentypen.
 *
 * Jede Komponente meldet über `onChange` eine Antwort im Format, das
 * `submissionSchema` erwartet. Die Bewertung findet ausschließlich auf dem
 * Server statt – hier ist bewusst keine Logik dazu enthalten, und die richtigen
 * Antworten liegen dem Browser gar nicht vor.
 */

export interface InputProps<K extends PublicExercisePayload['kind']> {
  payload: Extract<PublicExercisePayload, { kind: K }>;
  value: Extract<Submission, { kind: K }> | null;
  onChange: (submission: Extract<Submission, { kind: K }>) => void;
  marks: Record<string, boolean>;
  disabled: boolean;
}

// ---------------------------------------------------------------------------

export function SingleChoiceInput({
  payload,
  value,
  onChange,
  marks,
  disabled,
}: InputProps<'singleChoice'>): React.ReactElement {
  const groupId = useId();

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="sr-only">Wähle eine Antwort</legend>
      {payload.code ? <CodeBlock code={payload.code} label="Code zur Frage" /> : null}
      <div className="space-y-2">
        {payload.options.map((option) => {
          const id = `${groupId}-${option.id}`;
          const mark = marks[option.id];
          return (
            <label
              key={option.id}
              htmlFor={id}
              className={cx(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                value?.optionId === option.id
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] hover:bg-[var(--surface-sunken)]',
                mark === true && 'border-[var(--success)] bg-[var(--success-soft)]',
                mark === false && 'border-[var(--alert)] bg-[var(--alert-soft)]',
              )}
            >
              <input
                id={id}
                type="radio"
                name={groupId}
                value={option.id}
                checked={value?.optionId === option.id}
                onChange={() => onChange({ kind: 'singleChoice', optionId: option.id })}
                className="mt-1 size-4 shrink-0"
              />
              <span className="text-[0.95rem]">
                {mark !== undefined ? (
                  <span aria-hidden="true" className="mr-1.5 font-semibold">
                    {mark ? '✓' : '✕'}
                  </span>
                ) : null}
                {option.text}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------

export function MultipleChoiceInput({
  payload,
  value,
  onChange,
  marks,
  disabled,
}: InputProps<'multipleChoice'>): React.ReactElement {
  const groupId = useId();
  const selected = new Set(value?.optionIds ?? []);

  const toggle = (optionId: string): void => {
    const next = new Set(selected);
    if (next.has(optionId)) next.delete(optionId);
    else next.add(optionId);
    onChange({ kind: 'multipleChoice', optionIds: [...next] });
  };

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm text-[var(--text-muted)]">
        {payload.correctCount === 1
          ? 'Genau eine Aussage trifft zu.'
          : `${payload.correctCount} Aussagen treffen zu.`}
      </legend>
      {payload.code ? <CodeBlock code={payload.code} label="Code zur Frage" /> : null}
      <div className="space-y-2">
        {payload.options.map((option) => {
          const id = `${groupId}-${option.id}`;
          const mark = marks[option.id];
          return (
            <label
              key={option.id}
              htmlFor={id}
              className={cx(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                selected.has(option.id)
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] hover:bg-[var(--surface-sunken)]',
                mark === true && 'border-[var(--success)] bg-[var(--success-soft)]',
                mark === false && 'border-[var(--alert)] bg-[var(--alert-soft)]',
              )}
            >
              <input
                id={id}
                type="checkbox"
                checked={selected.has(option.id)}
                onChange={() => toggle(option.id)}
                className="mt-1 size-4 shrink-0"
              />
              <span className="text-[0.95rem]">
                {mark !== undefined ? (
                  <span aria-hidden="true" className="mr-1.5 font-semibold">
                    {mark ? '✓' : '✕'}
                  </span>
                ) : null}
                {option.text}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------

export function FreeTextInput({
  payload,
  value,
  onChange,
  disabled,
}: InputProps<'freeText'>): React.ReactElement {
  const id = useId();
  const text = value?.text ?? '';

  return (
    <div className="space-y-2">
      {payload.code ? <CodeBlock code={payload.code} label="Code zur Frage" /> : null}
      <label htmlFor={id} className="block text-sm font-semibold">
        Deine Erklärung
      </label>
      <p id={`${id}-hint`} className="text-sm text-[var(--text-muted)]">
        Formuliere in eigenen Worten. Es kommt auf den Inhalt an, nicht auf den genauen Wortlaut.
        Erwartet werden{' '}
        {payload.expectedPoints === 1 ? 'ein Aspekt' : `${payload.expectedPoints} Aspekte`}.
      </p>
      <textarea
        id={id}
        value={text}
        disabled={disabled}
        onChange={(event) => onChange({ kind: 'freeText', text: event.target.value })}
        rows={5}
        aria-describedby={`${id}-hint ${id}-count`}
        className={cx(inputClass, 'min-h-32 resize-y')}
      />
      <p id={`${id}-count`} className="text-xs text-[var(--text-muted)]">
        {text.trim().length} von mindestens {payload.minLength} Zeichen
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function PredictOutputInput({
  payload,
  value,
  onChange,
  disabled,
}: InputProps<'predictOutput'>): React.ReactElement {
  const id = useId();

  return (
    <div className="space-y-3">
      <CodeBlock code={payload.code} label="Was gibt dieser Code aus?" />
      <Callout tone="info" title="Erst denken, dann ausführen">
        Der Unterschied zwischen deiner Erwartung und dem tatsächlichen Ergebnis ist die eigentliche
        Lernstelle. Deshalb kommt die Vorhersage vor dem Ausführen.
      </Callout>
      <label htmlFor={id} className="block text-sm font-semibold">
        Deine Vorhersage der Ausgabe
      </label>
      <p id={`${id}-hint`} className="text-sm text-[var(--text-muted)]">
        Eine Zeile je Ausgabezeile. Leerraum am Zeilenende wird nicht mitgewertet.
      </p>
      <textarea
        id={id}
        value={value?.output ?? ''}
        disabled={disabled}
        onChange={(event) => onChange({ kind: 'predictOutput', output: event.target.value })}
        rows={4}
        aria-describedby={`${id}-hint`}
        spellCheck={false}
        className={cx(inputClass, 'font-mono')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ParsonsInput({
  payload,
  value,
  onChange,
  disabled,
}: InputProps<'parsons'>): React.ReactElement {
  const [used, setUsed] = useState<Array<{ id: string; indent: number }>>(
    value?.orderedLineIds.map((id, index) => ({ id, indent: value.indents[index] ?? 0 })) ?? [],
  );

  const lineById = new Map(payload.lines.map((l) => [l.id, l]));
  const available = payload.lines.filter((line) => !used.some((u) => u.id === line.id));

  const emit = (next: Array<{ id: string; indent: number }>): void => {
    setUsed(next);
    onChange({
      kind: 'parsons',
      orderedLineIds: next.map((n) => n.id),
      indents: next.map((n) => n.indent),
    });
  };

  const add = (id: string): void => emit([...used, { id, indent: 0 }]);
  const remove = (index: number): void => emit(used.filter((_, i) => i !== index));
  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= used.length) return;
    const next = [...used];
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    emit(next);
  };
  const changeIndent = (index: number, delta: number): void => {
    const next = [...used];
    const entry = next[index];
    if (!entry) return;
    next[index] = { ...entry, indent: Math.max(0, Math.min(4, entry.indent + delta)) };
    emit(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Die Lösung besteht aus {payload.solutionLength} Zeilen. Es sind mehr Zeilen vorhanden, als
        du brauchst.
        {payload.checkIndentation
          ? ' Die Einrückung wird mitbewertet – nutze die Pfeile nach rechts und links.'
          : ''}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="parsons-verfuegbar">
          <h4 id="parsons-verfuegbar" className="mb-2 text-sm font-semibold">
            Verfügbare Zeilen
          </h4>
          <ul className="space-y-1.5">
            {available.length === 0 ? (
              <li className="rounded-lg border border-dashed border-[var(--border-strong)] p-3 text-sm text-[var(--text-muted)]">
                Alle Zeilen sind verwendet.
              </li>
            ) : null}
            {available.map((line) => (
              <li key={line.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => add(line.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] p-2.5 text-left font-mono text-sm hover:bg-[var(--surface-sunken)] disabled:opacity-60"
                >
                  <span aria-hidden="true" className="text-[var(--accent)]">
                    +
                  </span>
                  <span className="whitespace-pre">{line.code}</span>
                  <span className="sr-only">zur Lösung hinzufügen</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="parsons-loesung">
          <h4 id="parsons-loesung" className="mb-2 text-sm font-semibold">
            Deine Lösung ({used.length} von {payload.solutionLength} Zeilen)
          </h4>
          <ol className="space-y-1.5">
            {used.length === 0 ? (
              <li className="rounded-lg border border-dashed border-[var(--border-strong)] p-3 text-sm text-[var(--text-muted)]">
                Noch leer. Wähle links die Zeile, die zuerst ausgeführt werden soll.
              </li>
            ) : null}
            {used.map((entry, index) => {
              const line = lineById.get(entry.id);
              if (!line) return null;
              return (
                <li
                  key={`${entry.id}-${index}`}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-1.5"
                >
                  <span
                    className="flex-1 whitespace-pre font-mono text-sm"
                    style={{ paddingLeft: `${entry.indent * 1.5}rem` }}
                  >
                    {line.code}
                  </span>
                  <div className="flex shrink-0 gap-0.5">
                    {payload.checkIndentation ? (
                      <>
                        <IconButton
                          label={`Zeile ${index + 1} weniger einrücken`}
                          onClick={() => changeIndent(index, -1)}
                          disabled={disabled || entry.indent === 0}
                        >
                          ←
                        </IconButton>
                        <IconButton
                          label={`Zeile ${index + 1} weiter einrücken`}
                          onClick={() => changeIndent(index, 1)}
                          disabled={disabled}
                        >
                          →
                        </IconButton>
                      </>
                    ) : null}
                    <IconButton
                      label={`Zeile ${index + 1} nach oben`}
                      onClick={() => move(index, -1)}
                      disabled={disabled || index === 0}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label={`Zeile ${index + 1} nach unten`}
                      onClick={() => move(index, 1)}
                      disabled={disabled || index === used.length - 1}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label={`Zeile ${index + 1} entfernen`}
                      onClick={() => remove(index)}
                      disabled={disabled}
                    >
                      ✕
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-raised)] text-sm disabled:opacity-40"
    >
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------

export function CodeCompletionInput({
  payload,
  value,
  onChange,
  marks,
  disabled,
}: InputProps<'codeCompletion'>): React.ReactElement {
  const baseId = useId();
  const values = value?.values ?? {};

  const update = (blankId: string, next: string): void => {
    onChange({ kind: 'codeCompletion', values: { ...values, [blankId]: next } });
  };

  // Die Vorlage wird an den Platzhaltern zerlegt, damit die Eingabefelder an
  // genau der richtigen Stelle im Code stehen.
  const parts = payload.template.split(/(\{\{blank:[a-zA-Z0-9_-]+\}\})/g);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3">
        <pre className="font-mono text-sm leading-8">
          {parts.map((part, index) => {
            const match = /^\{\{blank:([a-zA-Z0-9_-]+)\}\}$/.exec(part);
            if (!match?.[1]) {
              return (
                <span key={index} className="whitespace-pre-wrap">
                  {part}
                </span>
              );
            }
            const blankId = match[1];
            const blank = payload.blanks.find((b) => b.id === blankId);
            const mark = marks[blankId];
            return (
              <span key={index} className="inline-flex align-middle">
                <input
                  id={`${baseId}-${blankId}`}
                  type="text"
                  value={values[blankId] ?? ''}
                  disabled={disabled}
                  onChange={(event) => update(blankId, event.target.value)}
                  aria-label={blank?.description ?? `Lücke ${blankId}`}
                  spellCheck={false}
                  autoComplete="off"
                  className={cx(
                    'mx-1 inline-block min-h-9 w-32 rounded border-2 bg-[var(--surface-sunken)] px-2 py-0.5 font-mono text-sm',
                    mark === true
                      ? 'border-[var(--success)]'
                      : mark === false
                        ? 'border-[var(--alert)]'
                        : 'border-[var(--accent)]',
                  )}
                />
              </span>
            );
          })}
        </pre>
      </div>

      <ul className="space-y-1 text-sm text-[var(--text-muted)]">
        {payload.blanks.map((blank, index) => (
          <li key={blank.id}>
            <span className="font-medium">Lücke {index + 1}:</span> {blank.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function FindErrorInput({
  payload,
  value,
  onChange,
  marks,
  disabled,
}: InputProps<'findError'>): React.ReactElement {
  const selected = new Set(value?.lineNumbers ?? []);

  const toggle = (lineNumber: number): void => {
    const next = new Set(selected);
    if (next.has(lineNumber)) next.delete(lineNumber);
    else next.add(lineNumber);
    onChange({ kind: 'findError', lineNumbers: [...next].sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">
        Markiere {payload.expectedCount === 1 ? 'die Zeile' : `${payload.expectedCount} Zeilen`} mit
        der Ursache. Ein Klick auf eine Zeile markiert sie.
      </p>

      <div className="overflow-hidden rounded-lg border border-[var(--border-strong)]">
        <ul>
          {payload.codeLines.map((line, index) => {
            const lineNumber = index + 1;
            const isSelected = selected.has(lineNumber);
            const mark = marks[String(lineNumber)];
            return (
              <li key={lineNumber}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(lineNumber)}
                  aria-pressed={isSelected}
                  className={cx(
                    'flex w-full items-start gap-3 px-3 py-1.5 text-left font-mono text-sm',
                    isSelected
                      ? 'bg-[var(--accent-soft)]'
                      : 'bg-[var(--surface-raised)] hover:bg-[var(--surface-sunken)]',
                    mark === true && 'bg-[var(--success-soft)]',
                    mark === false && 'bg-[var(--alert-soft)]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="w-6 shrink-0 text-right text-[var(--text-muted)]"
                  >
                    {lineNumber}
                  </span>
                  <span aria-hidden="true" className="w-4 shrink-0">
                    {mark === true ? '✓' : mark === false ? '✕' : isSelected ? '▸' : ' '}
                  </span>
                  <span className="whitespace-pre-wrap">
                    <span className="sr-only">Zeile {lineNumber}: </span>
                    {line || ' '}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {payload.traceback ? (
        <details className="rounded-lg border border-[var(--border)] px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Fehlermeldung von Python ansehen
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
            {payload.traceback}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
