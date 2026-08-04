'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cx, type Tone } from '@/components/ui/primitives';

/**
 * Kurzmeldungen.
 *
 * Grundsätze:
 *  - Eine Kurzmeldung ist nie der einzige Ort einer Information. Sie bestätigt,
 *    was ohnehin schon auf der Seite sichtbar ist. Wer sie verpasst, verliert
 *    nichts.
 *  - Fehler werden bestimmt (`assertive`) angesagt, Bestätigungen höflich
 *    (`polite`). Sonst unterbricht jede gespeicherte Notiz das Vorlesen.
 *  - Die Zeit läuft nicht weiter, solange die Maus darauf steht oder der Fokus
 *    darin liegt. Sonst verschwindet die Meldung genau dann, wenn jemand sie
 *    gerade liest oder den Schließen-Knopf ansteuert.
 *  - Kein Ton, kein Zittern, keine Dringlichkeitsfarbe ohne Anlass.
 */

export interface ToastOptions {
  tone?: Tone;
  /** Zusatzzeile unter der Meldung. */
  detail?: string;
  /** Anzeigedauer in Millisekunden. `null` bleibt bis zum Schließen stehen. */
  durationMs?: number | null;
}

interface ToastRecord extends ToastOptions {
  id: number;
  message: string;
}

interface ToastApi {
  notify: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION_MS = 5_000;
/** Mehr als drei gleichzeitig sind nicht mehr lesbar. */
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, options: ToastOptions = {}): void => {
    const id = nextId.current;
    nextId.current += 1;
    setToasts((current) => [...current, { id, message, ...options }].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // Fest am unteren Rand, oberhalb der mobilen Navigationsleiste.
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-20 sm:bottom-4 sm:right-4 sm:left-auto sm:items-end sm:pb-0"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TONE_ICON: Record<Tone, string> = {
  info: 'ℹ',
  success: '✓',
  caution: '!',
  alert: '✕',
};

const TONE_BORDER: Record<Tone, string> = {
  info: 'border-l-[var(--accent)]',
  success: 'border-l-[var(--success)]',
  caution: 'border-l-[var(--caution)]',
  alert: 'border-l-[var(--alert)]',
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}): ReactNode {
  const tone = toast.tone ?? 'info';
  const duration = toast.durationMs === undefined ? DEFAULT_DURATION_MS : toast.durationMs;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (duration === null || paused) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, paused, toast.id, onDismiss]);

  return (
    <div
      role={tone === 'alert' ? 'alert' : 'status'}
      aria-live={tone === 'alert' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cx(
        'animate-sheet-up elevation-2 pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-l-4 border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3',
        TONE_BORDER[tone],
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 font-semibold">
        {TONE_ICON[tone]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-medium">{toast.message}</p>
        {toast.detail ? (
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{toast.detail}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-1 shrink-0 rounded-lg px-2 py-1 text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
      >
        <span aria-hidden="true">✕</span>
        <span className="sr-only">Meldung schließen</span>
      </button>
    </div>
  );
}

/**
 * Zugriff auf die Kurzmeldungen.
 *
 * Wird bewusst nicht fehlerfrei gemacht, wenn kein Provider da ist: Eine
 * stillschweigend verschluckte Meldung wäre schwerer zu finden als ein klarer
 * Fehler beim ersten Rendern.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast benötigt einen ToastProvider weiter oben im Baum.');
  }
  return context;
}
