'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Callout, Kbd, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import {
  countLineVisits,
  describeStep,
  diffVariables,
  neverExecutedLines,
  outputUpTo,
  summarizeTrace,
} from '@/domain/trace/execution-trace';
import type { TraceResult } from '@/lib/runner/types';

/**
 * Ausführungs-Visualisierer.
 *
 * Das mentale Modell der ersten Lektion lautet: „Ein Programm ist ein Rezept,
 * das ein sehr genauer Mitarbeiter Schritt für Schritt abarbeitet." Genau das
 * wird hier sichtbar. Statt zu behaupten, dass Python von oben nach unten
 * arbeitet und Werte in Variablen ablegt, lässt sich beides beobachten:
 * welche Zeile gerade dran ist, was in den Variablen steht, was sich durch die
 * letzte Zeile geändert hat und was bisher ausgegeben wurde.
 *
 * Erfahrungsgemäß sind es drei Einsichten, die Anfängerinnen und Anfängern
 * hier zum ersten Mal aufgehen:
 *  - Eine Zuweisung wird von rechts nach links gelesen.
 *  - Eine Schleife führt dieselben Zeilen mehrfach aus.
 *  - Ein Zweig, der nie an die Reihe kommt, bleibt einfach unausgeführt.
 * Der letzte Punkt ist der Grund für die Kennzeichnung „nie ausgeführt".
 *
 * Bedienung vollständig über die Tastatur, Bewegung reduzierbar, jede Angabe
 * zusätzlich als Text – die Zeitleiste ist kein Diagramm zum Anschauen,
 * sondern ein Werkzeug zum Untersuchen.
 */

/** Abspielgeschwindigkeit in Millisekunden je Schritt. */
const SPEEDS: ReadonlyArray<{ label: string; ms: number }> = [
  { label: 'langsam', ms: 1_400 },
  { label: 'mittel', ms: 700 },
  { label: 'schnell', ms: 300 },
];

