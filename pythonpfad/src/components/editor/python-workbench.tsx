'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Callout, cx } from '@/components/ui/primitives';
import { usePythonRunner } from './use-python-runner';
import { ExecutionTimeline } from './execution-timeline';
import { explainPythonError } from '@/domain/errors/python-errors';
import type { RunnerTestCase, RunnerTestResult, RunResult, TraceResult } from '@/lib/runner/types';
import { DEFAULT_TIMEOUT_MS, TEST_TIMEOUT_MS } from '@/lib/runner/types';

/**
 * Arbeitsbereich zum Schreiben und Ausführen von Python.
 *
 * Wird an drei Stellen genutzt: bei Code-Aufgaben in Lektionen, in der
 * Projektwerkstatt und im freien Code-Labor. Die Unterschiede stecken
 * ausschließlich in den Eigenschaften, nicht in eigenen Varianten.
 */

const CodeEditor = dynamic(() => import('./code-editor'), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-56 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-sm text-[var(--text-muted)]"
      role="status"
    >
      Editor wird geladen …
    </div>
  ),
});

export interface PythonWorkbenchProps {
  code: string;
  onCodeChange: (code: string) => void;
  ariaLabel: string;
  /** Ausgangszustand für den Zurücksetzen-Knopf. */
  starterCode?: string;
  /** Sichtbare Testfälle, die beim Ausführen mitlaufen. */
  visibleTests?: RunnerTestCase[];
  hiddenTestCount?: number;
  /** Wird nach jedem Lauf mit dem Ergebnis aufgerufen. */
  onRunComplete?: (result: RunResult) => void;
  /** Zusätzliche Schaltflächen (z. B. "Lösung prüfen"). */
  actions?: React.ReactNode;
  minHeight?: string;
  /** Eingaben für input(), eine Zeile je Eingabe. */
  allowStdin?: boolean;
  /**
   * Schaltfläche für die schrittweise Ausführung anbieten.
   *
   * Standardmäßig an. Ausgeschaltet wird sie dort, wo der Blick auf den Ablauf
   * die Aufgabe verrät – etwa wenn eine Aufgabe ausdrücklich verlangt, die
   * Ausgabe vorherzusagen.
   */
  allowTrace?: boolean;
}

