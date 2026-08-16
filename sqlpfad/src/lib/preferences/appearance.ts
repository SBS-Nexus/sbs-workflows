/**
 * Darstellungseinstellungen im Browser.
 *
 * Farbschema und Bewegungsreduktion werden an zwei Stellen umgeschaltet: über
 * die Knöpfe in der Kopfzeile und über die Befehlspalette. Damit beide
 * dieselbe Wahrheit sehen, liegt der Zustand hier in einem winzigen Speicher
 * außerhalb von React, den Komponenten über `useSyncExternalStore` lesen.
 *
 * Warum nicht React-Kontext: Der Wert muss auch dann stimmen, wenn ein anderer
 * Tab ihn ändert, und er muss vor dem ersten Rendern feststehen (sonst blitzt
 * das falsche Schema auf). Ein Inline-Skript in app/layout.tsx setzt die
 * Attribute deshalb, bevor React startet – dieselben Schlüssel wie hier.
 */

export type Theme = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'sqlpfad-theme';
export const MOTION_STORAGE_KEY = 'sqlpfad-reduce-motion';

export const THEME_LABELS: Record<Theme, string> = {
  system: 'Systemeinstellung',
  light: 'Hell',
  dark: 'Dunkel',
};

/**
 * Icon-Namen aus dem eigenen Satz. Bewusst keine Unicode-Zeichen: Die sehen je
 * nach Betriebssystem völlig anders aus und lassen sich nicht auf die
 * Strichstärke der übrigen Oberfläche abstimmen.
 */
export const THEME_ICONS: Record<Theme, 'halbmond' | 'sonne' | 'mond'> = {
  system: 'halbmond',
  light: 'sonne',
  dark: 'mond',
};

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Abonnement für `useSyncExternalStore`. Deckt auch Änderungen in anderen Tabs ab. */
export function subscribeAppearance(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

export function readTheme(): Theme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function readThemeOnServer(): Theme {
  return 'system';
}

export function setTheme(theme: Theme): void {
  if (theme === 'system') {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  } else {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
  notify();
}

/** Reihum: Systemeinstellung → Hell → Dunkel. Liefert das neue Schema zurück. */
export function cycleTheme(): Theme {
  const order: Theme[] = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(readTheme()) + 1) % order.length] ?? 'system';
  setTheme(next);
  return next;
}

export function readReduceMotion(): boolean {
  return window.localStorage.getItem(MOTION_STORAGE_KEY) === 'true';
}

export function readReduceMotionOnServer(): boolean {
  return false;
}

/**
 * Schaltet die Bewegungsreduktion um.
 *
 * Der Schalter kann die Systemeinstellung nur verschärfen, nie aufheben: Wer
 * im Betriebssystem „Bewegung reduzieren" gewählt hat, bekommt weiterhin
 * ruhige Übergänge, weil die Medienabfrage in globals.css unabhängig davon
 * greift.
 */
export function toggleReduceMotion(): boolean {
  const next = !readReduceMotion();
  if (next) {
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'true');
    document.documentElement.setAttribute('data-reduce-motion', 'true');
  } else {
    window.localStorage.removeItem(MOTION_STORAGE_KEY);
    document.documentElement.removeAttribute('data-reduce-motion');
  }
  notify();
  return next;
}
