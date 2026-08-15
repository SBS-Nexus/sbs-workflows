import { describe, expect, it } from 'vitest';
import { LEHRPLAN, inhaltsZahlen } from '@/content';
import { pruefeLehrplan } from '@/content/validator';
import type { Aufgabe, Lehrplan } from '@/content/typen';
import { entferneKommentareUndLiterale, pruefeAnweisung } from '@/domain/sql/statement-policy';
import { HANDWERK } from '@/content/uebungsdaten/handwerk';

/**
 * Inhalte sind Code, der von Menschen gelesen wird – und ein Fehler darin ist
 * teurer als ein Programmfehler: Er sieht richtig aus, fällt niemandem auf,
 * und die Lernende sucht den Fehler bei sich.
 */

describe('Der Lehrplan ist in sich stimmig', () => {
  it('hat keine Befunde', () => {
    const befunde = pruefeLehrplan(LEHRPLAN);
    // Die Ausgabe nennt Ort und Problem, damit ein roter Lauf sofort zeigt,
    // welche Aufgabe gemeint ist.
    expect(befunde.map((befund) => `${befund.ort}: ${befund.problem}`)).toEqual([]);
  });

  it('zählt seine Inhalte selbst', () => {
    const zahlen = inhaltsZahlen();
    expect(zahlen.lektionen).toBeGreaterThan(0);
    expect(zahlen.aufgaben).toBeGreaterThanOrEqual(zahlen.lektionen * 3);
    expect(zahlen.konzepte).toBeGreaterThan(0);
  });
});

describe('Jede Musterlösung kommt durch ihre eigene Policy', () => {
  /*
   * Der teuerste Inhaltsfehler überhaupt: Eine Aufgabe erlaubt nur SELECT,
   * die Musterlösung ist ein UPDATE. Wer sie richtig löst, bekommt eine
   * Ablehnung - und sucht den Fehler bei sich.
   *
   * Der Validator prüft das schon; hier steht es noch einmal einzeln, damit
   * ein roter Lauf die betroffene Aufgabe beim Namen nennt.
   */
  const alleAufgaben: Array<[string, Aufgabe]> = LEHRPLAN.module.flatMap((modul) =>
    modul.lektionen.flatMap((lektion) =>
      lektion.aufgaben.map((aufgabe): [string, Aufgabe] => [
        `${lektion.slug}/${aufgabe.slug}`,
        aufgabe,
      ]),
    ),
  );

  it.each(alleAufgaben.filter(([, aufgabe]) => aufgabe.loesungSql))('%s', (_ort, aufgabe) => {
    const ergebnis = pruefeAnweisung(
      aufgabe.loesungSql as string,
      aufgabe.erlaubteKlassen ?? ['SELECT'],
    );
    expect(ergebnis.erlaubt).toBe(true);
  });
});

describe('Aufgaben nennen nur Tabellen und Spalten, die es gibt', () => {
  /*
   * Ein Tippfehler in einer Musterlösung fällt sonst erst auf, wenn jemand die
   * Aufgabe löst und die Bewertung scheitert - an der Musterlösung, nicht an
   * der Eingabe.
   *
   * Der Test prüft nur *Bezeichner*. Zeichenfolgen werden vorher entfernt:
   * `WHERE Stadt = 'Mannheim'` nennt keine Spalte namens Mannheim, sondern
   * einen Wert. Genau dafür gibt es `entferneKommentareUndLiterale` schon -
   * eine zweite, eigene Zerlegung wäre eine zweite Quelle für denselben
   * Fehler.
   */
  const bekannteNamen = new Set<string>([
    ...HANDWERK.tabellen.map((tabelle) => tabelle.name.toLowerCase()),
    ...HANDWERK.tabellen.flatMap((tabelle) =>
      tabelle.spalten.map((spalte) => spalte.name.toLowerCase()),
    ),
  ]);

  /** Wörter der Sprache, die keine Namen aus dem Datensatz sind. */
  const SCHLUESSELWOERTER = new Set([
    'select',
    'from',
    'where',
    'is',
    'null',
    'as',
    'and',
    'or',
    'not',
    'in',
    'like',
    'between',
    'order',
    'by',
    'asc',
    'desc',
    'distinct',
    'top',
    // Verbinden
    'inner',
    'left',
    'right',
    'full',
    'outer',
    'cross',
    'join',
    'on',
    // Zusammenfassen
    'group',
    'having',
    'count',
    'sum',
    'avg',
    'min',
    'max',
  ]);

  const mitSql = LEHRPLAN.module.flatMap((modul) =>
    modul.lektionen.flatMap((lektion) =>
      lektion.aufgaben
        .filter((aufgabe) => aufgabe.loesungSql)
        .map((aufgabe): [string, string] => [
          `${lektion.slug}/${aufgabe.slug}`,
          aufgabe.loesungSql as string,
        ]),
    ),
  );

  it.each(mitSql)('%s', (_ort, loesung) => {
    const ohneLiterale = entferneKommentareUndLiterale(loesung);
    const woerter = (ohneLiterale.match(/[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_]*/g) ?? []).map(
      (wort) => wort.toLowerCase(),
    );

    /*
     * Selbst vergebene Aliase gelten überall in derselben Anweisung - auch im
     * ORDER BY, wo sie zulässigerweise noch einmal auftauchen.
     */
    const aliase = new Set(
      woerter.filter((_wort, index) => woerter[index - 1] === 'as').map((wort) => wort),
    );

    const unbekannt = woerter.filter(
      (wort) => !SCHLUESSELWOERTER.has(wort) && !bekannteNamen.has(wort) && !aliase.has(wort),
    );

    expect(unbekannt).toEqual([]);
  });

  it('würde einen Tippfehler tatsächlich melden', () => {
    // Gegenprobe: Ohne sie wäre nicht zu sehen, ob der Test noch etwas prüft.
    const woerter = entferneKommentareUndLiterale('SELECT Stadtt FROM Kunden')
      .toLowerCase()
      .match(/[a-zäöüß_]+/g);
    expect(woerter).toContain('stadtt');
    expect(bekannteNamen.has('stadtt')).toBe(false);
  });
});

