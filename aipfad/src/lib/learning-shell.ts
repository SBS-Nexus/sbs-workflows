/**
 * Lernpfade-Shell — gemeinsamer Navigationsvertrag (LP-03A).
 *
 * KANONISCH ist `docs/learning-shell/learning-shell.ts`. Jede App führt eine
 * bytegleiche Kopie unter `src/lib/learning-shell.ts`; die Apps bleiben
 * dadurch unabhängig baubar, ohne Laufzeit-Import aus einer anderen App.
 * `node scripts/check-learning-shell.mjs` scheitert, sobald eine Kopie fehlt
 * oder abweicht. Geändert wird nur hier — danach in alle drei Apps kopieren.
 *
 * Reine Daten und Funktionen: kein React, kein Zugriff auf Umgebung oder DOM.
 */

export type ShellApp = 'python' | 'sql' | 'ai';

/**
 * Semantische Bereiche in verbindlicher Reihenfolge. Die IDs sind stabil und
 * unabhängig von Beschriftung, Route und Symbol der jeweiligen App.
 */
export const SHELL_AREAS = [
  'overview',
  'learn',
  'practice',
  'projects',
  'review',
  'progress',
  'profile',
] as const;

export type ShellArea = (typeof SHELL_AREAS)[number];

export type ShellNavItem = {
  readonly id: ShellArea;
  readonly href: string;
  readonly label: string;
  /**
   * Weitere Pfadpräfixe, die zu diesem Bereich gehören, obwohl sie nicht unter
   * `href` liegen (z. B. AIPfad-Lektionen unter `/lektion/...` → Lernen).
   */
  readonly also?: readonly string[];
};

/**
 * Fähigkeitsmatrix: Ein Bereich, den eine App nicht hat, fehlt — er wird
 * nicht erfunden. Python und SQL zeigen ihren Überblick unter `/fortschritt`
 * und deshalb keinen zweiten Fortschritts-Eintrag; AIPfad trennt Überblick
 * (`/pfad`) und Fortschritt (`/fortschritt`).
 */
export const SHELL_NAV: Readonly<Record<ShellApp, readonly ShellNavItem[]>> = {
  python: [
    { id: 'overview', href: '/fortschritt', label: 'Überblick' },
    { id: 'learn', href: '/lernen', label: 'Lernen' },
    { id: 'practice', href: '/ueben', label: 'Üben' },
    { id: 'projects', href: '/projekte', label: 'Projekte' },
    { id: 'review', href: '/wiederholen', label: 'Wiederholen' },
    { id: 'profile', href: '/profil', label: 'Profil' },
  ],
  sql: [
    { id: 'overview', href: '/fortschritt', label: 'Überblick' },
    { id: 'learn', href: '/lernen', label: 'Lernen' },
    { id: 'practice', href: '/ueben', label: 'Üben' },
    { id: 'projects', href: '/projekte', label: 'Projekte' },
    { id: 'review', href: '/wiederholen', label: 'Wiederholen' },
    { id: 'profile', href: '/profil', label: 'Profil' },
  ],
  ai: [
    { id: 'overview', href: '/pfad', label: 'Überblick' },
    { id: 'learn', href: '/lernen', label: 'Lernen', also: ['/lektion'] },
    { id: 'practice', href: '/labs', label: 'Labs' },
    { id: 'review', href: '/wiederholen', label: 'Wiederholen' },
    { id: 'progress', href: '/fortschritt', label: 'Fortschritt' },
  ],
};

export const SHELL_APP_NAME: Readonly<Record<ShellApp, string>> = {
  python: 'PythonPfad',
  sql: 'SQLPfad',
  ai: 'AIPfad',
};

/** Hauptnavigation einer App in Vertragsreihenfolge. */
export function shellNav(app: ShellApp): readonly ShellNavItem[] {
  return SHELL_NAV[app];
}

/**
 * Liegt `pathname` auf `prefix` oder darunter? Verglichen wird an
 * Segmentgrenzen: `/lernen-extra` gehört nicht zu `/lernen`.
 */
export function isWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Der eine aktive Eintrag einer Navigation — höchstens einer. Bei mehreren
 * Treffern gewinnt der längste passende Präfix, damit ein Unterbereich (z. B.
 * eine App-eigene Zusatzseite) nicht zugleich seinen Oberbereich markiert.
 */
export function activeShellHref(
  pathname: string,
  entries: ReadonlyArray<{ readonly href: string; readonly also?: readonly string[] }>,
): string | null {
  let best: { href: string; length: number } | null = null;
  for (const entry of entries) {
    for (const prefix of [entry.href, ...(entry.also ?? [])]) {
      if (isWithin(pathname, prefix) && (best === null || prefix.length > best.length)) {
        best = { href: entry.href, length: prefix.length };
      }
    }
  }
  return best?.href ?? null;
}

export type HubLinks = {
  readonly home: string;
  readonly review: string;
  readonly progress: string;
};

/**
 * Ziele der Plattform-Dachleiste aus `NEXT_PUBLIC_LEARNING_HUB_URL`.
 *
 * Ohne oder mit unbrauchbarer Angabe gibt es keine Ziele (`null`) — die
 * Dachleiste erfindet dann keine Adresse. Abschließende Schrägstriche werden
 * entfernt, damit keine `//wiederholen`-Adressen entstehen. Zugangsdaten,
 * Abfrageteil und Fragment sind in einer Basisadresse nicht zulässig.
 */
export function hubLinks(raw: string | null | undefined): HubLinks | null {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || url.search || url.hash) return null;
  const base = `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  return { home: base, review: `${base}/wiederholen`, progress: `${base}/fortschritt` };
}
