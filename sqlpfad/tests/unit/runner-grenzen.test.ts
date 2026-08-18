import { describe, expect, it } from 'vitest';
import { erstelleAufsicht, STANDARD_BETRIEBSGRENZEN } from '../../runner/grenzen';
import { sandboxAnmeldename, sandboxDatenbankName } from '../../src/domain/sql/bezeichner';

/**
 * Die Grenzen, mit kontrollierter Uhr.
 *
 * Über den Dienst sind sie im Groben schon geprüft. Was dort nicht geht, ist
 * das Vergehen von Zeit: Ein Test, der ein Minutenfenster real abwartet, ist
 * eine Minute lang nutzlos und wird irgendwann übersprungen. Deshalb nimmt
 * `bittEinlass` den Zeitpunkt entgegen.
 */

describe('Aufsicht: gleichzeitige Ausführungen', () => {
  it('lässt bis zur Grenze durch und weist die nächste ab', () => {
    const aufsicht = erstelleAufsicht({
      jeSandbox: 2,
      insgesamt: 10,
      proFenster: 100,
      fensterMs: 60_000,
    });

    expect(aufsicht.bittEinlass('a').eingelassen).toBe(true);
    expect(aufsicht.bittEinlass('a').eingelassen).toBe(true);

    const dritte = aufsicht.bittEinlass('a');
    expect(dritte.eingelassen).toBe(false);
    expect(dritte.grund).toBe('zu-viele-je-sandbox');
  });

  it('trennt die Sandboxes voneinander', () => {
    // Sonst blockierte eine einzelne Person alle anderen mit.
    const aufsicht = erstelleAufsicht({
      jeSandbox: 1,
      insgesamt: 10,
      proFenster: 100,
      fensterMs: 60_000,
    });

    expect(aufsicht.bittEinlass('a').eingelassen).toBe(true);
    expect(aufsicht.bittEinlass('b').eingelassen).toBe(true);
    expect(aufsicht.bittEinlass('a').eingelassen).toBe(false);
  });

  it('schützt den Server als Ganzes', () => {
    const aufsicht = erstelleAufsicht({
      jeSandbox: 5,
      insgesamt: 2,
      proFenster: 100,
      fensterMs: 60_000,
    });

    aufsicht.bittEinlass('a');
    aufsicht.bittEinlass('b');

    const dritte = aufsicht.bittEinlass('c');
    expect(dritte.grund).toBe('server-ausgelastet');
  });

  it('zählt beim Entlassen nicht unter null', () => {
    /*
     * Die Gegenprobe zum unauffälligsten Fehler dieser Klasse: Ein zweites
     * `entlasse` zur selben Ausführung – etwa aus einem `finally` nach einem
     * Abbruch – würde den Zähler dauerhaft nach unten verfälschen. Die Grenze
     * griffe danach nie wieder, und niemand würde es merken.
     */
    const aufsicht = erstelleAufsicht({
      jeSandbox: 1,
      insgesamt: 1,
      proFenster: 100,
      fensterMs: 60_000,
    });

    aufsicht.bittEinlass('a');
    aufsicht.entlasse('a');
    aufsicht.entlasse('a');
    aufsicht.entlasse('a');
    expect(aufsicht.laufende()).toBe(0);

    aufsicht.bittEinlass('a');
    // Wäre der Zähler negativ, ließe diese Grenze zwei durch statt einer.
    expect(aufsicht.bittEinlass('a').eingelassen).toBe(false);
  });
});

describe('Aufsicht: Zeitfenster', () => {
  it('weist ab, wer im Fenster zu oft kommt', () => {
    const aufsicht = erstelleAufsicht({
      jeSandbox: 99,
      insgesamt: 99,
      proFenster: 3,
      fensterMs: 60_000,
    });

    for (let runde = 0; runde < 3; runde += 1) {
      expect(aufsicht.bittEinlass('a', 1_000).eingelassen).toBe(true);
    }
    expect(aufsicht.bittEinlass('a', 1_000).grund).toBe('zu-schnell');
  });

  it('lässt nach Ablauf des Fensters wieder durch', () => {
    const aufsicht = erstelleAufsicht({
      jeSandbox: 99,
      insgesamt: 99,
      proFenster: 2,
      fensterMs: 60_000,
    });

    aufsicht.bittEinlass('a', 0);
    aufsicht.bittEinlass('a', 0);
    expect(aufsicht.bittEinlass('a', 0).eingelassen).toBe(false);

    // Eine Minute später ist das Fenster leer. Ohne dieses Aufräumen wäre die
    // Abweisung dauerhaft - aus einem Schutz würde eine Sperre.
    expect(aufsicht.bittEinlass('a', 60_001).eingelassen).toBe(true);
  });
});

describe('Die Sätze an die Lernende', () => {
  it('erklären, statt zu tadeln', () => {
    const aufsicht = erstelleAufsicht({
      jeSandbox: 1,
      insgesamt: 9,
      proFenster: 9,
      fensterMs: 60_000,
    });
    aufsicht.bittEinlass('a');

    const hinweis = aufsicht.bittEinlass('a').hinweis ?? '';
    expect(hinweis.length).toBeGreaterThan(20);
    expect(hinweis).not.toMatch(/verboten|unzulässig|Missbrauch|Fehler deinerseits/i);
  });
});

describe('Anmeldename der Sandbox', () => {
  it('ist ein anderer als der Datenbankname', () => {
    /*
     * Die Aussage des ganzen Berechtigungsmodells in einem Test: Wer
     * ausführt, ist nicht, wer verwaltet – und beide sind unterscheidbar.
     */
    const datenbank = sandboxDatenbankName('clv3k2j9a0000abcd', 'handwerk');
    const anmeldename = sandboxAnmeldename(datenbank);

    expect(anmeldename).not.toBe(datenbank);
    expect(anmeldename).toContain(datenbank);
  });

  it('enthält kein personenbezogenes Merkmal', () => {
    const anmeldename = sandboxAnmeldename(sandboxDatenbankName('clv3k2j9a0000abcd', 'handwerk'));
    expect(anmeldename).not.toMatch(/@/);
    expect(anmeldename).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
  });

  it('meldet einen zu langen Namen, statt ihn zu kürzen', () => {
    // Ein abgeschnittener Anmeldename könnte mit dem einer anderen Sandbox
    // zusammenfallen - und damit auf deren Rechte zeigen.
    expect(() => sandboxAnmeldename('s'.repeat(62))).toThrow();
  });
});

describe('Standardgrenzen', () => {
  it('lassen zwei gleichzeitige Ausführungen je Person zu', () => {
    // Eine wäre zu wenig: Wer abbricht und sofort neu ausführt, träfe sonst
    // auf die eigene, gerade beendete Abfrage.
    expect(STANDARD_BETRIEBSGRENZEN.jeSandbox).toBeGreaterThanOrEqual(2);
  });
});
