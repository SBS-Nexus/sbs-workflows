/**
 * Vergleich von Ergebnismengen.
 *
 * Das ist die wichtigste Rechnung der ganzen Anwendung. Sie entscheidet, ob
 * eine Lösung als richtig gilt – und sie entscheidet damit, ob SQLPfad
 * Verstehen belohnt oder Abschreiben.
 *
 * Der naheliegende Weg wäre, den Abfragetext mit einer Musterlösung zu
 * vergleichen. Das ist aus einem einfachen Grund falsch: Diese beiden Abfragen
 * sind semantisch identisch und würden bei einem Textvergleich als
 * unterschiedlich gelten.
 *
 *     SELECT Name FROM Kunden WHERE Aktiv = 1;
 *     SELECT k.Name FROM dbo.Kunden AS k WHERE k.Aktiv = 1;
 *
 * Verglichen wird deshalb ausschließlich das, was herauskommt.
 *
 * Drei Eigenschaften von SQL-Ergebnissen, die dabei regelmäßig falsch
 * behandelt werden:
 *
 *  1. **Ein Resultset ist keine Menge, sondern eine Multimenge.** Ohne
 *     `DISTINCT` können Zeilen doppelt vorkommen, und das ist bedeutungsvoll:
 *     Drei Bestellungen desselben Kunden sind nicht dasselbe wie eine. Ein
 *     Vergleich über `Set` würde genau diesen Unterschied verschlucken.
 *  2. **Die Reihenfolge ist ohne `ORDER BY` nicht zugesichert.** Sie zu
 *     bewerten, wo sie nicht verlangt war, bestraft korrekte Lösungen nach
 *     Zufall. Sie *nicht* zu bewerten, wo `ORDER BY` das Lernziel ist, lässt
 *     falsche Lösungen durch. Deshalb ist das eine Angabe je Aufgabe.
 *  3. **`NULL` ist kein Wert, sondern dessen Abwesenheit.** In SQL gilt
 *     `NULL = NULL` nicht als wahr. Beim *Vergleich zweier Ergebnisse* ist die
 *     Frage aber eine andere: Steht an derselben Stelle in beiden Fällen
 *     „unbekannt"? Dann stimmen sie überein. Diese beiden Bedeutungen
 *     auseinanderzuhalten ist der häufigste Fehler in selbstgebauten Gradern.
 */

/** Ein Wert, wie ihn ein Treiber liefert. */
export type SqlWert = string | number | boolean | Date | Uint8Array | null;

export interface Resultset {
  spalten: string[];
  zeilen: SqlWert[][];
}

export interface VergleichsOptionen {
  /**
   * Zählt die Reihenfolge der Zeilen?
   *
   * Nur wahr, wenn die Aufgabe eine Sortierung verlangt. Ohne `ORDER BY` darf
   * eine Datenbank die Zeilen in beliebiger Reihenfolge liefern – dieselbe
   * Abfrage kann heute anders herauskommen als morgen.
   */
  reihenfolgeZaehlt: boolean;

  /**
   * Müssen die Spalten genau so heißen wie in der Musterlösung?
   *
   * Standardmäßig nein. Ob jemand `AS Anzahl` oder `AS Menge` schreibt, ist
   * für die meisten Aufgaben keine fachliche Frage. Wo ein Aliasname
   * ausdrücklich Teil der Aufgabe ist, wird es eingeschaltet.
   */
  spaltennamenZaehlen?: boolean;

  /**
   * Zeichenfolgen ohne Rücksicht auf Groß- und Kleinschreibung vergleichen.
   *
   * Standardmäßig aus. SQL Server vergleicht je nach Sortierung (Collation)
   * unterschiedlich; für das Grading ist der genaue Wert maßgeblich.
   */
  textUnabhaengigVonGrossschreibung?: boolean;
}

export interface Abweichung {
  art:
    | 'spaltenanzahl'
    | 'spaltennamen'
    | 'zeilenanzahl'
    | 'zeileFehlt'
    | 'zeileZuviel'
    | 'reihenfolge'
    | 'wert';
  /** Ein Satz, der sagt, was nicht stimmt – ohne die Lösung zu verraten. */
  beschreibung: string;
  zeile?: number;
  spalte?: string;
}

export interface Vergleichsergebnis {
  stimmtUeberein: boolean;
  abweichungen: Abweichung[];
}

