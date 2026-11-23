import assert from 'node:assert/strict';
import test from 'node:test';
import {
  containRect,
  inverseBackgroundMatrix,
  isCrossOrigin,
  isDarkColor,
  parseColorLiteral,
  resolveSources,
  selectSculptureSource,
  type Rgb,
  type SculptureSources,
} from './liquid-sculpture-model.ts';

const DEMO = {
  src: 'https://demo.example/light.webp',
  darkSrc: 'https://demo.example/dark.webp',
  mobileSrc: 'https://demo.example/mobile.webp',
  mobileDarkSrc: 'https://demo.example/mobile-dark.webp',
} as const;

const VIEWS = [
  { mobile: false, dark: false },
  { mobile: true, dark: false },
  { mobile: false, dark: true },
  { mobile: true, dark: true },
] as const;

function near(actual: Rgb | null, expected: Rgb): void {
  assert.ok(actual, 'Farbe erkannt');
  for (let i = 0; i < 3; i += 1) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-9, `Kanal ${i}: ${actual[i]} ≠ ${expected[i]}`);
}

test('Farbliterale: Hex in allen Längen, rgb() mit Komma, Leerzeichen und Prozent', () => {
  near(parseColorLiteral('#f6f7fb'), [246 / 255, 247 / 255, 251 / 255]);
  near(parseColorLiteral('  #F6F7FB  '), [246 / 255, 247 / 255, 251 / 255]);
  near(parseColorLiteral('#f6f7fb80'), [246 / 255, 247 / 255, 251 / 255]);
  near(parseColorLiteral('#abc'), [0xaa / 255, 0xbb / 255, 0xcc / 255]);
  near(parseColorLiteral('#abcd'), [0xaa / 255, 0xbb / 255, 0xcc / 255]);
  near(parseColorLiteral('rgb(233, 234, 229)'), [233 / 255, 234 / 255, 229 / 255]);
  near(parseColorLiteral('rgba(233,234,229,0.5)'), [233 / 255, 234 / 255, 229 / 255]);
  near(parseColorLiteral('rgb(233 234 229 / 40%)'), [233 / 255, 234 / 255, 229 / 255]);
  near(parseColorLiteral('rgb(100% 50% 0%)'), [1, 0.5, 0]);
  near(parseColorLiteral('rgb(300, -4, 12.5)'), [1, 0, 12.5 / 255]);
});

test('CSS-Ausdrücke und unbekannte Formate werden nicht als Hex missverstanden', () => {
  for (const value of [
    'var(--bg)',
    'oklch(0.97 0.01 270)',
    'color-mix(in srgb, #fff 50%, #000)',
    'white',
    'rgb(var(--r) 0 0)',
    'rgb(1, 2)',
    'rgb(1 2 3 4 5)',
    'rgb(1 2 3 / 50% / 2)',
    'rgb(a b c)',
    '#12',
    '#12345',
    '',
    undefined,
    null,
  ]) {
    assert.equal(parseColorLiteral(value), null, String(value));
  }
});

test('dunkler Grund nach derselben Schwelle wie im Original', () => {
  assert.equal(isDarkColor(parseColorLiteral('#111110')!), true);
  assert.equal(isDarkColor(parseColorLiteral('#f6f7fb')!), false);
  assert.equal(isDarkColor(parseColorLiteral('#ebe9e5')!), false);
});

test('eigene Basisquelle ohne Varianten: auf allen Ansichten nur das eigene Bild, nie die Demo', () => {
  const sources = resolveSources({ src: '/eigen.webp' }, DEMO);
  for (const view of VIEWS) {
    assert.equal(selectSculptureSource(sources, view), '/eigen.webp', JSON.stringify(view));
  }
  assert.deepEqual(Object.values(sources).filter(Boolean), ['/eigen.webp']);
});

test('eigene Basisquelle mit Mobilvariante: Mobil nimmt sie, Dunkel ohne Dunkelvariante bleibt eigen', () => {
  const sources = resolveSources({ src: '/eigen.webp', mobileSrc: '/eigen-mobil.webp' }, DEMO);
  assert.equal(selectSculptureSource(sources, { mobile: false, dark: false }), '/eigen.webp');
  assert.equal(selectSculptureSource(sources, { mobile: true, dark: false }), '/eigen-mobil.webp');
  assert.equal(selectSculptureSource(sources, { mobile: false, dark: true }), '/eigen.webp');
  assert.equal(selectSculptureSource(sources, { mobile: true, dark: true }), '/eigen-mobil.webp');
});