describe('Der Validator findet echte Fehler', () => {
  /*
   * Ein Validator, der nie etwas meldet, ist von einem, der nichts prüft,
   * nicht zu unterscheiden. Diese Tests bauen den Fehler absichtlich ein.
   */
  const basis = (aufgabe: Partial<Aufgabe> = {}): Lehrplan => ({
    version: '1.0.0',
    konzepte: [{ slug: 'k', titel: 'K', beschreibung: 'K', schwierigkeit: 1 }],
    module: [
      {
        slug: 'm',
        titel: 'M',
        beschreibung: 'M',
        lektionen: [
          {
            slug: 'l',
            titel: 'L',
            leitfrage: 'Und wie geht das?',
            lernziele: ['etwas'],
            text: 'Text',
            datensatz: 'handwerk',
            dauerMinuten: 10,
            konzepte: ['k'],
            aufgaben: [
              {
                slug: 'a1',
                art: 'ABFRAGE_SCHREIBEN',
                titel: 'A',
                aufgabenstellung: 'Eine ausreichend lange Aufgabenstellung.',
                loesungSql: 'SELECT Name FROM Kunden;',
                hinweise: ['erster', 'zweiter'],
                schwierigkeit: 1,
                konzepte: ['k'],
                ...aufgabe,
              },
              { ...GRUNDAUFGABE, slug: 'a2' },
              { ...GRUNDAUFGABE, slug: 'a3' },
            ],
          },
        ],
      },
    ],
    projekte: [],
  });

  it('meldet eine Musterlösung, die die eigene Policy verletzt', () => {
    const befunde = pruefeLehrplan(
      basis({ loesungSql: 'UPDATE Kunden SET Stadt = NULL;', erlaubteKlassen: ['SELECT'] }),
    );
    expect(befunde.some((befund) => befund.problem.includes('Ablehnung'))).toBe(true);
  });

  it('meldet einen Hinweis, der die Lösung verrät', () => {
    const befunde = pruefeLehrplan(
      basis({ hinweise: ['Schreib SELECT Name FROM Kunden;', 'zweiter Hinweis'] }),
    );
    expect(befunde.some((befund) => befund.problem.includes('Wortlaut'))).toBe(true);
  });

  it('meldet ein erwartetes Ergebnis mit schiefer Zeile', () => {
    const befunde = pruefeLehrplan(
      basis({ erwartetesErgebnis: { spalten: ['A', 'B'], zeilen: [['nur eins']] } }),
    );
    expect(befunde.some((befund) => befund.problem.includes('Spalten'))).toBe(true);
  });

  it('meldet ein unbekanntes Konzept', () => {
    const befunde = pruefeLehrplan(basis({ konzepte: ['gibt-es-nicht'] }));
    expect(befunde.some((befund) => befund.problem.includes('Unbekanntes Konzept'))).toBe(true);
  });

  it('meldet eine einzelne Hinweisstufe', () => {
    // Ein einzelner Hinweis ist entweder zu vage oder verrät alles.
    const befunde = pruefeLehrplan(basis({ hinweise: ['nur einer'] }));
    expect(befunde.some((befund) => befund.problem.includes('Hinweise'))).toBe(true);
  });

  it('meldet eine Lektion mit zu wenigen Aufgaben', () => {
    const plan = basis();
    const modul = plan.module[0];
    const lektion = modul?.lektionen[0];
    if (!lektion) throw new Error('Aufbau des Testplans hat sich geändert.');
    const gekuerzt: Lehrplan = {
      ...plan,
      module: [{ ...modul, lektionen: [{ ...lektion, aufgaben: [lektion.aufgaben[0]!] }] }],
    };
    expect(
      pruefeLehrplan(gekuerzt).some((befund) => befund.problem.includes('mindestens drei')),
    ).toBe(true);
  });
});

/** Eine unauffällige Aufgabe zum Auffüllen der Mindestzahl. */
const GRUNDAUFGABE: Aufgabe = {
  slug: 'fuell',
  art: 'ABFRAGE_SCHREIBEN',
  titel: 'Füllaufgabe',
  aufgabenstellung: 'Eine ausreichend lange Aufgabenstellung zum Auffüllen.',
  loesungSql: 'SELECT Name FROM Kunden;',
  hinweise: ['erster', 'zweiter'],
  schwierigkeit: 1,
  konzepte: ['k'],
};
