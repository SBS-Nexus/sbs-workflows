import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUTTON_PRESSABLE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  BUTTON_VARIANT_ALIASES,
  CARD_EMPHASES,
  CARD_KINDS,
  COMPONENT_APPS,
  EMPTY_KINDS,
  EMPTY_SIZES,
  ERROR_DEFAULT_TITLES,
  ERROR_KINDS,
  PROGRESS_TONES,
  buttonAttributes,
  buttonVariant,
  cardAttributes,
  emptyAttributes,
  errorAttributes,
  errorReference,
  errorTitle,
  progressAttributes,
  progressFillWidth,
  progressTone,
  progressValue,
  progressValueText,
} from '@/lib/learning-components';

/*
 * LP-03C — gemeinsamer Komponentenvertrag. KANONISCH unter
 * `docs/learning-components/learning-components.test.ts`; PythonPfad, SQLPfad
 * und AIPfad führen eine bytegleiche Kopie (Drift-Check). Der zweite Teil
 * liest die bytegleiche CSS-Kopie der App und rechnet die Kontraste aus den
 * dort stehenden Werten nach, statt sie zu behaupten.
 */

describe('Komponentenvertrag (LP-03C) — Button', () => {
  it('kennt die Absichten aus LEARNING-DESIGN-SYSTEM §4 und die zwei Kontextfälle', () => {
    expect([...BUTTON_VARIANTS]).toEqual([
      'primary',
      'secondary',
      'ghost',
      'danger',
      'danger-secondary',
      'on-dark',
      'on-dark-secondary',
    ]);
    expect([...BUTTON_SIZES]).toEqual(['sm', 'md', 'lg']);
  });

  it('löst ältere Variantennamen an der Adaptergrenze auf und weist Unbekanntes ab', () => {
    expect(BUTTON_VARIANT_ALIASES).toEqual({
      onDark: 'on-dark',
      onDarkGhost: 'on-dark-secondary',
      'ghost-danger': 'danger-secondary',
    });
    for (const variant of BUTTON_VARIANTS) expect(buttonVariant(variant)).toBe(variant);
    expect(buttonVariant('onDark')).toBe('on-dark');
    expect(() => buttonVariant('link' as never)).toThrow();
    expect(() => buttonAttributes('primary', 'xl' as never)).toThrow();
  });

  it('liefert Klassen und Zustandsattribute; Vorgabe ist primary in md', () => {
    expect(buttonAttributes()).toEqual({
      className: 'lp-ui lp-ui-button',
      'data-lp-variant': 'primary',
      'data-lp-size': 'md',
    });
    expect(buttonAttributes('onDarkGhost', 'lg')).toEqual({
      className: 'lp-ui lp-ui-button',
      'data-lp-variant': 'on-dark-secondary',
      'data-lp-size': 'lg',
    });
  });

  it('nur tragende Varianten haben eine Unterkante — zurückhaltende nicht', () => {
    expect(BUTTON_PRESSABLE.has('primary')).toBe(true);
    expect(BUTTON_PRESSABLE.has('danger')).toBe(true);
    expect(BUTTON_PRESSABLE.has('ghost')).toBe(false);
    expect(BUTTON_PRESSABLE.has('on-dark-secondary')).toBe(false);
  });
});

describe('Komponentenvertrag (LP-03C) — Card', () => {
  it('Information oder Ziel, nie beides; Betonung nur als Zusatz', () => {
    expect([...CARD_KINDS]).toEqual(['static', 'interactive']);
    expect([...CARD_EMPHASES]).toEqual(['none', 'accent', 'danger']);
    expect(cardAttributes()).toEqual({ className: 'lp-ui lp-ui-card', 'data-lp-card': 'static' });
    expect(cardAttributes('interactive', 'accent')).toEqual({
      className: 'lp-ui lp-ui-card',
      'data-lp-card': 'interactive',
      'data-lp-emphasis': 'accent',
    });
    expect(() => cardAttributes('clickable' as never)).toThrow();
    expect(() => cardAttributes('static', 'loud' as never)).toThrow();
  });
});

