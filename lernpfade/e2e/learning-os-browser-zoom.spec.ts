import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import { HUB_ORIGIN } from './config';
import { expectNoSeriousA11yViolations, horizontalOverflow, mockLiveSources, mockProgressSources } from './helpers';

/**
 * Echter Browser-Seitenzoom, keine Viewport-/DPR-/CSS-Zoom-Simulation.
 * Eine nur im temporären Testprofil geladene MV3-Erweiterung bedient die
 * native chrome.tabs-Zoom-API. Rechte ausschließlich für den lokalen Hub.
 * Der bestehende Produktionsbuild und die bestehenden CI-Gates bleiben gleich.
 * Seit LO-UI-001 prüft der Test das Learning OS auf allen vier Routen.
 *
 * Referenzen:
 * https://playwright.dev/docs/chrome-extensions
 * https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom
 */
type NativeTabs = {
  query: (query: { url: string }) => Promise<Array<{ id?: number; url?: string }>>;
  setZoomSettings: (id: number, settings: { mode: 'automatic'; scope: 'per-tab' }) => Promise<void>;
  setZoom: (id: number, factor: number) => Promise<void>;
  getZoom: (id: number) => Promise<number>;
};

test('echter Browser-Zoom 200 %: Learning OS auf allen vier Routen bedienbar, Fokus und Primäraktion sichtbar', async ({}, testInfo) => {
  const origin = new URL(HUB_ORIGIN);
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1') {
    throw new Error('Dieser Test darf ausschließlich den lokalen Hub prüfen.');
  }
  const temporary = mkdtempSync(join(tmpdir(), 'lernpfade-native-zoom-'));
  const extension = join(temporary, 'extension');
  mkdirSync(extension);
  writeFileSync(join(extension, 'manifest.json'), JSON.stringify({
    manifest_version: 3,
    name: 'Lernpfade: isolierter nativer Zoom-Test',
    version: '1.0.0',
    host_permissions: ['http://127.0.0.1/*'],
    background: { service_worker: 'background.js' },
  }));
  writeFileSync(join(extension, 'background.js'), 'chrome.runtime.onInstalled.addListener(() => {});\n');

  let context: BrowserContext | undefined;
  let page: Page | undefined;
  const errors: string[] = [];
  const observations: string[] = [];
  const evidence: Record<string, unknown> = {
    method: 'chrome.tabs.setZoom / getZoom; keine Viewport-, DPR- oder CSS-Manipulation',
    origin: HUB_ORIGIN,
  };
  try {
    // Full Chromium (neuer Headless-Modus), nicht chromium-headless-shell:
    // Erweiterungen benötigen laut Playwright einen persistenten Kontext.
    context = await chromium.launchPersistentContext(join(temporary, 'profile'), {
      channel: 'chromium',
      headless: true,
      viewport: null,
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      reducedMotion: 'reduce',
      args: [
        '--window-size=1280,900',
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
      ],
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    page = context.pages()[0] ?? await context.newPage();
    const currentPage = page;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        // Separat dokumentierter Parent-Befund, keine allgemeine 404-Ausnahme.
        if (message.location().url === `${HUB_ORIGIN}/favicon.ico` && /404/.test(message.text())) {
          observations.push(`Vorbestehend: ${message.text()} (${message.location().url})`);
        } else errors.push(message.text());
      } else if (message.type() === 'warning') observations.push(message.text());
    });
    const response = await page.goto(HUB_ORIGIN);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Lernpfade/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.los-hero')).toBeVisible();
    await expect(page.locator('nextjs-portal')).toHaveCount(0);

    const setNativeZoom = (factor: number) => worker.evaluate(async ({ base, factor }) => {
      const tabs = (globalThis as unknown as { chrome: { tabs: NativeTabs } }).chrome.tabs;
      const matches = (await tabs.query({ url: 'http://127.0.0.1/*' })).filter((tab) => tab.url?.startsWith(`${base}/`));
      if (matches.length !== 1 || matches[0].id === undefined) throw new Error('Lokaler Testtab nicht eindeutig.');
      const id = matches[0].id;
      await tabs.setZoomSettings(id, { mode: 'automatic', scope: 'per-tab' });
      await tabs.setZoom(id, factor);
      return tabs.getZoom(id);
    }, { base: HUB_ORIGIN, factor });
    const metrics = () => currentPage.evaluate(() => ({
      innerWidth, innerHeight, outerWidth, outerHeight,
      dpr: devicePixelRatio,
      visualScale: visualViewport?.scale,
      htmlZoom: getComputedStyle(document.documentElement).zoom,
      bodyZoom: getComputedStyle(document.body).zoom,
    }));
    const cdp = await context.newCDPSession(currentPage);
    const captures: Array<{ name: string; width: number; height: number }> = [];
    evidence.captures = captures;
    evidence.captureMethod = 'CDP Page.captureScreenshot ohne clip, vollständige sichtbare Browserfläche';
    const capture = async (name: string) => {
      // Befund aus dem ersten echten Zoom-Lauf: Playwrights CSS-Clip lieferte
      // bei 200 % nur einen Ausschnitt. Die native Oberfläche ohne Clip
      // aufnehmen; ihre Pixelmaße werden mitgeprüft.
      const result = await cdp.send('Page.captureScreenshot', {
        format: 'png', fromSurface: true, captureBeyondViewport: false,
      });
      const image = Buffer.from(result.data, 'base64');
      expect(image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
      const width = image.readUInt32BE(16);
      const height = image.readUInt32BE(20);
      const current = await metrics();
      expect(Math.abs(width - current.innerWidth * current.dpr), 'vollständige Aufnahmebreite, kein Zoom-Clip').toBeLessThanOrEqual(2);
      expect(Math.abs(height - current.innerHeight * current.dpr), 'vollständige Aufnahmehöhe').toBeLessThanOrEqual(2);
      captures.push({ name, width, height });
      const path = testInfo.outputPath(`${name}.png`);
      writeFileSync(path, image);
      await testInfo.attach(name, { path, contentType: 'image/png' });
    };
    const textOutside = () => currentPage.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      return [...document.querySelectorAll('main h1, main h2, main h3, main p, main a, header a')].flatMap((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].filter((rect) => rect.width > 0 && (rect.left < -1 || rect.right > viewport + 1))
          .map((rect) => ({ text: element.textContent, left: rect.left, right: rect.right, viewport }));
      });
    });

    expect(await setNativeZoom(1)).toBe(1);
    const baseline = await metrics();
    evidence.baseline = baseline;
    evidence.browser = context.browser()?.version();
    await capture('native-zoom-100-start');

    const actualZoom = await setNativeZoom(2);
    expect(actualZoom, 'native Chrome-Zoomstufe, nicht nur kleinere CSS-Fläche').toBe(2);
    await expect.poll(async () => (await metrics()).dpr / baseline.dpr).toBeCloseTo(2, 5);
    const zoomed = await metrics();
    evidence.nativeZoom = actualZoom;
    evidence.zoomed = zoomed;
    expect(zoomed.outerWidth).toBe(baseline.outerWidth);
    expect(zoomed.outerHeight).toBe(baseline.outerHeight);
    expect(Math.abs(zoomed.innerWidth * 2 - baseline.innerWidth)).toBeLessThanOrEqual(2);
    expect(Math.abs(zoomed.innerHeight * 2 - baseline.innerHeight)).toBeLessThanOrEqual(2);
    expect(zoomed.visualScale, 'kein Pinch-Zoom').toBe(1);
    expect(zoomed.htmlZoom).toBe(baseline.htmlZoom);
    expect(zoomed.bodyZoom).toBe(baseline.bodyZoom);
    await page.evaluate(() => document.fonts.ready);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(await textOutside(), 'Startseite: alle Textzeilen innerhalb der verfügbaren Breite').toEqual([]);
    await expectNoSeriousA11yViolations(page, 'Startseite bei nativem Browser-Zoom 200 %');
    await capture('native-zoom-200-start');

    // Echter Tastaturweg. Kein focus()- oder scrollIntoView()-Bypass.
    const primary = page.getByRole('link', { name: 'Entdecke deinen Pfad', exact: true });
    for (let index = 0; index < 24; index += 1) {
      if (await primary.evaluate((element) => element === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(primary).toBeFocused();
    await expect(primary).toBeInViewport({ ratio: 1 });
    const focus = await primary.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { outline: style.outlineStyle, width: parseFloat(style.outlineWidth), covered: !top || !element.contains(top) };
    });
    expect(focus.outline).not.toBe('none');
    expect(focus.width).toBeGreaterThan(0);
    expect(focus.covered).toBe(false);
    await capture('native-zoom-200-cta-fokus');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#lernpfade$/);
    await expect(page.getByRole('heading', { level: 2, name: /Dein nächster.*Sprung/s })).toBeInViewport();
    evidence.cta = { url: page.url(), focus };

    // Innere Ansichten im selben Tab, je wieder auf 200 % gesetzt (der Zoom gilt je Tab und Navigation).
    const inner = [
      { path: '/vokabeln', h1: /Vokabeln lernen/ },
      { path: '/wiederholen', h1: /Wiederholen über alle Lernpfade/ },
      { path: '/fortschritt', h1: /^Dein Fortschritt$/ },
    ] as const;
    for (const route of inner) {
      // Quellen sind MOCKS wie in den übrigen Browserfällen, je Route nur die passende.
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      if (route.path === '/wiederholen') await mockLiveSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
      if (route.path === '/fortschritt') await mockProgressSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
      await page.goto(`${HUB_ORIGIN}${route.path}`);
      expect(await setNativeZoom(2)).toBe(2);
      await expect.poll(async () => (await metrics()).dpr / baseline.dpr).toBeCloseTo(2, 5);
      await expect(page.getByRole('heading', { level: 1, name: route.h1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await horizontalOverflow(page), `${route.path}: kein horizontales Scrollen`).toBeLessThanOrEqual(0);
      expect(await textOutside(), `${route.path}: alle Textzeilen innerhalb der Breite`).toEqual([]);
      const nav = page.getByRole('navigation', { name: 'Seitennavigation' });
      const brand = (await page.getByRole('link', { name: 'Lernpfade Startseite' }).boundingBox())!;
      expect((await nav.boundingBox())!.y, `${route.path}: Navigation als eigene Zeile`).toBeGreaterThanOrEqual(brand.y + brand.height - 1);
      await expectNoSeriousA11yViolations(page, `${route.path} bei nativem Browser-Zoom 200 %`);
      await capture(`native-zoom-200${route.path.replace('/', '-')}`);
    }

    expect(await setNativeZoom(1), 'Zoom im temporären Testtab zurückgesetzt').toBe(1);
    await expect.poll(async () => (await metrics()).dpr / baseline.dpr).toBeCloseTo(1, 5);
    expect(errors, 'keine neuen Konsolen-, Laufzeit- oder Hydrationsfehler').toEqual([]);
  } finally {
    evidence.errors = errors;
    evidence.observations = observations;
    await testInfo.attach('native-zoom-messwerte', { body: Buffer.from(JSON.stringify(evidence, null, 2)), contentType: 'application/json' });
    try { await context?.close(); } finally { rmSync(temporary, { recursive: true, force: true }); }
  }
});
