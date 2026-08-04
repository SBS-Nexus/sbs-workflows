/**
 * Leitfarben der Module.
 *
 * Jedes Modul bekommt eine eigene Farbe, die überall wiederkehrt: im Lernpfad,
 * in der Kopfzeile der Lektion, in der Wissenslandkarte und in der
 * Fortschrittsübersicht. Der Zweck ist Orientierung, nicht Schmuck – wer eine
 * Seite öffnet, soll an der Farbe erkennen, wo im Kurs er gerade ist, bevor er
 * die Überschrift liest.
 *
 * Die Farbwerte selbst stehen in globals.css, weil sie sich je nach
 * Farbschema unterscheiden. Hier stehen nur die Namen der Variablen und die
 * Zuordnung. So gibt es genau eine Stelle für die Werte und genau eine für die
 * Zuordnung.
 */

export interface ModuleTheme {
  /** CSS-Variable der Volltonfarbe. */
  color: string;
  /** CSS-Variable der hellen Fläche. */
  soft: string;
  /** Kurzbezeichnung, falls die Farbe benannt werden muss. */
  label: string;
}

const THEMES: readonly ModuleTheme[] = [
  { color: 'var(--color-modul-0)', soft: 'var(--color-modul-0-soft)', label: 'Violett' },
  { color: 'var(--color-modul-1)', soft: 'var(--color-modul-1-soft)', label: 'Petrol' },
  { color: 'var(--color-modul-2)', soft: 'var(--color-modul-2-soft)', label: 'Orange' },
  { color: 'var(--color-modul-3)', soft: 'var(--color-modul-3-soft)', label: 'Blau' },
];

export const PROJECT_THEME: ModuleTheme = {
  color: 'var(--color-projekt)',
  soft: 'var(--color-projekt-soft)',
  label: 'Magenta',
};

export const REVIEW_THEME: ModuleTheme = {
  color: 'var(--color-wiederholen)',
  soft: 'var(--color-wiederholen-soft)',
  label: 'Blattgrün',
};

/**
 * Farbe zu einer Modulnummer.
 *
 * Läuft bewusst um, statt bei zu großen Zahlen zu scheitern: Ein fünftes Modul
 * bekommt wieder die erste Farbe. Das ist besser als eine farblose Kachel und
 * besser als ein Absturz, wenn der Kurs später wächst.
 */
export function moduleTheme(order: number): ModuleTheme {
  const index = ((Math.trunc(order) % THEMES.length) + THEMES.length) % THEMES.length;
  return THEMES[index] ?? THEMES[0]!;
}

/** Alle Modulfarben – für Legenden und für Tests. */
export const MODULE_THEMES = THEMES;

/**
 * Stilobjekt mit den beiden Farben als eigene Eigenschaften.
 *
 * Komponenten setzen damit `--akzent` und `--akzent-soft` auf einem Element;
 * die Klassen darunter greifen dann darauf zu. Dadurch kommen die Modulfarben
 * ohne dynamische Klassennamen aus – Tailwind kann Klassen, die erst zur
 * Laufzeit entstehen, nicht erzeugen.
 */
export function themeStyle(theme: ModuleTheme): Record<string, string> {
  return { '--akzent': theme.color, '--akzent-soft': theme.soft };
}