describe('Komponentenvertrag (LP-03C) — ProgressBar', () => {
  it('begrenzt den Wert und rundet ab: 99,6 % ist nicht fertig', () => {
    expect(progressValue(3, 10)).toEqual({ value: 3, max: 10, percent: 30, complete: false });
    expect(progressValue(12, 10)).toEqual({ value: 10, max: 10, percent: 100, complete: true });
    expect(progressValue(-4, 10)).toEqual({ value: 0, max: 10, percent: 0, complete: false });
    expect(progressValue(996, 1000).percent).toBe(99);
    expect(progressValue(996, 1000).complete).toBe(false);
  });

  it('ungültige Daten ergeben einen leeren Balken, nie einen vollen', () => {
    const faelle: Array<[number, number]> = [
      [Number.NaN, 10],
      [5, 0],
      [5, -1],
      [5, Number.NaN],
      [Number.POSITIVE_INFINITY, 10],
      [5, Number.POSITIVE_INFINITY],
    ];
    for (const [value, max] of faelle) {
      const progress = progressValue(value, max);
      expect(progress.complete, `${value}/${max}`).toBe(false);
      expect(progress.percent, `${value}/${max}`).toBe(0);
    }
    expect(progressFillWidth(progressValue(5, 0))).toBe('0%');
  });

  it('spricht „x von y" bzw. „n %" und formatiert deutsch', () => {
    expect(progressValueText(progressValue(3, 10))).toBe('3 von 10');
    expect(progressValueText(progressValue(62, 100))).toBe('62 %');
    expect(progressValueText(progressValue(1234, 5000))).toBe('1.234 von 5.000');
  });

  it('setzt Rolle, Grenzen, sprechbaren Wert und Abschlusszustand', () => {
    expect(progressAttributes(progressValue(3, 10), 'module')).toEqual({
      className: 'lp-ui lp-ui-progress',
      role: 'progressbar',
      'aria-valuemin': 0,
      'aria-valuemax': 10,
      'aria-valuenow': 3,
      'aria-valuetext': '3 von 10',
      'data-lp-tone': 'accent',
    });
    const done = progressAttributes(progressValue(4, 4), 'success', 'Alle vier Meilensteine');
    expect(done['data-lp-complete']).toBe('true');
    expect(done['aria-valuetext']).toBe('Alle vier Meilensteine');
  });

  it('kennt vier Füllungen; ältere Tonnamen bleiben gültig', () => {
    expect([...PROGRESS_TONES]).toEqual(['accent', 'success', 'warning', 'neutral']);
    expect(progressTone('caution')).toBe('warning');
    expect(progressTone('signal')).toBe('accent');
    expect(progressTone('module')).toBe('accent');
    expect(() => progressTone('rainbow' as never)).toThrow();
  });

  it('die Füllbreite bleibt zwischen 0 und 100 %', () => {
    expect(progressFillWidth(progressValue(1, 3))).toBe('33.3%');
    expect(progressFillWidth(progressValue(20, 10))).toBe('100%');
    expect(progressFillWidth(progressValue(0, 10))).toBe('0%');
  });
});

