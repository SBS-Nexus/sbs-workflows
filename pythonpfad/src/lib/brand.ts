/**
 * Name, Aussage und Farben der Marke – an genau einer Stelle.
 *
 * Diese Werte tauchen an vielen Orten auf: im Seitentitel, im Manifest der
 * installierbaren App, im Vorschaubild für geteilte Links, in der Kopfzeile.
 * Standen sie überall einzeln, würden sie beim ersten Umbenennen auseinander
 * laufen – und niemand merkt es, weil jede Stelle für sich richtig aussieht.
 *
 * Bewusst ohne `server-only`: Diese Angaben sind öffentlich und werden auch im
 * Browser gebraucht. Die Adresse der Seite steht dagegen in `server/site.ts`,
 * weil sie aus der Umgebungskonfiguration kommt.
 */

export const BRAND = {
  /** Vollständiger Name. */
  name: 'PythonPfad',

  /** Titel der Startseite. Wird auch als Standardtitel benutzt. */
  title: 'PythonPfad – Python verstehen. Selbst schreiben. Wirklich anwenden.',

  /** Ein Satz, der erklärt, worum es geht. Für Suchmaschinen und Vorschauen. */
  description:
    'Interaktive Lernplattform für Python-Anfängerinnen und -Anfänger: verständliche Erklärungen, Code direkt im Browser ausführen, Fehler systematisch verstehen und Gelerntes zum richtigen Zeitpunkt wiederholen.',

  /** Kurzfassung für das Manifest, wo wenig Platz ist. */
  shortDescription:
    'Interaktive Lernplattform für Python-Anfängerinnen und -Anfänger. Python läuft direkt im Browser.',

  /** Der Anspruch in drei Worten – für das Vorschaubild. */
  claim: 'Python verstehen. Selbst schreiben. Wirklich anwenden.',

  /**
   * Farben für Fenstergestaltung und Vorschaubild.
   *
   * Sie sind hier als feste Werte notiert und nicht als CSS-Variablen: Ein
   * Vorschaubild wird auf dem Server erzeugt, wo es kein Farbschema gibt, und
   * die Fensterfarbe des Betriebssystems kennt ebenfalls keine Variablen.
   */
  colors: {
    /** Grundton der Marke. */
    primary: '#1d3fc4',
    /** Flächen des dunklen Kopfbereichs: die Tinte des Learning OS (Roadmap E3). */
    heroFrom: '#0b0e0e',
    heroVia: '#121b17',
    heroTo: '#151b19',
    /** Akzente im Vorschaubild; Minze wie die Akzentzeile der Startseite. */
    mint: '#b4f5d2',
    sky: '#93c5fd',
    rose: '#f9a8d4',
    /** Fensterfarbe: Papier und Tinte, wie --color-ink-50 und -950. */
    surfaceLight: '#f2f2e9',
    surfaceDark: '#0b0e0e',
  },
} as const;
