import { describe, expect, it } from 'vitest';
import { type Resultset, vergleicheResultsets } from '@/domain/sql/resultset';

/**
 * Der Grader entscheidet, ob SQLPfad Verstehen belohnt oder Abschreiben.
 * Entsprechend gründlich ist er zu prüfen.
 */

const ohneSortierung = { reihenfolgeZaehlt: false };
const mitSortierung = { reihenfolgeZaehlt: true };

const r = (spalten: string[], zeilen: unknown[][]): Resultset => ({ spalten, zeilen }) as Resultset;

describe('Multimengen-Vergleich', () => {
  it('erkennt gleiche Ergebnisse unabhängig von der Zeilenreihenfolge', () => {
    // Ohne ORDER BY darf die Datenbank die Zeilen beliebig liefern. Wer hier
    // die Reihenfolge bewertet, bestraft richtige Lösungen nach Zufall.
    const a = r(['Name'], [['Anna'], ['Sofia']]);
    const b = r(['Name'], [['Sofia'], ['Anna']]);
    expect(vergleicheResultsets(a, b, ohneSortierung).stimmtUeberein).toBe(true);
  });

  it('behandelt doppelte Zeilen als bedeutungsvoll', () => {
    /*
     * Der Kern des Wortes „Multimenge". Drei Bestellungen desselben Kunden
     * sind nicht dasselbe wie eine. Ein Vergleich über `Set` würde beide
     * Ergebnisse für gleich halten – und damit eine fehlende Gruppierung oder
     * ein versehentliches DISTINCT durchwinken.
     */
    const erwartet = r(['Stadt'], [['Mannheim'], ['Mannheim'], ['Weinheim']]);
    const geliefert = r(['Stadt'], [['Mannheim'], ['Weinheim']]);

    const ergebnis = vergleicheResultsets(erwartet, geliefert, ohneSortierung);
    expect(ergebnis.stimmtUeberein).toBe(false);
    expect(ergebnis.abweichungen.some((a) => a.art === 'zeileFehlt')).toBe(true);
  });

  it('meldet überzählige Zeilen', () => {
    const erwartet = r(['Name'], [['Anna']]);
    const geliefert = r(['Name'], [['Anna'], ['Mehmet']]);
    const ergebnis = vergleicheResultsets(erwartet, geliefert, ohneSortierung);
    expect(ergebnis.abweichungen.some((a) => a.art === 'zeileZuviel')).toBe(true);
  });

  it('erkennt ein leeres Ergebnis als gültiges Ergebnis', () => {
    // „Keine Zeile" ist eine richtige Antwort, wenn keine erwartet wird.
    expect(
      vergleicheResultsets(r(['Name'], []), r(['Name'], []), ohneSortierung).stimmtUeberein,
    ).toBe(true);
  });
});

describe('Sortierung', () => {
  const erwartet = r(['Name'], [['Anna'], ['Sofia']]);
  const verdreht = r(['Name'], [['Sofia'], ['Anna']]);

  it('bewertet die Reihenfolge, wenn ORDER BY das Lernziel ist', () => {
    expect(vergleicheResultsets(erwartet, verdreht, mitSortierung).stimmtUeberein).toBe(false);
  });

  it('bewertet sie sonst nicht', () => {
    expect(vergleicheResultsets(erwartet, verdreht, ohneSortierung).stimmtUeberein).toBe(true);
  });

  it('meldet bei falscher Sortierung höchstens eine Abweichung je Zeile', () => {
    // Wer die Sortierrichtung verwechselt, soll nicht dreißig Meldungen
    // bekommen, die alle dieselbe Ursache haben.
    const a = r(
      ['A', 'B'],
      [
        [1, 'x'],
        [2, 'y'],
      ],
    );
    const b = r(
      ['A', 'B'],
      [
        [2, 'y'],
        [1, 'x'],
      ],
    );
    const ergebnis = vergleicheResultsets(a, b, mitSortierung);
    expect(ergebnis.abweichungen.filter((x) => x.art === 'wert')).toHaveLength(2);
  });
});

