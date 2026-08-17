import { describe, expect, it } from 'vitest';
import {
  FRISCH,
  GUETE_BESTANDEN,
  LEICHTIGKEIT_MINIMUM,
  LEICHTIGKEIT_START,
  beschreibeFaelligkeit,
  guete,
  plane,
  type Gedaechtnisstand,
} from '@/domain/wiederholung/sm2';

/**
 * Die Wiederholungsplanung.
 *
 * Was hier schiefgehen kann, fällt im Betrieb **nicht** auf: Eine Aufgabe, die
 * zu früh oder zu spät wieder ansteht, sieht genauso aus wie eine, die richtig
 * geplant wurde. Der Schaden zeigt sich erst Wochen später daran, dass etwas
 * nicht sitzt – und dann sucht niemand mehr in der Terminrechnung.
 *
 * Deshalb wird hier gegen die **veröffentlichten Zahlen von SM-2** geprüft und
 * nicht gegen das, was der Code gerade tut.
 */

const JETZT = new Date('2026-06-01T10:00:00Z');
const TAG_MS = 24 * 60 * 60 * 1000;

function tageBis(faelligAm: Date): number {
  return Math.round((faelligAm.getTime() - JETZT.getTime()) / TAG_MS);
}

describe('guete', () => {
  it('unterscheidet gelöst mit und ohne Hinweise', () => {
    expect(guete('PASSED', 0)).toBe(5);
    expect(guete('PASSED', 1)).toBe(4);
    expect(guete('PASSED', 2)).toBe(3);
    expect(guete('PASSED', 5)).toBe(3);
  });

  it('wertet die angesehene Lösung als 0 und damit nicht als gekonnt', () => {
    expect(guete('SOLUTION_REVEALED', 4)).toBe(0);
    expect(guete('SOLUTION_REVEALED', 4)).toBeLessThan(GUETE_BESTANDEN);
  });

  it('wertet teilweise und daneben als nicht bestanden', () => {
    expect(guete('PARTIAL', 0)).toBeLessThan(GUETE_BESTANDEN);
    expect(guete('FAILED', 0)).toBeLessThan(GUETE_BESTANDEN);
  });

  it('gibt einer Lösung mit vielen Hinweisen trotzdem noch bestanden', () => {
    // Gegenprobe zur Versuchung, Hinweisnutzung zu bestrafen: Wer die Aufgabe
    // mit Hilfe löst, hat sie gelöst. Das Intervall wächst nur langsamer.
    expect(guete('PASSED', 9)).toBeGreaterThanOrEqual(GUETE_BESTANDEN);
  });
});

describe('plane – die Stufenfolge aus SM-2', () => {
  it('vergibt beim ersten Gelingen einen Tag', () => {
    const ergebnis = plane(FRISCH, 5, JETZT);
    expect(ergebnis.stand.intervallTage).toBe(1);
    expect(tageBis(ergebnis.faelligAm)).toBe(1);
    expect(ergebnis.stand.wiederholungen).toBe(1);
  });

  it('vergibt beim zweiten Gelingen sechs Tage', () => {
    const nachErstem = plane(FRISCH, 5, JETZT).stand;
    const ergebnis = plane(nachErstem, 5, JETZT);
    expect(ergebnis.stand.intervallTage).toBe(6);
    expect(tageBis(ergebnis.faelligAm)).toBe(6);
  });

  it('rechnet ab dem dritten Mal Intervall mal Leichtigkeit', () => {
    let stand: Gedaechtnisstand = FRISCH;
    stand = plane(stand, 5, JETZT).stand; // 1 Tag,  EF 2,6
    stand = plane(stand, 5, JETZT).stand; // 6 Tage, EF 2,7
    const drittes = plane(stand, 5, JETZT);

    // 6 * 2,7 = 16,2 -> gerundet 16
    expect(drittes.stand.intervallTage).toBe(16);
    expect(tageBis(drittes.faelligAm)).toBe(16);
  });
});

describe('plane – die Leichtigkeit', () => {
  it('startet bei 2,5', () => {
    expect(FRISCH.leichtigkeit).toBe(LEICHTIGKEIT_START);
  });

  it('steigt bei Güte 5 um 0,1', () => {
    expect(plane(FRISCH, 5, JETZT).stand.leichtigkeit).toBeCloseTo(2.6, 5);
  });

  it('bleibt bei Güte 4 unverändert', () => {
    // Die Formel aus SM-2 ergibt bei q=4 genau 0. Wer sie falsch klammert,
    // merkt es an keiner anderen Stelle so deutlich wie hier.
    expect(plane(FRISCH, 4, JETZT).stand.leichtigkeit).toBeCloseTo(2.5, 5);
  });

  it('sinkt ab Güte 3', () => {
    expect(plane(FRISCH, 3, JETZT).stand.leichtigkeit).toBeCloseTo(2.36, 5);
  });

  it('wird auch nach einem Fehlschlag angepasst', () => {
    // So steht es im Original. Eine Umsetzung, die den Faktor nur bei Erfolg
    // anfasst, lässt wiederholt misslingende Konzepte gleich schnell wachsen
    // wie mühelose - der Unterschied verschwindet genau dort, wo er zählt.
    expect(plane(FRISCH, 1, JETZT).stand.leichtigkeit).toBeLessThan(LEICHTIGKEIT_START);
  });

  it('fällt nie unter 1,3', () => {
    let stand: Gedaechtnisstand = FRISCH;
    for (let runde = 0; runde < 20; runde += 1) stand = plane(stand, 0, JETZT).stand;
    expect(stand.leichtigkeit).toBe(LEICHTIGKEIT_MINIMUM);
  });
});

