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
 *
 * Seit Roadmap E3 sind es gedeckte Töne aus der Farbwelt des Learning OS –
 * Pflaume, Petrol, Ocker, Taubenblau, dazu Beere für Projekte und Moos fürs
 * Wiederholen – und in allen Fachanwendungen dieselben: Modul 1 hat in
 * PythonPfad und SQLPfad dieselbe Farbe. Vorher standen hier Violett, Orange
 * und Magenta in voller Sättigung; zusammen auf einer Seite wirkte das wie ein
 * Farbkasten und nicht wie eine Orientierungshilfe.
 */

export interface ModuleTheme {
  /** CSS-Variable der Volltonfarbe. */
  color: string;
  /** CSS-Variable der hellen Fläche. */
  soft: string;
  /** Kurzbezeichnung, falls die Farbe benannt werden muss. */
  label: string;
  /**
   * Farbe des Lichtkegels im großen Kopfbereich.
   *
   * Hier steht ausnahmsweise ein fester Farbwert statt einer Variable. Der
   * Grund: Ein solcher Kopfbereich trägt weiße Schrift und ist in beiden
   * Farbschemata dunkel. Die Modulfarben werden im dunklen Schema aber
   * aufgehellt – ein Kegel aus der Variable würde dort zu Pastell, und Weiß
   * darauf wäre nicht mehr lesbar. Der Wert ist deshalb immer die volle Farbe
   * des hellen Schemas; weiße Schrift erreicht darauf mindestens 5,8 : 1.
   */
  heroAccent: string;
}

const THEMES: readonly ModuleTheme[] = [
  {
    color: 'var(--color-modul-0)',
    soft: 'var(--color-modul-0-soft)',
    label: 'Pflaume',
    heroAccent: '#5e4378',
  },
  {
    color: 'var(--color-modul-1)',
    soft: 'var(--color-modul-1-soft)',
    label: 'Petrol',
    heroAccent: '#1d6964',
  },
  {
    color: 'var(--color-modul-2)',
    soft: 'var(--color-modul-2-soft)',
    label: 'Ocker',
    heroAccent: '#95551d',
  },
  {
    color: 'var(--color-modul-3)',
    soft: 'var(--color-modul-3-soft)',
    label: 'Taubenblau',
    heroAccent: '#34568a',
  },
];

export const PROJECT_THEME: ModuleTheme = {
  color: 'var(--color-projekt)',
  soft: 'var(--color-projekt-soft)',
  label: 'Beere',
  heroAccent: '#843856',
};

export const REVIEW_THEME: ModuleTheme = {
  color: 'var(--color-wiederholen)',
  soft: 'var(--color-wiederholen-soft)',
  label: 'Moos',
  heroAccent: '#4f6e2e',
};

/**
 * Fertiger Verlauf für einen Kopfbereich.
 *
 * Dieselbe Machart wie auf der Startseite: die Tinte des Learning OS als
 * Grund und ein einziger Lichtkegel im Ton des jeweiligen Bereichs.
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
   * Danach war es die Leitfarbe des Bereichs, aufgezogen von dunkel nach
   * kräftig, mit einem aufhellenden Kegel aus halb Weiß genau dort, wo die
   * weiße Überschrift steht. Jetzt (Roadmap E3) steht jeder Kopfbereich auf
   * der Tinte des Learning OS, wie die Startseite und der Hub, und die
   * Bereichsfarbe kommt nur noch als Lichtkegel dazu. Der Kegel ist nirgends
   * heller als die volle Bereichsfarbe, darum bleibt weiße Schrift überall
   * darauf lesbar.
   */
  return [
    `radial-gradient(at 12% 8%, color-mix(in oklab, ${theme.heroAccent} 70%, transparent) 0px, transparent 60%)`,
    'linear-gradient(165deg, #0b0e0e 0%, #121b17 55%, #151b19 100%)',
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
  /*
   * `--lp-ui-area` reicht die Bereichsfarbe an die gemeinsamen Komponenten
   * (LP-03C) weiter: Karten, Fortschrittsbalken und Leerzustände im Bereich
   * nehmen sie an, ohne dass der Vertrag App-Tokens lesen muss.
   */
  return { '--akzent': theme.color, '--akzent-soft': theme.soft, '--lp-ui-area': theme.color };
}
