import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { erstelleDienst } from '../../runner/dienst';
import { erstelleAufsicht } from '../../runner/grenzen';
import {
  SqlMotorFehler,
  SqlZeitlimitFehler,
  type Ausfuehrungsauftrag,
  type Ausfuehrungsgrenzen,
  type RohAusfuehrung,
  type SqlMotor,
} from '../../src/domain/sql/runner';

/**
 * Der Runner-Dienst auf dem ganzen Weg – gegen den **echten** Prozess.
 *
 * Der Dienst wird hier gestartet, über HTTP angesprochen und wieder beendet.
 * Was er tut, wird also nicht nachgestellt, sondern gemessen: Token-Prüfung,
 * Wege, Grenzen, Fehlerbehandlung.
 *
 * Was hier **nicht** geprüft wird, ist T-SQL-Semantik. Dafür braucht es einen
 * laufenden SQL Server; das ist `tests/sql/` und läuft nur mit Zugangsdaten.
 * Der Motor ist deshalb ein Prüfstand-Motor – und das ist keine Notlösung: Er
 * lässt sich Fehler und Zeitlimits auf Zuruf erzeugen, was mit einem echten
 * Server mühsam bis unmöglich wäre.
 */

/** Ein Motor, der tut, was der Test ihm sagt. */
function pruefstandMotor(): SqlMotor & {
  antwort: (wert: RohAusfuehrung | Error) => void;
  gesehen: Ausfuehrungsauftrag[];
  abgebrochen: string[];
  zurueckgesetzt: string[];
} {
  let naechste: RohAusfuehrung | Error = { resultset: { spalten: ['x'], zeilen: [[1]] } };
  const gesehen: Ausfuehrungsauftrag[] = [];
  const abgebrochen: string[] = [];
  const zurueckgesetzt: string[] = [];

  return {
    antwort: (wert) => {
      naechste = wert;
    },
    gesehen,
    abgebrochen,
    zurueckgesetzt,

    async fuehreAus(auftrag: Ausfuehrungsauftrag, _grenzen: Ausfuehrungsgrenzen) {
      gesehen.push(auftrag);
      if (naechste instanceof Error) throw naechste;
      return naechste;
    },
    async brichAb(id: string) {
      abgebrochen.push(id);
    },
    async setzeSandboxZurueck(id: string) {
      zurueckgesetzt.push(id);
    },
    async zustand() {
      return { erreichbar: true, hinweis: 'Prüfstand antwortet.' };
    },
  };
}

const TOKEN = 'a'.repeat(40);
const motor = pruefstandMotor();
let basis = '';
let dienst: ReturnType<typeof erstelleDienst>;

beforeAll(async () => {
  dienst = erstelleDienst({
    motor,
    token: TOKEN,
    // Kleine Grenzen, damit sie im Test überhaupt greifen können.
    aufsicht: erstelleAufsicht({ jeSandbox: 2, insgesamt: 3, proFenster: 4, fensterMs: 60_000 }),
  });
  await new Promise<void>((fertig) => dienst.listen(0, fertig));
  basis = `http://127.0.0.1:${(dienst.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((fertig) => dienst.close(() => fertig()));
});

function ruf(pfad: string, koerper: unknown, token = TOKEN): Promise<Response> {
  return fetch(`${basis}${pfad}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(koerper),
  });
}

describe('Token', () => {
  it('lässt ohne Token niemanden herein', async () => {
    const antwort = await fetch(`${basis}/zustand`, { method: 'POST' });
    expect(antwort.status).toBe(401);
  });

  it('lässt mit falschem Token niemanden herein', async () => {
    const antwort = await ruf('/zustand', {}, 'b'.repeat(40));
    expect(antwort.status).toBe(401);
  });

  it('verrät im Fehlerfall nicht, was am Token falsch war', async () => {
    /*
     * Gegenprobe gegen die hilfsbereite Fehlermeldung. „Token abgelaufen"
     * gegen „Token unbekannt" zu unterscheiden, sagt jemandem, der rät, wie
     * nah er ist.
     */
    const kurz = await (await ruf('/zustand', {}, 'x')).json();
    const lang = await (await ruf('/zustand', {}, 'b'.repeat(40))).json();
    expect(kurz).toEqual(lang);
  });

  it('lässt mit richtigem Token herein', async () => {
    const antwort = await ruf('/zustand', {});
    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toMatchObject({ erreichbar: true });
  });
});

