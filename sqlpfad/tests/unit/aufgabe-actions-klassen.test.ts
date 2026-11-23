import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Lektionsaufgaben: Die erlaubten Anweisungsklassen kommen aus der Aufgabe in
 * der Datenbank – nicht aus dem Browser.
 *
 * Gegenstück zu `abfrage-actions.test.ts`. Die Werkbank ist jetzt fest auf
 * SELECT gestellt; hier wird festgehalten, dass das die Lektionen nicht
 * mitreißt: Eine Aufgabe, die `INSERT` übt, lässt `INSERT` weiterhin zu, und
 * zwar weil ihre Zeile es sagt – eine mitgeschickte Liste ändert daran nichts,
 * in keine Richtung.
 */

const umgebung = vi.hoisted(() => ({ runnerAn: false, zeile: null as unknown }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireUser: vi.fn(async () => ({ id: 'kontoA' })) }));
vi.mock('@/server/env', () => ({ istSqlRunnerVerfuegbar: () => umgebung.runnerAn }));
vi.mock('@/server/lernsitzung', () => ({ haltAktivitaetFest: vi.fn(async () => undefined) }));
vi.mock('@/server/wiederholung', () => ({ planeWiederholung: vi.fn(async () => undefined) }));
vi.mock('@/server/lernen/lektionsstand', () => ({
  ladeAufgabenstaende: vi.fn(async () => []),
  ladeLektionsstand: vi.fn(async () => null),
}));
vi.mock('@/server/db/prisma', () => ({
  prisma: {
    exercise: { findUnique: vi.fn(async () => umgebung.zeile) },
    attempt: { create: vi.fn(async () => ({})) },
    lessonProgress: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
  },
}));
vi.mock('@/server/sql/runner-client', () => ({
  stelleSandboxBereit: vi.fn(async (userId: string, datensatz: string) => ({
    datenbank: `sbx_${userId}_${datensatz}`,
  })),
  fuehreImRunnerAus: vi.fn(async () => ({
    art: 'erfolg',
    resultset: { spalten: ['Name'], zeilen: [['Becker']] },
    abgeschnitten: false,
    gelieferteZeilen: 1,
    dauerMs: 2,
  })),
}));

const { gibAufgabeAb } = await import('@/server/actions/aufgabe-actions');
const runner = await import('@/server/sql/runner-client');

/** So, wie `ladeAufgabe` eine Zeile aus der Plattformdatenbank liest. */
function aufgabenzeile(felder: {
  slug: string;
  klassen: string[];
  erwartet?: { spalten: string[]; zeilen: unknown[][] };
}): Record<string, unknown> {
  return {
    id: `id-${felder.slug}`,
    slug: felder.slug,
    status: 'PUBLISHED',
    type: 'WRITE_QUERY',
    lessonId: null,
    practiceSchema: { slug: 'handwerk' },
    comparisonOptions: {},
    hints: [],
    solutionSql: null,
    solutionNotes: null,
    payload: {},
    expectedResultset: felder.erwartet ?? null,
    allowedStatementClasses: felder.klassen,
  };
}

function abgabe(slug: string, sql: string, zusatz: Record<string, unknown> = {}): unknown {
  return {
    aufgabeSlug: slug,
    antwort: { art: 'sql', sql },
    hinweiseGenutzt: 0,
    dauerMs: 1_000,
    ...zusatz,
  };
}

const INSERT_LOESUNG =
  "INSERT INTO Kunden (KundeId, Name, Stadt, Telefon, KundeSeit) VALUES (9, 'Reiter GmbH', 'Speyer', NULL, '2024-03-01');";

beforeEach(() => {
  vi.mocked(runner.stelleSandboxBereit).mockClear();
  vi.mocked(runner.fuehreImRunnerAus).mockClear();
  umgebung.runnerAn = false;
});

describe('Lektionsaufgaben mit DML bleiben gültig', () => {
  it.each([false, true])(
    'lässt INSERT zu, wenn die Aufgabe DML übt (Runner an: %s)',
    async (an) => {
      umgebung.runnerAn = an;
      umgebung.zeile = aufgabenzeile({ slug: 'a-insert-schreiben', klassen: ['SELECT', 'DML'] });

      const { bewertung } = await gibAufgabeAb(abgabe('a-insert-schreiben', INSERT_LOESUNG));

      expect(bewertung.art).toBe('braucht-ausfuehrung');
    },
  );

  it('lässt UPDATE … WHERE zu, wenn die Aufgabe DML übt', async () => {
    umgebung.zeile = aufgabenzeile({ slug: 'a-update-ohne-where', klassen: ['SELECT', 'DML'] });

    const { bewertung } = await gibAufgabeAb(
      abgabe('a-update-ohne-where', "UPDATE Kunden SET Stadt = 'Mannheim' WHERE KundeId = 4;"),
    );

    expect(bewertung.art).toBe('braucht-ausfuehrung');
  });

  it('lässt eine Transaktion zu, wenn die Aufgabe sie übt', async () => {
    umgebung.zeile = aufgabenzeile({
      slug: 'a-transaktion',
      klassen: ['SELECT', 'DML', 'TRANSAKTION'],
    });

    const { bewertung } = await gibAufgabeAb(
      abgabe(
        'a-transaktion',
        "BEGIN TRANSACTION; UPDATE Kunden SET Stadt = 'Mannheim' WHERE KundeId = 4; COMMIT;",
      ),
    );

    expect(bewertung.art).toBe('braucht-ausfuehrung');
  });

  it('nimmt einer DML-Aufgabe ihre Klassen nicht durch eine mitgeschickte SELECT-Liste', async () => {
    umgebung.zeile = aufgabenzeile({ slug: 'a-insert-schreiben', klassen: ['SELECT', 'DML'] });

    const { bewertung } = await gibAufgabeAb(
      abgabe('a-insert-schreiben', INSERT_LOESUNG, { erlaubteKlassen: ['SELECT'] }),
    );

    expect(bewertung.art).toBe('braucht-ausfuehrung');
  });
});

describe('Lektionsaufgaben, die nur lesen', () => {
  it('lehnt DML ab, auch wenn der Browser DML mitschickt', async () => {
    umgebung.runnerAn = true;
    umgebung.zeile = aufgabenzeile({ slug: 'a-lesen', klassen: ['SELECT'] });

    const { bewertung } = await gibAufgabeAb(
      abgabe('a-lesen', 'DELETE FROM Kunden', { erlaubteKlassen: ['SELECT', 'DML', 'DDL'] }),
    );

    expect(bewertung.art).toBe('abgelehnt');
    expect(runner.fuehreImRunnerAus).not.toHaveBeenCalled();
  });

  it('gibt dem Runner die Klassen der Aufgabe mit, nicht die des Browsers', async () => {
    umgebung.runnerAn = true;
    umgebung.zeile = aufgabenzeile({
      slug: 'a-lesen',
      klassen: ['SELECT'],
      erwartet: { spalten: ['Name'], zeilen: [['Becker']] },
    });

    const { bewertung } = await gibAufgabeAb(
      abgabe('a-lesen', 'SELECT Name FROM Kunden', { erlaubteKlassen: ['SELECT', 'DML'] }),
    );

    expect(bewertung.art).toBe('richtig');
    expect(runner.stelleSandboxBereit).toHaveBeenCalledWith('kontoA', 'handwerk');
    expect(runner.fuehreImRunnerAus).toHaveBeenCalledWith({
      datenbank: 'sbx_kontoA_handwerk',
      sql: 'SELECT Name FROM Kunden',
      erlaubteKlassen: ['SELECT'],
      verwerfen: true,
    });
  });
});
