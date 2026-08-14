/**
 * Übersetzung zwischen dem SQL-Server-Treiber und der Fachlogik.
 *
 * Diese Datei enthält die Teile des Motors, die **keine** Datenbank brauchen:
 * die Umwandlung eines Treiberergebnisses in ein `Resultset` und die Zuordnung
 * eines Treiberfehlers zu den Fehlerarten des Runners.
 *
 * Dass sie getrennt liegen, ist keine Ordnungsfrage. Es sind genau die
 * Stellen, an denen sich Fehler einschleichen und an denen ein Test in
 * Millisekunden läuft – während der Rest des Motors einen laufenden SQL Server
 * voraussetzt. Was hier nicht steht, lässt sich ohne Server ehrlich nicht
 * prüfen.
 */

import type { Resultset, SqlWert } from './resultset';
import { SqlAbbruchFehler, SqlMotorFehler, SqlZeitlimitFehler } from './runner';

// ---------------------------------------------------------------------------
// Ergebnis
// ---------------------------------------------------------------------------

/**
 * Spaltenangabe, wie der Treiber sie im `arrayRowMode` liefert.
 *
 * Nur die Felder, die hier gebraucht werden. Eine vollständige Nachbildung der
 * Treibertypen wäre eine zweite Quelle der Wahrheit, die beim nächsten Update
 * still veraltet.
 */
export interface TreiberSpalte {
  name?: string;
  index?: number;
}

/**
 * Baut ein `Resultset` aus Zeilen und Spaltenangaben.
 *
 * Der Treiber wird im `arrayRowMode` betrieben: Zeilen kommen als Arrays, nicht
 * als Objekte. Das ist keine Kleinigkeit, sondern notwendig. Als Objekte gingen
 * zwei Dinge verloren, die für das Bewerten zählen: die Reihenfolge der Spalten
 * und doppelte Spaltennamen. `SELECT Name, Name FROM …` ist ein gültiges
 * Ergebnis mit zwei Spalten – als Objekt wäre es eines mit einer.
 */
export function zuResultset(
  zeilen: readonly unknown[][],
  spalten: readonly TreiberSpalte[],
): Resultset {
  return {
    spalten: spalten.map((spalte, index) => spalte.name ?? `Spalte${index + 1}`),
    zeilen: zeilen.map((zeile) => zeile.map(zuSqlWert)),
  };
}

/**
 * Bringt einen Treiberwert in die Wertemenge, die der Vergleich kennt.
 *
 * `undefined` wird zu `null`: Der Treiber liefert für eine fehlende Spalte in
 * seltenen Fällen `undefined`, gemeint ist aber immer NULL. Beim Vergleich
 * würden die beiden sonst als verschieden gelten – ein Unterschied, den es in
 * der Datenbank gar nicht gibt.
 */
function zuSqlWert(wert: unknown): SqlWert {
  if (wert === undefined || wert === null) return null;
  if (wert instanceof Date || wert instanceof Uint8Array) return wert;
  if (Buffer.isBuffer(wert)) return new Uint8Array(wert);
  if (typeof wert === 'number' || typeof wert === 'boolean' || typeof wert === 'string') {
    return wert;
  }
  /*
   * Alles Übrige - BigInt aus bigint-Spalten, Decimal-Objekte, geografische
   * Typen - wird als Text dargestellt. Das ist ehrlicher als eine stille
   * Umwandlung in eine Gleitkommazahl: Ein bigint jenseits von 2^53 verlöre
   * dabei Stellen, und die Lernende bekäme ein falsches Ergebnis angezeigt,
   * ohne dass irgendwo ein Fehler stünde.
   */
  return String(wert);
}

// ---------------------------------------------------------------------------
// Fehler
// ---------------------------------------------------------------------------

/** Ein Fehler, wie der Treiber ihn wirft. */
export interface TreiberFehler {
  message?: string;
  code?: string;
  number?: number;
  originalError?: { message?: string; number?: number };
}

function istTreiberFehler(wert: unknown): wert is TreiberFehler {
  return typeof wert === 'object' && wert !== null;
}

/**
 * Ordnet einen Treiberfehler den Fehlerarten des Runners zu.
 *
 * Die Unterscheidung zwischen Zeitlimit, Abbruch und Serverfehler ist nicht
 * kosmetisch: Ein Abbruch ist etwas, das die Lernende selbst ausgelöst hat,
 * und darf nicht wie ein Fehler aussehen. Ein Zeitlimit hat fast immer
 * dieselbe Ursache und bekommt deshalb eine eigene Erklärung. Nur der dritte
 * Fall ist eine Meldung von SQL Server, die übersetzt werden kann.
 *
 * Was nicht zugeordnet werden kann, wird unverändert weitergereicht. Ein
 * Verbindungsabbruch als „Fehler in deiner Abfrage" auszugeben wäre eine
 * Falschauskunft – und würde die Lernende ihren richtigen Satz suchen lassen.
 */
export function uebersetzeTreiberfehler(fehler: unknown, zeitlimitMs: number): Error {
  if (!istTreiberFehler(fehler))
    return fehler instanceof Error ? fehler : new Error(String(fehler));

  if (fehler.code === 'ETIMEOUT') return new SqlZeitlimitFehler(zeitlimitMs);
  if (fehler.code === 'ECANCEL' || fehler.code === 'EABORT') return new SqlAbbruchFehler();

  if (fehler.code === 'EREQUEST') {
    /*
     * Die Fehlernummer steht je nach Treiberfassung am Fehler selbst oder am
     * eingebetteten Originalfehler. Beide Stellen zu prüfen kostet eine Zeile
     * und verhindert, dass eine gut erklärbare Meldung als „unbekannt" endet.
     */
    const nummer = fehler.number ?? fehler.originalError?.number;
    const meldung = fehler.message ?? fehler.originalError?.message ?? 'Unbekannter Fehler.';
    return nummer === undefined ? new SqlMotorFehler(meldung) : new SqlMotorFehler(meldung, nummer);
  }

  return fehler instanceof Error ? fehler : new Error(fehler.message ?? String(fehler));
}
