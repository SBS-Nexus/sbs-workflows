import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LEHRPLAN, UEBUNGSDATEN } from '@/content';
import type { Aufgabe } from '@/content/typen';
import { vergleicheResultsets } from '@/domain/sql/resultset';
import { type SqlMotor, STANDARDGRENZEN } from '@/domain/sql/runner';
import { erstelleMssqlMotor } from '../../runner/mssql-motor';

/**
 * Jede Musterlösung gegen ihr eigenes erwartetes Ergebnis – auf einem echten
 * SQL Server, mit den echten Übungsdaten.
 *
 * Sobald der Übungsserver eine Schreibaufgabe bewertet, vergleicht er die
 * Abfrage der Lernenden mit `erwartetesErgebnis` aus dem Lehrplan. Steht dort
 * ein Fehler – eine vergessene Zeile, ein Tippfehler in einem Namen –, hört
 * jemand mit einer richtigen Abfrage „Noch nicht". Das ist der teuerste Fehler,
 * den eine Lernplattform machen kann: Er bringt bei, dem eigenen richtigen
 * Denken zu misstrauen. Dieselbe Prüfung macht PythonPfad mit
 * `scripts/verify_solutions.py`.
 *
 * Geprüft werden alle Aufgaben mit Musterlösung und erwartetem Ergebnis, deren
 * Lösung nur liest. Aufgaben, die Daten oder Strukturen ändern, bewertet der
 * Übungsserver nicht automatisch (siehe docs/SQL-RUNNER.md, Abschnitt 12).
 *
 * Ohne Zugangsdaten übersprungen, nicht bestanden – siehe
 * motor.integration.test.ts.
 */

const host = process.env.SQL_SERVER_HOST;
const passwort = process.env.SQL_SERVER_SA_PASSWORD;
const vorhanden = Boolean(host && passwort);

const SANDBOX = 'sbx_musterloesungen_handwerk';

interface Pruefling {
  slug: string;
  datensatz: string;
  aufgabe: Aufgabe & {
    loesungSql: string;
    erwartetesErgebnis: NonNullable<Aufgabe['erwartetesErgebnis']>;
  };
}

/** Alle lesenden Aufgaben mit Musterlösung und erwartetem Ergebnis. */
function prueflinge(): Pruefling[] {
  const liste: Pruefling[] = [];
  for (const modul of LEHRPLAN.module) {
    for (const lektion of modul.lektionen) {
      for (const aufgabe of lektion.aufgaben) {
        const nurLesend = (aufgabe.erlaubteKlassen ?? ['SELECT']).every((k) => k === 'SELECT');
        if (!aufgabe.loesungSql || !aufgabe.erwartetesErgebnis || !nurLesend) continue;
        liste.push({
          slug: aufgabe.slug,
          datensatz: lektion.datensatz,
          aufgabe: aufgabe as Pruefling['aufgabe'],
        });
      }
    }
  }
  return liste;
}

const PRUEFLINGE = prueflinge();

describe('Lehrplan', () => {
  it('enthält lesende Aufgaben mit Musterlösung und erwartetem Ergebnis', () => {
    // Fiele die Liste leer aus, bestünde die Prüfung unten ohne einen Fall.
    expect(PRUEFLINGE.length).toBeGreaterThan(5);
    expect(new Set(PRUEFLINGE.map((p) => p.datensatz))).toEqual(new Set(['handwerk']));
  });
});

const beschreibe = vorhanden ? describe : describe.skip;

beschreibe('Musterlösungen gegen SQL Server', () => {
  let motor: SqlMotor;

  beforeAll(async () => {
    const handwerk = UEBUNGSDATEN.find((datensatz) => datensatz.slug === 'handwerk');
    if (!handwerk) throw new Error('Übungsdatensatz handwerk fehlt.');
    motor = erstelleMssqlMotor({
      host: host as string,
      port: Number(process.env.SQL_SERVER_PORT ?? 1433),
      verwaltung: { benutzer: 'sa', passwort: passwort as string },
      verschluesseln: true,
      zertifikatNichtPruefen: true,
      ladeSchemaSkript: async () => handwerk.skript,
    });
    await motor.setzeSandboxZurueck(SANDBOX);
  }, 180_000);

  afterAll(async () => {
    await motor.setzeSandboxZurueck(SANDBOX).catch(() => undefined);
  }, 120_000);

  it.each(PRUEFLINGE.map((p) => [p.slug, p] as const))(
    '%s liefert genau das erwartete Ergebnis',
    async (_slug, { aufgabe }) => {
      const roh = await motor.fuehreAus(
        {
          sandboxId: SANDBOX,
          ausfuehrungId: `muster-${aufgabe.slug}`,
          sql: aufgabe.loesungSql,
          erlaubteKlassen: ['SELECT'],
        },
        STANDARDGRENZEN,
      );
      expect(roh.resultset, 'die Musterlösung liefert ein Ergebnis').toBeDefined();
      const vergleich = vergleicheResultsets(
        aufgabe.erwartetesErgebnis,
        roh.resultset!,
        aufgabe.vergleich ?? { reihenfolgeZaehlt: false },
      );
      expect(vergleich.abweichungen.map((a) => a.beschreibung)).toEqual([]);
      expect(vergleich.stimmtUeberein).toBe(true);
    },
  );
});