/**
 * Bringt einen Wert in eine vergleichbare Form.
 *
 * Jeder Wert bekommt eine Typkennung vorangestellt. Ohne sie fielen Werte
 * zusammen, die fachlich verschieden sind: die Zahl 10 und der Text „10", oder
 * NULL und die Zeichenfolge „NULL".
 */
function vereinheitliche(wert: SqlWert, optionen: VergleichsOptionen): string {
  const T = '\u0000';
  if (wert === null || wert === undefined) return `${T}NULL`;
  if (wert instanceof Date) return `${T}D${wert.toISOString()}`;
  if (wert instanceof Uint8Array) return `${T}B${Array.from(wert).join(',')}`;

  /*
   * Zahl und gleichlautender Text bleiben unterscheidbar.
   *
   * Die erste Fassung machte aus beiden dieselbe Zeichenfolge, und der Test
   * hat es aufgedeckt. Der Unterschied ist fachlich erheblich: Eine Loesung,
   * die versehentlich alles nach nvarchar konvertiert, liefert optisch
   * dasselbe Ergebnis und ist trotzdem falsch - Sortierung und Rechnen
   * verhalten sich danach anders.
   *
   * Unbedenklich ist das, weil Musterloesung und Lernendenabfrage ueber
   * denselben Treiber gegen denselben Server laufen. Ein Unterschied im
   * JavaScript-Typ bildet dann einen echten Unterschied im SQL-Typ ab und
   * keine Treiberlaune.
   *
   * `bit` und `int` werden dagegen bewusst gleich behandelt: `bit` ist in SQL
   * Server ein Ganzzahltyp mit den Werten 0 und 1, und Treiber liefern ihn mal
   * als Wahrheitswert, mal als Zahl. Diese Unterscheidung waere eine
   * Treiberlaune und keine fachliche Aussage.
   */
  if (typeof wert === 'boolean') return `${T}N${wert ? 1 : 0}`;

  if (typeof wert === 'number') {
    // -0 und 0 sind derselbe Wert. Ohne diese Zeile unterschieden sie sich.
    return `${T}N${Object.is(wert, -0) ? 0 : wert}`;
  }

  const text = String(wert);
  const angepasst = optionen.textUnabhaengigVonGrossschreibung
    ? text.toLocaleLowerCase('de-DE')
    : text;
  return `${T}S${angepasst}`;
}

/** Eine ganze Zeile als vergleichbarer Schlüssel. */
function zeilenSchluessel(zeile: readonly SqlWert[], optionen: VergleichsOptionen): string {
  // Das Trennzeichen ist ein Steuerzeichen, weil es in echten Daten nicht
  // vorkommt. Mit einem Komma wären ['a,b'] und ['a','b'] nicht zu
  // unterscheiden.
  return zeile.map((wert) => vereinheitliche(wert, optionen)).join('');
}

/**
 * Vergleicht zwei Ergebnismengen.
 *
 * Die Reihenfolge der Prüfungen ist bewusst gewählt: Sie geht vom Groben zum
 * Feinen. Wer die falsche Spaltenzahl liefert, soll das erfahren und nicht eine
 * Liste von dreißig Wertabweichungen bekommen, die alle aus derselben Ursache
 * folgen.
 */
export function vergleicheResultsets(
  erwartet: Resultset,
  tatsaechlich: Resultset,
  optionen: VergleichsOptionen,
): Vergleichsergebnis {
  const abweichungen: Abweichung[] = [];

  // --- Spalten ------------------------------------------------------------
  if (erwartet.spalten.length !== tatsaechlich.spalten.length) {
    return {
      stimmtUeberein: false,
      abweichungen: [
        {
          art: 'spaltenanzahl',
          beschreibung:
            `Erwartet werden ${erwartet.spalten.length} Spalten, ` +
            `deine Abfrage liefert ${tatsaechlich.spalten.length}.`,
        },
      ],
    };
  }

  if (optionen.spaltennamenZaehlen) {
    for (const [index, name] of erwartet.spalten.entries()) {
      const tatsaechlicherName = tatsaechlich.spalten[index];
      if (name !== tatsaechlicherName) {
        abweichungen.push({
          art: 'spaltennamen',
          beschreibung: `Spalte ${index + 1} soll „${name}" heißen, heißt aber „${tatsaechlicherName ?? '(ohne Namen)'}".`,
          spalte: name,
        });
      }
    }
  }

  // --- Zeilenanzahl -------------------------------------------------------
  if (erwartet.zeilen.length !== tatsaechlich.zeilen.length) {
    abweichungen.push({
      art: 'zeilenanzahl',
      beschreibung:
        `Erwartet werden ${erwartet.zeilen.length} Zeilen, ` +
        `deine Abfrage liefert ${tatsaechlich.zeilen.length}.`,
    });
  }

  // --- Inhalt -------------------------------------------------------------
  if (optionen.reihenfolgeZaehlt) {
    vergleicheGeordnet(erwartet, tatsaechlich, optionen, abweichungen);
  } else {
    vergleicheAlsMultimenge(erwartet, tatsaechlich, optionen, abweichungen);
  }

  return { stimmtUeberein: abweichungen.length === 0, abweichungen };
}

