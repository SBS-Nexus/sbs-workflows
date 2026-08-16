import type { AnweisungsKlasse } from '@/domain/sql/statement-policy';
import type { Resultset, VergleichsOptionen } from '@/domain/sql/resultset';

/**
 * Der Lehrplan als Daten.
 *
 * Inhalte stehen in versionierten Dateien und nicht in der Datenbank. Der Seed
 * schreibt sie hinein, die Datenbank ist die Kopie – nicht die Quelle. Damit
 * ist jede Änderung am Lehrplan ein Commit mit Verlauf, Begründung und der
 * Möglichkeit, sie zurückzunehmen.
 *
 * Der Aufbau folgt dem Ablauf, der auf der Startseite versprochen wird: eine
 * Frage an die Daten, die Tabellen ansehen, das Ergebnis vorhersagen, selbst
 * schreiben, Fehler verstehen, wiederholen. Die Felder hier sind die Teile
 * dieses Ablaufs und keine allgemeine Inhaltsverwaltung.
 */

export interface Konzept {
  slug: string;
  titel: string;
  beschreibung: string;
  /** 1 (Einstieg) bis 5 (anspruchsvoll). */
  schwierigkeit: number;
}

export type Aufgabenart =
  | 'EINFACHAUSWAHL'
  | 'MEHRFACHAUSWAHL'
  /**
   * Eine Frage, die in eigenen Worten beantwortet wird.
   *
   * Für die Fälle, in denen das Verstehen zählt und nicht das Ergebnis –
   * „wie viele Zeilen kommen dabei heraus und warum". Ein erwartetes
   * Resultset gibt es dafür nicht; es gibt eine Musterantwort, mit der die
   * eigene verglichen wird.
   */
  | 'FREITEXT'
  | 'ERGEBNIS_VORHERSAGEN'
  | 'REIHENFOLGE'
  | 'ABFRAGE_ERGAENZEN'
  | 'FEHLER_FINDEN'
  | 'FEHLER_ERKLAEREN'
  | 'ABFRAGE_SCHREIBEN'
  | 'TRANSFER';

/**
 * Eine Aufgabe.
 *
 * `nutzlast` ist je Art verschieden – Auswahlmöglichkeiten, Bausteine,
 * Lücken. Was dort erlaubt ist, prüft `validator.ts`; ein Feld ohne Prüfung
 * wäre eine Einladung, beim Schreiben zu improvisieren.
 */
export interface Aufgabe {
  slug: string;
  art: Aufgabenart;
  titel: string;
  /** Die Frage an die Lernende – nicht die Anweisung an die Datenbank. */
  aufgabenstellung: string;
  nutzlast?: Record<string, unknown>;
  /** Gerüst im Editor. Leer heißt: von Grund auf. */
  startSql?: string;
  /** Musterlösung. Pflicht bei allen Arten, die SQL verlangen. */
  loesungSql?: string;
  /** Erklärung der Musterlösung – wird erst nach der Hinweisleiter gezeigt. */
  loesungsErklaerung?: string;
  /** Was diese Aufgabe ausführen darf. Standard: nur Lesen. */
  erlaubteKlassen?: readonly AnweisungsKlasse[];
  /** Erwartetes Ergebnis, gegen das bewertet wird. */
  erwartetesErgebnis?: Resultset;
  vergleich?: VergleichsOptionen;
  /**
   * Hinweisleiter, Stufe 1 bis 5.
   *
   * Stufe 1 ist ein Denkimpuls, Stufe 5 erklärt den Weg. Keine Stufe nennt die
   * Lösung – die steht in `loesungSql` und wird gesondert freigegeben.
   */
  hinweise: readonly string[];
  /** 1 bis 5. */
  schwierigkeit: number;
  /** Konzept-Slugs, auf die diese Aufgabe einzahlt. */
  konzepte: readonly string[];
}

export interface Lektion {
  slug: string;
  titel: string;
  /** Die Frage, mit der die Lektion beginnt. Keine Syntaxregel. */
  leitfrage: string;
  lernziele: readonly string[];
  /** Erklärtext in Markdown. */
  text: string;
  /** Slug des Übungsdatensatzes. */
  datensatz: string;
  /** Geschätzte Dauer in Minuten. */
  dauerMinuten: number;
  konzepte: readonly string[];
  aufgaben: readonly Aufgabe[];
}

export interface Modul {
  slug: string;
  titel: string;
  beschreibung: string;
  lektionen: readonly Lektion[];
}

export interface Projekt {
  slug: string;
  titel: string;
  /** Der Auftrag in Prosa – eine Frage, die jemand wirklich stellen würde. */
  auftrag: string;
  /** Woran man merkt, dass es fertig ist. */
  abnahme: readonly string[];
  startSql?: string;
  modul: string;
}

export interface Lehrplan {
  version: string;
  konzepte: readonly Konzept[];
  module: readonly Modul[];
  projekte: readonly Projekt[];
}
