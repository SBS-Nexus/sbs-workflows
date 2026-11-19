import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AA_FLIESSTEXT, kontrastverhaeltnis } from '@/domain/design/kontrast';
import { MODULE_THEMES, PROJECT_THEME, REVIEW_THEME } from '@/domain/design/module-theme';

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

/*
 * Die Farbwerte selbst stehen seit Roadmap E3 im gemeinsamen Token-Vertrag;
 * globals.css verweist mit `var(--los-…)` darauf. Gerechnet wird mit dem
 * aufgelösten Wert – sonst prüfte der Test nur noch, dass ein Verweis dasteht.
 */
const TOKENS = readFileSync(
  path.resolve(import.meta.dirname, '..', '..', 'src', 'styles', 'learning-tokens.css'),
  'utf8',
);

function aufloesen(wert: string, tiefe = 0): string {
  const verweis = /^var\((--[\w-]+)\)$/.exec(wert.trim())?.[1];
  if (!verweis) return wert.trim();
  if (tiefe > 5) throw new Error(`Verweiskette zu lang: ${wert}`);
  const muster = new RegExp(`(?<![\\w-])${verweis}:\\s*([^;]+);`);
  const treffer = muster.exec(TOKENS) ?? muster.exec(GLOBALS);
  if (!treffer?.[1]) {
    throw new Error(`${verweis} steht weder im Token-Vertrag noch in globals.css.`);
  }
  return aufloesen(treffer[1], tiefe + 1);
}

function tonwert(stufe: number): string {
  const treffer = new RegExp(`--color-ink-${stufe}:\\s*([^;]+);`).exec(GLOBALS);
  if (!treffer?.[1]) {
    throw new Error(
      `--color-ink-${stufe} steht nicht mehr in globals.css. ` +
        'Wurde die Grundskala umbenannt? Dann gehört dieser Test mit angepasst.',
    );
  }
  return aufloesen(treffer[1]);
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
   * hellen wie im dunklen Schema. Die Werte stehen im Token-Vertrag
   * (src/styles/learning-tokens.css), den scripts/check-learning-tokens.mjs in
   * allen Apps bytegleich hält; globals.css verweist nur darauf. Hier wird
   * geprüft, dass die Verweise stimmen und die aufgelösten Farben lesbar sind.
   *
   * Vorher trug SQLPfad im dunklen Schema die Werte von PythonPfad, im hellen
   * aber eigene: Modul 2 war hell blau und dunkel petrol.
   */
  const ROLLEN = ['modul-0', 'modul-1', 'modul-2', 'modul-3', 'projekt', 'wiederholen'] as const;

  const DUNKEL_AB = GLOBALS.indexOf(":root[data-theme='dark']");
  const roh = (name: string, ab = 0): string => {
    const treffer = new RegExp(`(?<![\\w-])--color-${name}:\\s*([^;]+);`).exec(GLOBALS.slice(ab));
    if (ab < 0 || !treffer?.[1]) throw new Error(`--color-${name} fehlt in globals.css.`);
    return treffer[1].trim();
  };
  const hell = (name: string): string => aufloesen(roh(name));
  const dunkel = (name: string): string => aufloesen(roh(name, DUNKEL_AB));

  it.each(ROLLEN)('%s verweist in beiden Schemata auf den Token-Vertrag', (name) => {
    expect(roh(name)).toBe(`var(--los-${name})`);
    expect(roh(`${name}-soft`)).toBe(`var(--los-${name}-weich)`);
    expect(roh(name, DUNKEL_AB)).toBe(`var(--los-${name}-dunkel)`);
    expect(roh(`${name}-soft`, DUNKEL_AB)).toBe(`var(--los-${name}-dunkel-weich)`);
  });

  it('der Lichtkegel im Kopfbereich hat die volle helle Farbe aus dem Vertrag', () => {
    // module-theme.ts trägt feste Werte, weil der Kopfbereich in beiden
    // Schemata dunkel ist. Sie müssen trotzdem dieselben sein.
    MODULE_THEMES.forEach((theme, index) => {
      expect(theme.heroAccent, theme.label).toBe(aufloesen(`var(--los-modul-${index})`));
    });
    expect(PROJECT_THEME.heroAccent).toBe(aufloesen('var(--los-projekt)'));
    expect(REVIEW_THEME.heroAccent).toBe(aufloesen('var(--los-wiederholen)'));
  });

  const PAPIER = aufloesen('var(--los-ton-50)');
  const SENKE = aufloesen('var(--los-ton-100)');
  const KARTE = aufloesen('var(--los-surface)');
  const TINTE = aufloesen('var(--los-ton-950)');
  const KARTE_DUNKEL = aufloesen('var(--los-ton-900)');

  it.each(ROLLEN)('%s ist im hellen Schema lesbar', (name) => {
    const voll = hell(name);
    // Weiße Beschriftung auf der vollen Farbe, die Farbe als Schrift auf
    // Papier, Karte, vertiefter Fläche und der eigenen weichen Fläche.
    for (const grund of ['#ffffff', PAPIER, KARTE, SENKE, hell(`${name}-soft`)]) {
      expect(kontrastverhaeltnis(voll, grund)).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
    }
  });

  it.each(ROLLEN)('%s ist im dunklen Schema lesbar', (name) => {
    const voll = dunkel(name);
    // Die aufgehellte Farbe als Schrift auf Tinte, dunkler Karte und der
    // eigenen weichen Fläche.
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