describe('Ausführen', () => {
  it('reicht Auftrag und Ergebnis durch', async () => {
    motor.antwort({ resultset: { spalten: ['Name'], zeilen: [['Nordwind']] } });

    const antwort = await ruf('/ausfuehren', {
      sandboxId: 'sbx_a_handwerk',
      ausfuehrungId: 'lauf-1',
      sql: 'SELECT Name FROM Kunden;',
      erlaubteKlassen: ['SELECT'],
    });

    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toMatchObject({
      art: 'erfolg',
      resultset: { spalten: ['Name'], zeilen: [['Nordwind']] },
    });
    expect(motor.gesehen.at(-1)?.sandboxId).toBe('sbx_a_handwerk');
  });

  it('lehnt ab, was die Aufgabe nicht zulässt – ohne den Motor zu bemühen', async () => {
    const vorher = motor.gesehen.length;

    const antwort = await ruf('/ausfuehren', {
      sandboxId: 'sbx_a_handwerk',
      ausfuehrungId: 'lauf-2',
      sql: "UPDATE Kunden SET Stadt = N'Bremen';",
      erlaubteKlassen: ['SELECT'],
    });

    expect(await antwort.json()).toMatchObject({ art: 'abgelehnt' });
    // Der Übungsserver bekommt gar nicht erst Arbeit, die er ohnehin
    // ablehnen würde.
    expect(motor.gesehen.length).toBe(vorher);
  });

  it('macht aus einem Serverfehler eine Erklärung', async () => {
    motor.antwort(new SqlMotorFehler("Invalid object name 'Kundn'.", 208));

    const ergebnis = (await (
      await ruf('/ausfuehren', {
        sandboxId: 'sbx_a_handwerk',
        ausfuehrungId: 'lauf-3',
        sql: 'SELECT * FROM Kundn;',
        erlaubteKlassen: ['SELECT'],
      })
    ).json()) as { art: string; erklaerung?: unknown };

    expect(ergebnis.art).toBe('fehler');
    expect(ergebnis.erklaerung).toBeDefined();
  });

  it('meldet ein Zeitlimit als solches, nicht als Fehler', async () => {
    motor.antwort(new SqlZeitlimitFehler(5_000));

    const ergebnis = await (
      await ruf('/ausfuehren', {
        sandboxId: 'sbx_a_handwerk',
        ausfuehrungId: 'lauf-4',
        sql: 'SELECT * FROM Kunden, Auftraege;',
        erlaubteKlassen: ['SELECT'],
      })
    ).json();

    expect(ergebnis).toMatchObject({ art: 'zeitlimit', grenzeMs: 5_000 });
    motor.antwort({ resultset: { spalten: ['x'], zeilen: [[1]] } });
  });

  it('verlangt eine sandboxId', async () => {
    const antwort = await ruf('/ausfuehren', { sql: 'SELECT 1;' });
    expect(antwort.status).toBe(400);
  });
});

describe('Grenzen', () => {
  it('weist ab, wer zu schnell zu oft kommt – mit einem Satz ohne Vorwurf', async () => {
    const auftrag = {
      sandboxId: 'sbx_schnell_handwerk',
      ausfuehrungId: 'x',
      sql: 'SELECT 1;',
      erlaubteKlassen: ['SELECT'],
    };

    // Vier gehen durch (proFenster: 4), der fünfte nicht.
    for (let runde = 0; runde < 4; runde += 1) {
      expect((await ruf('/ausfuehren', auftrag)).status).toBe(200);
    }

    const antwort = await ruf('/ausfuehren', auftrag);
    expect(antwort.status).toBe(429);

    const koerper = (await antwort.json()) as { hinweis: string };
    expect(koerper.hinweis).toContain('doppelter Klick');
    // Kein Tadel: Wer eine Aufgabe lösen will, ist mit „du hast etwas falsch
    // gemacht" nicht geholfen.
    expect(koerper.hinweis).not.toMatch(/verboten|unzulässig|Missbrauch/i);
  });

  it('gibt den Platz nach der Ausführung wieder frei', async () => {
    /*
     * Der Fall, der im Betrieb wehtut: Bliebe ein Platz nach jedem Fehler
     * belegt, wäre die Grenze nach ein paar Fehlversuchen eine dauerhafte
     * Sperre – und niemand käme auf die Idee, dort zu suchen.
     */
    const auftrag = {
      sandboxId: 'sbx_frei_handwerk',
      ausfuehrungId: 'y',
      sql: 'SELECT 1;',
      erlaubteKlassen: ['SELECT'],
    };

    motor.antwort(new SqlMotorFehler('irgendwas', 1));
    await ruf('/ausfuehren', auftrag);
    await ruf('/ausfuehren', auftrag);

    motor.antwort({ resultset: { spalten: ['x'], zeilen: [[1]] } });
    // Wäre der Platz nicht freigegeben, käme hier 429 statt 200.
    expect((await ruf('/ausfuehren', auftrag)).status).toBe(200);
  });
});

describe('Abbrechen und Zurücksetzen', () => {
  it('reicht den Abbruch an den Motor durch', async () => {
    const antwort = await ruf('/abbrechen', { ausfuehrungId: 'lauf-1' });
    expect(antwort.status).toBe(200);
    expect(motor.abgebrochen).toContain('lauf-1');
  });

  it('reicht das Zurücksetzen an den Motor durch', async () => {
    const antwort = await ruf('/sandbox/zuruecksetzen', { sandboxId: 'sbx_a_handwerk' });
    expect(antwort.status).toBe(200);
    expect(motor.zurueckgesetzt).toContain('sbx_a_handwerk');
  });
});

describe('Unbekannte Wege', () => {
  it('antwortet mit 404 statt mit einem Hinweis, was es gäbe', async () => {
    const antwort = await ruf('/gibtesnicht', {});
    expect(antwort.status).toBe(404);
  });
});
