import { beforeEach, describe, expect, it } from 'vitest';
import {
  type Ausfuehrungsauftrag,
  erstelleSqlRunner,
  SqlAbbruchFehler,
  SqlMotorFehler,
  type SqlRunner,
  SqlZeitlimitFehler,
} from '@/domain/sql/runner';
import type { Resultset } from '@/domain/sql/resultset';
import { MotorAttrappe } from '../hilfen/motor-attrappe';

const r = (spalten: string[], zeilen: unknown[][]): Resultset => ({ spalten, zeilen }) as Resultset;

const auftrag = (sql: string, extra: Partial<Ausfuehrungsauftrag> = {}): Ausfuehrungsauftrag => ({
  sandboxId: 'sandbox-1',
  ausfuehrungId: 'lauf-1',
  sql,
  erlaubteKlassen: ['SELECT'],
  ...extra,
});

describe('SQL Runner', () => {
  let motor: MotorAttrappe;
  let runner: SqlRunner;

  beforeEach(() => {
    motor = new MotorAttrappe();
    let tick = 0;
    runner = erstelleSqlRunner(motor, { uhr: () => (tick += 10) });
  });

  describe('Policy vor Ausführung', () => {
    it('schickt eine unerlaubte Anweisung gar nicht erst an den Server', async () => {
      /*
       * Die Reihenfolge ist der Punkt dieses Tests. Erst prüfen, dann
       * ausführen - sonst arbeitet der Übungsserver an etwas, das ohnehin
       * abgelehnt wird, und die Lernende bekommt eine Serverfehlermeldung
       * statt einer Erklärung.
       */
      const ergebnis = await runner.execute(auftrag('UPDATE Kunden SET Aktiv = 0'));

      expect(ergebnis.art).toBe('abgelehnt');
      expect(motor.ausgefuehrt).toHaveLength(0);
    });

    it('prüft jede Anweisung einer Eingabe, nicht nur die erste', async () => {
      // Sonst käme ein UPDATE hinter einem harmlosen SELECT ungesehen durch.
      const ergebnis = await runner.execute(
        auftrag('SELECT * FROM Kunden; UPDATE Kunden SET Aktiv = 0'),
      );

      expect(ergebnis.art).toBe('abgelehnt');
      expect(motor.ausgefuehrt).toHaveLength(0);
    });

    it('lässt ein Semikolon in einer Zeichenfolge unangetastet', async () => {
      motor.antwort = { resultset: r(['Text'], [['a;b']]) };
      const ergebnis = await runner.execute(auftrag("SELECT Text FROM Notizen WHERE Text = 'a;b'"));

      expect(ergebnis.art).toBe('erfolg');
    });

    it('begrenzt die Zahl der Anweisungen und erklärt warum', async () => {
      const viele = Array.from({ length: 12 }, (_, i) => `SELECT ${i + 1}`).join('; ');
      const ergebnis = await runner.execute(auftrag(viele));

      expect(ergebnis.art).toBe('abgelehnt');
      if (ergebnis.art !== 'abgelehnt') return;
      expect(ergebnis.policy.begruendung).toContain('einzeln');
      expect(motor.ausgefuehrt).toHaveLength(0);
    });

    it('sagt bei leerem Editor etwas Freundliches', async () => {
      const ergebnis = await runner.execute(auftrag('   \n-- noch nichts\n'));

      expect(ergebnis.art).toBe('abgelehnt');
      if (ergebnis.art !== 'abgelehnt') return;
      expect(ergebnis.policy.begruendung).not.toMatch(/Fehler|ungültig/i);
    });
  });

  describe('Zeilengrenze', () => {
    it('kürzt ein zu großes Ergebnis und sagt es', async () => {
      motor.antwort = {
        resultset: r(
          ['N'],
          Array.from({ length: 40 }, (_, i) => [i]),
        ),
      };
      const ergebnis = await runner.execute(
        auftrag('SELECT N FROM Zahlen', { grenzen: { maxZeilen: 10 } }),
      );

      expect(ergebnis.art).toBe('erfolg');
      if (ergebnis.art !== 'erfolg') return;
      expect(ergebnis.resultset.zeilen).toHaveLength(10);
      expect(ergebnis.abgeschnitten).toBe(true);
      // Die tatsächliche Zahl bleibt sichtbar - sonst hält die Lernende die
      // gekürzte Anzeige für das ganze Ergebnis.
      expect(ergebnis.gelieferteZeilen).toBe(40);
    });

    it('kürzt nicht, solange das Ergebnis hineinpasst', async () => {
      motor.antwort = { resultset: r(['N'], [[1], [2]]) };
      const ergebnis = await runner.execute(auftrag('SELECT N FROM Zahlen'));

      expect(ergebnis.art).toBe('erfolg');
      if (ergebnis.art !== 'erfolg') return;
      expect(ergebnis.abgeschnitten).toBe(false);
    });

    it('behandelt eine Anweisung ohne Ergebnismenge als Erfolg', async () => {
      motor.antwort = { betroffeneZeilen: 3 };
      const ergebnis = await runner.execute(
        auftrag('UPDATE Kunden SET Aktiv = 0', { erlaubteKlassen: ['SELECT', 'DML'] }),
      );

      expect(ergebnis.art).toBe('erfolg');
      if (ergebnis.art !== 'erfolg') return;
      expect(ergebnis.resultset.zeilen).toHaveLength(0);
      expect(ergebnis.betroffeneZeilen).toBe(3);
    });
  });

  describe('Fehler kommen übersetzt zurück', () => {
    it('macht aus einer Servermeldung eine Erklärung', async () => {
      motor.antwort = () => {
        throw new SqlMotorFehler("Invalid column name 'Stadtt'.", 207);
      };
      const ergebnis = await runner.execute(auftrag('SELECT Stadtt FROM Kunden'));

      expect(ergebnis.art).toBe('fehler');
      if (ergebnis.art !== 'fehler') return;
      expect(ergebnis.erklaerung.kategorie).toBe('SPALTE');
      expect(ergebnis.erklaerung.bedeutung).toContain('Stadtt');
      // Die Originalmeldung bleibt erhalten, nicht ersetzt.
      expect(ergebnis.erklaerung.original).toContain('Invalid column name');
    });

    it('erklärt ein Zeitlimit statt es nur zu melden', async () => {
      motor.antwort = () => {
        throw new SqlZeitlimitFehler(5000);
      };
      const ergebnis = await runner.execute(auftrag('SELECT * FROM A, B, C'));

      expect(ergebnis.art).toBe('zeitlimit');
      if (ergebnis.art !== 'zeitlimit') return;
      expect(ergebnis.grenzeMs).toBe(5000);
      // Der häufigste Grund wird genannt, ohne ihn als sicher auszugeben.
      expect(ergebnis.hinweis).toContain('JOIN');
    });

    it('meldet einen Abbruch als Abbruch, nicht als Fehler', async () => {
      // Wer selbst stoppt, hat nichts falsch gemacht.
      motor.antwort = () => {
        throw new SqlAbbruchFehler();
      };
      const ergebnis = await runner.execute(auftrag('SELECT * FROM Kunden'));

      expect(ergebnis.art).toBe('abgebrochen');
    });

    it('verschluckt keine unerwarteten Fehler', async () => {
      /*
       * Ein Programmierfehler im Motor darf nicht als freundliche
       * Lernendenmeldung enden - sonst sucht niemand die Ursache.
       */
      motor.antwort = () => {
        throw new TypeError('kaputt');
      };
      await expect(runner.execute(auftrag('SELECT 1'))).rejects.toThrow(TypeError);
    });
  });

  describe('Bewertung', () => {
    const erwartet = r(['Name'], [['Anna'], ['Sofia']]);

    it('besteht bei gleichem Ergebnis unabhängig von der Reihenfolge', async () => {
      motor.antwort = { resultset: r(['Name'], [['Sofia'], ['Anna']]) };
      const bewertung = await runner.grade(auftrag('SELECT Name FROM Kunden'), erwartet, {
        reihenfolgeZaehlt: false,
      });

      expect(bewertung.bestanden).toBe(true);
    });

    it('besteht nicht, wenn die Ausführung gar kein Ergebnis lieferte', async () => {
      /*
       * Der gefährlichste Fall: Ein leeres Resultset gegen eine Musterlösung
       * zu vergleichen, die auch leer ist, würde einen Serverfehler als
       * bestandene Aufgabe zählen.
       */
      motor.antwort = () => {
        throw new SqlMotorFehler("Invalid object name 'Kunde'.", 208);
      };
      const bewertung = await runner.grade(auftrag('SELECT Name FROM Kunde'), r(['Name'], []), {
        reihenfolgeZaehlt: false,
      });

      expect(bewertung.bestanden).toBe(false);
      expect(bewertung.ausfuehrung.art).toBe('fehler');
      expect(bewertung.vergleich).toBeUndefined();
    });

    it('bewertet ein gekürztes Ergebnis nicht als bestanden', async () => {
      // Die abgeschnittenen Zeilen würden sonst als „fehlt" gezählt - ein
      // Urteil über die Anzeige, nicht über die Lösung.
      motor.antwort = { resultset: r(['Name'], [['Anna'], ['Sofia'], ['Mehmet']]) };
      const bewertung = await runner.grade(
        auftrag('SELECT Name FROM Kunden', { grenzen: { maxZeilen: 2 } }),
        erwartet,
        { reihenfolgeZaehlt: false },
      );

      expect(bewertung.bestanden).toBe(false);
      expect(bewertung.vergleich?.abweichungen[0]?.art).toBe('zeilenanzahl');
      expect(bewertung.vergleich?.abweichungen[0]?.beschreibung).toContain('3');
    });

    it('besteht nicht bei abgelehnter Anweisung', async () => {
      const bewertung = await runner.grade(auftrag('DELETE FROM Kunden'), erwartet, {
        reihenfolgeZaehlt: false,
      });

      expect(bewertung.bestanden).toBe(false);
      expect(bewertung.ausfuehrung.art).toBe('abgelehnt');
    });
  });

  describe('Sandbox und Zustand', () => {
    it('reicht das Zurücksetzen an den Motor durch', async () => {
      await runner.resetSandbox('sandbox-7');
      expect(motor.zurueckgesetzt).toEqual(['sandbox-7']);
    });

    it('bricht genau die benannte Ausführung ab', async () => {
      await runner.cancel('lauf-42');
      expect(motor.abgebrochen).toEqual(['lauf-42']);
    });

    it('meldet einen nicht erreichbaren Server ohne Schuldzuweisung', async () => {
      motor.erreichbar = false;
      const zustand = await runner.health();

      expect(zustand.erreichbar).toBe(false);
      expect(zustand.hinweis).toContain('gespeichert');
    });
  });
});
