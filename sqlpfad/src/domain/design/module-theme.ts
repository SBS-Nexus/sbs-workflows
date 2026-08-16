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
  /**
   * Verlauf für große Kopfbereiche, von dunkel nach kräftig.
   *
   * Hier stehen ausnahmsweise feste Farbwerte statt Variablen. Der Grund: Ein
   * solcher Kopfbereich trägt weiße Schrift und ist in beiden Farbschemata
   * dunkel. Die Modulfarben werden im dunklen Schema aber aufgehellt – ein
   * Verlauf aus Variablen würde dort zu Pastell, und Weiß darauf wäre nicht
   * mehr lesbar.
   */
  heroFrom: string;
  heroTo: string;
}

const THEMES: readonly ModuleTheme[] = [
  {
    color: 'var(--color-modul-0)',
    soft: 'var(--color-modul-0-soft)',
    label: 'Violett',
    heroFrom: '#3b0764',
    heroTo: '#7c3aed',
  },
  {
    color: 'var(--color-modul-1)',
    soft: 'var(--color-modul-1-soft)',
    label: 'Petrol',
    heroFrom: '#134e4a',
    heroTo: '#0d9488',
  },
  {
    color: 'var(--color-modul-2)',
    soft: 'var(--color-modul-2-soft)',
    label: 'Orange',
    heroFrom: '#7c2d12',
    heroTo: '#ea580c',
  },
  {
    color: 'var(--color-modul-3)',
    soft: 'var(--color-modul-3-soft)',
    label: 'Blau',
    heroFrom: '#172554',
    heroTo: '#2563eb',
  },
];

export const PROJECT_THEME: ModuleTheme = {
  color: 'var(--color-projekt)',
  soft: 'var(--color-projekt-soft)',
  label: 'Magenta',
  heroFrom: '#500724',
  heroTo: '#db2777',
};

export const REVIEW_THEME: ModuleTheme = {
  color: 'var(--color-wiederholen)',
  soft: 'var(--color-wiederholen-soft)',
  label: 'Blattgrün',
  heroFrom: '#1a2e05',
  heroTo: '#4d7c0f',
};

/**
 * Fertiger Verlauf für einen Kopfbereich.
 *
 * Zwei Farbwolken über einer Grundschräge – dieselbe Machart wie auf der
 * Startseite, nur im Ton des jeweiligen Bereichs. Der Verlauf allein wäre
 * flach; die beiden Wolken geben ihm Tiefe.
 */
export function heroGradient(theme: ModuleTheme): string {
  /*
   * Ein Ton, nicht drei.
   *
   * Vorher lagen hier zwei farbige Lichtkegel über einem Verlauf von einer
   * Farbe in eine andere – zusammen also drei Buntheiten auf einer Fläche.
   * Das ist die Bildsprache, die man inzwischen an jeder zweiten neuen
   * Oberfläche sieht, und sie hat einen Grund: Sie entsteht, wenn man Farbe
   * hinzufügt, bis es „lebendig" aussieht, statt eine auszuwählen.
   *
   * Jetzt bleibt es bei der Leitfarbe des Bereichs, aufgezogen von dunkel nach
   * kräftig, mit einem einzigen aufhellenden Lichtkegel oben links – dort, wo
   * die Überschrift steht. Das gibt Tiefe, ohne eine zweite Farbe einzuführen.
   * Die Bereiche unterscheiden sich dadurch deutlicher voneinander, nicht
   * weniger: Vorher trug jeder Kopfbereich dieselbe Mischung.
   */
  return [
    `radial-gradient(at 12% 8%, color-mix(in oklab, ${theme.heroTo} 55%, white) 0px, transparent 62%)`,
    `linear-gradient(160deg, ${theme.heroFrom} 0%, ${theme.heroTo} 100%)`,
  ].join(', ');
}

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
