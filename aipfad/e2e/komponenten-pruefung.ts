import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Prüfhilfen für den Komponentenvertrag (LP-03C) — gleich in PythonPfad,
 * SQLPfad, AIPfad und im Hub. Gemessen wird am gerenderten Element:
 * berechnete Farben (über einen Canvas-Pixel nach sRGB, auch bei Alpha und
 * oklab), Kontraste, Geometrie der Unterkante, Fokusring, Bewegung.
 */

export type Schema = 'light' | 'dark';
export type App = 'python' | 'sql' | 'ai' | 'hub';

/** Pfad-Akzent aus `learning-components.css`: Fläche · Unterkante. */
export const AKZENT: Record<App, Partial<Record<Schema, [string, string]>>> = {
  python: { light: ['#1d3fc4', '#1d337d'], dark: ['#93b4fd', '#5a7fe6'] },
  sql: { light: ['#095d56', '#062f2c'], dark: ['#6ed3c7', '#2f9c8f'] },
  ai: { light: ['#b45309', '#6b3105'], dark: ['#efb26a', '#b97b34'] },
  hub: { light: ['#3155d5', '#1f3690'] },
};

export const GEFAHR: Record<Schema, [string, string]> = {
  light: ['#c0281c', '#7f1a12'],
  dark: ['#f2867c', '#b8524a'],
};

export type Knopf = {
  variant: string | null;
  size: string | null;
  background: string;
  edge: string;
  text: string;
  contrast: number;
  edgeWidth: number;
  topWidth: number;
  height: number;
  font: string;
  transform: string;
  textTransform: string;
  durations: number[];
};

/** Farben, Kontrast und Geometrie eines Knopfes oder einer Karte. */
export async function messe(element: Locator): Promise<Knopf> {
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

    const style = getComputedStyle(node);
    const surface = background(node);
    const text = over(parse(style.color), surface);
    const edge = over(parse(style.borderBottomColor), surface);
    return {
      variant: node.getAttribute('data-lp-variant'),
      size: node.getAttribute('data-lp-size'),
      background: hex(surface),
      edge: hex(edge),
      text: hex(text),
      contrast: ratio(text, surface),
      edgeWidth: Number.parseFloat(style.borderBottomWidth),
      topWidth: Number.parseFloat(style.borderTopWidth),
      height: node.getBoundingClientRect().height,
      font: style.fontFamily,
      transform: style.transform,
      textTransform: style.textTransform,
      durations: style.transitionDuration
        .split(',')
        .map((d) => Number.parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000)),
    };
  });
}

/** Mindesthöhe je Größe (px) und Unterkante je Größe (px). */
const HOEHE = { sm: 36, md: 44, lg: 52 } as const;
const KANTE = { sm: 3, md: 4, lg: 4 } as const;

/**
 * Ein tragender Knopf: Vertragsfarben des Pfades, lesbare Beschriftung,
 * taktile Unterkante, Zielgröße, Produktschrift, keine Großbuchstaben.
 */
export async function erwarteTragenderKnopf(
  element: Locator,
  farben: [string, string],
  label: string,
): Promise<Knopf> {
  const m = await messe(element);
  const size = (m.size ?? 'md') as keyof typeof HOEHE;
  expect({ background: m.background, edge: m.edge }, `${label}: Vertragsfarben`).toEqual({
    background: farben[0],
    edge: farben[1],
  });
  expect(m.contrast, `${label}: Beschriftung lesbar`).toBeGreaterThanOrEqual(4.5);
  expect(m.edgeWidth, `${label}: Unterkante`).toBe(KANTE[size]);
  expect(m.topWidth, `${label}: oben nur Rand`).toBe(1);
  expect(m.height, `${label}: Zielgröße`).toBeGreaterThanOrEqual(HOEHE[size] - 0.5);
  expect(m.font, `${label}: Produktschrift statt Monospace`).not.toMatch(/mono/i);
  expect(m.textTransform, `${label}: keine Großbuchstaben`).toBe('none');
  return m;
}

/**
 * Element mittig ins Bild holen — sonst trifft der Mausdruck bei 375 px die
 * fixierte untere Navigation oder liegt außerhalb des Sichtfensters.
 */
