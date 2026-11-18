import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { HUB_ORIGIN, MOCK_SOURCE_ORIGINS } from './config';
import {
  clearBrowserData,
  expectNoSeriousA11yViolations,
  horizontalOverflow,
  mockLiveSources,
  mockProgressSources,
  recordRequests,
} from './helpers';

/**
 * LO-UI-001 — Learning OS auf den vier echten Routen. Visuelle Regression ohne
 * Pixel-Baselines (die Schriften unterscheiden sich zwischen macOS und der
 * Linux-CI): geprüft werden die gerenderten Invarianten — gemeinsame
 * Kopfzeile, Flächenfarben, eine H1, keine Überläufe oder abgeschnittenen
 * Überschriften, Reihenfolge der Bereiche, Fokus, Bewegung, SSR — plus
 * Ganzseitenaufnahmen je Route und Breite für die Sichtprüfung.
 * Live- und Fortschrittsquellen sind MOCKS (`page.route`), keine echten Apps.
 */

const SHOTS = 'test-results/screenshots';
const WIDTHS = [375, 390, 640, 920, 1280, 1440] as const;
const NAV = ['Pfade', 'Vokabeln', 'Wiederholen', 'Fortschritt'] as const;
const INK = 'rgb(11, 14, 14)';
const PAPER = 'rgb(242, 242, 233)';
const LIME = 'rgb(208, 250, 131)';

type Route = {
  path: '/' | '/vokabeln' | '/wiederholen' | '/fortschritt';
  slug: string;
  h1: RegExp;
  current: (typeof NAV)[number] | null;
};

const ROUTES: readonly Route[] = [
  { path: '/', slug: 'start', h1: /Wissen.*Verstehen.*Können/s, current: null },
  { path: '/vokabeln', slug: 'vokabeln', h1: /Vokabeln lernen – Englisch ↔ Deutsch/, current: 'Vokabeln' },
  { path: '/wiederholen', slug: 'wiederholen', h1: /Wiederholen über alle Lernpfade/, current: 'Wiederholen' },
  { path: '/fortschritt', slug: 'fortschritt', h1: /^Dein Fortschritt$/, current: 'Fortschritt' },
];

/** Öffnet eine Route mit MOCK-Quellen und wartet, bis ihr Inhalt steht. */
async function open(page: Page, route: Route): Promise<void> {
  if (route.path === '/wiederholen') await mockLiveSources(page, { python: 'unauthenticated', sql: 'ok', ai: 'ok' });
  if (route.path === '/fortschritt') await mockProgressSources(page, { python: 'ok', sql: 'ok', ai: 'ok' });
  await page.goto(route.path);
  await expect(page.getByRole('heading', { level: 1, name: route.h1 })).toBeVisible();
  if (route.path === '/wiederholen') await expect(page.getByText('LIVE · SQL')).toBeVisible();
  if (route.path === '/fortschritt') {
    await expect(page.getByRole('region', { name: 'Fällig insgesamt' }).locator('.progress-total')).toHaveText('6 fällig');
  }
  await page.evaluate(() => document.fonts.ready);
}

async function expectSharedHeader(page: Page, route: Route, width: number): Promise<void> {
  const header = page.locator('header.los-header');
  await expect(header).toHaveCount(1);
  expect(await header.evaluate((element) => getComputedStyle(element).backgroundColor), 'Kopfzeile in Ink').toBe(INK);

  const nav = page.getByRole('navigation', { name: 'Seitennavigation' });
  await expect(nav).toHaveCount(1);
  await expect(nav.getByRole('link')).toHaveText([...NAV]);
  await expect(nav.getByRole('link', { name: 'Pfade' })).toHaveAttribute('href', route.path === '/' ? '#lernpfade' : '/#lernpfade');
  for (const label of NAV) {
    const link = nav.getByRole('link', { name: label });
    if (label === route.current) await expect(link).toHaveAttribute('aria-current', 'page');
    else await expect(link).not.toHaveAttribute('aria-current', /./);
  }
  const brand = page.getByRole('link', { name: 'Lernpfade Startseite' });
  await expect(brand).toHaveAttribute('href', '/');
  if (route.path === '/') await expect(brand).toHaveAttribute('aria-current', 'page');

  // Unter 900 px eigene Zeile unter der Marke, darüber in einer Zeile daneben.
  const brandBox = (await brand.boundingBox())!;
  const navBox = (await nav.boundingBox())!;
  const viewport = await page.evaluate(() => document.documentElement.clientWidth);
  if (width <= 900) {
    expect(navBox.y, 'Navigation unter der Marke').toBeGreaterThanOrEqual(brandBox.y + brandBox.height - 1);
    // Eigene Zeile randlos über die ganze Breite (Fläche und Oberlinie ohne Lücke am Rand).
    expect(navBox.x, 'Navigationszeile beginnt am linken Rand').toBeLessThanOrEqual(0.5);
    expect(navBox.x + navBox.width, 'Navigationszeile reicht bis zum rechten Rand').toBeGreaterThanOrEqual(viewport - 0.5);
  } else {
    expect(Math.abs(navBox.y + navBox.height / 2 - (brandBox.y + brandBox.height / 2)), 'Navigation neben der Marke').toBeLessThan(8);
  }
  expect(navBox.x + navBox.width, 'Navigation im Bild').toBeLessThanOrEqual(viewport + 0.5);
}

