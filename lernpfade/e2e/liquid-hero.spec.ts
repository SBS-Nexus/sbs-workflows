import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  clearBrowserData,
  expectNoOutgoingContent,
  expectNoSeriousA11yViolations,
  horizontalOverflow,
  mockLiveSources,
  mockProgressSources,
  recordRequests,
} from './helpers';

/**
 * Startseiten-Hero (Liquid Sculpture) gegen den Produktionsbuild.
 *
 * Nachweisarten, ausdrücklich getrennt:
 * - Die echte Engine läuft hier in Playwright-Chromium auf dem
 *   Software-Renderer SwiftShader — kein Hardware-GPU-Nachweis (der steht
 *   getrennt in `docs/LIQUID-HERO.md`).
 * - Fehlerfälle sind SIMULIERT: Ein Init-Skript nimmt dem Browser WebGL2 oder
 *   die Float-Ziele, lässt einen Shader scheitern, verliert den Kontext, lässt
 *   die Pixelabfrage oder den Upload scheitern. Die Bilddatei wird per
 *   `page.route` abgewiesen.
 *
 * Gezählt wird im Hauptkontext der Seite: angelegte und freigegebene
 * WebGL-Kontexte, Shader, Programme sowie jeder `requestAnimationFrame`-Aufruf
 * (Playwright selbst läuft in einer isolierten Welt und zählt nicht mit).
 *
 * Gemessen (docs/LIQUID-HERO.md): Auf SwiftShader kostet der Partikelpass
 * 0,3–0,75 s pro Frame (1–3 fps, ohne Partikelpass 58 fps). Die Rückkehr in den
 * Ruhezustand dauert nach Engine-Logik rund 155 Frames — dort also bis zu
 * 70 s. Nur EIN Test wartet sie vollständig ab, mit eigenem, begründetem
 * Zeitbudget; alle anderen prüfen Start, Stopp und Wiederaufnahme der Schleife.
 * Tests mit viel Bewegung laufen im Low-Power-Pfad der Engine (4 Kerne wie die
 * CI-Runner, weniger Partikel): Solange SwiftShader hinterherrechnet, blockiert
 * der WebGL-Befehlspuffer auch den Haupt-Thread der Seite und damit jeden
 * Playwright-Schritt. Den normalen Pfad rendern weiter Kontextverlust im
 * Betrieb, Quellenwechsel, Reduced-Motion-Wechsel und Aufbau→Abbau→Aufbau.
 */

const SHOTS = 'test-results/screenshots';
const WIDE = '/images/hero/skulptur.webp';
const TALL = '/images/hero/skulptur-mobil.webp';

type Faults = {
  /** Gerät mit 4 Kernen wie die CI-Runner: Die Engine nimmt ihren Low-Power-Pfad (weniger Partikel). */
  fourCores?: boolean;
  noWebgl2?: boolean;
  noFloatTargets?: boolean;
  /** Shader, dessen Quelltext diesen Text enthält, kompiliert „nicht“. */
  failShader?: string;
  /** Pixelabfrage des Abtast-Canvas scheitert wie bei einem CORS-Bild. */
  failSampling?: boolean;
};

type Spy = {
  contexts: number;
  released: number;
  shaders: number;
  shadersDeleted: number;
  programs: number;
  programsDeleted: number;
  frames: number;
  /** Bild-Upload scheitert, sobald die Quelle diesen Text enthält. */
  failUpload: string;
};

