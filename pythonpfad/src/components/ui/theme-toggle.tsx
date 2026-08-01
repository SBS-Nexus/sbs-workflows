'use client';

import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'pythonpfad-theme';

const LABELS: Record<Theme, string> = {
  system: 'Systemeinstellung',
  light: 'Hell',
  dark: 'Dunkel',
};

const ICONS: Record<Theme, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
};

/**
 * Umschalter für das Farbschema.
 *
 * Die Auswahl liegt im localStorage – einem externen Speicher außerhalb von
 * React. Deshalb wird sie über `useSyncExternalStore` gelesen statt über einen
 * Effekt: So bleibt der Server-Render eindeutig, und Änderungen in einem anderen
 * Tab kommen automatisch an.
 *
 * Damit beim Laden nicht kurz das falsche Schema aufblitzt, setzt zusätzlich ein
 * kleines Inline-Skript in app/layout.tsx das Attribut, bevor React startet.
 */
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function getServerSnapshot(): Theme {
  return 'system';
}

export function ThemeToggle(): React.ReactElement {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const cycle = useCallback(() => {
    const order: Theme[] = ['system', 'light', 'dark'];
    const current = getSnapshot();
    const next = order[(order.indexOf(current) + 1) % order.length] ?? 'system';

    if (next === 'system') {
      window.localStorage.removeItem(STORAGE_KEY);
      document.documentElement.removeAttribute('data-theme');
    } else {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.setAttribute('data-theme', next);
    }

    for (const listener of listeners) listener();
  }, []);

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] text-base"
      title={`Farbschema: ${LABELS[theme]}`}
    >
      <span aria-hidden="true">{ICONS[theme]}</span>
      <span className="sr-only">Farbschema umschalten. Aktuell: {LABELS[theme]}</span>
    </button>
  );
}
