import { describe, expect, it } from 'vitest';
import {
  amErgebnisPruefbar,
  bewerteAusfuehrung,
  istAmErgebnisPruefbar,
} from '@/domain/aufgabe/ausfuehrung';
import type { Fehlererklaerung } from '@/domain/sql/fehler';
import { resultsetAusJson, type Resultset } from '@/domain/sql/resultset';
import type { Ausfuehrungsergebnis } from '@/domain/sql/runner';

const ERWARTET: Resultset = {
  spalten: ['Name', 'Telefon'],
  zeilen: [
    ['Anna Brandt', '0621 445566'],
    ['Sofia Adler', '0621 998877'],
    ['Jonas Brandt', null],
  ],
};

const OHNE_REIHENFOLGE = { reihenfolgeZaehlt: false };

function erfolg(resultset: Resultset, abgeschnitten = false): Ausfuehrungsergebnis {
  return {
    art: 'erfolg',
    resultset,
    abgeschnitten,
    gelieferteZeilen: abgeschnitten ? 900 : resultset.zeilen.length,
    dauerMs: 12,
  };
}

describe('Welche Aufgaben am Ergebnis bewertet werden', () => {
  it('eine lesende Schreibaufgabe mit erwartetem Ergebnis', () => {
    expect(istAmErgebnisPruefbar({ art: 'ABFRAGE_SCHREIBEN', erwartetesErgebnis: ERWARTET })).toBe(
      true,
    );
  });

  it('keine Aufgabe, die Daten ändert – ihr Ergebnis ist ein Zustand', () => {
    expect(
      istAmErgebnisPruefbar({
        art: 'ABFRAGE_SCHREIBEN',
        erwartetesErgebnis: ERWARTET,
        erlaubteKlassen: ['SELECT', 'DML'],
      }),
    ).toBe(false);
  });

  it('keine Schreibaufgabe ohne erwartetes Ergebnis', () => {
    expect(istAmErgebnisPruefbar({ art: 'ABFRAGE_SCHREIBEN' })).toBe(false);
  });

  it('keine Vorhersage, auch wenn sie ein Ergebnis hat', () => {
    // Vorhersagen werden über die Zahl bewertet, ohne Ausführung.
    expect(
      istAmErgebnisPruefbar({ art: 'ERGEBNIS_VORHERSAGEN', erwartetesErgebnis: ERWARTET }),
    ).toBe(false);
  });
});

describe('Bewertung einer ausgeführten Abfrage', () => {
  it('richtig, wenn das Ergebnis übereinstimmt – unabhängig von der Reihenfolge', () => {
    const umgestellt = { ...ERWARTET, zeilen: [...ERWARTET.zeilen].reverse() };
    const rueckmeldung = bewerteAusfuehrung(erfolg(umgestellt), ERWARTET, OHNE_REIHENFOLGE);
    expect(rueckmeldung.bewertung.art).toBe('richtig');
    expect(rueckmeldung.bewertung).toMatchObject({
      begruendung: expect.stringContaining('3 Zeilen'),
    });
    expect(rueckmeldung.abweichungen).toEqual([]);
    expect(rueckmeldung.protokoll).toEqual({ errorType: 'NONE', returnedRows: 3, executionMs: 12 });
    expect(rueckmeldung.eigenesErgebnis?.resultset).toBe(umgestellt);
  });

  it('falsch mit Abweichungen, wenn eine Zeile fehlt', () => {
    const zuWenig = { ...ERWARTET, zeilen: ERWARTET.zeilen.slice(0, 2) };
    const rueckmeldung = bewerteAusfuehrung(erfolg(zuWenig), ERWARTET, OHNE_REIHENFOLGE);
    expect(rueckmeldung.bewertung.art).toBe('falsch');
    expect(rueckmeldung.abweichungen).toContain(
      'Erwartet werden 3 Zeilen, deine Abfrage liefert 2.',
    );
    expect(rueckmeldung.protokoll?.errorType).toBe('WRONG_RESULT');
    expect(rueckmeldung.protokoll?.returnedRows).toBe(2);
  });

  it('zeigt jede Abweichung nur einmal und höchstens vier', () => {
    const daneben: Resultset = {
      spalten: ['Name', 'Telefon'],
      zeilen: Array.from({ length: 9 }, (_x, i) => [`Person ${i}`, null]),
    };
    const rueckmeldung = bewerteAusfuehrung(erfolg(daneben), ERWARTET, OHNE_REIHENFOLGE);
    expect(rueckmeldung.abweichungen.length).toBeLessThanOrEqual(4);
    expect(new Set(rueckmeldung.abweichungen).size).toBe(rueckmeldung.abweichungen.length);
  });

  it('bewertet ein gekürztes Ergebnis nicht als richtig', () => {
    const rueckmeldung = bewerteAusfuehrung(erfolg(ERWARTET, true), ERWARTET, OHNE_REIHENFOLGE);
    expect(rueckmeldung.bewertung.art).toBe('falsch');
    expect(rueckmeldung.bewertung).toMatchObject({ begruendung: expect.stringContaining('900') });
  });

  it('gibt bei einem SQL-Fehler die übersetzte Meldung weiter und hält die Art fest', () => {
    const erklaerung: Fehlererklaerung = {
      kategorie: 'SPALTE',
      original: "Invalid column name 'Stadtt'.\nZweite Zeile",
      bedeutung: 'Die Spalte gibt es nicht.',
      moeglicheUrsachen: ['Tippfehler'],
      woSuchen: 'Im Schema-Explorer.',
      kontrollfrage: 'Wie heißt die Spalte genau?',
    };
    const rueckmeldung = bewerteAusfuehrung(
      { art: 'fehler', erklaerung, dauerMs: 7 },
      ERWARTET,
      OHNE_REIHENFOLGE,
    );
    expect(rueckmeldung.bewertung.art).toBe('falsch');
    expect(rueckmeldung.fehler).toBe(erklaerung);
    expect(rueckmeldung.protokoll).toEqual({
      errorType: 'COLUMN',
      errorSignature: "Invalid column name 'Stadtt'.",
      executionMs: 7,
    });
  });

  it('ein Zeitlimit ist ein Fehlversuch mit eigener Art', () => {
    const rueckmeldung = bewerteAusfuehrung(
      { art: 'zeitlimit', grenzeMs: 5000, hinweis: 'Zu lange gelaufen.' },
      ERWARTET,
      OHNE_REIHENFOLGE,
    );
    expect(rueckmeldung.bewertung).toEqual({ art: 'falsch', begruendung: 'Zu lange gelaufen.' });
    expect(rueckmeldung.protokoll?.errorType).toBe('TIMEOUT');
  });

  it('eine abgelehnte oder abgebrochene Ausführung ist kein Versuch', () => {
    const abgelehnt = bewerteAusfuehrung(
      {
        art: 'abgelehnt',
        policy: { erlaubt: false, begruendung: 'Hier wird nur gelesen.' },
      } as Ausfuehrungsergebnis,
      ERWARTET,
      OHNE_REIHENFOLGE,
    );
    expect(abgelehnt.bewertung).toEqual({
      art: 'abgelehnt',
      begruendung: 'Hier wird nur gelesen.',
    });
    expect(abgelehnt.protokoll).toBeUndefined();

    const abgebrochen = bewerteAusfuehrung({ art: 'abgebrochen' }, ERWARTET, OHNE_REIHENFOLGE);
    expect(abgebrochen.bewertung.art).toBe('braucht-ausfuehrung');
    expect(abgebrochen.protokoll).toBeUndefined();
  });
});