describe('Komponentenvertrag (LP-03C) — EmptyState und ErrorState', () => {
  it('ein leerer Bereich sagt eines von drei Dingen', () => {
    expect([...EMPTY_KINDS]).toEqual(['start', 'done', 'filtered']);
    expect(emptyAttributes()).toEqual({
      className: 'lp-ui lp-ui-empty',
      'data-lp-empty': 'start',
      'data-lp-size': 'regular',
    });
    expect(emptyAttributes('done', 'compact')).toEqual({
      className: 'lp-ui lp-ui-empty',
      'data-lp-empty': 'done',
      'data-lp-size': 'compact',
    });
    expect([...EMPTY_SIZES]).toEqual(['regular', 'compact']);
    expect(() => emptyAttributes('nothing' as never)).toThrow();
    expect(() => emptyAttributes('start', 'tiny' as never)).toThrow();
  });

  it('seitenweite Fehler mit allgemeinem Titel; ein fachlicher hat Vorrang', () => {
    expect([...ERROR_KINDS]).toEqual(['unexpected', 'not-found', 'unavailable']);
    expect(ERROR_DEFAULT_TITLES).toEqual({
      unexpected: 'Da ist etwas schiefgegangen',
      'not-found': 'Diese Seite gibt es nicht',
      unavailable: 'Gerade nicht erreichbar',
    });
    expect(errorTitle('not-found')).toBe('Diese Seite gibt es nicht');
    expect(errorTitle('unexpected', 'Lektion nicht geladen')).toBe('Lektion nicht geladen');
    expect(errorAttributes('unavailable')).toEqual({
      className: 'lp-ui lp-ui-error',
      'data-lp-error': 'unavailable',
    });
    expect(() => errorAttributes('teapot' as never)).toThrow();
  });

  it('zeigt nur Kennungen — nie eine Fehlermeldung, die im Digest landet', () => {
    expect(errorReference('3051718722')).toBe('3051718722');
    expect(errorReference('a1_B2-c3')).toBe('a1_B2-c3');
    expect(errorReference('TypeError: x is undefined')).toBeNull();
    expect(errorReference('<script>')).toBeNull();
    expect(errorReference('x'.repeat(65))).toBeNull();
    expect(errorReference('')).toBeNull();
    expect(errorReference(undefined)).toBeNull();
    expect(errorReference(42)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Darstellung: aus der CSS-Kopie dieser App gelesen und nachgerechnet.
// ---------------------------------------------------------------------------

const css = readFileSync(
  path.join(import.meta.dirname, '../../src/styles/learning-components.css'),
  'utf8',
);

/** Alle Blöcke `Selektor { Deklarationen }`, auch innerhalb von `@media`. */
function blocks(): Array<{ selector: string; body: Record<string, string> }> {
  const result: Array<{ selector: string; body: Record<string, string> }> = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const [, selector = '', declarations = ''] of css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(pattern)) {
    const body: Record<string, string> = {};
    for (const line of declarations.split(';')) {
      const index = line.indexOf(':');
      if (index > 0) body[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
    result.push({ selector: selector.replace(/\s+/g, ' ').trim(), body });
  }
  return result;
}

function tokens(selector: string): Record<string, string> {
  const found = blocks().find((block) => block.selector === selector);
  if (!found) throw new Error(`Block fehlt: ${selector}`);
  return found.body;
}

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

function contrast(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT = '.lp-ui';
const DARK = ":root[data-theme='dark'] .lp-ui, :root.dark .lp-ui";
const SYSTEM_DARK = ":root:not([data-theme='light']) .lp-ui";
const appLight = (app: string) => `:root[data-lp-app='${app}'] .lp-ui`;
const appDark = (app: string) =>
  `:root[data-theme='dark'][data-lp-app='${app}'] .lp-ui, :root.dark[data-lp-app='${app}'] .lp-ui`;
const appSystemDark = (app: string) =>
  `:root:not([data-theme='light'])[data-lp-app='${app}'] .lp-ui`;

/**
 * Wirksame Tokens: Grundwerte, darüber Dunkel, darüber der Pfad-Akzent.
 * Ein fehlendes Token lässt die Prüfung scheitern, statt still „undefined"
 * zu vergleichen.
 */
function scheme(app: string, dark: boolean): (name: string) => string {
  const base = { ...tokens(LIGHT), ...(dark ? tokens(DARK) : {}) };
  const merged = app === 'hub' ? base : { ...base, ...tokens(dark ? appDark(app) : appLight(app)) };
  return (name) => {
    const value = merged[name];
    if (!value) throw new Error(`Token fehlt: ${name} (${app}, ${dark ? 'dunkel' : 'hell'})`);
    return value;
  };
}

describe('Komponentenvertrag (LP-03C) — Darstellung', () => {
  it('ausdrückliches und System-Dunkel tragen dieselben Werte', () => {
    expect(tokens(SYSTEM_DARK)).toEqual(tokens(DARK));
    for (const app of COMPONENT_APPS.filter((a) => a !== 'hub')) {
      expect(tokens(appSystemDark(app)), app).toEqual(tokens(appDark(app)));
    }
  });

  it('jede Variante, Füllung, Leer- und Fehlerart hat ihre Regel', () => {
    const selectors = blocks().map((block) => block.selector);
    for (const variant of BUTTON_VARIANTS.filter((v) => v !== 'primary')) {
      expect(selectors, variant).toContain(`.lp-ui-button[data-lp-variant='${variant}']`);
    }
    for (const tone of PROGRESS_TONES.filter((t) => t !== 'accent')) {
      expect(selectors, tone).toContain(`.lp-ui-progress[data-lp-tone='${tone}']`);
    }
    for (const kind of EMPTY_KINDS.filter((k) => k !== 'start')) {
      expect(selectors, kind).toContain(`.lp-ui-empty[data-lp-empty='${kind}']`);
    }
    for (const kind of ERROR_KINDS.filter((k) => k !== 'unexpected')) {
      expect(selectors, kind).toContain(`.lp-ui-error[data-lp-error='${kind}']`);
    }
  });

  it.each(COMPONENT_APPS.flatMap((app) => [[app, false] as const, [app, true] as const]))(
    'Kontraste %s (dunkel: %s): Text ≥ 4,5 : 1, Füllung gegen Spur ≥ 3 : 1',
    (app, dark) => {
      if (app === 'hub' && dark) return; // Der Hub ist ausschließlich hell.
      const t = scheme(app, dark);
      const text = [
        ['on-accent / accent', t('--lp-ui-on-accent'), t('--lp-ui-accent')],
        ['on-accent / accent-hover', t('--lp-ui-on-accent'), t('--lp-ui-accent-hover')],
        ['accent-text / surface', t('--lp-ui-accent-text'), t('--lp-ui-surface')],
        ['accent-text / accent-soft', t('--lp-ui-accent-text'), t('--lp-ui-accent-soft')],
        ['text / secondary-bg', t('--lp-ui-text'), t('--lp-ui-secondary-bg')],
        ['text / secondary-hover', t('--lp-ui-text'), t('--lp-ui-secondary-hover')],
        ['text-muted / surface', t('--lp-ui-text-muted'), t('--lp-ui-surface')],
        ['on-danger / danger', t('--lp-ui-on-danger'), t('--lp-ui-danger')],
        ['on-danger / danger-hover', t('--lp-ui-on-danger'), t('--lp-ui-danger-hover')],
        ['danger-text / danger-soft', t('--lp-ui-danger-text'), t('--lp-ui-danger-soft')],
        ['success-text / success-soft', t('--lp-ui-success-text'), t('--lp-ui-success-soft')],
        ['warning-text / warning-soft', t('--lp-ui-warning-text'), t('--lp-ui-warning-soft')],
        ['info-text / info-soft', t('--lp-ui-info-text'), t('--lp-ui-info-soft')],
      ] as const;
      for (const [name, fg, bg] of text) {
        expect(contrast(fg, bg), `${app} ${dark ? 'dunkel' : 'hell'}: ${name}`).toBeGreaterThan(
          4.5,
        );
      }
      for (const fill of ['--lp-ui-accent', '--lp-ui-success', '--lp-ui-warning']) {
        expect(contrast(t(fill), t('--lp-ui-track')), `${app}: ${fill} / track`).toBeGreaterThan(3);
      }
      expect(contrast(t('--lp-ui-focus'), t('--lp-ui-surface')), 'Fokus').toBeGreaterThan(3);
    },
  );

  it('die Unterkante ist dunkler als die Fläche, hell wie dunkel', () => {
    for (const app of COMPONENT_APPS) {
      for (const dark of [false, true]) {
        if (app === 'hub' && dark) continue;
        const t = scheme(app, dark);
        expect(
          luminance(t('--lp-ui-accent-edge')),
          `${app} ${dark ? 'dunkel' : 'hell'}`,
        ).toBeLessThan(luminance(t('--lp-ui-accent')));
        expect(luminance(t('--lp-ui-danger-edge'))).toBeLessThan(luminance(t('--lp-ui-danger')));
      }
    }
  });
});