export function ExecutionTimeline({
  code,
  result,
  onClose,
}: {
  code: string;
  result: TraceResult;
  onClose: () => void;
}): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const steps = result.steps;
  const lastIndex = Math.max(0, steps.length - 1);
  const safeIndex = Math.min(index, lastIndex);
  const step = steps[safeIndex];
  const previousStep = safeIndex > 0 ? (steps[safeIndex - 1] ?? null) : null;

  const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
  const visits = useMemo(() => countLineVisits(steps), [steps]);
  const unreached = useMemo(() => new Set(neverExecutedLines(code, steps)), [code, steps]);
  const overview = useMemo(() => summarizeTrace(steps), [steps]);

  const variables = useMemo(
    () => diffVariables(step?.variables ?? [], previousStep?.variables ?? null),
    [step, previousStep],
  );
  const outputSoFar = useMemo(() => outputUpTo(result.stdout, step), [result.stdout, step]);

  // Am Ende läuft nichts weiter, statt umzulaufen: Ein Ablauf, der immer
  // wieder von vorn beginnt, wirkt wie eine Animation und nicht wie ein
  // Werkzeug. `isPlaying` wird abgeleitet statt gespeichert – so muss kein
  // Effekt den Zustand nachträglich zurücksetzen.
  const atEnd = safeIndex >= lastIndex;
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    if (!isPlaying) return;
    const delay = SPEEDS[speedIndex]?.ms ?? 700;
    const timer = window.setTimeout(() => setIndex((current) => current + 1), delay);
    return () => window.clearTimeout(timer);
  }, [isPlaying, safeIndex, speedIndex]);

  const goTo = useCallback(
    (next: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(next, lastIndex)));
    },
    [lastIndex],
  );

  /*
   * Tastaturbedienung für die gesamte Zeitleiste.
   *
   * Als Effekt am Behälter und nicht als onKeyDown im JSX: Ein Abschnitt ist
   * kein bedienbares Element, und ihn künstlich zu einem zu machen (tabIndex
   * plus Rolle) wäre für Hilfstechnik irreführend. So greifen die Tasten,
   * sobald der Fokus irgendwo in der Zeitleiste liegt – etwa auf einem der
   * Knöpfe –, ohne dass ein zusätzliches Bedienelement erfunden wird.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        // Der Schieberegler bringt das von Haus aus mit. Ihm die Tasten
        // wegzunehmen, würde die erwartete Bedienung zerstören.
        if (target instanceof HTMLInputElement) return;
        event.preventDefault();
        goTo(safeIndex + (event.key === 'ArrowRight' ? 1 : -1));
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        if (target instanceof HTMLInputElement) return;
        event.preventDefault();
        goTo(event.key === 'Home' ? 0 : lastIndex);
        return;
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        // Leertaste bedient Knöpfe und Auswahlfelder – dort hat sie Vorrang.
        if (target.closest('button, select, [contenteditable="true"]')) return;
        event.preventDefault();
        setPlaying((current) => !current);
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [goTo, safeIndex, lastIndex]);

  /*
   * Fokus auffangen, wenn ein Knopf unter den Fingern verschwindet.
   *
   * Wer am vorletzten Schritt auf „Weiter" steht und ans Ende springt, verliert
   * den Fokus: Der Knopf wird deaktiviert, und der Fokus fällt auf den
   * Seitenkörper. Ab da reagiert keine Taste mehr, und die Tastaturbedienung
   * bricht mitten in der Benutzung ab. Deshalb fängt die Zeitleiste den Fokus
   * auf und behält ihn bei sich.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onFocusOut = (event: FocusEvent): void => {
      // relatedTarget ist null, wenn der Fokus nirgendwohin weitergereicht
      // wurde – genau der Fall eines gerade deaktivierten Knopfes.
      if (event.relatedTarget === null) container.focus();
    };

    container.addEventListener('focusout', onFocusOut);
    return () => container.removeEventListener('focusout', onFocusOut);
  }, []);

  if (steps.length === 0) {
    return (
      <Callout tone="caution" title="Es gibt nichts aufzuzeichnen" live>
        <p>
          {result.error
            ? result.error.message
            : 'Das Programm hat keine einzige Zeile ausgeführt. Steht überhaupt etwas im Editor?'}
        </p>
        <p className="mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Zurück zum Editor
          </Button>
        </p>
      </Callout>
    );
  }

  return (
    <section
      ref={containerRef}
      aria-labelledby="visualisierer-titel"
      // Programmatisch fokussierbar, aber nicht im Tabulatorlauf: Der Fokus
      // landet hier nur, wenn ihn sonst niemand auffängt.
      tabIndex={-1}
      className="animate-rise rounded-xl border border-[var(--accent)] bg-[var(--surface-raised)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 id="visualisierer-titel" className="text-base font-semibold">
            Schritt für Schritt
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            {overview.totalSteps} Schritte über {overview.executedLines}{' '}
            {overview.executedLines === 1 ? 'Zeile' : 'Zeilen'}
            {overview.repeatedLines.length > 0
              ? ` · ${overview.repeatedLines.length} ${
                  overview.repeatedLines.length === 1 ? 'Zeile wird' : 'Zeilen werden'
                } wiederholt`
              : ''}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          Schließen
        </Button>
      </header>

      {result.truncated ? (
        <div className="px-4 pt-3">
          <Callout tone="caution" title="Aufzeichnung gekürzt">
            Das Programm macht mehr Schritte, als sich sinnvoll anzeigen lassen. Zu sehen ist der
            Anfang. Bei einer Schleife hilft es, die Anzahl der Durchläufe vorübergehend kleiner zu
            machen.
          </Callout>
        </div>
      ) : null}

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* --- Code mit Markierung ---------------------------------------- */}
        <div className="min-w-0">
          <h4 className="mb-2 text-sm font-semibold">Dein Programm</h4>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)]">
            <ol className="min-w-full py-2 font-mono text-[0.8125rem] leading-relaxed">
              {lines.map((text, position) => {
                const lineNumber = position + 1;
                const isCurrent = step?.line === lineNumber;
                const visitCount = visits.get(lineNumber) ?? 0;
                const isUnreached = unreached.has(lineNumber);

                return (
                  <li
                    key={lineNumber}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={cx(
                      'flex items-start gap-2 px-2',
                      isCurrent && 'bg-[var(--accent-soft)]',
                      isUnreached && 'opacity-45',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        'flex w-4 shrink-0 select-none justify-center',
                        isCurrent ? 'text-[var(--accent)]' : 'text-transparent',
                      )}
                    >
                      <Icon name="vor" size={13} />
                    </span>
                    <span className="w-6 shrink-0 select-none text-right text-[var(--text-muted)]">
                      {lineNumber}
                    </span>
                    <span
                      className={cx(
                        'whitespace-pre pr-2',
                        isCurrent && 'font-semibold text-[var(--accent)]',
                      )}
                    >
                      {text || ' '}
                    </span>
                    {visitCount > 1 ? (
                      <span className="ml-auto shrink-0 pl-2 font-sans text-[0.6875rem] text-[var(--text-muted)]">
                        {visitCount}×<span className="sr-only"> ausgeführt</span>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>

          {unreached.size > 0 ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Blasse Zeilen wurden bei diesem Durchlauf nie ausgeführt. Das ist oft der schnellste
              Weg zu der Frage, warum eine Bedingung nicht greift.
            </p>
          ) : null}
        </div>

        {/* --- Zustand ---------------------------------------------------- */}
        <div className="min-w-0 space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              Variablen
              {step && step.function !== '<module>' ? (
                <span className="ml-2 font-normal text-[var(--text-muted)]">
                  in {step.function}
                </span>
              ) : null}
            </h4>

            {variables.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-4 text-sm text-[var(--text-muted)]">
                Bis hierhin gibt es noch keine Variable. Sie entsteht erst, wenn ihr zum ersten Mal
                ein Wert zugewiesen wird.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {variables.map((variable) => (
                  <li
                    key={variable.name}
                    className={cx(
                      'rounded-lg border px-3 py-2',
                      variable.change === 'unchanged'
                        ? 'border-[var(--border)]'
                        : 'animate-flash border-[var(--accent)]',
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <code className="font-mono text-sm font-semibold">{variable.name}</code>
                      <span className="shrink-0 text-xs text-[var(--text-muted)]">
                        {variable.typeLabel}
                        <span className="ml-1 font-mono">({variable.type})</span>
                      </span>
                    </div>
                    <code className="mt-0.5 block break-all font-mono text-sm">
                      {variable.value}
                    </code>
                    {variable.change === 'new' ? (
                      <p className="mt-1 text-xs text-[var(--accent)]">
                        <Icon name="funke" size={13} className="inline align-[-2px]" /> neu
                        entstanden
                      </p>
                    ) : variable.change === 'changed' ? (
                      <p className="mt-1 text-xs text-[var(--accent)]">
                        <Icon name="wiederholen" size={13} className="inline align-[-2px]" /> vorher{' '}
                        <code className="font-mono">{variable.previousValue}</code>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Ausgabe bis hierhin</h4>
            <pre className="max-h-40 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-3 font-mono text-sm whitespace-pre-wrap">
              {outputSoFar.length > 0 ? (
                outputSoFar
              ) : (
                <span className="font-sans text-[var(--text-muted)]">Noch nichts ausgegeben.</span>
              )}
            </pre>
          </div>
        </div>
      </div>

      {/* --- Steuerung ---------------------------------------------------- */}
      <div className="space-y-3 border-t border-[var(--border)] px-4 py-3">
        <p
          // Während des Abspielens wird nicht angesagt: Ein Schritt je Sekunde
          // würde das Vorlesen unbrauchbar machen.
          {...(isPlaying ? {} : { role: 'status', 'aria-live': 'polite' })}
          className="text-sm font-medium"
        >
          Schritt {safeIndex + 1} von {steps.length}
          {step ? ` · ${describeStep(step)}` : ''}
          {step && step.depth > 0 ? ` (Aufruftiefe ${step.depth})` : ''}
        </p>

        <label className="block">
          <span className="sr-only">Schritt auswählen</span>
          <input
            type="range"
            min={0}
            max={lastIndex}
            step={1}
            value={safeIndex}
            onChange={(event) => goTo(Number(event.target.value))}
            aria-valuetext={`Schritt ${safeIndex + 1} von ${steps.length}${
              step ? `, ${describeStep(step)}` : ''
            }`}
            className="w-full accent-[var(--accent)]"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => goTo(0)}
            disabled={safeIndex === 0}
          >
            <Icon name="anfang" size={18} />
            <span className="sr-only">Zum ersten Schritt</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => goTo(safeIndex - 1)}
            disabled={safeIndex === 0}
          >
            <Icon name="zurueck" size={18} /> Zurück
          </Button>
          <Button type="button" onClick={() => setPlaying((current) => !current)} disabled={atEnd}>
            <Icon name={isPlaying ? 'anhalten' : 'abspielen'} size={18} />
            {isPlaying ? 'Anhalten' : 'Abspielen'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => goTo(safeIndex + 1)}
            disabled={safeIndex >= lastIndex}
          >
            Weiter <Icon name="vor" size={18} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => goTo(lastIndex)}
            disabled={safeIndex >= lastIndex}
          >
            <Icon name="ende" size={18} />
            <span className="sr-only">Zum letzten Schritt</span>
          </Button>

          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)]">Tempo</span>
            <select
              value={speedIndex}
              onChange={(event) => setSpeedIndex(Number(event.target.value))}
              className="min-h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 text-sm"
            >
              {SPEEDS.map((speed, position) => (
                <option key={speed.label} value={position}>
                  {speed.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <Kbd>←</Kbd>
            <Kbd>→</Kbd> Schritt
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Leertaste</Kbd> abspielen
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Pos1</Kbd>
            <Kbd>Ende</Kbd> Anfang und Ende
          </span>
        </p>

        {result.error ? (
          <Callout tone="caution" title="Das Programm endet mit einem Fehler">
            <p>
              {result.error.type}
              {result.error.line ? ` in Zeile ${result.error.line}` : ''}: {result.error.message}
            </p>
            <p className="mt-1">
              Geh die letzten Schritte davor durch. Meist steht dort schon ein Wert in einer
              Variablen, der nicht zu dem passt, was die Zeile mit ihm vorhat.
            </p>
          </Callout>
        ) : null}

        {overview.maxDepth > 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            <Badge tone="neutral">Funktionsaufrufe</Badge>{' '}
            <span className="ml-1">
              Die Ausführung springt in eigene Funktionen hinein. Die Variablen dort gehören nur zu
              diesem Aufruf und verschwinden am Ende wieder.
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
