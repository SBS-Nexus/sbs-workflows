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

describe('Weiche Akzentfläche im dunklen Schema', () => {
  /*
   * Diese Paarung ist beim Sichttest fast durchgerutscht.
   *
   * Im dunklen Schema ist `--accent` ein helles Petrol. Weiße Schrift darauf
   * ergibt 1,78:1 - auf dem Bildschirm sah das nur „etwas blass" aus, und
   * genau deshalb steht die Rechnung jetzt hier.
   */
  it('trägt die Leitfarbe als Text', () => {
    /*
     * Im hellen Schema verweist `--accent-soft` auf accent-50, im dunklen
     * steht dort ein fester Wert. Genau der wird hier gesucht - deshalb die
     * Suche nach einem Hexwert und nicht nach der Stelle im Text: Ein Test,
     * der von der Reihenfolge der Blöcke in der Datei abhängt, geht beim
     * nächsten Umsortieren still kaputt.
     */
    const weicheFlaeche = /--accent-soft:\s*(#[0-9a-fA-F]{6})/.exec(GLOBALS)?.[1];
    expect(weicheFlaeche).toBeDefined();
    expect(
      kontrastverhaeltnis(farbe('accent-300'), weicheFlaeche as string),
    ).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
  });

  it('trägt keine weiße Schrift auf der vollen Leitfarbe', () => {
    // Der Fehler, der hier gemacht wurde: Weiß auf accent-300.
    expect(kontrastverhaeltnis('#ffffff', farbe('accent-300'))).toBeLessThan(AA_FLIESSTEXT);
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

/**
 * Die Farbmarken eines Blocks aus globals.css, ohne Kommentare.
 *
 * Das dunkle Schema steht zweimal in der Datei: einmal für die ausdrückliche
 * Wahl (`data-theme='dark'`) und einmal für die Systemeinstellung. CSS kann
 * die beiden nicht teilen, ohne dass eine der Wege die andere überstimmt.
 */
function farbmarken(beginn: string): Map<string, string> {
  const start = GLOBALS.indexOf(beginn);
  if (start < 0) throw new Error(`${beginn} steht nicht mehr in globals.css.`);
  let tiefe = 0;
  let ende = start;
  for (let stelle = GLOBALS.indexOf('{', start); stelle < GLOBALS.length; stelle += 1) {
    if (GLOBALS[stelle] === '{') tiefe += 1;
    if (GLOBALS[stelle] === '}' && --tiefe === 0) {
      ende = stelle;
      break;
    }
  }
  const block = GLOBALS.slice(start, ende).replace(/\/\*[\s\S]*?\*\//g, '');
  return new Map(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, n = '', w = '']) => [n, w.trim()]),
  );
}

describe('Dunkles Schema: ausdrücklich gewählt und vom System gleich', () => {
  it('setzt in beiden Wegen dieselben Farbmarken', () => {
    /*
     * Gefunden beim Nachmessen des Editors: Die ausdrückliche Wahl trug als
     * weiche Akzentfläche noch ein Navy aus der blauen Familie, das System-
     * schema schon das Petrol. Wer „Dunkel" anklickte, sah andere Flächen als
     * jemand, dessen Rechner dunkel eingestellt ist.
     */
    const ausdruecklich = farbmarken(":root[data-theme='dark']");
    const system = farbmarken('@media (prefers-color-scheme: dark)');
    expect(ausdruecklich.size).toBeGreaterThan(20);
    expect(Object.fromEntries(ausdruecklich)).toEqual(Object.fromEntries(system));
  });
});

describe('Syntaxfarben im Editor', () => {
  /*
   * Die Hervorhebung im SQL-Editor bekommt ihre Farben aus diesen Marken
   * (`.tok-*` in globals.css). Vorher kamen sie aus CodeMirrors Vorgabe, die
   * nur für helle Flächen gedacht ist: `SELECT` stand im dunklen Schema mit
   * 1,6:1 auf der Editorfläche.
   */
  const dunkel = farbmarken(":root[data-theme='dark']");
  const dunkleMarke = (name: string): string => {
    const wert = dunkel.get(name) ?? '';
    const verweis = /^var\(--color-([\w-]+)\)$/.exec(wert)?.[1];
    return verweis ? farbe(verweis) : wert;
  };

  it.each([
    ['Schlüsselwort und Datentyp', 'accent-700'],
    ['Zeichenkette', 'success-700'],
    ['Zahl, NULL', 'caution-700'],
    ['Kommentar', 'ink-500'],
  ])('%s ist im hellen Schema lesbar', (_rolle, marke) => {
    expect(kontrastverhaeltnis(farbe(marke), KARTE_HELL)).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
  });

  it.each([
    ['Schlüsselwort und Datentyp', '--accent'],
    ['Zeichenkette', '--success'],
    ['Zahl, NULL', '--caution'],
    ['Kommentar', '--text-muted'],
  ])('%s ist im dunklen Schema lesbar', (_rolle, marke) => {
    expect(
      kontrastverhaeltnis(dunkleMarke(marke), dunkleMarke('--surface-raised')),
    ).toBeGreaterThanOrEqual(AA_FLIESSTEXT);
  });

  it('die frühere Vorgabe wäre im dunklen Schema durchgefallen', () => {
    // Gegenprobe: CodeMirrors Schlüsselwortfarbe auf derselben Fläche.
    expect(kontrastverhaeltnis('#770088', dunkleMarke('--surface-raised'))).toBeLessThan(2);
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