test('eigene Basisquelle mit Dunkelvarianten: ausdrückliche Variante vor Design- vor Layoutvariante', () => {
  const all: SculptureSources = {
    src: '/hell.webp',
    darkSrc: '/dunkel.webp',
    mobileSrc: '/hell-mobil.webp',
    mobileDarkSrc: '/dunkel-mobil.webp',
  };
  const sources = resolveSources(all, DEMO);
  assert.equal(selectSculptureSource(sources, { mobile: false, dark: false }), '/hell.webp');
  assert.equal(selectSculptureSource(sources, { mobile: true, dark: false }), '/hell-mobil.webp');
  assert.equal(selectSculptureSource(sources, { mobile: false, dark: true }), '/dunkel.webp');
  assert.equal(selectSculptureSource(sources, { mobile: true, dark: true }), '/dunkel-mobil.webp');

  // Ohne mobile Dunkelvariante zählt das Design vor dem Layout.
  const withoutMobileDark = resolveSources({ ...all, mobileDarkSrc: undefined }, DEMO);
  assert.equal(selectSculptureSource(withoutMobileDark, { mobile: true, dark: true }), '/dunkel.webp');
  // Ohne jede Dunkelvariante: wenigstens das passende Layout.
  const lightOnly = resolveSources({ src: '/hell.webp', mobileSrc: '/hell-mobil.webp' }, DEMO);
  assert.equal(selectSculptureSource(lightOnly, { mobile: true, dark: true }), '/hell-mobil.webp');
});

test('leere Zeichenketten zählen als nicht gesetzt', () => {
  const sources = resolveSources({ src: '/eigen.webp', mobileSrc: '', darkSrc: '' }, DEMO);
  assert.equal(selectSculptureSource(sources, { mobile: true, dark: true }), '/eigen.webp');
});

test('unveränderte Demo: alle vier Demo-Varianten; einzelne eigene Varianten ersetzen nur sich selbst', () => {
  const demo = resolveSources({}, DEMO);
  assert.equal(selectSculptureSource(demo, { mobile: false, dark: false }), DEMO.src);
  assert.equal(selectSculptureSource(demo, { mobile: true, dark: false }), DEMO.mobileSrc);
  assert.equal(selectSculptureSource(demo, { mobile: false, dark: true }), DEMO.darkSrc);
  assert.equal(selectSculptureSource(demo, { mobile: true, dark: true }), DEMO.mobileDarkSrc);

  const partly = resolveSources({ darkSrc: '/eigen-dunkel.webp' }, DEMO);
  assert.equal(selectSculptureSource(partly, { mobile: false, dark: true }), '/eigen-dunkel.webp');
  assert.equal(selectSculptureSource(partly, { mobile: true, dark: false }), DEMO.mobileSrc);
});

test('containRect entspricht object-fit: contain, mittig', () => {
  assert.deepEqual(containRect({ x: 10, y: 20, w: 500, h: 100 }, 2.5), { x: 135, y: 20, w: 250, h: 100 });
  assert.deepEqual(containRect({ x: 0, y: 0, w: 250, h: 400 }, 2.5), { x: 0, y: 150, w: 250, h: 100 });
  assert.deepEqual(containRect({ x: 4, y: 8, w: 300, h: 120 }, 2.5), { x: 4, y: 8, w: 300, h: 120 });
  // Unbekanntes Seitenverhältnis oder leere Fläche: unverändert statt NaN.
  assert.deepEqual(containRect({ x: 1, y: 2, w: 3, h: 4 }, 0), { x: 1, y: 2, w: 3, h: 4 });
  assert.deepEqual(containRect({ x: 1, y: 2, w: 0, h: 4 }, 2), { x: 1, y: 2, w: 0, h: 4 });
});

test('Farbmatrix teilt durch den Bildhintergrund: Hintergrund × Hero ÷ Hintergrund = Hero', () => {
  const imageBackground = parseColorLiteral('#e9eae5')!;
  const matrix = inverseBackgroundMatrix(imageBackground).split(' ').map(Number);
  assert.equal(matrix.length, 20);
  const hero = parseColorLiteral('#f6f7fb')!;
  for (const [index, channelIndex] of [[0, 0], [6, 1], [12, 2]] as const) {
    const result = imageBackground[channelIndex] * hero[channelIndex] * matrix[index];
    assert.ok(Math.abs(result - hero[channelIndex]) < 0.001, `Kanal ${channelIndex}`);
  }
  assert.equal(matrix[18], 1, 'Alpha bleibt');
});

test('Herkunft: nur fremde Ursprünge brauchen CORS', () => {
  const page = 'https://lernpfade.example/';
  assert.equal(isCrossOrigin('/images/hero/skulptur.webp', page), false);
  assert.equal(isCrossOrigin('https://lernpfade.example/a.webp', page), false);
  assert.equal(isCrossOrigin('https://cdn.example/a.webp', page), true);
  assert.equal(isCrossOrigin('data:image/png;base64,AAAA', page), false);
  assert.equal(isCrossOrigin('blob:https://lernpfade.example/1234', page), false);
});
