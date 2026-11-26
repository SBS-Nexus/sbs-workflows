import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations, horizontalOverflow } from './helpers';

/**
 * Work-Befund (LP-07): Auf Desktop lief eine Hero-Zeile unter die Grafik.
 * Geprüft wird die tatsächliche Geometrie: Jede Textzeile der Überschrift liegt
 * vollständig im Bild und überschneidet die Grafik nicht. Ein Seitenüberlauf
 * allein würde den Fehler nicht zeigen (die Grafik verdeckt, ohne die Seite zu
 * verbreitern). Dieselbe Prüfung gilt für die VokabelPfad-Überschrift.
 *
 * Seit dem Learning OS ist die Grafik der Wissensorbit (`.los-instrument`)
 * bzw. die RECALL-Tafel (`.los-vocab-art`); die Prüfung bleibt dieselbe.
 */

const SHOTS = 'test-results/screenshots';

type Box = { left: number; right: number; top: number; bottom: number };

/** Zeilenboxen des Texts (nicht der Block-Box) und die Box der Grafik daneben. */
async function textAndGraphic(page: Page, textSelector: string, graphicSelector: string) {
  return page.evaluate(
    ([textSel, graphicSel]) => {
      const toBox = (rect: DOMRect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
      const heading = document.querySelector(textSel)!;
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      const lines: ReturnType<typeof toBox>[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) if (rect.width > 0) lines.push(toBox(rect));
      }
      return {
        lines,
        graphic: toBox(document.querySelector(graphicSel)!.getBoundingClientRect()),
        viewport: document.documentElement.clientWidth,
        text: heading.textContent,
      };
    },
    [textSelector, graphicSelector] as const,
  );
}

const overlaps = (a: Box, b: Box): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

async function expectReadable(page: Page, textSelector: string, graphicSelector: string, label: string): Promise<void> {
  await page.locator(textSelector).scrollIntoViewIfNeeded();
  const { lines, graphic, viewport, text } = await textAndGraphic(page, textSelector, graphicSelector);
  expect(lines.length, `${label}: Text vorhanden`).toBeGreaterThan(0);
  for (const line of lines) {
    expect(line.left, `${label}: Zeile im Bild`).toBeGreaterThanOrEqual(0);
    expect(line.right, `${label}: Zeile im Bild`).toBeLessThanOrEqual(viewport);
    expect(overlaps(line, graphic), `${label}: „${text}" liegt nicht unter der Grafik`).toBe(false);
  }
}

for (const width of [900, 901, 920, 1000, 1280, 1440]) {
  test(`${width} px: Hero- und VokabelPfad-Überschrift vollständig lesbar, nichts unter der Grafik`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    expect(await horizontalOverflow(page), 'kein horizontales Scrollen').toBeLessThanOrEqual(0);
    await expectReadable(page, '.los-hero h1', '.los-instrument', 'Hero');
    await expectReadable(page, '.los-hero-lead', '.los-instrument', 'Hero-Text');
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width === 920) {
      mkdirSync(SHOTS, { recursive: true });
      await page.screenshot({ path: `${SHOTS}/startseite-desktop-${width}.png` });
    }
    await expectReadable(page, '.los-vocab-inner h2', '.los-vocab-art', 'VokabelPfad');

    // Einstieg zu /fortschritt bleibt sichtbar.
    await expect(page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('link', { name: 'Fortschritt' })).toBeVisible();
    if (width === 1280) await expectNoSeriousA11yViolations(page, `${width} px Startseite`);
  });
}
