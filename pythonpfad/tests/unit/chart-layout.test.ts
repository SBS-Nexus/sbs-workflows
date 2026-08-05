import { describe, expect, it } from 'vitest';
import { baueRing, baueSaeulen, baueVerlaufslinie, rundeSkala } from '@/domain/design/chart-layout';

describe('Skala eines Säulendiagramms', () => {
  it('rundet auf gefällige Werte auf', () => {
    // Eine Achse, die bei 7 endet, weil der höchste Wert 7 ist, lässt sich
    // nicht ablesen. Gesucht ist die nächste Zahl aus 1, 2, 5, 10, 20, 50 …
    expect(rundeSkala(7)).toBe(10);
    expect(rundeSkala(1)).toBe(1);
    expect(rundeSkala(2)).toBe(2);
    expect(rundeSkala(3)).toBe(5);
    expect(rundeSkala(11)).toBe(20);
    expect(rundeSkala(23)).toBe(50);
    expect(rundeSkala(51)).toBe(100);
  });

  it('liefert auch ohne Werte eine benutzbare Skala', () => {
    // Eine Obergrenze von null würde beim Rechnen zu einer Division durch
    // null und im Bild zu einer Achse ohne Ausdehnung.
    expect(rundeSkala(0)).toBe(1);
    expect(rundeSkala(-5)).toBe(1);
  });
});

