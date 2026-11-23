import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { onboardingAbschliessen, registriere } from './helfer';
import {
  erwarteKeineSchwerenAxeBefunde,
  erwarteVertrag,
  horizontalOverflow,
  verschachtelteLiveRegionen,
} from './feedback-pruefung';

/**
 * LP-03B — Badges und Callouts in AIPfad aus dem gemeinsamen Statusvertrag,
 * geprüft an echten Seiten mit einem synthetischen Konto. Vorher: eigene
 * Tailwind-Farben, Monospace-Titel und „Gefährlich" als allgemeiner
 * Fehlertitel. Fachinhalte (Befehle, Code) im Text behalten ihre Schrift.
 */

const SHOTS = 'test-results/screenshots';
const BREITEN = [375, 640, 1280];

async function anmeldenMitBegonnenerLektion(page: Page): Promise<string> {
  await registriere(page);
  await onboardingAbschliessen(page);
  await page.goto('/pfad');
  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await page.waitForURL(/\/lektion\//);
  await page.goto('/labs');
  const lab = await page.locator('main a[href^="/labs/"]').first().getAttribute('href');
  expect(lab).toBeTruthy();
  return lab!;
}

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

test('echte Seiten: Vertragsfarben, Kontrast, Umbruch — System hell und dunkel, 375/640/1280 px', async ({
  page,
}) => {
  const lab = await anmeldenMitBegonnenerLektion(page);
  const stellen = [
    {
      route: '/pfad',
      finde: () => page.locator('.lp-feedback-badge', { hasText: /^Begonnen$/ }).first(),
      tone: 'in-progress',
    },
    {
      route: '/pfad',
      finde: () => page.locator('.lp-feedback-badge', { hasText: /^Offen$/ }).first(),
      tone: 'neutral',
    },
    {
      route: lab,
      finde: () => page.locator('.lp-feedback-callout', { hasText: 'Anleitung' }).first(),
      tone: 'info',
    },
  ];
  for (const schema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: schema, reducedMotion: 'reduce' });
    for (const stelle of stellen) {
      for (const breite of BREITEN) {
        await test.step(`${stelle.route} ${stelle.tone} ${breite} px ${schema}`, async () => {
          await page.setViewportSize({ width: breite, height: 900 });
          await page.goto(stelle.route);
          const element = stelle.finde();
          await expect(element).toBeVisible();
          await expect(element).toHaveAttribute('data-lp-tone', stelle.tone);
          await erwarteVertrag(element, schema, `${stelle.route} ${breite} px ${schema}`);
          expect(await horizontalOverflow(page), 'kein waagerechtes Scrollen').toBeLessThanOrEqual(
            0,
          );
          if (breite !== 640)
            await bild(
              page,
              `status-ai-${stelle.route.split('/').filter(Boolean)[0]}-${stelle.tone}-${breite}-${schema}`,
            );
        });
      }
      await erwarteKeineSchwerenAxeBefunde(page, `${stelle.route} 1280 px ${schema}`);
    }
  }
});

test('ausgewähltes Farbschema schlägt das System — in beide Richtungen', async ({ page }) => {
  await anmeldenMitBegonnenerLektion(page);
  const begonnen = page.locator('.lp-feedback-badge', { hasText: /^Begonnen$/ }).first();
  for (const [system, gewaehlt] of [
    ['light', 'dark'],
    ['dark', 'light'],
  ] as const) {
    await page.emulateMedia({ colorScheme: system });
    await page.goto('/pfad');
    await page.evaluate((wert) => localStorage.setItem('aipfad-theme', wert), gewaehlt);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', gewaehlt);
    await erwarteVertrag(begonnen, gewaehlt, `System ${system}, gewählt ${gewaehlt}`);
    await bild(page, `status-ai-pfad-1280-system-${system}-gewaehlt-${gewaehlt}`);
  }
});

test('Fehler beim Anmelden: „Anmeldung nicht möglich" statt „Gefährlich", höflich, kein Fokuswechsel', async ({
  page,
}) => {
  for (const schema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.goto('/anmelden');
    await page.getByLabel('E-Mail-Adresse').fill('niemand-lp03b@example.org');
    await page.getByLabel('Passwort').fill('falsches-passwort-2026');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    const meldung = page.locator('.lp-feedback-callout[data-lp-tone="danger"]');
    await expect(meldung).toBeVisible();
    await expect(meldung.locator('.lp-feedback-title')).toHaveText('Anmeldung nicht möglich');
    await expect(meldung).toHaveAttribute('role', 'status');
    await expect(meldung).toHaveAttribute('aria-live', 'polite');
    expect(await page.locator('.lp-feedback[role="alert"]').count()).toBe(0);
    expect(await verschachtelteLiveRegionen(page), 'keine verschachtelten Live-Regionen').toBe(0);
    expect(
      await meldung.evaluate((node) => node.contains(document.activeElement)),
      'die Meldung nimmt nicht den Fokus',
    ).toBe(false);
    await erwarteVertrag(meldung, schema, `Anmeldefehler ${schema}`);
    // Bestandsbefund außerhalb der Meldung: der Registrieren-Link der Seite
    // (`text-signal-500`) hat im Dunkeln zu wenig Kontrast, auch auf dem
    // unveränderten Stand. Hier zählt die Meldung selbst.
    await erwarteKeineSchwerenAxeBefunde(page, `Anmeldefehler ${schema}`, '.lp-feedback');
    await bild(page, `status-ai-anmelden-fehler-1280-${schema}`);
  }
});
