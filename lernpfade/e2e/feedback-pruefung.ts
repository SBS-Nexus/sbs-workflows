import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Prüfhilfen für den Statusvertrag (LP-03B) — gleich in PythonPfad, SQLPfad
 * und AIPfad. Gemessen wird am gerenderten Element: berechnete Farben (auch
 * Alpha und oklab werden über einen Canvas-Pixel nach sRGB umgerechnet),
 * Kontrast, Schrift, Live-Semantik und Überlauf.
 */

type Schema = 'light' | 'dark';

/** Erwartete Vertragsfarben (learning-feedback.css): Fläche · Rand · Text. */
export const VERTRAGSFARBEN: Record<Schema, Record<string, [string, string, string]>> = {
  light: {
    neutral: ['#f3f4f6', '#6b7280', '#374151'],
    info: ['#e8f1fb', '#2563a6', '#1c4f86'],
    success: ['#e7f5ec', '#1d7a46', '#155c35'],
    warning: ['#fdf4dd', '#a16207', '#734805'],
    danger: ['#fdeeed', '#c0281c', '#981c12'],
    due: ['#f2eefc', '#6d45c6', '#55349f'],
    'in-progress': ['#e5f4f8', '#0e7490', '#0b5c72'],
    locked: ['#f4f4f5', '#71717a', '#3f3f46'],
  },
  dark: {
    neutral: ['#1f2530', '#8b95a5', '#d4d9e1'],
    info: ['#11263d', '#6aaee8', '#b3d6f6'],
    success: ['#0f2b1c', '#4cc38a', '#9be3bd'],
    warning: ['#30240b', '#e2a83c', '#f5d38f'],
    danger: ['#371614', '#f2867c', '#f9b9b3'],
    due: ['#231a3c', '#a98ae8', '#d2c2f6'],
    'in-progress': ['#0c2a33', '#4fc1dd', '#a6dfee'],
    locked: ['#23252a', '#8d929b', '#c9cdd4'],
  },
};

export type Messung = {
  tone: string | null;
  surface: string;
  edge: string;
  text: string;
  body: string | null;
  contrastText: number;
  contrastBody: number | null;
  contrastEdge: number;
  font: string;
  role: string | null;
  live: string | null;
  overflow: boolean;
};

/** Farben und Kontraste eines Badges oder Callouts, wie sie gerendert werden. */
export async function messe(element: Locator): Promise<Messung> {
  return element.evaluate((node) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    type C = { r: number; g: number; b: number; a: number };
    const parse = (value: string): C => {
      if (!value || value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a: a / 255 };
    };
    const over = (t: C, u: C): C => ({
      r: t.r * t.a + u.r * (1 - t.a),
      g: t.g * t.a + u.g * (1 - t.a),
      b: t.b * t.a + u.b * (1 - t.a),
      a: 1,
    });
    const background = (element: Element): C => {
      const layers: C[] = [];
      for (let n: Element | null = element; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c.a > 0) {
          layers.push(c);
          if (c.a >= 1) break;
        }
      }
      let result: C = { r: 255, g: 255, b: 255, a: 1 };
      for (const layer of layers.reverse()) result = over(layer, result);
      return result;
    };
    const lum = ({ r, g, b }: C): number => {
      const f = (v: number): number => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: C, b: C): number => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
    };
    const hex = (c: C): string =>
      '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

    const isCallout = node.classList.contains('lp-feedback-callout');
    const title = isCallout ? (node.querySelector('.lp-feedback-title') ?? node) : node;
    const body = isCallout ? node.querySelector('.lp-feedback-body') : null;
    const surface = background(node);
    const style = getComputedStyle(node);
    const edge = over(parse(isCallout ? style.borderLeftColor : style.borderTopColor), surface);
    const text = over(parse(getComputedStyle(title).color), surface);
    const bodyColor = body ? over(parse(getComputedStyle(body).color), surface) : null;
    return {
      tone: node.getAttribute('data-lp-tone'),
      surface: hex(surface),
      edge: hex(edge),
      text: hex(text),
      body: bodyColor ? hex(bodyColor) : null,
      contrastText: ratio(text, surface),
      contrastBody: bodyColor ? ratio(bodyColor, surface) : null,
      contrastEdge: ratio(edge, surface),
      font: getComputedStyle(title).fontFamily,
      role: node.getAttribute('role'),
      live: node.getAttribute('aria-live'),
      overflow: node.scrollWidth > node.clientWidth + 1,
    };
  });
}

/** Gerenderte Farben entsprechen dem Vertrag; Kontraste reichen; Schrift ist Sans. */
export async function erwarteVertrag(
  element: Locator,
  schema: Schema,
  label: string,
): Promise<Messung> {
  const m = await messe(element);
  expect(m.tone, `${label}: data-lp-tone`).not.toBeNull();
  const [surface, edge, text] = VERTRAGSFARBEN[schema][m.tone!];
  expect(
    { surface: m.surface, edge: m.edge, text: m.text },
    `${label}: Vertragsfarben (${schema})`,
  ).toEqual({
    surface,
    edge,
    text,
  });
  expect(m.contrastText, `${label}: Textkontrast`).toBeGreaterThanOrEqual(4.5);
  if (m.contrastBody !== null)
    expect(m.contrastBody, `${label}: Fließtext`).toBeGreaterThanOrEqual(4.5);
  expect(m.contrastEdge, `${label}: Randsignal`).toBeGreaterThanOrEqual(3);
  expect(m.font, `${label}: Produktschrift statt Monospace`).not.toMatch(/mono/i);
  expect(m.overflow, `${label}: nichts abgeschnitten`).toBe(false);
  return m;
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/**
 * axe ohne serious/critical — ein DOM-Test, kein Screenreader-Test.
 * `nur` begrenzt die Prüfung auf einen Bereich; nur für Seiten mit
 * nachgewiesenem Bestandsbefund außerhalb der Statusanzeigen (siehe Aufrufer).
 */
export async function erwarteKeineSchwerenAxeBefunde(
  page: Page,
  label: string,
  nur?: string,
): Promise<void> {
  const builder = new AxeBuilder({ page });
  if (nur) builder.include(nur);
  const result = await builder.analyze();
  const schwer = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    schwer.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    `axe (${label})`,
  ).toEqual([]);
}

/** Keine Live-Region in einer Live-Region (doppelte Ansagen). */
export async function verschachtelteLiveRegionen(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')].filter(
        (node) => node.parentElement?.closest('[aria-live], [role="status"], [role="alert"]'),
      ).length,
  );
}
