import { describe, expect, it } from 'vitest';
import {
  anordnung,
  anordnungsSchluessel,
  ordneAn,
  zurAufLehrplan,
} from '@/domain/aufgabe/anordnung';
import { bewerteAufgabe } from '@/domain/aufgabe/bewertung';
import { LEHRPLAN } from '@/content';

const SCHLUESSEL = Array.from({ length: 2000 }, (_x, i) =>
  anordnungsSchluessel(`konto-${i}`, 'a-was-ist-eine-zeile'),
);

describe('Anzeigereihenfolge der Optionen', () => {
  it('ist für dieselbe Person und Aufgabe immer dieselbe', () => {
    expect(anordnung(4, 'konto-1:a-x')).toEqual(anordnung(4, 'konto-1:a-x'));
  });

  it('ist eine Umordnung aller Optionen', () => {
    for (const schluessel of SCHLUESSEL.slice(0, 200)) {
      expect([...anordnung(5, schluessel)].sort()).toEqual([0, 1, 2, 3, 4]);
    }
  });

  it('ist nie die Lehrplanreihenfolge', () => {
    // Sonst wäre eine Reihenfolge-Aufgabe beim Öffnen schon gelöst.
    for (const anzahl of [2, 3, 4]) {
      for (const schluessel of SCHLUESSEL) {
        const reihenfolge = anordnung(anzahl, schluessel);
        expect(reihenfolge.every((wert, index) => wert === index)).toBe(false);
      }
    }
  });

  it('setzt die im Lehrplan erste Antwort nicht mehr bevorzugt nach vorn', () => {
    // Im Lehrplan steht die richtige Antwort jeder Einfachauswahl vorn.
    const vorn = SCHLUESSEL.filter((schluessel) => anordnung(4, schluessel)[0] === 0).length;
    const anteil = vorn / SCHLUESSEL.length;
    expect(anteil).toBeGreaterThan(0.15);
    expect(anteil).toBeLessThan(0.35);
  });

  it('lässt eine oder keine Option, wie sie ist', () => {
    expect(anordnung(1, 'x')).toEqual([0]);
    expect(anordnung(0, 'x')).toEqual([]);
  });

  it('ordnet Werte an und rechnet Antworten exakt zurück', () => {
    const werte = ['a', 'b', 'c', 'd'];
    const reihenfolge = anordnung(4, 'konto-7:a-y');
    const angezeigt = ordneAn(werte, reihenfolge);
    for (let position = 0; position < 4; position += 1) {
      expect(angezeigt[position]).toBe(werte[reihenfolge[position]!]);
    }
    expect(zurAufLehrplan({ art: 'auswahl', gewaehlt: [0, 2] }, reihenfolge)).toEqual({
      art: 'auswahl',
      gewaehlt: [reihenfolge[0], reihenfolge[2]],
    });
    // Andere Antwortformen bleiben unberührt.
    expect(zurAufLehrplan({ art: 'zahl', wert: 4 }, reihenfolge)).toEqual({ art: 'zahl', wert: 4 });
  });

  it('macht eine Position außerhalb der Anzeige nicht still zu einer gültigen', () => {
    expect(zurAufLehrplan({ art: 'auswahl', gewaehlt: [9] }, [1, 0])).toEqual({
      art: 'auswahl',
      gewaehlt: [9],
    });
  });
});

describe('Der ganze Weg mit echten Aufgaben', () => {
  const aufgaben = LEHRPLAN.module.flatMap((modul) =>
    modul.lektionen.flatMap((lektion) => lektion.aufgaben),
  );

  it('bewertet die angezeigte richtige Option als richtig', () => {
    for (const aufgabe of aufgaben.filter((a) => a.art === 'EINFACHAUSWAHL')) {
      const optionen = (aufgabe.nutzlast as { optionen: string[]; richtig: number }).optionen;
      const richtig = (aufgabe.nutzlast as { richtig: number }).richtig;
      const reihenfolge = anordnung(
        optionen.length,
        anordnungsSchluessel('konto-e2e', aufgabe.slug),
      );
      // Was die Lernende sieht und anklickt: die Anzeigeposition der richtigen Option.
      const angeklickt = reihenfolge.indexOf(richtig);
      const antwort = zurAufLehrplan({ art: 'auswahl', gewaehlt: [angeklickt] }, reihenfolge);
      expect(
        bewerteAufgabe({ art: aufgabe.art, nutzlast: aufgabe.nutzlast ?? null }, antwort).art,
        aufgabe.slug,
      ).toBe('richtig');
    }
  });

  it('ist bei keiner Reihenfolge-Aufgabe schon beim Öffnen gelöst', () => {
    for (const aufgabe of aufgaben.filter((a) => a.art === 'REIHENFOLGE')) {
      const optionen = (aufgabe.nutzlast as { optionen: string[] }).optionen;
      for (const schluessel of SCHLUESSEL.slice(0, 300)) {
        const reihenfolge = anordnung(optionen.length, schluessel);
        // Unveränderte Abgabe: die Anzeigepositionen in ihrer Reihenfolge.
        const unveraendert = zurAufLehrplan(
          { art: 'reihenfolge', reihenfolge: optionen.map((_o, i) => i) },
          reihenfolge,
        );
        expect(
          bewerteAufgabe({ art: aufgabe.art, nutzlast: aufgabe.nutzlast ?? null }, unveraendert)
            .art,
        ).not.toBe('richtig');
      }
    }
  });
});