async function mitte(element: Locator, label: string) {
  // `instant`: Der Hub scrollt sonst weich, und die Position wäre veraltet.
  await element.evaluate((node) =>
    node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
  );
  const box = await element.boundingBox();
  if (!box) throw new Error(`${label}: nicht sichtbar`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Gedrückt ist an der Geometrie erkennbar: Der Knopf sinkt um 2 px ein, die
 * Unterkante wird um 2 px schmaler — auch unter „Bewegung reduzieren".
 */
export async function erwarteEinsinken(page: Page, element: Locator, label: string): Promise<void> {
  const vorher = await messe(element);
  // Nur der Zustand wird geprüft: Der Klick beim Loslassen löst nichts aus.
  await element.evaluate((node) =>
    node.addEventListener('click', (event) => event.preventDefault(), { once: true }),
  );
  const punkt = await mitte(element, label);
  await page.mouse.move(punkt.x, punkt.y);
  await page.mouse.down();
  // Unter „Bewegung reduzieren" ist der Übergang 0,01 ms, sonst 90 ms. Kante
  // und Verschiebung werden gemeinsam abgewartet: Chrome rundet Randbreiten
  // auf ganze Pixel, die Kante ist also früher „fertig" als die Verschiebung.
  await expect
    .poll(
      async () => {
        const m = await messe(element);
        return { kante: m.edgeWidth, verschiebung: m.transform };
      },
      { message: `${label}: Knopf sinkt ein` },
    )
    .toEqual({ kante: vorher.edgeWidth - 2, verschiebung: 'matrix(1, 0, 0, 1, 0, 2)' });
  await page.mouse.up();
  await page.mouse.move(0, 0);
}

/** Gesperrt ist flach: Kante in Flächenfarbe, kein Einsinken, kein Zeiger. */
export async function erwarteGesperrt(page: Page, element: Locator, label: string): Promise<void> {
  await expect(element, label).toBeDisabled();
  // Nach dem Sperren läuft noch der Farbübergang; gemessen wird der Endzustand.
  await expect
    .poll(
      async () => {
        const m = await messe(element);
        return m.edge === m.background;
      },
      { message: `${label}: keine sichtbare Kante` },
    )
    .toBe(true);
  expect(await element.evaluate((node) => getComputedStyle(node).cursor), `${label}: Zeiger`).toBe(
    'not-allowed',
  );
  const punkt = await mitte(element, label);
  await page.mouse.move(punkt.x, punkt.y);
  await page.mouse.down();
  expect((await messe(element)).transform, `${label}: sinkt nicht ein`).toBe('none');
  await page.mouse.up();
  await page.mouse.move(0, 0);
}

/** Tastaturfokus: 3-px-Ring, mindestens 3 : 1 gegen den Untergrund. */
export async function erwarteFokusring(page: Page, element: Locator, label: string): Promise<void> {
  // Eine Taste vorher macht den folgenden programmatischen Fokus „sichtbar".
  await page.keyboard.press('Shift');
  await element.focus();
  const ring = await element.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      visible: node.matches(':focus-visible'),
      width: Number.parseFloat(style.outlineWidth),
      style: style.outlineStyle,
      offset: Number.parseFloat(style.outlineOffset),
    };
  });
  expect(ring, `${label}: Fokusring`).toEqual({
    visible: true,
    width: 3,
    style: 'solid',
    offset: 2,
  });
  await element.blur();
}

/** Unter „Bewegung reduzieren" laufen keine Übergänge. */
export async function erwarteOhneUebergang(element: Locator, label: string): Promise<void> {
  const m = await messe(element);
  for (const dauer of m.durations) {
    expect(dauer, `${label}: Übergangsdauer`).toBeLessThanOrEqual(1);
  }
}

/** Fortschritt: Rolle, sprechbarer Wert, Breite der Füllung, Kontrast zur Spur. */
export async function erwarteFortschritt(
  element: Locator,
  sprechbar: string | RegExp,
  label: string,
): Promise<void> {
  await expect(element, `${label}: sichtbar`).toBeVisible();
  await expect(element, `${label}: Rolle`).toHaveAttribute('role', 'progressbar');
  await expect(element, `${label}: sprechbarer Wert`).toHaveAttribute('aria-valuetext', sprechbar);
  await expect(element, `${label}: beschriftet`).toHaveAttribute('aria-label', /.+/);
  const m = await element.evaluate((node) => {
    const fill = node.querySelector('.lp-ui-progress-fill') as HTMLElement | null;
    const now = Number(node.getAttribute('aria-valuenow'));
    const max = Number(node.getAttribute('aria-valuemax'));
    return {
      height: node.getBoundingClientRect().height,
      ratio: fill ? fill.getBoundingClientRect().width / node.getBoundingClientRect().width : -1,
      expected: max > 0 ? now / max : 0,
      track: getComputedStyle(node).backgroundColor,
      fill: fill ? getComputedStyle(fill).backgroundColor : '',
    };
  });
  expect(m.height, `${label}: kräftige Spur`).toBe(12);
  expect(Math.abs(m.ratio - m.expected), `${label}: Füllung passt zum Wert`).toBeLessThan(0.02);
  expect(m.fill, `${label}: Füllung hat Farbe`).not.toBe(m.track);
}

/** Leerzustand: benannte Aussage, keine Live-Region, Symbol nur dekorativ. */
export async function erwarteLeerzustand(
  element: Locator,
  art: 'start' | 'done' | 'filtered',
  label: string,
): Promise<void> {
  await expect(element, label).toHaveAttribute('data-lp-empty', art);
  await expect(element, `${label}: keine Live-Region`).not.toHaveAttribute('aria-live', /.+/);
  await expect(element, `${label}: keine Live-Region`).not.toHaveAttribute('role', /.+/);
  await expect(element.locator('.lp-ui-empty-art'), `${label}: Symbol dekorativ`).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  expect(
    await element.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    `${label}: nichts abgeschnitten`,
  ).toBe(true);
}

/** 404: echter Statuscode, gemeinsamer Fehlerzustand, ein Weg zurück. */
export async function erwarte404(page: Page, adresse: string, label: string): Promise<Locator> {
  const antwort = await page.goto(adresse);
  expect(antwort?.status(), `${label}: Statuscode`).toBe(404);
  const zustand = page.locator('.lp-ui-error[data-lp-error="not-found"]');
  await expect(zustand, label).toBeVisible();
  await expect(zustand.getByRole('heading', { level: 1 })).toHaveText('Diese Seite gibt es nicht');
  await expect(zustand.locator('.lp-ui-error-art')).toHaveAttribute('aria-hidden', 'true');
  expect(await zustand.locator('.lp-ui-button').count(), `${label}: Ausweg`).toBeGreaterThan(0);
  return zustand;
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}