describe('plane – nach einem Fehlschlag', () => {
  it('setzt den Zähler zurück und das Intervall auf einen Tag', () => {
    let stand: Gedaechtnisstand = FRISCH;
    stand = plane(stand, 5, JETZT).stand;
    stand = plane(stand, 5, JETZT).stand;
    stand = plane(stand, 5, JETZT).stand;
    expect(stand.wiederholungen).toBe(3);

    const danach = plane(stand, 1, JETZT);
    expect(danach.stand.wiederholungen).toBe(0);
    expect(danach.stand.intervallTage).toBe(1);
    expect(danach.gelungen).toBe(false);
  });

  it('lässt das Konzept sofort wieder anstehen, nicht erst morgen', () => {
    // Woźniak schreibt, ein misslungenes Element solle in derselben Sitzung
    // erneut abgefragt werden. Stünde es erst morgen an, verschwände es genau
    // in dem Moment aus der Wiederholungsseite, in dem es dorthin gehört.
    const ergebnis = plane(FRISCH, 1, JETZT);
    expect(ergebnis.faelligAm.getTime()).toBe(JETZT.getTime());
  });

  it('braucht nach einem Fehlschlag wieder zwei Erfolge bis zu den sechs Tagen', () => {
    // Gegenprobe gegen die naheliegende Abkürzung, den Zähler aus dem
    // gespeicherten Intervall abzuleiten: Nach einem Fehlschlag steht dort
    // dieselbe 1 wie nach dem ersten Erfolg - die beiden Zustände sind aber
    // verschieden, und SM-2 behandelt sie verschieden.
    const nachFehlschlag = plane(FRISCH, 1, JETZT).stand;
    const ersterErfolg = plane(nachFehlschlag, 5, JETZT);
    expect(ersterErfolg.stand.intervallTage).toBe(1);

    const zweiterErfolg = plane(ersterErfolg.stand, 5, JETZT);
    expect(zweiterErfolg.stand.intervallTage).toBe(6);
  });
});

describe('plane – Grenzfall an der Bestehensgrenze', () => {
  it('behandelt Güte 3 als bestanden und Güte 2 als Fehlschlag', () => {
    expect(plane(FRISCH, 3, JETZT).gelungen).toBe(true);
    expect(plane(FRISCH, 2, JETZT).gelungen).toBe(false);
  });
});

describe('beschreibeFaelligkeit', () => {
  it('nennt Fälliges beim Namen statt mit einer negativen Zahl', () => {
    expect(beschreibeFaelligkeit(new Date(JETZT.getTime() - 5 * TAG_MS), JETZT)).toBe(
      'steht jetzt an',
    );
    expect(beschreibeFaelligkeit(JETZT, JETZT)).toBe('steht jetzt an');
  });

  it('rundet auf Tage, Wochen und Monate statt auf die Minute', () => {
    expect(beschreibeFaelligkeit(new Date(JETZT.getTime() + 1 * TAG_MS), JETZT)).toBe(
      'morgen wieder',
    );
    expect(beschreibeFaelligkeit(new Date(JETZT.getTime() + 3 * TAG_MS), JETZT)).toBe(
      'in 3 Tagen wieder',
    );
    expect(beschreibeFaelligkeit(new Date(JETZT.getTime() + 9 * TAG_MS), JETZT)).toBe(
      'in einer Woche wieder',
    );
    expect(beschreibeFaelligkeit(new Date(JETZT.getTime() + 21 * TAG_MS), JETZT)).toBe(
      'in 3 Wochen wieder',
    );
    expect(beschreibeFaelligkeit(new Date(JETZT.getTime() + 40 * TAG_MS), JETZT)).toBe(
      'in einem Monat wieder',
    );
    expect(beschreibeFaelligkeit(new Date(JETZT.getTime() + 120 * TAG_MS), JETZT)).toBe(
      'in 4 Monaten wieder',
    );
  });
});

describe('der ganze Verlauf', () => {
  it('lässt ein müheloses Konzept in wenigen Runden auf Monate wachsen', () => {
    let stand: Gedaechtnisstand = FRISCH;
    const intervalle: number[] = [];
    for (let runde = 0; runde < 6; runde += 1) {
      const ergebnis = plane(stand, 5, JETZT);
      stand = ergebnis.stand;
      intervalle.push(stand.intervallTage);
    }

    /*
     * Nachgerechnet, nicht abgeschrieben:
     *   1 · EF 2,6 → 6 (feste Stufe) · EF 2,7 → 16,2 → 16 · EF 2,8 → 44,8 → 45
     *   · EF 2,9 → 130,5 → 131 · EF 3,0 → 393
     * Die Leichtigkeit hat nach oben **keine** Grenze; SM-2 begrenzt nur nach
     * unten. Ein Konzept, das immer mühelos sitzt, wächst deshalb schnell aus
     * dem Blickfeld – und das ist genau der Zweck.
     */
    expect(intervalle).toEqual([1, 6, 16, 45, 131, 393]);
  });

  it('hält ein zähes Konzept dauerhaft in kurzen Abständen', () => {
    let stand: Gedaechtnisstand = FRISCH;
    // Abwechselnd knapp bestanden und danebengelegen - der Alltag bei einem
    // Konzept, das nicht sitzt.
    for (let runde = 0; runde < 10; runde += 1) {
      stand = plane(stand, runde % 2 === 0 ? 3 : 1, JETZT).stand;
    }
    expect(stand.intervallTage).toBeLessThanOrEqual(1);
    expect(stand.leichtigkeit).toBe(LEICHTIGKEIT_MINIMUM);
  });
});