async function instrument(page: Page, faults: Faults = {}): Promise<void> {
  await page.addInitScript((f: Faults) => {
    const spy: Spy = {
      contexts: 0,
      released: 0,
      shaders: 0,
      shadersDeleted: 0,
      programs: 0,
      programsDeleted: 0,
      frames: 0,
      failUpload: '',
    };
    (window as unknown as { __heroSpy: Spy }).__heroSpy = spy;
    if (f.fourCores) Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 });

    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      spy.frames += 1;
      return raf(callback);
    };

    const counted = new WeakSet<object>();
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === 'webgl2' && f.noWebgl2) return null;
      const context = (getContext as (...args: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      if (type === 'webgl2' && context && !counted.has(context)) {
        counted.add(context);
        spy.contexts += 1;
      }
      return context;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;

    const proto = WebGL2RenderingContext.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
    const wrap = (
      name: string,
      around: (this: WebGL2RenderingContext, original: (...args: unknown[]) => unknown, args: unknown[]) => unknown,
    ) => {
      const original = proto[name];
      proto[name] = function (this: WebGL2RenderingContext, ...args: unknown[]) {
        return around.call(this, original, args);
      };
    };
    wrap('createShader', function (original, args) {
      const shader = original.apply(this, args);
      if (shader) spy.shaders += 1;
      return shader;
    });
    wrap('deleteShader', function (original, args) {
      if (args[0]) spy.shadersDeleted += 1;
      return original.apply(this, args);
    });
    wrap('createProgram', function (original, args) {
      const program = original.apply(this, args);
      if (program) spy.programs += 1;
      return program;
    });
    wrap('deleteProgram', function (original, args) {
      if (args[0]) spy.programsDeleted += 1;
      return original.apply(this, args);
    });
    wrap('getShaderParameter', function (original, args) {
      const source = f.failShader ? this.getShaderSource(args[0] as WebGLShader) ?? '' : '';
      if (f.failShader && args[1] === this.COMPILE_STATUS && source.includes(f.failShader)) return false;
      return original.apply(this, args);
    });
    wrap('texImage2D', function (original, args) {
      const source = args[args.length - 1];
      if (spy.failUpload && source instanceof HTMLImageElement && source.src.includes(spy.failUpload)) {
        throw new Error('Upload-Test: Bild nicht übertragbar');
      }
      return original.apply(this, args);
    });
    const released = new WeakSet<object>();
    wrap('getExtension', function (original, args) {
      if (f.noFloatTargets && /^EXT_color_buffer_(half_)?float$/.test(String(args[0]))) return null;
      const extension = original.apply(this, args) as { loseContext?: () => void } | null;
      if (args[0] === 'WEBGL_lose_context' && extension?.loseContext && !released.has(extension)) {
        released.add(extension);
        const lose = extension.loseContext.bind(extension);
        extension.loseContext = () => {
          spy.released += 1;
          lose();
        };
      }
      return extension;
    });

    if (f.failSampling) {
      const getImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (
        this: CanvasRenderingContext2D,
        ...args: Parameters<CanvasRenderingContext2D['getImageData']>
      ) {
        // Nur das Abtast-Canvas der Engine, nicht die 1×1-Farbauflösung der Komponente.
        if (this.canvas.width > 1) throw new DOMException('Test: Bild nicht CORS-lesbar', 'SecurityError');
        return getImageData.apply(this, args);
      };
    }
  }, faults);
}

const spyOf = (page: Page): Promise<Spy> =>
  page.evaluate(() => ({ ...(window as unknown as { __heroSpy: Spy }).__heroSpy }));

const hero = (page: Page) => page.locator('.sh-root');
const canvases = (page: Page) => page.locator('.sh-canvas');
const fallback = (page: Page) => page.locator('.sh-fallback');
const figure = (page: Page) => page.locator('.sh-figure');

/** Engine hat ihren ersten Frame gezeigt — mit genau dieser Quelle. */
async function expectEngine(page: Page, src: string): Promise<void> {
  await expect(hero(page)).toHaveAttribute('data-gl', 'on');
  await expect(hero(page)).toHaveAttribute('data-gl-src', src);
  await expect(hero(page)).not.toHaveAttribute('data-swap');
  await expect(canvases(page)).toHaveCount(1);
  await expect(canvases(page)).toHaveCSS('opacity', '1');
}

