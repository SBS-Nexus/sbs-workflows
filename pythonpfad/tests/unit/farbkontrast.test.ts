import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AA_FLIESSTEXT, kontrastverhaeltnis } from '@/domain/design/kontrast';

/**
 * Lesbarkeit der Farbwelt, in beiden Schemata.
 *
 * Die Farbwerte werden aus `globals.css` gelesen und nicht hier wiederholt.
 * Das ist der Punkt der Sache: Ein Test mit eigener Farbtabelle prüft ab der
 * ersten Gestaltungsänderung eine Farbwelt, die es nicht mehr gibt, und meldet
 * dabei fröhlich „bestanden".
 *
 * Geprüft werden die Paarungen, die tatsächlich auf dem Bildschirm
 * aufeinandertreffen – Fließtext auf Karte, Sekundärtext auf der Leinwand und
 * so weiter. Nicht geprüft wird jede denkbare Kombination: Ein Test, der
 * Verhältnisse einfordert, die nirgends vorkommen, erzwingt am Ende eine
 * blasse Gestaltung ohne Gewinn für irgendjemanden.
 */

const GLOBALS = readFileSync(
  path.resolve(import.meta.dirname, '..', '..', 'src', 'app', 'globals.css'),
  'utf8',
);

function tonwert(stufe: number): string {
  const treffer = new RegExp(`--color-ink-${stufe}:\\s*(#[0-9a-fA-F]{6})`).exec(GLOBALS);
  if (!treffer?.[1]) {
    throw new Error(
      `--color-ink-${stufe} steht nicht mehr in globals.css. ` +
        'Wurde die Grundskala umbenannt? Dann gehört dieser Test mit angepasst.',
    );
  }
  return treffer[1];
}

const KARTE_HELL = '#fbfbf6'; // --surface-raised im hellen Schema (Learning-OS-Papier)

describe('Farbkontraste, helles Schema', () => {
  const leinwand = tonwert(50);
  const vertieft = tonwert(100);
  const text = tonwert(900);
  const gedaempft = tonwert(500);

  it.each([
    ['Fließtext auf Karte', () => kontrastverhaeltnis(text, KARTE_HELL)],
    ['Fließtext auf Leinwand', () => kontrastverhaeltnis(text, leinwand)],
    ['Sekundärtext auf Karte', () => kontrastverhaeltnis(gedaempft, KARTE_HELL)],
    ['Sekundärtext auf Leinwand', () => kontrastverhaeltnis(gedaempft, leinwand)],
    ['Sekundärtext auf vertiefter Fläche', () => kontrastverhaeltnis(gedaempft, vertieft)],
  ])('%s erfüllt Stufe AA', (_name, messen) => {
    expect(messen()).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
  });
});

describe('Farbkontraste, dunkles Schema', () => {
  const leinwand = tonwert(950);
  const karte = tonwert(900);
  const text = tonwert(50);
  const gedaempft = tonwert(300);

  it.each([
    ['Fließtext auf Karte', () => kontrastverhaeltnis(text, karte)],
    ['Fließtext auf Leinwand', () => kontrastverhaeltnis(text, leinwand)],
    ['Sekundärtext auf Karte', () => kontrastverhaeltnis(gedaempft, karte)],
    ['Sekundärtext auf Leinwand', () => kontrastverhaeltnis(gedaempft, leinwand)],
  ])('%s erfüllt Stufe AA', (_name, messen) => {
    expect(messen()).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
  });
});

