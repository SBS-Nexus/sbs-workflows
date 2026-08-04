'use client';

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/components/ui/primitives';

/**
 * Modaler Dialog.
 *
 * Bewusst von Hand statt über `<dialog>`: Das native Element bringt zwar
 * Fokusfang und Escape mit, sein `::backdrop` lässt sich aber in beiden
 * Farbschemata nur umständlich gestalten, und das Verhalten bei geschachtelten
 * Überlagerungen unterscheidet sich noch zwischen den Browsern.
 *
 * Umgesetzt sind die Anforderungen aus dem WAI-ARIA Authoring Practices Guide
 * für das Muster „Dialog (Modal)":
 *  - `role="dialog"` mit `aria-modal="true"` und Beschriftung
 *  - Fokus wandert beim Öffnen hinein und beim Schließen zurück
 *  - Tabulator bleibt im Dialog gefangen
 *  - Escape schließt
 *  - der Hintergrund scrollt nicht mit
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Dialog({
  open,
  onClose,
  title,
  description,
  /** Wenn gesetzt, wird die Beschriftung nicht sichtbar dargestellt. */
  hideTitle = false,
  /** Breite des Dialogs. `wide` etwa für die Befehlspalette. */
  size = 'base',
  /** Am oberen Rand ausrichten statt mittig – ruhiger bei wechselnder Höhe. */
  align = 'center',
  initialFocusRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  hideTitle?: boolean;
  size?: 'base' | 'wide';
  align?: 'center' | 'top';
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children: ReactNode;
}): ReactNode {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const focusFirst = useCallback((): void => {
    const explicit = initialFocusRef?.current;
    if (explicit) {
      explicit.focus();
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    const candidates = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = candidates.item(0);
    if (first) first.focus();
    else panel.focus();
  }, [initialFocusRef]);

  // Öffnen: Fokus merken, hineinsetzen, Hintergrund festhalten.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.dataset.overlayOpen = 'true';
    focusFirst();

    const restoreTarget = previouslyFocused.current;
    return () => {
      delete document.body.dataset.overlayOpen;
      // Der Fokus darf nicht ins Nichts fallen, sonst landet er am Seitenanfang
      // und die Tastaturbedienung beginnt von vorn.
      if (restoreTarget && document.contains(restoreTarget)) restoreTarget.focus();
    };
  }, [open, focusFirst]);

  // Escape und Fokusfang.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const candidates = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (candidates.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cx(
        'pp-overlay flex justify-center px-4',
        align === 'top' ? 'items-start pt-[10vh]' : 'items-center',
      )}
    >
      {/*
       * Der Hintergrund ist ein echter Knopf und kein anklickbares div: So
       * bleibt die Bedienung für Hilfstechnik eindeutig. Aus dem Tabulatorlauf
       * ist er herausgenommen und für Screenreader unsichtbar – dort führt
       * Escape zum selben Ziel, und ein zusätzlicher „Hintergrund"-Knopf wäre
       * nur Lärm.
       */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onMouseDown={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(
          'animate-scale-in elevation-3 relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]',
          size === 'wide' ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        <div className={cx('px-5 pt-5', hideTitle && 'sr-only')}>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm text-[var(--text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
