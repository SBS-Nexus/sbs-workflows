import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Die freie Werkbank: Welche Anweisungen sie zulässt, entscheidet der Server.
 *
 * Vorher schickte der Browser die erlaubten Anweisungsklassen mit, und die
 * Server Action reichte sie ungeprüft an die eigene Prüfung **und** an den
 * Runner weiter. Wer den Aufruf nachbaute, bekam mit
 * `erlaubteKlassen: ['DML', 'DDL', …]` jede Klasse frei (Review DEV-03).
 *
 * Geprüft wird hier die Server Action selbst – mit allem, was sie außerhalb
 * ihrer eigenen Datei braucht, als Attrappe: Sitzung, Umgebung und der Weg zum
 * Runner. Die Anweisungsprüfung ist die echte; sie ist es, deren Eingabe nicht
 * mehr aus dem Browser kommen darf.
 */

const sitzung = vi.hoisted(() => ({ userId: 'kontoA' }));
const umgebung = vi.hoisted(() => ({ runnerAn: false }));

vi.mock('@/server/auth/session', () => ({
  requireUser: vi.fn(async () => ({ id: sitzung.userId })),
}));

vi.mock('@/server/env', () => ({
  getEnv: () => ({ SQL_MAX_ANWEISUNGEN: 10 }),
  istSqlRunnerVerfuegbar: () => umgebung.runnerAn,
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
    dauerMs: 3,
  })),
}));

const { fuehreAbfrageAus } = await import('@/server/actions/abfrage-actions');
const runner = await import('@/server/sql/runner-client');
const { requireUser } = await import('@/server/auth/session');

const ALLE_KLASSEN = ['SELECT', 'DML', 'DDL', 'TRANSAKTION', 'PROGRAMMIERUNG'];

beforeEach(() => {
  vi.mocked(runner.stelleSandboxBereit).mockClear();
  vi.mocked(runner.fuehreImRunnerAus).mockClear();
  vi.mocked(requireUser).mockClear();
  sitzung.userId = 'kontoA';
  umgebung.runnerAn = true;
});

function nichtsAusgefuehrt(): void {
  expect(runner.stelleSandboxBereit).not.toHaveBeenCalled();
  expect(runner.fuehreImRunnerAus).not.toHaveBeenCalled();
}

