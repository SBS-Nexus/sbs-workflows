/**
 * Reine Logik der Liquid Sculpture Hero: Farbwerte, Bildauswahl und
 * Bildgeometrie. Kein React, kein DOM — `npm test` prüft sie direkt.
 *
 * Die WebGL-Engine (`liquid-sculpture-engine.ts`) und die Komponente
 * (`liquid-sculpture-hero.tsx`) nutzen dieselben Funktionen, damit statisches
 * Bild und GPU-Darstellung dieselbe Quelle und dieselbe Fläche zeigen.
 */

/** sRGB-Kanäle 0–1, wie sie die Shader erwarten. */
export type Rgb = readonly [number, number, number];

/** Rechteck in CSS-Pixeln relativ zur Hero. */
export type Rect = { x: number; y: number; w: number; h: number };

export type SculptureSources = {
  src?: string;
  darkSrc?: string;
  mobileSrc?: string;
  mobileDarkSrc?: string;
};

export type SculptureView = { mobile: boolean; dark: boolean };

/**
 * Ab hier gilt das Hochformat-Layout. Dieselbe Abfrage steuert `<picture>`
 * (ohne JavaScript) und die Engine (`matchMedia`), damit beide dasselbe Bild
 * wählen.
 */
export const MOBILE_QUERY = '(max-width: 639.98px)';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function channel(token: string): number | null {
  const percent = token.endsWith('%');
  const number = Number(percent ? token.slice(0, -1) : token);
  if (token === '' || !Number.isFinite(number)) return null;
  return clamp(percent ? number / 100 : number / 255, 0, 1);
}

/**
 * Liest eine als Literal angegebene Farbe: `#rgb`, `#rgba`, `#rrggbb`,
 * `#rrggbbaa` sowie `rgb()`/`rgba()` in Komma- oder Leerzeichenschreibweise,
 * auch mit Prozentwerten. Alpha wird ignoriert.
 *
 * Alles andere — `var(--bg)`, `oklch(…)`, Farbnamen — ergibt `null`. Solche
 * Werte kennt erst der Browser; die Komponente löst sie zur Laufzeit über die
 * berechneten Styles auf, statt sie als Hex-Wert misszuverstehen.
 */
export function parseColorLiteral(value: string | null | undefined): Rgb | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();

  const short = /^#([0-9a-f]{3,4})$/.exec(text);
  if (short) {
    const [r, g, b] = [...short[1]].slice(0, 3).map((digit) => parseInt(digit + digit, 16) / 255);
    return [r, g, b];
  }

  const long = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(text);
  if (long) {
    const n = parseInt(long[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  const functional = /^rgba?\(([^()]*)\)$/.exec(text);
  if (!functional) return null;
  const [colour, alpha, ...rest] = functional[1].split('/');
  if (rest.length > 0 || (alpha !== undefined && channel(alpha.trim()) === null)) return null;
  const parts = colour.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 3 && !(parts.length === 4 && alpha === undefined)) return null;
  const channels = parts.slice(0, 3).map(channel);
  if (channels.some((value) => value === null)) return null;
  const [r, g, b] = channels as number[];
  return [r, g, b];
}

/** Gleiche Schwelle wie im Original: helle Schrift erst auf wirklich dunklem Grund. */
export function isDarkColor([r, g, b]: Rgb): boolean {
  return r * 0.2126 + g * 0.7152 + b * 0.0722 < 0.45;
}

/**
 * Demo-Varianten gelten nur für die unveränderte Demo. Wer eine eigene
 * Basisquelle setzt, bekommt nie still ein fremdes Demo-Bild — weder auf
 * Mobilgeräten noch im dunklen Design.
 */
export function resolveSources(given: SculptureSources, demo: Required<SculptureSources>): SculptureSources {
  const own = (value: string | undefined): string | undefined => (value ? value : undefined);
  if (own(given.src)) {
    return {
      src: given.src,
      darkSrc: own(given.darkSrc),
      mobileSrc: own(given.mobileSrc),
      mobileDarkSrc: own(given.mobileDarkSrc),
    };
  }
  return {
    src: demo.src,
    darkSrc: own(given.darkSrc) ?? demo.darkSrc,
    mobileSrc: own(given.mobileSrc) ?? demo.mobileSrc,
    mobileDarkSrc: own(given.mobileDarkSrc) ?? demo.mobileDarkSrc,
  };
}

/**
 * Wählt das Bild für Design und Layout: die ausdrücklich passende Variante
 * zuerst, dann die zum Design passende (ihr flacher Hintergrund muss zum
 * Design passen), dann die zum Layout passende, zuletzt die Basisquelle.
 */
export function selectSculptureSource(sources: SculptureSources, view: SculptureView): string | undefined {
  const { src, darkSrc, mobileSrc, mobileDarkSrc } = sources;
  if (view.dark) return (view.mobile && mobileDarkSrc) || darkSrc || (view.mobile && mobileSrc) || src;
  return (view.mobile && mobileSrc) || src;
}

/**
 * Lage eines Bilds mit Seitenverhältnis `aspect` in `box` — wie
 * `object-fit: contain` mit `object-position: 50% 50%`. So deckt die
 * GPU-Darstellung exakt das statische Bild ab.
 */
export function containRect(box: Rect, aspect: number): Rect {
  if (!(aspect > 0) || !(box.w > 0) || !(box.h > 0)) return box;
  if (box.w / box.h > aspect) {
    const w = box.h * aspect;
    return { x: box.x + (box.w - w) / 2, y: box.y, w, h: box.h };
  }
  const h = box.w / aspect;
  return { x: box.x, y: box.y + (box.h - h) / 2, w: box.w, h };
}

/**
 * Werte für `feColorMatrix`, die jeden Kanal durch den flachen Bildhintergrund
 * teilen. Zusammen mit einer Multiplikation mit der Hero-Fläche entspricht das
 * `col * (uBg / uImgBg)` im Bild-Shader: Das statische Bild verschmilzt so mit
 * dem Hintergrund wie die GPU-Darstellung.
 */
export function inverseBackgroundMatrix(imageBackground: Rgb): string {
  const [r, g, b] = imageBackground.map((value) => Number((1 / Math.max(value, 0.001)).toFixed(4)));
  return `${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`;
}

/**
 * Fremde Herkunft braucht `crossOrigin` für den Pixelzugriff der Engine.
 * Gleiche Herkunft, `data:` und `blob:` sind ohne CORS lesbar.
 */
export function isCrossOrigin(src: string, pageHref: string): boolean {
  try {
    const url = new URL(src, pageHref);
    if (url.protocol === 'data:' || url.protocol === 'blob:') return false;
    return url.origin !== new URL(pageHref).origin;
  } catch {
    return false;
  }
}