describe('NULL', () => {
  it('gilt an derselben Stelle als übereinstimmend', () => {
    /*
     * Hier werden zwei Bedeutungen verwechselt, und zwar regelmäßig:
     * In SQL ist `NULL = NULL` nicht wahr. Beim *Vergleich zweier Ergebnisse*
     * lautet die Frage aber: Steht an derselben Stelle beide Male „unbekannt"?
     * Dann stimmen sie überein. Andernfalls könnte niemand je eine Aufgabe
     * bestehen, deren richtiges Ergebnis ein NULL enthält.
     */
    const a = r(['Stadt'], [[null]]);
    const b = r(['Stadt'], [[null]]);
    expect(vergleicheResultsets(a, b, ohneSortierung).stimmtUeberein).toBe(true);
  });

  it('unterscheidet NULL von leerem Text', () => {
    // Der häufigste Anfängerirrtum überhaupt: NULL sei „leerer Text".
    const mitNull = r(['Stadt'], [[null]]);
    const mitLeer = r(['Stadt'], [['']]);
    expect(vergleicheResultsets(mitNull, mitLeer, ohneSortierung).stimmtUeberein).toBe(false);
  });

  it('unterscheidet NULL von der Zeichenfolge "NULL"', () => {
    const mitNull = r(['Stadt'], [[null]]);
    const mitText = r(['Stadt'], [['NULL']]);
    expect(vergleicheResultsets(mitNull, mitText, ohneSortierung).stimmtUeberein).toBe(false);
  });

  it('unterscheidet NULL von der Zahl null', () => {
    const mitNull = r(['Anzahl'], [[null]]);
    const mitNullZahl = r(['Anzahl'], [[0]]);
    expect(vergleicheResultsets(mitNull, mitNullZahl, ohneSortierung).stimmtUeberein).toBe(false);
  });
});

describe('Werttypen', () => {
  it('behandelt Zahl und gleichlautende Zeichenfolge als verschieden', () => {
    // Ein Treiber kann DECIMAL als Text liefern. Trotzdem ist eine Spalte mit
    // Zahlen etwas anderes als eine mit Text - sonst bestünde eine Lösung,
    // die versehentlich alles in nvarchar konvertiert.
    const a = r(['Preis'], [[10]]);
    const b = r(['Preis'], [['10']]);
    expect(vergleicheResultsets(a, b, ohneSortierung).stimmtUeberein).toBe(false);
  });

  it('behandelt -0 und 0 als gleich', () => {
    const a = r(['Wert'], [[0]]);
    const b = r(['Wert'], [[-0]]);
    expect(vergleicheResultsets(a, b, ohneSortierung).stimmtUeberein).toBe(true);
  });

  it('vergleicht Datumswerte über ihren Zeitpunkt', () => {
    const a = r(['Datum'], [[new Date('2026-03-01T00:00:00Z')]]);
    const b = r(['Datum'], [[new Date('2026-03-01T00:00:00.000Z')]]);
    expect(vergleicheResultsets(a, b, ohneSortierung).stimmtUeberein).toBe(true);
  });

  it('unterscheidet Groß- und Kleinschreibung standardmäßig', () => {
    const a = r(['Name'], [['Anna']]);
    const b = r(['Name'], [['anna']]);
    expect(vergleicheResultsets(a, b, ohneSortierung).stimmtUeberein).toBe(false);
    expect(
      vergleicheResultsets(a, b, { ...ohneSortierung, textUnabhaengigVonGrossschreibung: true })
        .stimmtUeberein,
    ).toBe(true);
  });

  it('verwechselt keine Spaltengrenzen', () => {
    // Ohne eindeutiges Trennzeichen wäre ['a','b'] nicht von ['a,b'] zu
    // unterscheiden - zwei völlig verschiedene Ergebnisse.
    const a = r(['X', 'Y'], [['a', 'b']]);
    const b = r(['X', 'Y'], [['a,b', '']]);
    expect(vergleicheResultsets(a, b, ohneSortierung).stimmtUeberein).toBe(false);
  });
});

describe('Spalten', () => {
  it('meldet abweichende Spaltenzahl und bricht dann ab', () => {
    // Wer zu viele Spalten liefert, soll das erfahren - und nicht zusätzlich
    // eine Liste von Wertabweichungen, die alle daraus folgen.
    const erwartet = r(['Name'], [['Anna']]);
    const geliefert = r(['Name', 'Stadt'], [['Anna', 'Mannheim']]);
    const ergebnis = vergleicheResultsets(erwartet, geliefert, ohneSortierung);

    expect(ergebnis.stimmtUeberein).toBe(false);
    expect(ergebnis.abweichungen).toHaveLength(1);
    expect(ergebnis.abweichungen[0]!.art).toBe('spaltenanzahl');
  });

  it('ignoriert Spaltennamen, solange sie nicht Teil der Aufgabe sind', () => {
    // Ob jemand AS Anzahl oder AS Menge schreibt, ist meist keine fachliche
    // Frage.
    const a = r(['Anzahl'], [[3]]);
    const b = r(['Menge'], [[3]]);
    expect(vergleicheResultsets(a, b, ohneSortierung).stimmtUeberein).toBe(true);
    expect(
      vergleicheResultsets(a, b, { ...ohneSortierung, spaltennamenZaehlen: true }).stimmtUeberein,
    ).toBe(false);
  });
});
