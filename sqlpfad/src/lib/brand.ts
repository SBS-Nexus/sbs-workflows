/**
 * Name, Aussage und Farben der Marke – an genau einer Stelle.
 *
 * Diese Werte tauchen im Seitentitel auf, im Manifest der installierbaren App,
 * im Vorschaubild geteilter Links und in der Kopfzeile. Stünden sie überall
 * einzeln, liefen sie beim ersten Umbenennen auseinander – und niemand merkt
 * es, weil jede Stelle für sich richtig aussieht.
 *
 * Bewusst ohne `server-only`: Diese Angaben sind öffentlich und werden auch im
 * Browser gebraucht. Die Adresse der Seite steht dagegen in `server/site.ts`,
 * weil sie aus der Umgebungskonfiguration kommt.
 */

export const BRAND = {
  name: 'SQLPfad',

  title: 'SQLPfad – SQL verstehen. Abfragen schreiben. Daten wirklich nutzen.',

  description:
    'Interaktive Lernplattform für T-SQL und SQL Server: verständliche Erklärungen, echte Abfragen gegen eine eigene Übungsdatenbank, Fehlermeldungen systematisch verstehen und Gelerntes zum richtigen Zeitpunkt wiederholen.',

  shortDescription:
    'Interaktive Lernplattform für T-SQL und SQL Server. Abfragen laufen gegen eine eigene Übungsdatenbank.',

  claim: 'SQL verstehen. Abfragen schreiben. Daten wirklich nutzen.',

  /**
   * Farben für Fenstergestaltung und Vorschaubild.
   *
   * Feste Werte statt CSS-Variablen: Ein Vorschaubild wird auf dem Server
   * erzeugt, wo es kein Farbschema gibt, und die Fensterfarbe des
   * Betriebssystems kennt ebenfalls keine Variablen.
   */
  colors: {
    /** Grundton der Marke – Petrol, siehe globals.css. */
    primary: '#095d56',
    /** Flächen des dunklen Kopfbereichs, von links oben nach rechts unten. */
    heroFrom: '#12102b',
    heroVia: '#093c39',
    heroTo: '#211d47',
    /** Akzente im Vorschaubild. */
    mint: '#6ed3c7',
    sky: '#93c5fd',
    rose: '#f9a8d4',
    surfaceLight: '#f4f2fb',
    surfaceDark: '#12102b',
  },
} as const;
