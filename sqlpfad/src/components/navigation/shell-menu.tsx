'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Tailwind-Breakpoints, an denen Shell und Apps den Kopf umbauen: sm, md, xl. */
const BREAKPOINTS = ['(min-width: 40rem)', '(min-width: 48rem)', '(min-width: 80rem)'];

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
 *  - eine Navigation schließt dauerhaft — auch Browser-Zurück/Vorwärts auf
 *    die Seite, auf der es offen war, öffnet es nicht wieder,
 *  - ein Breakpoint-Wechsel (sm, md, xl) schließt; ebenso eine Größenänderung,
 *    bei der der Knopf unsichtbar wird. Lag der Fokus im Menü, kehrt er zum
 *    Knopf zurück, wenn der sichtbar ist, sonst wird er abgegeben — er bleibt
 *    weder auf einem verborgenen Eintrag noch auf einem unsichtbaren Knopf,
 *  - die Liste öffnet zum Knopf bündig rechts; wäre sie dann links aus dem
 *    Bild, öffnet sie bündig links. Bei jeder Größenänderung innerhalb eines
 *    Breakpoints wird neu gemessen, weil der Knopf durch Umbruch wandert.
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
  // Offen nur auf der Seite, auf der es geöffnet wurde. Ein Pfadwechsel
  // verwirft den Zustand schon beim Rendern: Sonst wäre das Menü nach
  // Zurück und Vorwärts wieder offen, ohne dass jemand es geöffnet hat.
  const [openOn, setOpenOn] = useState<string | null>(null);
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const open = openOn !== null && openOn === pathname;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Nur Zustand: `close` wird an die Einträge gereicht und berührt keine Ref.
  const close = useCallback(() => setOpenOn(null), []);

  // Ausrichtung messen: Die Liste bleibt im Bild.
  const align = useCallback(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!panel || !button || panel.hidden) return;
    const fitsRightAligned = button.getBoundingClientRect().right - panel.offsetWidth >= 8;
    panel.dataset.align = fitsRightAligned ? 'end' : 'start';
  }, []);

  // Beim Öffnen messen, bevor gezeichnet wird.
  useLayoutEffect(() => {
    if (open) align();
  }, [open, align]);

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
    const visible = (element: HTMLElement): boolean => element.getClientRects().length > 0;
    // Schließen, ohne Fokus auf Verborgenem zu lassen.
    const dismiss = (): void => {
      const focusInside = !outside(document.activeElement);
      close();
      if (!focusInside) return;
      const button = buttonRef.current;
      if (button && visible(button)) button.focus();
      else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') dismiss();
    };
    const onResize = (): void => {
      const button = buttonRef.current;
      if (button && !visible(button)) dismiss();
      else align();
    };
    const breakpoints = BREAKPOINTS.map((query) => window.matchMedia(query));
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    for (const breakpoint of breakpoints) breakpoint.addEventListener('change', dismiss);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      for (const breakpoint of breakpoints) breakpoint.removeEventListener('change', dismiss);
    };
  }, [open, close, align]);

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
