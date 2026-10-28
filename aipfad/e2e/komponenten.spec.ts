import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { onboardingAbschliessen, registriere } from './helfer';
import { erwarteKeineSchwerenAxeBefunde } from './feedback-pruefung';
import {
  AKZENT,
  erwarte404,
  erwarteEinsinken,
  erwarteFokusring,
  erwarteFortschritt,
  erwarteLeerzustand,
  erwarteOhneUebergang,
  erwarteTragenderKnopf,
  horizontalOverflow,
  messe,
} from './komponenten-pruefung';

/**
 * LP-03C — Button, Card, ProgressBar, EmptyState und ErrorState in AIPfad
 * aus dem gemeinsamen Komponentenvertrag, geprüft an echten Seiten mit einem
 * synthetischen Konto. Knopfbeschriftungen stehen in der Produktschrift;
 * Monospace bleibt Fachinhalten (LEARNING-DESIGN-SYSTEM §6).
 */

const SHOTS = 'test-results/screenshots';

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function anmelden(page: Page): Promise<void> {
  await registriere(page);
  await onboardingAbschliessen(page);
}

test('/pfad: Fortschritt „x von y", betonter nächster Schritt, Knopf im Bernstein-Akzent', async ({
  page,
}) => {
  await anmelden(page);
  for (const schema of ['light', 'dark'] as const) {
    for (const breite of [375, 1280]) {
      await test.step(`${schema} ${breite} px`, async () => {
        await page.emulateMedia({ colorScheme: schema });
        await page.setViewportSize({ width: breite, height: 900 });
        await page.goto('/pfad');
        await erwarteFortschritt(page.locator('.lp-ui-progress').first(), /^0 von \d+$/, 'Pfad');
        const naechster = page.locator('.lp-ui-card[data-lp-emphasis="accent"]');
        await expect(naechster).toContainText('Nächster Schritt');
        expect((await messe(naechster)).edge, 'Akzentrand').toBe(AKZENT.ai[schema]![0]);
        const knopf = naechster.getByRole('link', { name: 'Weiterlernen' });
        await erwarteTragenderKnopf(knopf, AKZENT.ai[schema]!, `Weiterlernen ${schema}`);
        await erwarteEinsinken(page, knopf, `Weiterlernen ${schema}`);
        await erwarteFokusring(page, knopf, `Weiterlernen ${schema}`);
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
        await bild(page, `komponenten-ai-pfad-${breite}-${schema}`);
      });
    }
    await erwarteKeineSchwerenAxeBefunde(page, `/pfad ${schema}`);
  }
});

test('/labs: jedes Lab ist eine klickbare Karte mit Unterkante und Fokusring', async ({ page }) => {
  await anmelden(page);
  await page.goto('/labs');
  const karten = page.locator('a.lp-ui-card[data-lp-card="interactive"]');
  expect(await karten.count(), 'eine Karte je Lab').toBeGreaterThan(3);
  const erste = karten.first();
  await expect(erste).toHaveAttribute('href', /^\/labs\//);
  expect((await messe(erste)).edgeWidth).toBe(4);
  await erwarteEinsinken(page, erste, 'Lab-Karte');
  await erwarteFokusring(page, erste, 'Lab-Karte');
  await erwarteKeineSchwerenAxeBefunde(page, '/labs');
});

test('Bewegung reduzieren und erledigtes Wiederholen', async ({ page }) => {
  await anmelden(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pfad');
  const knopf = page.getByRole('link', { name: 'Weiterlernen' });
  await erwarteOhneUebergang(knopf, 'System');
  await erwarteEinsinken(page, knopf, 'System, reduziert');
  await page.goto('/wiederholen');
  await erwarteLeerzustand(page.locator('.lp-ui-empty'), 'done', 'Heute nichts fällig');
});

test('Unbekannte Adresse: 404 mit gemeinsamem Fehlerzustand — hell, dunkel, mobil', async ({
  page,
}) => {
  for (const [schema, breite] of [
    ['light', 1280],
    ['dark', 1280],
    ['light', 375],
  ] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.setViewportSize({ width: breite, height: 800 });
    const zustand = await erwarte404(page, '/gibt-es-nicht-lp03c', `404 ${schema} ${breite}`);
    await erwarteTragenderKnopf(
      zustand.getByRole('link', { name: 'Zum Lernpfad' }),
      AKZENT.ai[schema]!,
      `404 ${schema}`,
    );
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await erwarteKeineSchwerenAxeBefunde(page, `404 ${schema} ${breite}`);
    await bild(page, `komponenten-ai-404-${breite}-${schema}`);
  }
});