describe('Kontrastberechnung selbst', () => {
  it('liefert die bekannten Eckwerte', () => {
    // Schwarz auf Weiß ist das Höchstmaß, gleiche Farben ergeben 1:1.
    expect(kontrastverhaeltnis('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(kontrastverhaeltnis('#7c3aed', '#7c3aed')).toBeCloseTo(1, 5);
  });

  it('ist unabhängig von der Reihenfolge', () => {
    expect(kontrastverhaeltnis('#211d47', '#f4f2fb')).toBeCloseTo(
      kontrastverhaeltnis('#f4f2fb', '#211d47'),
      10,
    );
  });

  it('weist unbrauchbare Angaben zurück', () => {
    // Eine stillschweigend als Schwarz gelesene Fehleingabe wäre schlimmer als
    // ein Abbruch: Der Test bestünde und die Farbe wäre trotzdem falsch.
    expect(() => kontrastverhaeltnis('#12345', '#ffffff')).toThrow();
    expect(() => kontrastverhaeltnis('rot', '#ffffff')).toThrow();
  });
});

describe('Modulfarben: gemeinsame Palette der Fachanwendungen', () => {
  /*
   * Roadmap E3: Modul 1 hat in PythonPfad und SQLPfad dieselbe Farbe, im
   * hellen wie im dunklen Schema. Dieselbe Tabelle steht in beiden Apps in
   * diesem Test; wer die Palette in einer App ändert, ohne die andere
   * mitzunehmen, sieht es hier. Abgelöst wird das durch die geteilte
   * Token-Datei mit Drift-Prüfung.
   *
   * Vorher trug SQLPfad im dunklen Schema die Werte von PythonPfad, im hellen
   * aber eigene: Modul 2 war hell blau und dunkel petrol.
   */
  const PALETTE = {
    'modul-0': { hell: '#5e4378', hellWeich: '#ece5f1', dunkel: '#bda8d4', dunkelWeich: '#2a2134' },
    'modul-1': { hell: '#1d6964', hellWeich: '#dbece8', dunkel: '#9fd4cb', dunkelWeich: '#132f2c' },
    'modul-2': { hell: '#95551d', hellWeich: '#f6ebde', dunkel: '#ecc6a2', dunkelWeich: '#33241a' },
    'modul-3': { hell: '#34568a', hellWeich: '#e0e7f1', dunkel: '#a3b9de', dunkelWeich: '#1b2537' },
    projekt: { hell: '#843856', hellWeich: '#f2e0e7', dunkel: '#e4abc0', dunkelWeich: '#331c26' },
    wiederholen: {
      hell: '#4f6e2e',
      hellWeich: '#e5edda',
      dunkel: '#bfd99d',
      dunkelWeich: '#1f2b17',
    },
  } as const;

  const DUNKEL_AB = GLOBALS.indexOf(":root[data-theme='dark']");
  const dunkel = (name: string): string => {
    const treffer = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(
      GLOBALS.slice(DUNKEL_AB),
    );
    if (DUNKEL_AB < 0 || !treffer?.[1]) {
      throw new Error(`--color-${name} fehlt im dunklen Schema von globals.css.`);
    }
    return treffer[1];
  };
  const hell = (name: string): string => {
    const treffer = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(GLOBALS);
    if (!treffer?.[1]) throw new Error(`--color-${name} fehlt in globals.css.`);
    return treffer[1];
  };

  const namen = Object.keys(PALETTE) as (keyof typeof PALETTE)[];

  it.each(namen)('%s steht in beiden Schemata wie in der Palette', (name) => {
    const soll = PALETTE[name];
    expect(hell(name)).toBe(soll.hell);
    expect(hell(`${name}-soft`)).toBe(soll.hellWeich);
    expect(dunkel(name)).toBe(soll.dunkel);
    expect(dunkel(`${name}-soft`)).toBe(soll.dunkelWeich);
  });

  const PAPIER = hell('ink-50');
  const SENKE = hell('ink-100');
  const KARTE = '#fbfbf6';
  const TINTE = hell('ink-950');
  const KARTE_DUNKEL = hell('ink-900');

  it.each(namen)('%s ist im hellen Schema lesbar', (name) => {
    const voll = hell(name);
    // Weiße Beschriftung auf der vollen Farbe, die Farbe als Schrift auf
    // Papier, Karte, vertiefter Fläche und der eigenen weichen Fläche.
    for (const grund of ['#ffffff', PAPIER, KARTE, SENKE, hell(`${name}-soft`)]) {
      expect(kontrastverhaeltnis(voll, grund)).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
    }
  });

  it.each(namen)('%s ist im dunklen Schema lesbar', (name) => {
    const voll = dunkel(name);
    // Die aufgehellte Farbe als Schrift auf Tinte, dunkler Karte und der
    // eigenen weichen Fläche; dunkle Schrift auf der vollen Farbe.
    for (const grund of [TINTE, KARTE_DUNKEL, dunkel(`${name}-soft`)]) {
      expect(kontrastverhaeltnis(voll, grund)).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
    }
  });

  it('staffelt die vier Modulfarben auch in der Helligkeit', () => {
    // Für Farbsehschwäche: keine zwei Module mit fast gleicher Helligkeit.
    const werte = (['modul-0', 'modul-1', 'modul-2', 'modul-3'] as const)
      .map((name) => kontrastverhaeltnis(hell(name), '#ffffff'))
      .sort((a, b) => a - b);
    for (let i = 1; i < werte.length; i += 1) {
      expect((werte[i] ?? 0) - (werte[i - 1] ?? 0)).toBeGreaterThanOrEqual(0.5);
    }
  });
});