export function PythonWorkbench({
  code,
  onCodeChange,
  ariaLabel,
  starterCode,
  visibleTests = [],
  hiddenTestCount = 0,
  onRunComplete,
  actions,
  minHeight = '16rem',
  allowStdin = true,
  allowTrace = true,
}: PythonWorkbenchProps): React.ReactElement {
  const runner = usePythonRunner();
  const [stdin, setStdin] = useState('');
  const [testResults, setTestResults] = useState<RunnerTestResult[]>([]);
  const [showLimits, setShowLimits] = useState(false);
  const [trace, setTrace] = useState<{ code: string; result: TraceResult } | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [runner.output]);

  const handleRun = async (withTests: boolean): Promise<void> => {
    setTrace(null);
    const result = await runner.run({
      code,
      stdin: stdin.length > 0 ? stdin.split('\n') : [],
      ...(withTests && visibleTests.length > 0 ? { tests: visibleTests } : {}),
      timeoutMs: withTests ? TEST_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
    });
    setTestResults(result.testResults);
    onRunComplete?.(result);
  };

  const handleTrace = async (): Promise<void> => {
    const result = await runner.trace({
      code,
      stdin: stdin.length > 0 ? stdin.split('\n') : [],
    });
    // Der Code wird mitgespeichert: Die Zeitleiste zeigt weiterhin den Stand,
    // der aufgezeichnet wurde, auch wenn im Editor daneben schon weitergetippt
    // wird. Eine Markierung auf einer inzwischen verschobenen Zeile wäre
    // schlimmer als gar keine.
    setTrace({ code, result });
  };

  // Gemerkt statt bei jedem Rendern neu berechnet: Das Ergebnis wandert als
  // Fehlermarkierung in den Editor. Ein bei jedem Tastendruck frisch erzeugtes
  // Objekt würde dort jedes Mal eine neue Diagnose auslösen.
  const errorInfo = useMemo(() => {
    const error = runner.lastResult?.error;
    if (!error) return null;
    return explainPythonError(error.traceback || `${error.type}: ${error.message}`);
  }, [runner.lastResult]);

  const stdoutText = runner.output
    .filter((chunk) => chunk.stream === 'stdout')
    .map((chunk) => chunk.text)
    .join('');
  const stderrText = runner.output
    .filter((chunk) => chunk.stream === 'stderr')
    .map((chunk) => chunk.text)
    .join('');

  const combinedStdout = stdoutText || runner.lastResult?.stdout || '';

  /*
   * Fehlerzeile im Editor markieren.
   *
   * Die Meldung ist bewusst die deutsche Erklärung und nicht die englische
   * Originalmeldung: An dieser Stelle geht es darum, überhaupt zur richtigen
   * Zeile zu finden. Die vollständige Erklärung samt Ursachen und Suchstrategie
   * steht weiterhin unter der Ausgabe.
   */
  const errorMarker = useMemo(
    () =>
      errorInfo && errorInfo.line !== null
        ? { line: errorInfo.line, message: `${errorInfo.pythonType}: ${errorInfo.meaning}` }
        : null,
    [errorInfo],
  );

  return (
    <div className="space-y-3">
      <CodeEditor
        value={code}
        onChange={onCodeChange}
        ariaLabel={ariaLabel}
        minHeight={minHeight}
        onRun={() => void handleRun(visibleTests.length > 0)}
        errorMarker={errorMarker}
      />

      <p className="text-xs text-[var(--text-muted)]">
        Tastatur: Tab rückt ein. Mit Escape und danach Tab verlässt du den Editor. Strg + Eingabe
        (auf dem Mac ⌘ + Eingabe) führt den Code aus. Strg + Leertaste schlägt Python-Bausteine mit
        deutscher Erklärung vor.
      </p>

      {allowStdin ? (
        <details className="rounded-lg border border-[var(--border)] px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Eingaben für <code className="font-mono">input()</code>
            {stdin.length > 0 ? (
              <span className="ml-2 text-[var(--text-muted)]">
                ({stdin.split('\n').length} Zeile(n) vorbereitet)
              </span>
            ) : null}
          </summary>
          <div className="mt-2 space-y-1.5">
            <label htmlFor="stdin-feld" className="block text-sm text-[var(--text-muted)]">
              Eine Zeile je Eingabe. Der Browser kann keine echte Tastatureingabe während der
              Ausführung entgegennehmen – deshalb werden die Antworten vorher hier eingetragen.
            </label>
            <textarea
              id="stdin-feld"
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 font-mono text-sm"
              placeholder={'42\nja'}
            />
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void handleRun(false)} disabled={runner.isRunning}>
          <span aria-hidden="true">▶</span>
          {runner.isRunning ? 'Läuft …' : 'Ausführen'}
        </Button>

        {allowTrace ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleTrace()}
            disabled={runner.isRunning}
          >
            <span aria-hidden="true">◫</span> Schritt für Schritt
          </Button>
        ) : null}

        {visibleTests.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleRun(true)}
            disabled={runner.isRunning}
          >
            Mit Tests ausführen
          </Button>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          onClick={() => void runner.stop()}
          disabled={!runner.isRunning}
        >
          <span aria-hidden="true">■</span> Stopp
        </Button>

        {starterCode !== undefined ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onCodeChange(starterCode);
              runner.clearOutput();
              setTestResults([]);
            }}
          >
            Zurücksetzen
          </Button>
        ) : null}

        {actions}
      </div>

      <RunnerStatusLine status={runner.status} />

      {trace ? (
        <ExecutionTimeline code={trace.code} result={trace.result} onClose={() => setTrace(null)} />
      ) : null}

      {/* --- Ausgabe ---------------------------------------------------- */}
      <section aria-labelledby="ausgabe-titel" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 id="ausgabe-titel" className="text-sm font-semibold">
            Ausgabe
          </h3>
          <button
            type="button"
            onClick={() => setShowLimits((open) => !open)}
            aria-expanded={showLimits}
            className="text-xs text-[var(--accent)] underline"
          >
            Was kann diese Python-Umgebung?
          </button>
        </div>

        {showLimits ? (
          <Callout tone="info" title="Grenzen der Ausführung im Browser">
            <ul className="ml-4 list-disc space-y-1 text-sm">
              <li>
                Python läuft vollständig in deinem Browser. Dein Code wird nicht an einen Server
                geschickt.
              </li>
              <li>
                <code className="font-mono">input()</code> liest aus der Liste oben, nicht aus einem
                echten Terminal.
              </li>
              <li>Es gibt keinen Zugriff auf das Internet und auf Dateien deines Rechners.</li>
              <li>
                Verfügbar ist die Standardbibliothek. Zusätzliche Pakete lassen sich hier nicht
                installieren.
              </li>
              <li>
                Ein Programm wird nach {Math.round(DEFAULT_TIMEOUT_MS / 1000)} Sekunden angehalten.
                Bei Endlosschleifen greift außerdem der Stopp-Knopf.
              </li>
            </ul>
          </Callout>
        ) : null}

        <div
          ref={outputRef}
          role="log"
          aria-live="polite"
          aria-label="Programmausgabe"
          className="max-h-64 min-h-16 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-3 font-mono text-sm"
        >
          {combinedStdout.length === 0 && stderrText.length === 0 && !runner.lastResult ? (
            <p className="font-sans text-[var(--text-muted)]">
              Noch nichts ausgeführt. Drücke „Ausführen“, um dein Programm laufen zu lassen.
            </p>
          ) : null}

          {combinedStdout ? <pre className="whitespace-pre-wrap">{combinedStdout}</pre> : null}

          {runner.lastResult?.error ? (
            <pre className="mt-2 whitespace-pre-wrap text-[var(--alert)]">
              {runner.lastResult.error.traceback}
            </pre>
          ) : stderrText ? (
            <pre className="mt-2 whitespace-pre-wrap text-[var(--alert)]">{stderrText}</pre>
          ) : null}

          {runner.lastResult?.cancelled ? (
            <p className="mt-2 font-sans text-[var(--text-muted)]">
              Die Ausführung wurde gestoppt. Was bis dahin ausgegeben wurde, steht oben.
            </p>
          ) : null}

          {runner.lastResult &&
          !runner.lastResult.error &&
          !runner.lastResult.cancelled &&
          combinedStdout.length === 0 ? (
            <p className="font-sans text-[var(--text-muted)]">
              Das Programm ist ohne Fehler durchgelaufen, hat aber nichts ausgegeben. Fehlt
              vielleicht ein <code>print()</code>?
            </p>
          ) : null}
        </div>

        {errorInfo ? <ErrorExplanation info={errorInfo} /> : null}
      </section>

      {/* --- Tests ------------------------------------------------------- */}
      {visibleTests.length > 0 ? (
        <section aria-labelledby="tests-titel" className="space-y-2">
          <h3 id="tests-titel" className="text-sm font-semibold">
            Sichtbare Tests
            {hiddenTestCount > 0 ? (
              <span className="ml-2 font-normal text-[var(--text-muted)]">
                (zusätzlich {hiddenTestCount} versteckte
                {hiddenTestCount === 1 ? 'r Test' : ' Tests'} beim Einreichen)
              </span>
            ) : null}
          </h3>
          <ul className="space-y-1.5">
            {visibleTests.map((test) => {
              const result = testResults.find((r) => r.id === test.id);
              return (
                <li
                  key={test.id}
                  className={cx(
                    'rounded-lg border px-3 py-2 text-sm',
                    result === undefined
                      ? 'border-[var(--border)]'
                      : result.passed
                        ? 'border-[var(--success)] bg-[var(--success-soft)]'
                        : 'border-[var(--alert)] bg-[var(--alert-soft)]',
                  )}
                >
                  <p className="flex items-start gap-2 font-medium">
                    <span aria-hidden="true">
                      {result === undefined ? '○' : result.passed ? '✓' : '✕'}
                    </span>
                    <span>
                      <span className="sr-only">
                        {result === undefined
                          ? 'Noch nicht ausgeführt: '
                          : result.passed
                            ? 'Bestanden: '
                            : 'Nicht bestanden: '}
                      </span>
                      {test.name}
                    </span>
                  </p>
                  {result && !result.passed ? (
                    <div className="mt-1.5 space-y-1 pl-6 text-[0.8125rem]">
                      {result.message ? <p>{result.message}</p> : null}
                      {result.expectedStdout !== undefined ? (
                        <div className="grid gap-1 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold">Erwartet</p>
                            <pre className="overflow-x-auto rounded bg-[var(--surface-raised)] p-1.5 font-mono">
                              {result.expectedStdout || '(leer)'}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold">Erhalten</p>
                            <pre className="overflow-x-auto rounded bg-[var(--surface-raised)] p-1.5 font-mono">
                              {result.actualStdout || '(leer)'}
                            </pre>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RunnerStatusLine({
  status,
}: {
  status: ReturnType<typeof usePythonRunner>['status'];
}): React.ReactElement | null {
  if (status.phase === 'idle') return null;

  if (status.phase === 'loading') {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span aria-hidden="true">⟳</span>
        {status.message} Beim ersten Mal werden rund 13 MB geladen, danach kommt alles aus dem
        Browser-Cache.
      </p>
    );
  }

  if (status.phase === 'ready') {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        Python {status.pythonVersion} läuft in deinem Browser.
      </p>
    );
  }

  if (status.phase === 'running') {
    return (
      <p role="status" className="text-sm text-[var(--text-muted)]">
        Programm läuft …
      </p>
    );
  }

  return (
    <Callout tone="alert" title="Die Python-Laufzeit konnte nicht gestartet werden" live>
      {status.message} Lade die Seite neu. Falls das nicht hilft, prüfe, ob dein Browser WebAssembly
      erlaubt.
    </Callout>
  );
}

function ErrorExplanation({
  info,
}: {
  info: ReturnType<typeof explainPythonError>;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-[var(--caution)] bg-[var(--caution-soft)] p-4">
      <p className="flex items-center gap-2 font-semibold">
        <span aria-hidden="true">!</span>
        <span>
          {info.pythonType}
          {info.line ? ` – gemeldet in Zeile ${info.line}` : ''}
        </span>
        <Badge tone="caution">Fehler verstehen</Badge>
      </p>

      <p className="mt-2 text-[0.9375rem]">{info.meaning}</p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium">Mögliche Ursachen</summary>
        <ul className="ml-5 mt-1.5 list-disc space-y-1 text-sm">
          {info.likelyCauses.map((cause) => (
            <li key={cause}>{cause}</li>
          ))}
        </ul>
      </details>

      <details className="mt-2" open>
        <summary className="cursor-pointer text-sm font-medium">So grenzt du es ein</summary>
        <ol className="ml-5 mt-1.5 list-decimal space-y-1 text-sm">
          {info.searchStrategy.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>

      <p className="mt-3 border-t border-[var(--border)] pt-2 text-sm font-medium">
        Frage an dich selbst: {info.selfCheck}
      </p>
    </div>
  );
}
