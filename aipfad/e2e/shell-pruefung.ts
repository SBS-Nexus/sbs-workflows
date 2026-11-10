import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Prüfhilfen für die Lernpfade-Shell (LP-03A): Kopf, Hauptnavigation,
 * Menüs und Plattform-Dachleiste — gleich in PythonPfad, SQLPfad und AIPfad.
 *
 * „Sichtbar" heißt hier mehr als `isVisible()`: vollständig im Bild und an
 * der Mitte nicht von etwas anderem verdeckt (klebender Kopf, untere Leiste,
 * abschneidender Container). Dokumentüberlauf allein belegt das nicht.
 */

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

export async function istWirklichSichtbar(locator: Locator): Promise<boolean> {
  if (!(await locator.isVisible().catch(() => false))) return false;
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    if (rect.left < -0.5 || rect.right > document.documentElement.clientWidth + 0.5) return false;
    if (rect.top < -0.5 || rect.bottom > window.innerHeight + 0.5) return false;
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit !== null && (hit === element || element.contains(hit));
  });
}

export async function erwarteWirklichSichtbar(locator: Locator, label: string): Promise<void> {
  await expect(locator, label).toBeVisible();
  expect(await istWirklichSichtbar(locator), `${label}: im Bild und nicht verdeckt`).toBe(true);
}

/** Die eine sichtbare Hauptnavigation (Kopf ab 640 px, untere Leiste darunter). */
export async function sichtbareHauptnavigation(page: Page): Promise<Locator> {
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await expect(nav, 'genau eine sichtbare Hauptnavigation').toHaveCount(1);
  return nav;
}

/** Sichtbare Beschriftung jedes Links — ohne Zahl-Badge und ohne Screenreader-Zusatz. */
export async function beschriftungen(nav: Locator): Promise<string[]> {
  return nav.getByRole('link').evaluateAll((links) =>
    links.map((link) => {
      const kopie = link.cloneNode(true) as HTMLElement;
      kopie.querySelectorAll('.lp-shell-badge, .sr-only').forEach((teil) => teil.remove());
      return (kopie.textContent ?? '').replace(/\s+/g, ' ').trim();
    }),
  );
}

/** Das fokussierte Element hat einen sichtbaren Rahmen und liegt sichtbar im Bild. */
export async function erwarteSichtbarenFokus(page: Page, label: string): Promise<void> {
  /*
   * Zwei Bildaufbauten abwarten: Unter „Bewegung reduzieren" setzen die Apps
   * jede Übergangsdauer auf 0,01 ms — auch für den Fokusrahmen, der dann für
   * diesen Augenblick bei 0 px beginnt. Gemessen wird der dargestellte Stand.
   */
  await page.evaluate(
    () =>
      new Promise<void>((fertig) =>
        requestAnimationFrame(() => requestAnimationFrame(() => fertig())),
      ),
  );
  const fokus = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      name: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 60),
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      inView:
        rect.width > 0 &&
        rect.top >= -0.5 &&
        rect.bottom <= window.innerHeight + 0.5 &&
        rect.left >= -0.5 &&
        rect.right <= document.documentElement.clientWidth + 0.5,
      unverdeckt: hit !== null && (hit === element || element.contains(hit)),
    };
  });
  expect(fokus, `${label}: es ist etwas fokussiert`).not.toBeNull();
  expect(fokus!.outlineStyle, `${label}: Fokusrahmen (${fokus!.name})`).not.toBe('none');
  expect(
    fokus!.outlineWidth,
    `${label}: Fokusrahmen breit genug (${fokus!.name})`,
  ).toBeGreaterThanOrEqual(2);
  expect(fokus!.inView, `${label}: Fokus im Bild (${fokus!.name})`).toBe(true);
  expect(fokus!.unverdeckt, `${label}: Fokus nicht verdeckt (${fokus!.name})`).toBe(true);
}

/**
 * axe (WCAG 2.x A/AA) ohne serious/critical-Befunde. Mit `nurShell` wird nur
 * die Shell geprüft — für den Zustand „Menü offen": Ein aufgeklapptes Menü
 * überdeckt Ziele im Inhalt, und axe wertet verdeckte Ziele als zu klein.
 * Die ganze Seite wird zusätzlich mit geschlossenem Menü geprüft.
 */
export async function erwarteKeineSchwerenAxeBefunde(
  page: Page,
  label: string,
  { nurShell = false }: { nurShell?: boolean } = {},
): Promise<void> {
  let pruefung = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22a',
    'wcag22aa',
  ]);
  if (nurShell) pruefung = pruefung.include('.lp-shell');
  const ergebnis = await pruefung.analyze();
  const schwer = ergebnis.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    schwer.map(
      (v) =>
        `${v.impact}: ${v.id} — ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`,
    ),
    `${label}: keine serious/critical axe-Befunde`,
  ).toEqual([]);
}