/** Statische Darstellung: kein Canvas, sichtbares und geladenes Bild, Text und Links intakt. */
async function expectStatic(page: Page, src: string, gl: 'off' | null): Promise<void> {
  if (gl) await expect(hero(page)).toHaveAttribute('data-gl', gl);
  else await expect(hero(page)).not.toHaveAttribute('data-gl');
  await expect(hero(page)).not.toHaveAttribute('data-swap');
  await expect(canvases(page)).toHaveCount(0);
  await expect(fallback(page)).toHaveCSS('opacity', '1');
  await expect.poll(() => fallbackSource(page), 'statisches Bild zeigt die passende Variante').toContain(src);
  await expect
    .poll(() => fallback(page).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), 'geladen')
    .toBe(true);
  await expectContentIntact(page);
}

const fallbackSource = (page: Page): Promise<string> =>
  fallback(page).evaluate((img: HTMLImageElement) => img.currentSrc);

async function expectContentIntact(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Technologie lernen.');
  await expect(page.getByText('Python, SQL, Git und AI – mit einem gemeinsamen Lernmodell.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Lernpfad wählen' })).toHaveAttribute('href', '#pfade');
  await expect(page.getByRole('link', { name: 'So funktioniert das Lernen' })).toHaveAttribute('href', '#lernmodell');
  await expect(page.getByRole('link', { name: 'Lernpfad wählen' })).toBeVisible();
}

/**
 * Zeiger quer durch die dichten Bereiche der Skulptur (die Mitte des Rings ist leer).
 * Wenige Schritte: Chromium stellt Mausbewegungen bildsynchron zu, und auf dem
 * Software-Renderer dauert ein Bild bis zu 0,75 s.
 */
async function sweep(page: Page): Promise<void> {
  const box = (await figure(page).boundingBox())!;
  const at = (x: number, y: number) => page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 2 });
  await at(0.22, 0.5);
  await at(0.62, 0.42);
  await at(0.38, 0.55);
}

/** Anteil der Pixel, die sich deutlich unterscheiden (größte Kanaldifferenz > 24). */
async function changedShare(page: Page, first: Buffer, second: Buffer): Promise<number> {
  return page.evaluate(
    async ([a, b]) => {
      const load = (data: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = `data:image/png;base64,${data}`;
        });
      const pixels = (image: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const [p, q] = (await Promise.all([load(a), load(b)])).map(pixels);
      if (p.length !== q.length) return 1;
      let changed = 0;
      for (let i = 0; i < p.length; i += 4) {
        if (Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])) > 24) changed += 1;
      }
      return changed / (p.length / 4);
    },
    [first.toString('base64'), second.toString('base64')] as const,
  );
}

