'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Menü der Lernpfade-Shell (LP-03A): ein Knopf, der eine Liste von Zielen und
 * Aktionen auf- und zuklappt (Disclosure-Muster).
 *
 * KANONISCH ist `docs/learning-shell/shell-menu.tsx`; jede App führt eine
 * bytegleiche Kopie (geprüft von `scripts/check-learning-shell.mjs`).
 *
 * Bewusst ohne `role="menu"`: Diese Rolle verspricht Pfeiltasten-Bedienung
 * wie in einem Anwendungsmenü. Hier gilt die gewohnte Bedienung von Links und
 * Knöpfen — Tab durch die Einträge, Enter löst aus. Dazu:
 *  - Escape schließt und gibt den Fokus an den Knopf zurück,
 *  - Klick außerhalb oder Fokus außerhalb schließt,
 *  - nach einer Navigation ist das Menü zu,
 *  - wird der Knopf bei einem Breakpoint-Wechsel unsichtbar, schließt es —
 *    es bleibt kein verborgener, fokussierbarer Inhalt zurück,
 *  - die Liste öffnet zum Knopf bündig rechts; wäre sie dann links aus dem
 *    Bild, öffnet sie bündig links.
 */
export function ShellMenu({
  label,
  className,
  children,
}: {
  label: React.ReactNode;
  className?: string;
  /** Erhält `close`, damit Einträge das Menü nach ihrer Aktion schließen. */
  children: (close: () => void) => React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  // Offen nur auf der Seite, auf der es geöffnet wurde: Navigation schließt.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn !== null && openOn === pathname;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Nur Zustand: `close` wird an die Einträge gereicht und berührt keine Ref.
  const close = useCallback(() => setOpenOn(null), []);

  // Ausrichtung messen, bevor gezeichnet wird: Die Liste bleibt im Bild.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!open || !panel || !button) return;
    const fitsRightAligned = button.getBoundingClientRect().right - panel.offsetWidth >= 8;
    panel.dataset.align = fitsRightAligned ? 'end' : 'start';
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (target: EventTarget | null): boolean =>
      !(target instanceof Node && rootRef.current?.contains(target));
    const onPointerDown = (event: PointerEvent): void => {
      if (outside(event.target)) close();
    };
    const onFocusIn = (event: FocusEvent): void => {
      if (outside(event.target)) close();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      const focusInside = !outside(document.activeElement);
      close();
      if (focusInside) buttonRef.current?.focus();
    };
    const onResize = (): void => {
      if (buttonRef.current && buttonRef.current.getClientRects().length === 0) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={className ? `lp-shell-menu ${className}` : 'lp-shell-menu'}>
      <button
        ref={buttonRef}
        type="button"
        className="lp-shell-action"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpenOn(pathname))}
      >
        {label}
      </button>
      <div ref={panelRef} id={panelId} className="lp-shell-menu-panel" hidden={!open}>
        {children(close)}
      </div>
    </div>
  );
}