/** WCAG-Kontrast zweier berechneter Farben im Format `rgb(r, g, b)`. */
export function kontrast(a: string, b: string): number {
  const luminanz = (farbe: string): number => {
    const [r, g, bl] = (farbe.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((wert) => {
      const kanal = Number(wert) / 255;
      return kanal <= 0.03928 ? kanal / 12.92 : ((kanal + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hell, dunkel] = [luminanz(a), luminanz(b)].sort((x, y) => y - x);
  return (hell! + 0.05) / (dunkel! + 0.05);
}

export async function stil(locator: Locator, eigenschaft: string): Promise<string> {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    eigenschaft,
  );
}

/**
 * Erwartete Hub-Ziele — unabhängig vom App-Code aus der Umgebung abgeleitet:
 * ohne Angabe keine, sonst Basis ohne abschließende Schrägstriche.
 */
export function erwarteteHubZiele(): { home: string; review: string; progress: string } | null {
  const roh = process.env.NEXT_PUBLIC_LEARNING_HUB_URL?.trim();
  if (!roh) return null;
  const basis = roh.replace(/\/+$/, '');
  return { home: basis, review: `${basis}/wiederholen`, progress: `${basis}/fortschritt` };
}

export async function erwartePlattformleiste(page: Page): Promise<void> {
  const erwartet = erwarteteHubZiele();
  const plattform = page.getByRole('navigation', { name: 'Lernpfade-Plattform' });
  if (erwartet === null) {
    await expect(plattform, 'ohne Hub-Adresse keine Plattformnavigation').toHaveCount(0);
    return;
  }
  await expect(plattform).toBeVisible();
  const links = plattform.getByRole('link');
  await expect(links).toHaveText(['Alle Pfade', 'Alle Wiederholungen', 'Gesamtfortschritt']);
  expect(await links.evaluateAll((a) => a.map((link) => link.getAttribute('href')))).toEqual([
    erwartet.home,
    erwartet.review,
    erwartet.progress,
  ]);
  for (const link of await links.all())
    await erwarteWirklichSichtbar(link, `Plattformziel ${await link.textContent()}`);
}

/** Tab (oder Umschalt+Tab), bis `ziel` fokussiert ist; jeder Halt hat sichtbaren Fokus. */
export async function tabBis(
  page: Page,
  ziel: Locator,
  label: string,
  maximal = 40,
  taste: 'Tab' | 'Shift+Tab' = 'Tab',
): Promise<void> {
  for (let schritt = 0; schritt < maximal; schritt += 1) {
    if (await ziel.evaluate((element) => element === document.activeElement).catch(() => false))
      return;
    await page.keyboard.press(taste);
    await erwarteSichtbarenFokus(page, `${label}, Tab ${schritt + 1}`);
  }
  await expect(ziel, `${label}: per Tab erreichbar`).toBeFocused();
}

/** Offene, sichtbare Menü-Panels mit ihrer linken und rechten Kante. */
export async function offeneMenues(page: Page): Promise<Array<{ links: number; rechts: number }>> {
  return page.locator('.lp-shell-menu-panel:not([hidden])').evaluateAll((panels) =>
    panels
      .filter((panel) => panel.getClientRects().length > 0)
      .map((panel) => {
        const rect = panel.getBoundingClientRect();
        return { links: rect.left, rechts: rect.right };
      }),
  );
}

/** Jedes offene Menü-Panel liegt vollständig im Bild. */
export async function erwarteMenueImBild(page: Page, label: string): Promise<void> {
  const breite = await page.evaluate(() => document.documentElement.clientWidth);
  const panels = await offeneMenues(page);
  expect(panels.length, `${label}: ein offenes Menü`).toBe(1);
  for (const panel of panels) {
    expect(panel.links, `${label}: linke Kante im Bild`).toBeGreaterThanOrEqual(0);
    expect(panel.rechts, `${label}: rechte Kante im Bild`).toBeLessThanOrEqual(breite);
  }
}

/**
 * Der Fokus ist brauchbar: abgegeben (Dokument) oder auf einem sichtbaren
 * Element, das in keinem verborgenen Bereich liegt.
 */
export async function erwarteBrauchbarenFokus(page: Page, label: string): Promise<void> {
  const befund = await page.evaluate(() => {
    const aktiv = document.activeElement;
    if (aktiv === null || aktiv === document.body) return 'abgegeben';
    if (aktiv.closest('[hidden]') !== null) return 'in verborgenem Bereich';
    if (aktiv.getClientRects().length === 0) return 'auf unsichtbarem Element';
    return 'sichtbar';
  });
  expect(['abgegeben', 'sichtbar'], `${label}: Fokus ${befund}`).toContain(befund);
}
