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

function farbe(name: string): string {
  const treffer = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(GLOBALS);
  if (!treffer?.[1]) {
    throw new Error(
      `--color-${name} steht nicht mehr in globals.css. ` +
        'Wurde die Skala umbenannt? Dann gehört dieser Test mit angepasst.',
    );
  }
  return treffer[1];
}

const tonwert = (stufe: number): string => farbe(`ink-${stufe}`);

const KARTE_HELL = '#ffffff';

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

describe('Leitfarbe Petrol', () => {
  /*
   * Die Skala ist für SQLPfad neu. Die Arbeitsteilung steht als Kommentar in
   * globals.css - hier wird sie nachgerechnet, damit sie beim nächsten
   * Nachjustieren nicht stillschweigend verlorengeht.
   */
  it('trägt Text auf hellem Grund ab Stufe 600', () => {
    expect(kontrastverhaeltnis(farbe('accent-600'), '#ffffff')).toBeGreaterThanOrEqual(
      AA_FLIESSTEXT,
    );
    expect(kontrastverhaeltnis(farbe('accent-600'), tonwert(50))).toBeGreaterThanOrEqual(
      AA_FLIESSTEXT,
    );
  });

  it('trägt Text auf dunklem Grund ab Stufe 300', () => {
    expect(kontrastverhaeltnis(farbe('accent-300'), tonwert(950))).toBeGreaterThanOrEqual(
      AA_FLIESSTEXT,
    );
    expect(kontrastverhaeltnis(farbe('accent-300'), tonwert(900))).toBeGreaterThanOrEqual(
      AA_FLIESSTEXT,
    );
  });

  it('setzt sich als Fläche sichtbar von der Leinwand ab', () => {
    // Eine Schaltfläche muss nicht lesbar sein, aber erkennbar. 3:1 ist die
    // Schwelle, ab der eine Fläche als eigenes Element wahrgenommen wird
    // (WCAG 1.4.11).
    expect(kontrastverhaeltnis(farbe('accent-500'), tonwert(50))).toBeGreaterThanOrEqual(3);
  });

  it('trägt weißen Text auf der vollen Leitfarbe', () => {
    // Der häufigste Fall überhaupt: die Hauptschaltfläche.
    expect(kontrastverhaeltnis('#ffffff', farbe('accent-600'))).toBeGreaterThanOrEqual(
      AA_FLIESSTEXT,
    );
  });
});

describe('Modulfarben', () => {
  it.each(['modul-0', 'modul-1', 'modul-2', 'modul-3', 'projekt', 'wiederholen'])(
    '%s trägt weißen Text',
    (name) => {
      // Modulfarben liegen als Fläche unter Beschriftungen. Wer eine neue
      // hinzufügt, soll hier merken, wenn sie zu hell dafür ist.
      expect(kontrastverhaeltnis('#ffffff', farbe(name))).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
    },
  );

  it.each([
    ['modul-0', 'modul-0-soft'],
    ['modul-1', 'modul-1-soft'],
    ['modul-2', 'modul-2-soft'],
    ['modul-3', 'modul-3-soft'],
    ['projekt', 'projekt-soft'],
    ['wiederholen', 'wiederholen-soft'],
  ])('%s ist auf der eigenen weichen Fläche lesbar', (voll, weich) => {
    expect(kontrastverhaeltnis(farbe(voll), farbe(weich))).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
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