async function renderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.sh-canvas');
    const gl = canvas?.getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unbekannt';
  });
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe('Startseiten-Hero', () => {
  test('eine H1, bestehende Navigation, keine zweite; beide CTAs führen zu ihren Abschnitten', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    const nav = page.getByRole('navigation', { name: 'Seitennavigation' });
    for (const name of ['Pfade', 'Vokabeln', 'Wiederholen', 'Fortschritt', 'Roadmap', 'Lernmodell']) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expect(page.locator('main#hauptinhalt .sh-root')).toHaveCount(1);
    await expect(page.getByRole('region', { name: /Technologie lernen\./ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Direkt zum Hauptinhalt' })).toHaveAttribute('href', '#hauptinhalt');

    await page.getByRole('link', { name: 'Lernpfad wählen' }).click();
    await expect(page).toHaveURL(/#pfade$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Deine Kernpfade' })).toBeInViewport();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('link', { name: 'So funktioniert das Lernen' }).click();
    await expect(page).toHaveURL(/#lernmodell$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Ein Lernmodell für alle Themen' })).toBeInViewport();

    // Urheberhinweis bleibt sichtbar und erreichbar.
    await expect(page.getByRole('link', { name: 'Skulptur und Partikeleffekt: Guglielmo Giannattasio' })).toHaveAttribute(
      'href',
      'https://guglielmogiannattasio.it',
    );
  });

  test('echtes Referenzbild, WebGL aktiv: ruhig ohne Bildschleife, der Zeiger verformt die Skulptur', async ({ page }) => {
    await instrument(page, { fourCores: true });
    await page.goto('/');
    await expectEngine(page, WIDE);
    await expect(fallback(page)).toHaveJSProperty('naturalWidth', 1983);
    await expect(fallback(page)).toHaveJSProperty('naturalHeight', 793);
    test.info().annotations.push({ type: 'WebGL-Renderer', description: await renderer(page) });
    await expect(hero(page)).toHaveAttribute('data-motion', 'rest');
    await expect(page.locator('.sh-hint')).toBeVisible();
    await shot(page, 'liquid-hero-desktop-1280-ruhe');

    // Ruhezustand: keine Bildschleife (keine dauerhafte dekorative Bewegung).
    const before = (await spyOf(page)).frames;
    await page.waitForTimeout(1000);
    expect((await spyOf(page)).frames - before, 'keine rAF-Aufrufe in Ruhe').toBe(0);

    const rest = await figure(page).screenshot();
    await sweep(page);
    await expect(hero(page)).toHaveAttribute('data-motion', 'active');
    await page.waitForTimeout(400);
    const stirred = await figure(page).screenshot();
    await shot(page, 'liquid-hero-desktop-1280-interaktion');
    expect(await changedShare(page, rest, stirred), 'der Zeiger verändert die Skulptur sichtbar').toBeGreaterThan(0.01);
    await expect(page.locator('.sh-hint'), 'Hinweis verschwindet nach der ersten Berührung').toBeHidden();
  });

  test('nach der Interaktion zurück im Ruhezustand: gleiches Bild, Bildschleife beendet', async ({ page }) => {
    // Das einzige bewusst lange Budget der Suite: Die Engine zählt den Rückweg in simulierten
    // Frames (Präsenz klingt ab, dann 270 Frames Ruhe; dt ist auf 3 begrenzt, damit langsame
    // Geräte nie mitten im Rückweg springen) — rund 155 echte Frames. SwiftShader liefert im
    // Low-Power-Pfad 3 fps (gemessen), das sind gut 50 s. Kein Retry, kein Verdecken: Kommt die
    // Engine nicht zur Ruhe, schlägt der Test fehl.
    test.setTimeout(150_000);
    await instrument(page, { fourCores: true });
    await page.goto('/');
    await expectEngine(page, WIDE);
    const rest = await figure(page).screenshot();

    await sweep(page);
    await expect(hero(page)).toHaveAttribute('data-motion', 'active');
    await page.mouse.move(8, 8);
    const left = (await spyOf(page)).frames;
    await expect(hero(page)).toHaveAttribute('data-motion', 'rest', { timeout: 120_000 });
    const frames = (await spyOf(page)).frames - left;
    test.info().annotations.push({ type: 'Frames bis zur Ruhe', description: String(frames) });
    expect(frames, 'Rückweg ist begrenzt').toBeLessThan(250);

    const settled = await figure(page).screenshot();
    expect(await changedShare(page, rest, settled), 'Ruhezustand wie vor der Interaktion').toBeLessThan(0.002);
    const before = (await spyOf(page)).frames;
    await page.waitForTimeout(1000);
    expect((await spyOf(page)).frames - before, 'keine rAF-Aufrufe in Ruhe').toBe(0);
  });

  test('ohne WebGL2: statisches Bild, Text und Links bleiben nutzbar', async ({ page }) => {
    await instrument(page, { noWebgl2: true });
    await page.goto('/');
    await expectStatic(page, WIDE, 'off');
    await expect(page.locator('.sh-hint'), 'kein Hinweis ohne reagierende Skulptur').toBeHidden();
    await page.getByRole('link', { name: 'Lernpfad wählen' }).click();
    await expect(page).toHaveURL(/#pfade$/);
  });

  test('ohne Float-Render-Ziele: statisches Bild, Kontext freigegeben', async ({ page }) => {
    await instrument(page, { noFloatTargets: true });
    await page.goto('/');
    await expectStatic(page, WIDE, 'off');
    const spy = await spyOf(page);
    expect(spy.contexts).toBe(1);
    expect(spy.released, 'teilweise gebaute Engine gibt ihren Kontext frei').toBe(1);
  });

  test('Shader scheitert mitten in der Initialisierung: alles Angelegte wird freigegeben', async ({ page }) => {
    // Der Simulations-Shader ist der zweite von vier — der erste ist dann schon gebaut.
    await instrument(page, { failShader: 'uReturn' });
    await page.goto('/');
    await expectStatic(page, WIDE, 'off');
    const spy = await spyOf(page);
    expect(spy.shaders).toBeGreaterThan(2);
    expect(spy.shadersDeleted, 'jeder Shader freigegeben').toBe(spy.shaders);
    expect(spy.programs).toBeGreaterThan(1);
    expect(spy.programsDeleted, 'jedes Programm freigegeben').toBe(spy.programs);
    expect(spy.released, 'Kontext freigegeben').toBe(spy.contexts);
  });

  test('Pixelabfrage scheitert (wie bei einem nicht CORS-lesbaren Bild): statisches Bild bleibt', async ({ page }) => {
    await instrument(page, { failSampling: true });
    await page.goto('/');
    await expectStatic(page, WIDE, 'off');
    const spy = await spyOf(page);
    expect(spy.released).toBe(spy.contexts);
  });

  test('Kontextverlust im Betrieb: statisches Bild, späte Frames schalten nicht zurück', async ({ page }) => {
    await instrument(page);
    await page.goto('/');
    await expectEngine(page, WIDE);
    await sweep(page);
    await page.evaluate(() => {
      const gl = document.querySelector<HTMLCanvasElement>('.sh-canvas')!.getContext('webgl2')!;
      gl.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expectStatic(page, WIDE, 'off');
    await page.waitForTimeout(500); // Ein verspäteter Frame-Callback hätte hier zurückgeschaltet.
    await expect(hero(page)).toHaveAttribute('data-gl', 'off');
    await expect(hero(page)).not.toHaveAttribute('data-motion');
  });

  test('Upload-Fehler mitten im Bildwechsel: Wechsel endet, das neue statische Bild bleibt sichtbar', async ({ page }) => {
    await instrument(page);
    await page.goto('/');
    await expectEngine(page, WIDE);
    await page.evaluate((marker) => {
      (window as unknown as { __heroSpy: Spy }).__heroSpy.failUpload = marker;
    }, 'skulptur-mobil');

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(hero(page)).toHaveAttribute('data-swap', '1');
    await expectStatic(page, TALL, 'off');
    await page.waitForTimeout(500);
    await expect(hero(page)).toHaveAttribute('data-gl', 'off');
    const spy = await spyOf(page);
    expect(spy.released).toBe(spy.contexts);
  });

  test('Kontextverlust mitten im Bildwechsel: Wechsel endet, statisches Bild sichtbar', async ({ page }) => {
    await instrument(page);
    await page.goto('/');
    await expectEngine(page, WIDE);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(hero(page)).toHaveAttribute('data-swap', '1');
    await page.evaluate(() => {
      const gl = document.querySelector<HTMLCanvasElement>('.sh-canvas')!.getContext('webgl2')!;
      gl.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expectStatic(page, TALL, 'off');
  });

  test('Bilddatei nicht ladbar: Überschrift, Text und Aktionen bleiben, kein kaputtes Bild', async ({ page }) => {
    await page.route(`**${WIDE}`, (route) => route.abort());
    await page.goto('/');
    await expect(hero(page)).toHaveAttribute('data-gl', 'off');
    await expect(hero(page)).toHaveAttribute('data-img', 'error');
    await expect(fallback(page)).toBeHidden();
    await expect(canvases(page)).toHaveCount(0);
    await expectContentIntact(page);
    expect((await figure(page).boundingBox())!.height, 'Bildfläche bleibt reserviert').toBeGreaterThan(200);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('schnelle Quellenwechsel: am Ende genau ein Canvas mit dem Bild des letzten Layouts', async ({ page }) => {
    await instrument(page);
    await page.goto('/');
    await expectEngine(page, WIDE);

    for (let round = 0; round < 6; round += 1) {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await expectEngine(page, TALL);
    await expect.poll(() => fallbackSource(page)).toContain(TALL);

    for (let round = 0; round < 6; round += 1) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.setViewportSize({ width: 375, height: 812 });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await expectEngine(page, WIDE);
    await expect.poll(() => fallbackSource(page)).toContain(WIDE);
    const spy = await spyOf(page);
    expect(spy.contexts - spy.released, 'genau ein lebender WebGL-Kontext').toBe(1);
  });

  test('reduzierte Bewegung vor dem Start und nach Wechseln: statisch, keine Engine, keine Bildschleife', async ({ page }) => {
    await instrument(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expectStatic(page, WIDE, null);
    await expect(page.locator('.sh-hint')).toBeHidden();
    let before = (await spyOf(page)).frames;
    await sweep(page);
    await page.waitForTimeout(500);
    expect((await spyOf(page)).frames - before, 'keine Bildschleife, auch nicht unter dem Zeiger').toBe(0);
    await shot(page, 'liquid-hero-desktop-1280-reduzierte-bewegung');

    // Präferenz entfällt zur Laufzeit: Engine startet und reagiert.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expectEngine(page, WIDE);
    await sweep(page);
    await expect(hero(page)).toHaveAttribute('data-motion', 'active');

    // Präferenz kommt zurück, mitten in der Bewegung: sofort statisch, Kontext freigegeben.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expectStatic(page, WIDE, null);
    before = (await spyOf(page)).frames;
    await sweep(page);
    await page.waitForTimeout(500);
    expect((await spyOf(page)).frames - before).toBe(0);
    const spy = await spyOf(page);
    expect(spy.contexts - spy.released, 'kein WebGL-Kontext mehr').toBe(0);
  });

  test('Aufbau→Abbau→Aufbau (wie React Strict Mode) im Produktionsbuild: kein Leck, ein Canvas', async ({ page }) => {
    await instrument(page);
    await page.goto('/');
    await expectEngine(page, WIDE);
    // Jeder Zyklus muss wirklich stattfinden: Zwei Präferenzwechsel im selben Frame hebt Chromium
    // auf. Abgebaut wird, sobald das Canvas verschwindet; neu aufgebaut, sobald wieder eines da
    // ist — dann absichtlich sofort wieder abgebaut, während das Bild noch lädt.
    const rounds = 5;
    for (let round = 0; round < rounds; round += 1) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(canvases(page)).toHaveCount(0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(canvases(page)).toHaveCount(1);
    }
    await expectEngine(page, WIDE);
    const spy = await spyOf(page);
    expect(spy.contexts, 'jeder Zyklus baut eine neue Engine').toBe(rounds + 1);
    expect(spy.contexts - spy.released, 'genau ein lebender WebGL-Kontext').toBe(1);
    expect(spy.programs - spy.programsDeleted, 'nur die vier Programme der lebenden Engine').toBe(4);
    expect(spy.shaders, 'Shader nach dem Linken freigegeben').toBe(spy.shadersDeleted);
  });

  test('Sichtbarkeit: außerhalb des Viewports keine Bildschleife, auch nicht nach Tab-Rückkehr', async ({ page }) => {
    await instrument(page, { fourCores: true });
    await page.goto('/');
    await expectEngine(page, WIDE);
    await sweep(page);
    await expect(hero(page)).toHaveAttribute('data-motion', 'active');

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(hero(page)).toHaveAttribute('data-motion', 'rest');
    const before = (await spyOf(page)).frames;
    // Tab wird verborgen und wieder sichtbar, die Hero liegt weiter außerhalb des Viewports.
    await page.evaluate(() => {
      const set = (hidden: boolean) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
        document.dispatchEvent(new Event('visibilitychange'));
      };
      set(true);
      set(false);
    });
    await page.waitForTimeout(800);
    await expect(hero(page)).toHaveAttribute('data-motion', 'rest');
    expect((await spyOf(page)).frames - before, 'keine Bildschleife außerhalb des Viewports').toBe(0);

    // Zurück im Viewport: Die Engine setzt ihren unterbrochenen Rückweg fort
    // (die Rückkehr bis zur Ruhe prüft der eigene Test oben).
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(hero(page)).toHaveAttribute('data-motion', 'active');
    await expect.poll(async () => (await spyOf(page)).frames - before, 'Bildschleife läuft wieder').toBeGreaterThan(0);
    await expect(hero(page)).toHaveAttribute('data-gl', 'on');
  });

  test('axe ohne schwere Befunde; keine Konsolen- oder Hydrationsfehler; keine Fremd- oder Font-Anfragen', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      // Erlaubt sind nur Leistungsmeldungen des Software-Treibers der Testumgebung: Chromium liest
      // das SwiftShader-Bild für die Darstellung zurück („GPU stall due to ReadPixels“). Die Seite
      // selbst ruft nie readPixels auf (gemessen, docs/LIQUID-HERO.md).
      if (message.type() === 'warning' && /GL Driver Message \(OpenGL, Performance|swiftshader/i.test(message.text())) return;
      if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    const seen = recordRequests(page);
    await instrument(page, { fourCores: true });

    await page.goto('/');
    await expectEngine(page, WIDE);
    await sweep(page);
    await page.mouse.move(8, 8);
    await expectNoSeriousA11yViolations(page, 'Startseite mit aktiver Hero');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expectStatic(page, WIDE, null);
    await expectNoSeriousA11yViolations(page, 'Startseite, reduzierte Bewegung');

    expect(problems, 'keine Fehler oder Warnungen in der Konsole').toEqual([]);
    expect(seen.filter((request) => /fonts\.(googleapis|gstatic)\.com/.test(request.url)), 'keine Google Fonts').toEqual([]);
    expectNoOutgoingContent(seen, []);
  });

  for (const { width, height, label } of [
    { width: 375, height: 812, label: '375 px' },
    { width: 640, height: 800, label: '640 px' },
    { width: 700, height: 800, label: '700 px' },
    { width: 1024, height: 768, label: '1024 px' },
    { width: 1440, height: 900, label: '1440 px' },
    { width: 640, height: 400, label: '200 % Zoom (640 × 400)' },
    { width: 1280, height: 480, label: 'kleine Höhe (1280 × 480)' },
  ]) {
    test(`${label}: keine Überlappung, kein Überlauf, CTAs vollständig, Fokus sichtbar`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      expect(await horizontalOverflow(page), 'kein horizontales Scrollen').toBeLessThanOrEqual(0);

      const layout = await page.evaluate(() => {
        const box = (element: Element | null) => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        };
        const lines = (element: Element | null) => {
          if (!element) return [];
          const result: { left: number; right: number }[] = [];
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) if (rect.width > 0) result.push({ left: rect.left, right: rect.right });
          }
          return result;
        };
        const parts = {
          Bild: '.sh-figure',
          Hinweis: '.sh-hint',
          Eyebrow: '.sh-eyebrow',
          'Überschrift': '.sh-h1',
          Text: '.sh-body',
          'Primäre Aktion': '.sh-btn',
          'Sekundäre Aktion': '.sh-txt',
          Urheberhinweis: '.sh-credit a',
        } as const;
        return {
          viewport: document.documentElement.clientWidth,
          boxes: Object.fromEntries(Object.entries(parts).map(([name, selector]) => [name, box(document.querySelector(selector))])),
          lines: Object.fromEntries(Object.entries(parts).map(([name, selector]) => [name, lines(document.querySelector(selector))])),
          clipped: [...document.querySelectorAll('.sh-root h1, .sh-root p, .sh-root a')]
            .filter((element) => element.scrollWidth > element.clientWidth + 1)
            .map((element) => element.textContent),
        };
      });

      expect(layout.clipped, 'nichts in der Hero ist abgeschnitten').toEqual([]);
      const names = Object.keys(layout.boxes);
      for (const name of names) {
        const box = layout.boxes[name];
        expect(box, `${name} vorhanden`).not.toBeNull();
        expect(box!.left, `${name} links im Bild`).toBeGreaterThanOrEqual(0);
        expect(box!.right, `${name} rechts im Bild`).toBeLessThanOrEqual(layout.viewport);
        for (const line of layout.lines[name]) {
          expect(line.left, `${name}: Zeile links im Bild`).toBeGreaterThanOrEqual(0);
          expect(line.right, `${name}: Zeile rechts im Bild`).toBeLessThanOrEqual(layout.viewport);
        }
      }
      for (let i = 0; i < names.length; i += 1) {
        for (let j = i + 1; j < names.length; j += 1) {
          const a = layout.boxes[names[i]]!;
          const b = layout.boxes[names[j]]!;
          const overlap = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          expect(overlap, `${names[i]} überdeckt nicht ${names[j]}`).toBe(false);
        }
      }

      // Tastatur: vom Seitenanfang zur primären Aktion; Fokus sichtbar und nicht verdeckt.
      const primary = page.getByRole('link', { name: 'Lernpfad wählen' });
      await page.keyboard.press('Tab');
      for (let step = 0; step < 20; step += 1) {
        if (await primary.evaluate((element) => element === document.activeElement)) break;
        await page.keyboard.press('Tab');
      }
      await expect(primary).toBeFocused();
      // Der Hub scrollt weich (scroll-behavior: smooth): erst messen, wenn die Aktion ganz im Bild ist.
      await expect(primary).toBeInViewport({ ratio: 1 });
      const focus = await primary.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          outline: style.outlineStyle,
          width: parseFloat(style.outlineWidth),
          covered: !(top && element.contains(top)),
          inView: rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth,
        };
      });
      expect(focus.outline, 'sichtbarer Fokus').not.toBe('none');
      expect(focus.width).toBeGreaterThan(0);
      expect(focus.covered, 'Fokus nicht verdeckt').toBe(false);
      expect(focus.inView, 'fokussierte Aktion im Bild').toBe(true);
      if (width === 1440 || width === 375) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await shot(page, `liquid-hero-layout-${width}`);
      }
    });
  }
});

test.describe('Startseiten-Hero ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('wesentlicher Text, funktionierende Links und das statische Bild ohne JavaScript', async ({ page }) => {
    await page.goto('/');
    await expectContentIntact(page);
    await expect(canvases(page)).toHaveCount(0);
    await expect(fallback(page)).toBeVisible();
    await expect(fallback(page)).toHaveJSProperty('naturalWidth', 1983);
    await expect(fallback(page), 'Bildgrund verschmilzt mit der Fläche').toHaveCSS('filter', /url\(/);
    await expect(page.locator('.sh-hint')).toBeHidden();
    await shot(page, 'liquid-hero-ohne-javascript-1280');

    await page.getByRole('link', { name: 'Lernpfad wählen' }).click();
    await expect(page).toHaveURL(/#pfade$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Deine Kernpfade' })).toBeInViewport();
    await page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('link', { name: 'Vokabeln' }).click();
    await expect(page).toHaveURL(/\/vokabeln$/);
  });
});

test.describe('Regression der übrigen Routen', () => {
  test('die Hero schreibt keine Browserdaten; /vokabeln, /wiederholen, /fortschritt unverändert erreichbar', async ({ page }) => {
    await page.goto('/');
    await clearBrowserData(page);
    const databases = async () =>
      (await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name))).sort();
    const before = await databases();

    await page.reload();
    await expectEngine(page, WIDE);
    await sweep(page);
    await page.mouse.move(8, 8);
    expect(await databases(), 'keine IndexedDB durch die Hero').toEqual(before);
    expect(await page.evaluate(() => window.localStorage.length), 'kein localStorage durch die Hero').toBe(0);
    expect(await page.evaluate(() => window.sessionStorage.length), 'kein sessionStorage durch die Hero').toBe(0);

    await page.goto('/vokabeln');
    await expect(page.getByRole('heading', { level: 1, name: /Vokabeln lernen/ })).toBeVisible();
    await expect(page.locator('.sh-root')).toHaveCount(0);

    await mockLiveSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
    await page.goto('/wiederholen');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('.sh-root')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await mockProgressSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
    await page.goto('/fortschritt');
    await expect(page.getByRole('heading', { level: 1, name: 'Dein Fortschritt' })).toBeVisible();
    await expect(page.locator('.sh-root')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});