describe('Resultset aus JSON', () => {
  it('macht aus einem ISO-Zeitpunkt wieder ein Datum', () => {
    const datum = new Date('2026-03-02T00:00:00Z');
    const zurueck = resultsetAusJson(
      JSON.parse(JSON.stringify({ spalten: ['Eingegangen'], zeilen: [[datum]] })),
    );
    expect(zurueck?.zeilen[0]?.[0]).toEqual(datum);
  });

  it('lässt Text, der nur ähnlich aussieht, als Text stehen', () => {
    const zurueck = resultsetAusJson({
      spalten: ['a', 'b'],
      zeilen: [['2026-03-02', '0621 445566']],
    });
    expect(zurueck?.zeilen[0]).toEqual(['2026-03-02', '0621 445566']);
  });

  it('macht aus einem durch JSON gegangenen Uint8Array wieder Bytes', () => {
    const zurueck = resultsetAusJson(
      JSON.parse(JSON.stringify({ spalten: ['Daten'], zeilen: [[new Uint8Array([1, 2, 3])]] })),
    );
    expect(zurueck?.zeilen[0]?.[0]).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('behält Zahlen, Wahrheitswerte und NULL', () => {
    expect(
      resultsetAusJson({ spalten: ['x', 'y', 'z'], zeilen: [[1.5, true, null]] })?.zeilen,
    ).toEqual([[1.5, true, null]]);
  });

  it('weist alles zurück, was kein Resultset ist', () => {
    expect(resultsetAusJson(null)).toBeNull();
    expect(resultsetAusJson({ spalten: 'Name', zeilen: [] })).toBeNull();
    expect(resultsetAusJson({ spalten: ['Name'], zeilen: ['Anna'] })).toBeNull();
    expect(resultsetAusJson({ spalten: [1], zeilen: [] })).toBeNull();
  });

  it('nach dem Weg durch JSON vergleicht die Bewertung Datum mit Datum', () => {
    // Genau der Weg in der Anwendung: erwartetes Ergebnis aus der Datenbank,
    // eigenes Ergebnis aus der Antwort des Runner-Dienstes – beides JSON.
    const mitDatum: Resultset = {
      spalten: ['Eingegangen'],
      zeilen: [[new Date('2026-03-02T00:00:00Z')]],
    };
    const erwartet = resultsetAusJson(JSON.parse(JSON.stringify(mitDatum)))!;
    const geliefert = resultsetAusJson(JSON.parse(JSON.stringify(mitDatum)))!;
    expect(bewerteAusfuehrung(erfolg(geliefert), erwartet, OHNE_REIHENFOLGE).bewertung.art).toBe(
      'richtig',
    );
    // Und gegen den Lehrplan selbst, in dem echte Datumswerte stehen.
    expect(bewerteAusfuehrung(erfolg(geliefert), mitDatum, OHNE_REIHENFOLGE).bewertung.art).toBe(
      'richtig',
    );
  });
});

describe('Dieselbe Regel für Zeilen aus der Datenbank', () => {
  it('stimmt mit der Regel für geladene Aufgaben überein', () => {
    for (const art of ['ABFRAGE_SCHREIBEN', 'FEHLER_FINDEN', 'EINFACHAUSWAHL'] as const) {
      for (const erlaubteKlassen of [['SELECT'], ['SELECT', 'DML'], ['DDL']] as const) {
        for (const erwartetesErgebnis of [ERWARTET, null]) {
          expect(
            amErgebnisPruefbar({
              art,
              erlaubteKlassen,
              hatErwartetesErgebnis: erwartetesErgebnis !== null,
            }),
          ).toBe(istAmErgebnisPruefbar({ art, erlaubteKlassen, erwartetesErgebnis }));
        }
      }
    }
  });
});