/** Zeile für Zeile an derselben Position – für Aufgaben mit `ORDER BY`. */
function vergleicheGeordnet(
  erwartet: Resultset,
  tatsaechlich: Resultset,
  optionen: VergleichsOptionen,
  abweichungen: Abweichung[],
): void {
  const anzahl = Math.min(erwartet.zeilen.length, tatsaechlich.zeilen.length);

  for (let i = 0; i < anzahl; i += 1) {
    const erwarteteZeile = erwartet.zeilen[i]!;
    const tatsaechlicheZeile = tatsaechlich.zeilen[i]!;

    for (let s = 0; s < erwarteteZeile.length; s += 1) {
      const a = vereinheitliche(erwarteteZeile[s]!, optionen);
      const b = vereinheitliche(tatsaechlicheZeile[s]!, optionen);
      if (a !== b) {
        abweichungen.push({
          art: 'wert',
          beschreibung: `In Zeile ${i + 1}, Spalte „${erwartet.spalten[s]}" steht ein anderer Wert als erwartet.`,
          zeile: i + 1,
          spalte: erwartet.spalten[s],
        });
        // Eine Abweichung je Zeile genügt. Wer die Sortierung verwechselt hat,
        // bekäme sonst für jede Zeile und jede Spalte eine eigene Meldung.
        break;
      }
    }
  }
}

/**
 * Als Multimenge – für alles ohne verlangte Sortierung.
 *
 * Multimenge und nicht Menge: Doppelte Zeilen bleiben bedeutungsvoll. Gezählt
 * wird deshalb, wie oft jede Zeile vorkommt.
 */
function vergleicheAlsMultimenge(
  erwartet: Resultset,
  tatsaechlich: Resultset,
  optionen: VergleichsOptionen,
  abweichungen: Abweichung[],
): void {
  const zaehle = (zeilen: readonly SqlWert[][]): Map<string, number> => {
    const karte = new Map<string, number>();
    for (const zeile of zeilen) {
      const schluessel = zeilenSchluessel(zeile, optionen);
      karte.set(schluessel, (karte.get(schluessel) ?? 0) + 1);
    }
    return karte;
  };

  const erwarteteZaehlung = zaehle(erwartet.zeilen);
  const tatsaechlicheZaehlung = zaehle(tatsaechlich.zeilen);

  for (const [schluessel, anzahl] of erwarteteZaehlung) {
    const vorhanden = tatsaechlicheZaehlung.get(schluessel) ?? 0;
    if (vorhanden < anzahl) {
      abweichungen.push({
        art: 'zeileFehlt',
        beschreibung:
          vorhanden === 0
            ? 'Eine erwartete Zeile fehlt in deinem Ergebnis.'
            : `Eine Zeile kommt ${anzahl}-mal vor, in deinem Ergebnis nur ${vorhanden}-mal.`,
      });
    }
  }

  for (const [schluessel, anzahl] of tatsaechlicheZaehlung) {
    const erlaubt = erwarteteZaehlung.get(schluessel) ?? 0;
    if (anzahl > erlaubt) {
      abweichungen.push({
        art: 'zeileZuviel',
        beschreibung:
          erlaubt === 0
            ? 'Dein Ergebnis enthält eine Zeile, die nicht erwartet wird.'
            : `Eine Zeile kommt ${anzahl}-mal vor, erwartet werden ${erlaubt}.`,
      });
    }
  }
}
