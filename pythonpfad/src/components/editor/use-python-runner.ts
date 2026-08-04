'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSharedRunner } from '@/lib/runner/pyodide-runner';
import type {
  RunOptions,
  RunResult,
  RunnerStatus,
  TraceOptions,
  TraceResult,
} from '@/lib/runner/types';

/**
 * React-Anbindung an die Python-Laufzeit.
 *
 * Der Runner wird erst beim ersten Bedarf geladen (Lazy Loading), damit Seiten
 * ohne Code-Aufgabe nicht rund 13 MB WebAssembly herunterladen.
 */
export interface UsePythonRunner {
  status: RunnerStatus;
  /** Fortlaufende Ausgabe, auch während der Ausführung. */
  output: Array<{ stream: 'stdout' | 'stderr'; text: string }>;
  lastResult: RunResult | null;
  isRunning: boolean;
  /** Wurde die Laufzeit schon angefordert? */
  initialized: boolean;
  run: (options: RunOptions) => Promise<RunResult>;
  /** Führt aus und zeichnet jeden Schritt für den Visualisierer auf. */
  trace: (options: TraceOptions) => Promise<TraceResult>;
  stop: () => Promise<void>;
  reset: () => Promise<void>;
  clearOutput: () => void;
  preload: () => void;
}

export function usePythonRunner(): UsePythonRunner {
  const [status, setStatus] = useState<RunnerStatus>({ phase: 'idle' });
  const [output, setOutput] = useState<Array<{ stream: 'stdout' | 'stderr'; text: string }>>([]);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const runner = getSharedRunner();

    const unsubscribeStatus = runner.subscribe((next) => {
      if (mountedRef.current) setStatus(next);
    });
    const unsubscribeOutput = runner.onOutput((chunk) => {
      if (mountedRef.current) setOutput((previous) => [...previous, chunk]);
    });

    return () => {
      mountedRef.current = false;
      unsubscribeStatus();
      unsubscribeOutput();
    };
  }, []);

  const preload = useCallback(() => {
    setInitialized(true);
    void getSharedRunner().init();
  }, []);

  const run = useCallback(async (options: RunOptions): Promise<RunResult> => {
    setInitialized(true);
    setIsRunning(true);
    setOutput([]);

    try {
      const result = await getSharedRunner().run(options);
      if (mountedRef.current) setLastResult(result);
      return result;
    } finally {
      if (mountedRef.current) setIsRunning(false);
    }
  }, []);

  const trace = useCallback(async (options: TraceOptions): Promise<TraceResult> => {
    setInitialized(true);
    setIsRunning(true);
    // Die Ausgabe der Aufzeichnung wird in der Zeitleiste schrittweise gezeigt,
    // nicht im laufenden Ausgabefeld. Deshalb wird hier geleert und nicht
    // ergänzt – sonst stünde dieselbe Ausgabe zweimal auf dem Bildschirm.
    setOutput([]);

    try {
      return await getSharedRunner().trace(options);
    } finally {
      if (mountedRef.current) setIsRunning(false);
    }
  }, []);

  const stop = useCallback(async () => {
    await getSharedRunner().stop();
    if (mountedRef.current) setIsRunning(false);
  }, []);

  const reset = useCallback(async () => {
    setOutput([]);
    setLastResult(null);
    await getSharedRunner().reset();
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
    setLastResult(null);
  }, []);

  return {
    status,
    output,
    lastResult,
    isRunning,
    initialized,
    run,
    trace,
    stop,
    reset,
    clearOutput,
    preload,
  };
}