describe('manipulierte Anweisungsklassen aus dem Browser', () => {
  it('lässt mit untergeschobenem DML kein UPDATE durch', async () => {
    const ergebnis = await fuehreAbfrageAus({
      sql: 'UPDATE Kunden SET Stadt = NULL',
      erlaubteKlassen: ['SELECT', 'DML'],
    });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it('lässt mit allen Klassen auch kein DELETE hinter einem SELECT durch', async () => {
    const ergebnis = await fuehreAbfrageAus({
      sql: 'SELECT 1; DELETE FROM Kunden',
      erlaubteKlassen: ALLE_KLASSEN,
    });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it('lässt mit untergeschobenem DDL kein DROP TABLE durch', async () => {
    const ergebnis = await fuehreAbfrageAus({
      sql: 'DROP TABLE Kunden',
      erlaubteKlassen: ['SELECT', 'DDL'],
    });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it('lässt mit untergeschobenem DDL kein CREATE TABLE durch', async () => {
    const ergebnis = await fuehreAbfrageAus({
      sql: 'CREATE TABLE Notiz (Id int)',
      erlaubteKlassen: ALLE_KLASSEN,
    });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it('weist eine mitgeschickte Liste auch dann zurück, wenn sie nur SELECT enthält', async () => {
    // Die Liste ist keine Angabe, die der Browser machen darf – auch keine
    // harmlose. Nähme der Server sie in diesem Fall an, bliebe sie Teil des
    // Vertrags, und die nächste Änderung läse sie womöglich wieder aus.
    const ergebnis = await fuehreAbfrageAus({
      sql: 'SELECT Name FROM Kunden',
      erlaubteKlassen: ['SELECT'],
    });

    expect(ergebnis).toEqual({
      art: 'abgelehnt',
      begruendung: 'Die Eingabe konnte nicht gelesen werden.',
    });
    nichtsAusgefuehrt();
  });
});

describe('Transaktionen', () => {
  it('lehnt BEGIN TRANSACTION in der Werkbank ab', async () => {
    const ergebnis = await fuehreAbfrageAus({ sql: 'BEGIN TRANSACTION' });

    expect(ergebnis).toMatchObject({ art: 'abgelehnt' });
    expect(ergebnis.art === 'abgelehnt' && ergebnis.begruendung).toMatch(/Transaktion/);
    nichtsAusgefuehrt();
  });

  it('lehnt COMMIT hinter einem SELECT ab', async () => {
    const ergebnis = await fuehreAbfrageAus({ sql: 'SELECT 1 COMMIT' });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it('lässt sich auch mit untergeschobener TRANSAKTION nicht freischalten', async () => {
    const ergebnis = await fuehreAbfrageAus({
      sql: 'BEGIN TRAN; SELECT 1; COMMIT',
      erlaubteKlassen: ['SELECT', 'TRANSAKTION'],
    });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });
});

describe('unbekannte und manipulierte Kontrollparameter', () => {
  it.each([
    ['verwerfen', { verwerfen: false }],
    ['grenzen', { grenzen: { zeitlimitMs: 600_000, maxZeilen: 1_000_000 } }],
    ['sandboxId', { sandboxId: 'sbx_kontoB_handwerk' }],
    ['datenbank', { datenbank: 'sbx_kontoB_handwerk' }],
    ['userId', { userId: 'kontoB' }],
    ['ein beliebiger Name', { irgendwas: 1 }],
  ])('weist %s zurück', async (_name, zusatz) => {
    const ergebnis = await fuehreAbfrageAus({ sql: 'SELECT Name FROM Kunden', ...zusatz });

    expect(ergebnis).toEqual({
      art: 'abgelehnt',
      begruendung: 'Die Eingabe konnte nicht gelesen werden.',
    });
    nichtsAusgefuehrt();
  });

  it('weist einen fremden Übungsdatensatz zurück', async () => {
    const ergebnis = await fuehreAbfrageAus({
      sql: 'SELECT Name FROM Kunden',
      datensatz: 'anderer-datensatz',
    });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['ein Text', 'SELECT 1'],
    ['eine Liste', ['SELECT 1']],
    ['eine Zahl', 42],
  ])('weist %s als Eingabe zurück', async (_name, eingabe) => {
    const ergebnis = await fuehreAbfrageAus(eingabe);

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it('nimmt den Datensatz der Werkbank weiterhin an, wenn er mitkommt', async () => {
    // Der bisherige Vertrag kannte `datensatz` als freiwillige Angabe mit
    // „handwerk" als Vorgabe. Wer genau das schickt, bricht nichts.
    const ergebnis = await fuehreAbfrageAus({
      sql: 'SELECT Name FROM Kunden',
      datensatz: 'handwerk',
    });

    expect(ergebnis.art).toBe('erfolg');
    expect(runner.stelleSandboxBereit).toHaveBeenCalledWith('kontoA', 'handwerk');
  });
});

describe('zulässige Abfragen', () => {
  it('führt ein SELECT mit den Klassen aus, die der Server bestimmt', async () => {
    const ergebnis = await fuehreAbfrageAus({ sql: 'SELECT Name FROM Kunden ORDER BY Name' });

    expect(ergebnis).toEqual({
      art: 'erfolg',
      resultset: { spalten: ['Name'], zeilen: [['Becker']] },
      abgeschnitten: false,
      gelieferteZeilen: 1,
      dauerMs: 3,
    });
    expect(runner.stelleSandboxBereit).toHaveBeenCalledWith('kontoA', 'handwerk');
    expect(runner.fuehreImRunnerAus).toHaveBeenCalledTimes(1);
    expect(runner.fuehreImRunnerAus).toHaveBeenCalledWith({
      datenbank: 'sbx_kontoA_handwerk',
      sql: 'SELECT Name FROM Kunden ORDER BY Name',
      erlaubteKlassen: ['SELECT'],
      verwerfen: true,
    });
  });

  it('lässt mehrere SELECT nacheinander zu', async () => {
    const ergebnis = await fuehreAbfrageAus({ sql: 'SELECT 1; SELECT 2' });

    expect(ergebnis.art).toBe('erfolg');
    expect(vi.mocked(runner.fuehreImRunnerAus).mock.calls[0]?.[0].erlaubteKlassen).toEqual([
      'SELECT',
    ]);
  });

  it.each([
    ['UPDATE', 'UPDATE Kunden SET Stadt = NULL'],
    ['DELETE', 'DELETE FROM Kunden'],
    ['DROP TABLE', 'DROP TABLE Kunden'],
    ['EXEC', 'EXEC sp_who'],
  ])('hält %s vom Runner fern, bevor er es sieht', async (_name, sql) => {
    // Ohne mitgeschickte Liste, mit eingeschaltetem Runner: Die Regel des
    // Servers allein muss reichen.
    const ergebnis = await fuehreAbfrageAus({ sql });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it('lässt SELECT … INTO nicht als Lesen durchgehen', async () => {
    const ergebnis = await fuehreAbfrageAus({ sql: 'SELECT * INTO Kopie FROM Kunden' });

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });
});

describe('fehlendes SQL', () => {
  it.each([
    ['ohne sql', {}],
    ['mit leerem Text', { sql: '' }],
    ['mit einer Zahl statt Text', { sql: 1 }],
  ])('weist eine Eingabe %s zurück', async (_name, eingabe) => {
    const ergebnis = await fuehreAbfrageAus(eingabe);

    expect(ergebnis.art).toBe('abgelehnt');
    nichtsAusgefuehrt();
  });

  it('erklärt einen Editor, in dem nur ein Kommentar steht', async () => {
    const ergebnis = await fuehreAbfrageAus({ sql: '-- noch nichts' });

    expect(ergebnis).toEqual({
      art: 'abgelehnt',
      begruendung: 'Im Editor steht noch keine Abfrage.',
    });
    nichtsAusgefuehrt();
  });

  it('verlangt eine Anmeldung, bevor irgendetwas geprüft wird', async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    await expect(fuehreAbfrageAus({ sql: 'SELECT 1' })).rejects.toThrow('NEXT_REDIRECT');
    nichtsAusgefuehrt();
  });
});

describe('Runner abgeschaltet und eingeschaltet', () => {
  it('meldet ohne Runner ehrlich, dass nichts ausgeführt wurde', async () => {
    umgebung.runnerAn = false;

    const ergebnis = await fuehreAbfrageAus({ sql: 'SELECT Name FROM Kunden' });

    expect(ergebnis.art).toBe('nicht-verfuegbar');
    nichtsAusgefuehrt();
  });

  it('prüft auch ohne Runner gegen die Klassen des Servers', async () => {
    umgebung.runnerAn = false;

    const ergebnis = await fuehreAbfrageAus({ sql: 'UPDATE Kunden SET Stadt = NULL' });

    expect(ergebnis.art).toBe('abgelehnt');
    expect(ergebnis.art === 'abgelehnt' && ergebnis.begruendung).toMatch(/Lesen von Daten/);
    nichtsAusgefuehrt();
  });

  it('reicht mit eingeschaltetem Runner dessen Ablehnung durch', async () => {
    vi.mocked(runner.fuehreImRunnerAus).mockResolvedValueOnce({
      art: 'abgelehnt',
      policy: { erlaubt: false, klasse: 'DML', begruendung: 'vom Runner abgelehnt' },
    });

    const ergebnis = await fuehreAbfrageAus({ sql: 'SELECT 1' });

    expect(ergebnis).toEqual({ art: 'abgelehnt', begruendung: 'vom Runner abgelehnt' });
  });

  it('meldet eine nicht bereite Sandbox als nicht verfügbar', async () => {
    vi.mocked(runner.stelleSandboxBereit).mockResolvedValueOnce({
      art: 'runner-nicht-erreichbar',
      hinweis: 'Der Übungsserver antwortet gerade nicht.',
    });

    const ergebnis = await fuehreAbfrageAus({ sql: 'SELECT 1' });

    expect(ergebnis).toEqual({
      art: 'nicht-verfuegbar',
      hinweis: 'Der Übungsserver antwortet gerade nicht.',
    });
    expect(runner.fuehreImRunnerAus).not.toHaveBeenCalled();
  });
});

describe('Sandboxes verschiedener Konten', () => {
  it('führt jedes Konto in seiner eigenen Sandbox aus – bestimmt aus der Sitzung', async () => {
    sitzung.userId = 'kontoA';
    await fuehreAbfrageAus({ sql: 'SELECT 1' });
    sitzung.userId = 'kontoB';
    await fuehreAbfrageAus({ sql: 'SELECT 1' });

    expect(vi.mocked(runner.stelleSandboxBereit).mock.calls).toEqual([
      ['kontoA', 'handwerk'],
      ['kontoB', 'handwerk'],
    ]);
    expect(
      vi.mocked(runner.fuehreImRunnerAus).mock.calls.map(([auftrag]) => auftrag.datenbank),
    ).toEqual(['sbx_kontoA_handwerk', 'sbx_kontoB_handwerk']);
  });

  it('lässt sich nicht über mitgeschickte Angaben auf ein anderes Konto lenken', async () => {
    sitzung.userId = 'kontoA';

    for (const zusatz of [
      { userId: 'kontoB' },
      { sandboxId: 'sbx_kontoB_handwerk' },
      { datensatz: 'handwerk_kontoB' },
    ]) {
      expect((await fuehreAbfrageAus({ sql: 'SELECT 1', ...zusatz })).art).toBe('abgelehnt');
    }
    nichtsAusgefuehrt();
  });
});