async function expectSurfaces(page: Page, route: Route): Promise<void> {
  if (route.path === '/') {
    expect(await page.locator('.los-root').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(INK);
    return;
  }
  // Innere Ansichten: Papierfläche, darüber der dunkle Kopf direkt unter der Kopfzeile.
  const main = page.locator('main#hauptinhalt');
  expect(await main.evaluate((element) => getComputedStyle(element).backgroundColor), 'Papierfläche').toBe(PAPER);
  const head = main.locator('.los-head').filter({ has: page.locator('h1') });
  await expect(head).toHaveCount(1);
  const gap = await head.evaluate((element) => {
    const header = document.querySelector('header.los-header')!.getBoundingClientRect();
    return element.getBoundingClientRect().top + window.scrollY - (header.bottom + window.scrollY);
  });
  expect(Math.abs(gap), 'Kopf schließt an die Kopfzeile an').toBeLessThanOrEqual(1);
  expect(await head.evaluate((element) => getComputedStyle(element).backgroundImage)).toMatch(/gradient/);
}

async function expectNoClippedHeadings(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    return [...document.querySelectorAll('h1, h2, h3')].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0) return [];
      const clipped = element.scrollWidth > element.clientWidth + 1;
      const outside = rect.left < -1 || rect.right > viewport + 1;
      return clipped || outside ? [`${element.tagName} „${element.textContent}"`] : [];
    });
  });
  expect(problems, 'keine abgeschnittenen oder überstehenden Überschriften').toEqual([]);
}