describe('Säulendiagramm', () => {
  const eingaben = [
    { label: 'Mo', wert: 0 },
    { label: 'Di', wert: 3 },
    { label: 'Mi', wert: 7 },
    { label: 'Do', wert: 2 },
  ];

  it('rechnet Höhen als Anteil der gerundeten Skala', () => {
    const diagramm = baueSaeulen(eingaben);
    expect(diagramm.skalenMaximum).toBe(10);
    expect(diagramm.saeulen.map((s) => s.hoehe)).toEqual([0, 30, 70, 20]);
  });

  it('gibt einem Wert von null wirklich die Höhe null', () => {
    // Ein Stummel, der aussieht wie „ein bisschen", wäre eine Verfälschung:
    // Ein Tag ohne Übung ist ein Tag ohne Übung.
    expect(baueSaeulen(eingaben).saeulen[0]!.hoehe).toBe(0);
  });

  it('markiert genau die höchste Säule', () => {
    const diagramm = baueSaeulen(eingaben);
    expect(diagramm.saeulen.map((s) => s.istHoechster)).toEqual([false, false, true, false]);
  });

  it('markiert bei Gleichstand alle Höchsten', () => {
    const diagramm = baueSaeulen([
      { label: 'a', wert: 4 },
      { label: 'b', wert: 4 },
    ]);
    expect(diagramm.saeulen.every((s) => s.istHoechster)).toBe(true);
  });

  it('markiert nichts, wenn alle Werte null sind', () => {
    const diagramm = baueSaeulen([
      { label: 'a', wert: 0 },
      { label: 'b', wert: 0 },
    ]);
    expect(diagramm.saeulen.some((s) => s.istHoechster)).toBe(false);
    expect(diagramm.hoechsterWert).toBe(0);
  });

  it('liefert sechs Rasterlinien einschließlich der Grundlinie', () => {
    const diagramm = baueSaeulen(eingaben);
    expect(diagramm.rasterlinien).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('beschriftet die Achse nur mit ganzen Zahlen', () => {
    // Gezählt werden Aufgaben und Lerntage. Eine Achse, die „0,3 Aufgaben"
    // behauptet, ist nicht bloß hässlich – es gibt keine drittel Aufgabe.
    for (const hoechster of [0, 1, 2, 3, 4, 7, 11, 23, 51, 140, 999]) {
      const diagramm = baueSaeulen([{ label: 'a', wert: hoechster }]);
      for (const linie of diagramm.rasterlinien) {
        expect(Number.isInteger(linie)).toBe(true);
      }
    }
  });

  it('kommt bei einer Obergrenze von eins mit zwei Linien aus', () => {
    // 0 und 1 – dazwischen gibt es nichts zu beschriften.
    expect(baueSaeulen([{ label: 'a', wert: 0 }]).rasterlinien).toEqual([0, 1]);
  });

  it('behandelt negative Werte wie null', () => {
    // Negative Lernminuten gibt es nicht; ein Datenfehler darf trotzdem nicht
    // dazu führen, dass eine Säule nach unten aus dem Bild wächst.
    const diagramm = baueSaeulen([{ label: 'a', wert: -3 }]);
    expect(diagramm.saeulen[0]!.hoehe).toBe(0);
    expect(diagramm.saeulen[0]!.wert).toBe(0);
  });

  it('kommt mit einer leeren Reihe zurecht', () => {
    const diagramm = baueSaeulen([]);
    expect(diagramm.saeulen).toEqual([]);
    expect(diagramm.summe).toBe(0);
  });

  it('summiert für die Textfassung', () => {
    expect(baueSaeulen(eingaben).summe).toBe(12);
  });
});

describe('Verlaufslinie', () => {
  it('legt den höchsten Wert nach oben', () => {
    // In SVG wächst y nach unten. Ein Verlauf, der die Werte direkt übernimmt,
    // stünde auf dem Kopf – der häufigste Fehler bei selbst gezeichneten
    // Diagrammen.
    const linie = baueVerlaufslinie([0, 10], { breite: 100, hoehe: 40 });
    expect(linie.punkte[0]!.y).toBe(40);
    expect(linie.punkte[1]!.y).toBe(0);
  });

  it('verteilt die Punkte gleichmäßig über die Breite', () => {
    const linie = baueVerlaufslinie([1, 2, 3], { breite: 100 });
    expect(linie.punkte.map((p) => p.x)).toEqual([0, 50, 100]);
  });

  it('bleibt bei einem einzelnen Wert am linken Rand', () => {
    const linie = baueVerlaufslinie([5], { breite: 100 });
    expect(linie.punkte).toHaveLength(1);
    expect(linie.punkte[0]!.x).toBe(0);
    expect(linie.pfad).toBe('M 0 0');
  });

  it('schließt die Fläche unten ab', () => {
    const linie = baueVerlaufslinie([1, 2], { breite: 100, hoehe: 40 });
    expect(linie.flaeche.endsWith('Z')).toBe(true);
    expect(linie.flaeche).toContain('L 100 40');
  });

  it('bleibt zwischen den Messpunkten im Wertebereich', () => {
    // Die Steuerpunkte liegen waagerecht zwischen zwei Punkten. Dadurch kann
    // die Kurve nicht über den höheren der beiden hinausschwingen – sonst
    // sähe man Zwischenstände, die es nie gab.
    const linie = baueVerlaufslinie([0, 10, 0], { breite: 100, hoehe: 40 });
    const zahlen = linie.pfad.match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (const zahl of zahlen) {
      expect(zahl).toBeGreaterThanOrEqual(0);
      expect(zahl).toBeLessThanOrEqual(100);
    }
  });

  it('liefert für eine leere Reihe nichts zu zeichnen', () => {
    const linie = baueVerlaufslinie([]);
    expect(linie.pfad).toBe('');
    expect(linie.punkte).toEqual([]);
  });
});

describe('Ringdiagramm', () => {
  const UMFANG = 100;

  it('teilt den Ring im Verhältnis der Werte', () => {
    const abschnitte = baueRing([1, 3], UMFANG);
    expect(abschnitte[0]!.laenge).toBe(25);
    expect(abschnitte[1]!.laenge).toBe(75);
  });

  it('setzt jeden Abschnitt hinter den vorherigen', () => {
    const abschnitte = baueRing([1, 1, 2], UMFANG);
    expect(abschnitte.map((a) => a.versatz)).toEqual([-0, -25, -50]);
  });

  it('füllt den Ring vollständig, aber nie mehr', () => {
    const abschnitte = baueRing([3, 5, 2], UMFANG);
    const summe = abschnitte.reduce((gesamt, a) => gesamt + a.laenge, 0);
    expect(summe).toBeCloseTo(UMFANG, 5);
  });

  it('lässt den Ring bei lauter Nullen leer', () => {
    const abschnitte = baueRing([0, 0], UMFANG);
    expect(abschnitte.every((a) => a.laenge === 0)).toBe(true);
  });

  it('übergeht negative Werte', () => {
    const abschnitte = baueRing([-4, 4], UMFANG);
    expect(abschnitte[0]!.laenge).toBe(0);
    expect(abschnitte[1]!.laenge).toBe(UMFANG);
  });
});
