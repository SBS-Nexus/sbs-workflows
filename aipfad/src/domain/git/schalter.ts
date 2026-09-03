/**
 * Schalterprüfung für die Git-Simulatoren.
 *
 * Der wiederkehrende Fehler in diesen Simulatoren war immer derselbe: Ein
 * nicht umgesetzter Schalter wurde übergangen, und der Befehl tat danach
 * etwas anderes als verlangt — `git branch -d topic` legte einen Branch AN,
 * `git restore -S datei` verwarf die Arbeit statt die Vormerkung
 * zurückzunehmen. Das ist in einer Lernumgebung schlimmer als eine
 * Fehlermeldung: Es bringt still etwas Falsches bei.
 *
 * Deshalb hier eine gemeinsame Regel statt Einzelfallprüfungen: Jeder Befehl
 * nennt ausdrücklich, welche Schalter er versteht. Alles andere wird
 * abgelehnt. Neue Schalter müssen bewusst aufgenommen werden — vergessen
 * heißt jetzt "wird abgelehnt", nicht "tut heimlich etwas anderes".
 */

/** Ein Schalter mit seinen Schreibweisen, z. B. `-S` und `--staged`. */
export interface SchalterDefinition {
  /** Alle akzeptierten Schreibweisen. */
  schreibweisen: string[];
  /** Einheitlicher Name, unter dem der Befehl ihn abfragt. */
  name: string;
}

export interface SchalterErgebnis {
  /** Die erkannten Schalter unter ihrem einheitlichen Namen. */
  gesetzt: Set<string>;
  /** Alles, was kein Schalter ist — Pfade, Branchnamen, Nachrichten. */
  operanden: string[];
  /** Der erste nicht unterstützte Schalter, falls vorhanden. */
  unbekannt?: string;
}

/**
 * Trennt Schalter von Operanden und meldet den ersten unbekannten Schalter.
 *
 * `--` beendet die Schalterliste, wie in echten Befehlen: Alles danach gilt
 * als Operand, auch wenn es mit einem Bindestrich beginnt.
 */
export function leseSchalter(
  args: readonly string[],
  erlaubt: readonly SchalterDefinition[],
): SchalterErgebnis {
  const gesetzt = new Set<string>();
  const operanden: string[] = [];
  let nurNochOperanden = false;

  for (const arg of args) {
    if (nurNochOperanden) {
      operanden.push(arg);
      continue;
    }
    if (arg === '--') {
      nurNochOperanden = true;
      continue;
    }
    if (!arg.startsWith('-')) {
      operanden.push(arg);
      continue;
    }

    const treffer = erlaubt.find((s) => s.schreibweisen.includes(arg));
    if (!treffer) return { gesetzt, operanden, unbekannt: arg };
    gesetzt.add(treffer.name);
  }

  return { gesetzt, operanden };
}

/** Einheitliche Meldung für einen Schalter, den ein Simulator nicht umsetzt. */
export function schalterNichtUmgesetzt(befehl: string, schalter: string): string {
  return `${befehl} ${schalter}: in diesem Simulator nicht umgesetzt. Der Schalter wird bewusst abgelehnt, statt still etwas anderes zu tun.`;
}