for (const width of WIDTHS) {
  test(`${width} px: alle vier Routen im Learning OS – gemeinsame Kopfzeile, Flächen, eine H1, kein Überlauf, axe`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 640 ? 812 : 900 });
    await page.goto('/');
    await clearBrowserData(page);
    mkdirSync(SHOTS, { recursive: true });
    for (const route of ROUTES) {
      await open(page, route);
      await expect(page.locator('h1'), `${route.path}: genau eine H1`).toHaveCount(1);
      await expectSharedHeader(page, route, width);
      await expectSurfaces(page, route);
      expect(await horizontalOverflow(page), `${route.path}: kein horizontales Scrollen`).toBeLessThanOrEqual(0);
      await expectNoClippedHeadings(page);
      await expectNoSeriousA11yViolations(page, `${route.path} ${width} px`);
      await page.screenshot({ path: `${SHOTS}/learning-os-${route.slug}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
  });
}

/**
 * Geprüft wird die wirksame Dauer jeder Animation und jedes Übergangs
 * (`getComputedTiming().activeDuration`), nicht der Augenblickszustand
 * `playState`: Eine auf 0,01 ms verkürzte Animation kann direkt nach dem Laden
 * noch „running" melden, bis der nächste Frame tickt (CI-Befund auf PR #77,
 * 2 laufende Orbit-Animationen). Die Dauer ist dagegen sofort bekannt und
 * unabhängig vom Frame-Takt.
 */
const MAX_REDUCED_MS = 0.02;

test('reduzierte Bewegung: keine Animation länger als 0,02 ms auf allen Routen; ohne Einstellung dreht der Orbit', async ({ page }) => {
  const durations = (): Promise<number[]> =>
    page.evaluate(() => document.getAnimations().map((animation) => Number(animation.effect?.getComputedTiming().activeDuration ?? 0)));

  await page.goto('/');
  expect(await durations(), 'Gegenprobe: ohne Einstellung dreht der Orbit endlos').toContain(Infinity);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ROUTES) {
    await open(page, route);
    for (const duration of await durations()) {
      expect(duration, `${route.path}: wirksame Animationsdauer`).toBeLessThanOrEqual(MAX_REDUCED_MS);
    }
  }
  await page.goto('/');
  const track = page.getByRole('link', { name: 'PythonPfad öffnen' });
  await track.hover();
  for (const duration of await durations()) {
    expect(duration, 'auch Hover löst keine sichtbare Bewegung aus').toBeLessThanOrEqual(MAX_REDUCED_MS);
  }
  // Die Übergänge der Pfadzeile und ihres Pfeils sind selbst verkürzt (bereits beendete fehlen in getAnimations()).
  const configured = await track.evaluate((element) =>
    [element, element.querySelector('.los-track-arrow')!].flatMap((node) =>
      getComputedStyle(node).transitionDuration.split(',').map((value) => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)),
    ),
  );
  expect(configured.length).toBeGreaterThan(0);
  for (const duration of configured) {
    expect(duration, 'Übergangsdauer der Pfadzeile bei reduzierter Bewegung').toBeLessThanOrEqual(MAX_REDUCED_MS);
  }
});

test('Tastatur: Sprunglink zuerst, sichtbar, führt in den Hauptinhalt; Fokus in Lime auf dunklen Flächen', async ({ page }) => {
  for (const route of ROUTES) {
    await open(page, route);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Direkt zum Hauptinhalt' });
    await expect(skip, `${route.path}: Sprunglink ist der erste Halt`).toBeFocused();
    await expect(skip).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    const inMain = await page.evaluate(() => Boolean(document.activeElement?.closest('main#hauptinhalt')));
    expect(inMain, `${route.path}: nach dem Sprung landet der Fokus im Hauptinhalt`).toBe(true);
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline, `${route.path}: sichtbarer Fokus`).not.toBe('none');

    const navLink = page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('link', { name: 'Fortschritt' });
    await navLink.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(navLink).toBeFocused();
    expect(await navLink.evaluate((element) => getComputedStyle(element).outlineColor), 'Lime auf Ink').toBe(LIME);
  }
});

test('Startseite: Pfadzeilen nur mit konfigurierten Zielen, Status aus dem Katalog, keine Fremdanfragen', async ({ page }) => {
  const seen = recordRequests(page);
  await page.goto('/');
  const expected = [
    ['PythonPfad öffnen', MOCK_SOURCE_ORIGINS.python, 'Verfügbar'],
    ['SQLPfad öffnen', MOCK_SOURCE_ORIGINS.sql, 'Verfügbar'],
    ['Git & GitHub öffnen', `${MOCK_SOURCE_ORIGINS.ai}/lektion/warum-versionsverwaltung/1`, 'Verfügbar'],
    ['AIPfad öffnen', MOCK_SOURCE_ORIGINS.ai, 'In Ausbau'],
  ] as const;
  const tracks = page.getByRole('region', { name: /Dein nächster.*Sprung/s }).getByRole('link');
  await expect(tracks).toHaveCount(expected.length);
  for (const [name, href, status] of expected) {
    const link = page.getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAccessibleDescription(new RegExp(`^${status} `));
  }
  await expect(page.locator('.los-track-inactive')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'JOINs im SQLPfad vertiefen' })).toHaveAttribute('href', MOCK_SOURCE_ORIGINS.sql);

  // Geplante Pfade: sichtbar, aber nie als Link.
  const planned = page.locator('.los-roadmap');
  await expect(planned.getByRole('listitem')).toHaveText([/TypeScriptPfad/, /Data & Analytics/, /Agenten & Automation/, /SecurityPfad/]);
  await expect(planned.getByRole('link')).toHaveCount(0);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /index/);
  await expect(page.locator('meta[name=robots]')).not.toHaveAttribute('content', /noindex/);

  // Lernmoment: Probe ohne Speicherung.
  await page.getByRole('button', { name: /Zusammengehörige Datensätze/ }).click();
  await expect(page.getByText('Genau. Du hast es verstanden.')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.length), 'Lernmoment speichert nichts').toBe(0);

  const foreign = seen.filter((request) => !request.url.startsWith(HUB_ORIGIN) && !/^(data|blob):/.test(request.url));
  expect(foreign, 'Startseite fragt nichts außerhalb des Hubs an (keine Fonts, CDNs, Tracker)').toEqual([]);
});

test('Innere Ansichten: nur Hub und freigeschaltete MOCK-Quellen, nur lesende Plattformabrufe', async ({ page }) => {
  const seen = recordRequests(page);
  for (const route of ROUTES.slice(1)) await open(page, route);
  const mockOrigins = Object.values(MOCK_SOURCE_ORIGINS) as string[];
  const outside = seen.filter(
    (request) =>
      !request.url.startsWith(HUB_ORIGIN) &&
      !/^(data|blob):/.test(request.url) &&
      !mockOrigins.some((origin) => request.url.startsWith(origin)),
  );
  expect(outside, 'keine Fremdanfragen').toEqual([]);
  const toSources = seen.filter((request) => mockOrigins.some((origin) => request.url.startsWith(origin)));
  expect(toSources.length).toBeGreaterThan(0);
  for (const request of toSources) {
    expect(request.method).toBe('GET');
    expect(new URL(request.url).pathname).toMatch(/^\/api\/platform\/(review|progress)-source$/);
  }
});

test('VokabelPfad: Lernmodus direkt unter dem Kopf, Decks und Import erreichbar, Bereichslinks führen ans Ziel', async ({ page }) => {
  await page.goto('/');
  await clearBrowserData(page);
  await open(page, ROUTES[1]);
  const order = await page.evaluate(() =>
    ['vocab-title', 'session-title', 'stats-title', 'decks-title', 'starter-title', 'import-title'].map(
      (id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY,
    ),
  );
  expect([...order].sort((a, b) => a - b), 'Kopf → Lernmodus → Stand → Decks → Starterdecks → Import').toEqual(order);

  const jump = page.getByRole('navigation', { name: 'Bereiche im VokabelPfad' });
  await expect(jump.getByRole('link')).toHaveText(['Lernmodus', 'Decks & Export', 'Starterdecks', 'Deck importieren']);
  for (const link of await jump.getByRole('link').all()) {
    const target = (await link.getAttribute('href'))!;
    await expect(page.locator(target), `${target} existiert`).toHaveCount(1);
  }
  await jump.getByRole('link', { name: 'Deck importieren' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Deck importieren' })).toBeInViewport();
  await expect(page.getByRole('complementary', { name: 'Speicherort deiner Daten' })).toContainText('Nur in diesem Browser gespeichert.');
});

test('Wiederholen: LIVE, LOKAL und DEMO in getrennten Bahnen, ohne Vermischung', async ({ page }) => {
  await open(page, ROUTES[2]);
  const live = page.getByRole('region', { name: 'Fällig in deinen Lernpfaden' });
  const local = page.getByRole('region', { name: 'VokabelPfad: deine eigenen Decks' });
  const demo = page.getByRole('region', { name: 'Beispiel-Deck' });
  const tops = await Promise.all([live, local, demo].map(async (region) => (await region.boundingBox())!.y));
  expect([...tops].sort((a, b) => a - b), 'Reihenfolge LIVE → LOKAL → DEMO').toEqual(tops);

  await expect(live).toContainText('LIVE · nur gelesen aus den Apps');
  await expect(live).toContainText('In PythonPfad bist du nicht angemeldet.');
  await expect(live).not.toContainText('DEMO ·');
  await expect(live).not.toContainText('LOKAL ·');
  await expect(local).toContainText('LOKAL · nur in diesem Browser');
  await expect(local).not.toContainText(/LIVE ·|DEMO ·/);
  await expect(demo).toContainText('DEMO · Beispiel');
  await expect(demo).not.toContainText(/LIVE ·|LOKAL ·/);

  const lanes = page.locator('header.los-head .los-lanes dt');
  await expect(lanes).toHaveText(['LIVE', 'LOKAL', 'DEMO']);
});

test('Fortschritt: ruhige Zeilen statt Kartenraster, keine Prozentwerte, Zeilen bei 375 px gestapelt', async ({ page }) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, ROUTES[3]);
    const text = await page.locator('main').innerText();
    expect(text, 'keine Prozentangaben auf /fortschritt').not.toMatch(/\d\s*%/);
    const cards = page.locator('.progress-card');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      const side = (await card.locator('.progress-card-side').boundingBox())!;
      const main = (await card.locator('.progress-card-main').boundingBox())!;
      if (width === 1280) {
        expect(main.x, 'Kennzahlen rechts neben dem Pfadnamen').toBeGreaterThan(side.x + side.width - 1);
      } else {
        expect(main.y, 'gestapelt').toBeGreaterThanOrEqual(side.y + side.height - 1);
      }
    }
    // Eine Spalte von Zeilen: alle Pfade beginnen an derselben linken Kante.
    const lefts = await cards.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);
  }
  // Die große Zahl hat einen eigenen Abstand zum Wort („6 fällig", nicht „6fällig").
  const gap = await page.locator('.progress-total strong').evaluate((element) => {
    const style = getComputedStyle(element);
    return parseFloat(style.marginRight) / parseFloat(style.fontSize);
  });
  expect(gap, 'Abstand nach der Gesamtzahl').toBeGreaterThanOrEqual(0.1);
});

/**
 * Laufweiten-Untergrenzen aus der Schriftprobe (LO-UI-001, Linux-Sichtprüfung):
 * Enger berühren sich Buchstaben in Arial/Times (Linux, Windows); die Wortmarke
 * las sich bei -0.065em auch auf macOS als „lempfade.". Geprüft wird die
 * berechnete Laufweite relativ zur Schriftgröße, weil Pixelvergleiche an den
 * Plattformschriften scheitern.
 */
test('Typografie: Wortmarke und Display-Überschriften nie enger als die geprüften Untergrenzen', async ({ page }) => {
  const floors: Array<{ route: Route['path']; selector: string; floor: number }> = [
    { route: '/', selector: '.los-header .los-brand', floor: -0.03 },
    { route: '/', selector: '.los-footer-wordmark', floor: -0.03 },
    { route: '/', selector: '.los-hero h1', floor: -0.055 },
    { route: '/', selector: '.los-hero h1 em', floor: -0.04 },
    { route: '/', selector: '.los-statement h2', floor: -0.055 },
    { route: '/', selector: '.los-statement h2 em', floor: -0.04 },
    { route: '/', selector: '.los-tracks-header h2', floor: -0.055 },
    { route: '/', selector: '.los-track-identity h3', floor: -0.055 },
    { route: '/', selector: '.los-moment-intro h2', floor: -0.055 },
    { route: '/', selector: '.los-vocab-inner h2', floor: -0.055 },
    { route: '/', selector: '.los-vocab-inner h2 em', floor: -0.04 },
    { route: '/', selector: '.los-footer-top p', floor: -0.055 },
    { route: '/vokabeln', selector: '.los-head h1', floor: -0.045 },
    { route: '/vokabeln', selector: '.los-head h1 em', floor: -0.04 },
    { route: '/wiederholen', selector: '.los-head h1', floor: -0.045 },
    { route: '/wiederholen', selector: '.review-prompt', floor: -0.035 },
    { route: '/fortschritt', selector: '.los-head h1', floor: -0.045 },
  ];
  let current = '';
  for (const { route, selector, floor } of floors) {
    if (route !== current) {
      await open(page, ROUTES.find((entry) => entry.path === route)!);
      current = route;
    }
    const elements = page.locator(selector);
    expect(await elements.count(), `${route} ${selector} vorhanden`).toBeGreaterThan(0);
    const ratios = await elements.evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        const spacing = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing);
        return spacing / parseFloat(style.fontSize);
      }),
    );
    for (const ratio of ratios) {
      expect(ratio, `${route} ${selector}: Laufweite ${ratio.toFixed(3)}em`).toBeGreaterThanOrEqual(floor - 0.0005);
    }
  }
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('SSR: Kopfzeile, H1 und echte Links auf allen Routen; VokabelPfad erklärt, warum er JavaScript braucht', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: ROUTES[0].h1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entdecke deinen Pfad' })).toHaveAttribute('href', '#lernpfade');
    await expect(page.getByRole('link', { name: 'SQLPfad öffnen' })).toHaveAttribute('href', MOCK_SOURCE_ORIGINS.sql);
    await expect(page.getByRole('navigation', { name: 'Fußnavigation' }).getByRole('link')).toHaveText(['Vokabeln', 'Wiederholen', 'Fortschritt']);

    await page.goto('/vokabeln');
    await expect(page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('link', { name: 'Vokabeln' })).toHaveAttribute('aria-current', 'page');
    // Ohne JavaScript bleibt der Ladekopf; der Hinweis erscheint verzögert statt sofort.
    const hint = page.getByText(/Lädt VokabelPfad nicht\? Er braucht JavaScript/);
    expect(await hint.evaluate((element) => getComputedStyle(element).animationDelay), 'erst nach 4 s').toBe('4s');
    await expect(hint).toBeVisible();

    await page.goto('/wiederholen');
    await expect(page.getByRole('heading', { level: 1, name: ROUTES[2].h1 })).toBeVisible();
    await expect(page.locator('header.los-head .los-lanes dt')).toHaveText(['LIVE', 'LOKAL', 'DEMO']);
    await expect(page.getByRole('region', { name: 'VokabelPfad: deine eigenen Decks' }).getByRole('link', { name: 'Zum VokabelPfad' })).toHaveAttribute('href', '/vokabeln');

    await page.goto('/fortschritt');
    await expect(page.getByRole('heading', { level: 1, name: ROUTES[3].h1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Deine Pfade' })).toBeVisible();

    await page.goto('/gibt-es-nicht-lo-ui-001');
    await expect(page.getByRole('navigation', { name: 'Seitennavigation' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});
