import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';
import {
  erwarteKeineSchwerenAxeBefunde,
  erwarteVertrag,
  horizontalOverflow,
  verschachtelteLiveRegionen,
} from './feedback-pruefung';

/**
 * LP-03B — Badges und Callouts in PythonPfad aus dem gemeinsamen
 * Statusvertrag, geprüft an echten Seiten mit einem synthetischen Konto
 * (keine Testgalerie). Gleiche Töne müssen in allen Lernpfaden dieselben
 * berechneten Farben zeigen; die Werte stehen in `feedback-pruefung.ts`.
 */

const SHOTS = 'test-results/screenshots';
const BREITEN = [375, 640, 1280];

async function anmelden(page: Page): Promise<void> {
  await register(page, freshAccount());
  await completeOnboarding(page);
}

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

/** Reale Aufrufstellen: Route, Element, erwarteter Zustand. */
const STELLEN = [
  {
    route: '/wiederholen',
    finde: (page: Page) => page.locator('.lp-feedback-badge', { hasText: 'gesperrt' }).first(),
    tone: 'locked',
  },
  {
    route: '/projekte',
    finde: (page: Page) =>
      page.locator('.lp-feedback-badge', { hasText: 'noch nicht begonnen' }).first(),
    tone: 'neutral',
  },
  {
    route: '/profil',
    finde: (page: Page) =>
      page.locator('.lp-feedback-callout', { hasText: 'Kein externer Anbieter eingerichtet' }),
    tone: 'info',
  },
] as const;

test('echte Seiten: Vertragsfarben, Kontrast, Umbruch — System hell und dunkel, 375/640/1280 px', async ({
  page,
}) => {
  await anmelden(page);
  for (const schema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: schema, reducedMotion: 'reduce' });
    for (const stelle of STELLEN) {
      for (const breite of BREITEN) {
        await test.step(`${stelle.route} ${breite} px ${schema}`, async () => {
          await page.setViewportSize({ width: breite, height: 900 });
          await page.goto(stelle.route);
          const element = stelle.finde(page);
          await expect(element).toBeVisible();
          await expect(element).toHaveAttribute('data-lp-tone', stelle.tone);
          await erwarteVertrag(element, schema, `${stelle.route} ${breite} px ${schema}`);
          expect(await horizontalOverflow(page), 'kein waagerechtes Scrollen').toBeLessThanOrEqual(
            0,
          );
          if (breite !== 640)
            await bild(page, `status-py${stelle.route.replace('/', '-')}-${breite}-${schema}`);
        });
      }
      await erwarteKeineSchwerenAxeBefunde(page, `${stelle.route} 1280 px ${schema}`);
    }
  }
});

test('statischer Hinweis ist keine Live-Region; gesperrt ist nicht nur grau', async ({ page }) => {
  await anmelden(page);
  await page.goto('/profil');
  const hinweis = page.locator('.lp-feedback-callout', {
    hasText: 'Kein externer Anbieter eingerichtet',
  });
  await expect(hinweis).not.toHaveAttribute('role', /.+/);
  await expect(hinweis).not.toHaveAttribute('aria-live', /.+/);
  await expect(hinweis.locator('svg')).toHaveAttribute('aria-hidden', 'true');

  await page.goto('/wiederholen');
  const gesperrt = page.locator('.lp-feedback-badge[data-lp-tone="locked"]').first();
  await expect(gesperrt).toHaveText('gesperrt');
  expect(await gesperrt.evaluate((node) => getComputedStyle(node).borderTopStyle)).toBe('dashed');
  // „verfügbar" ist Erreichbarkeit, kein Lernerfolg: Kein Set-Badge trägt den Erfolgston.
  await expect(page.locator('.lp-feedback-badge[data-lp-tone="success"]')).toHaveCount(0);
});

test('ausdrückliches Farbschema schlägt das System — in beide Richtungen', async ({ page }) => {
  await anmelden(page);
  const hinweis = page.locator('.lp-feedback-callout', {
    hasText: 'Kein externer Anbieter eingerichtet',
  });
  for (const [system, gewaehlt] of [
    ['light', 'dark'],
    ['dark', 'light'],
  ] as const) {
    await page.emulateMedia({ colorScheme: system });
    await page.goto('/profil');
    await page.evaluate((wert) => localStorage.setItem('pythonpfad-theme', wert), gewaehlt);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', gewaehlt);
    await erwarteVertrag(hinweis, gewaehlt, `System ${system}, gewählt ${gewaehlt}`);
    await bild(page, `status-py-profil-1280-system-${system}-gewaehlt-${gewaehlt}`);
  }
});

test('Fehler beim Anmelden: danger mit fachlichem Titel, höflich angesagt, kein Fokuswechsel', async ({
  page,
}) => {
  for (const schema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.goto('/anmelden');
    await page.getByLabel('E-Mail-Adresse').fill('niemand-lp03b@example.org');
    await page.getByLabel('Passwort').fill('falschesPasswort2026');
    const knopf = page.getByRole('button', { name: 'Anmelden' });
    await knopf.click();
    const meldung = page.locator('.lp-feedback-callout[data-lp-tone="danger"]');
    await expect(meldung).toBeVisible();
    await expect(meldung.locator('.lp-feedback-title')).toHaveText('Anmeldung nicht möglich');
    await expect(meldung).toHaveAttribute('role', 'status');
    await expect(meldung).toHaveAttribute('aria-live', 'polite');
    expect(await page.locator('.lp-feedback[role="alert"]').count(), 'kein role="alert"').toBe(0);
    expect(await verschachtelteLiveRegionen(page), 'keine verschachtelten Live-Regionen').toBe(0);
    expect(
      await meldung.evaluate((node) => node.contains(document.activeElement)),
      'die Meldung nimmt nicht den Fokus',
    ).toBe(false);
    await erwarteVertrag(meldung, schema, `Anmeldefehler ${schema}`);
    await erwarteKeineSchwerenAxeBefunde(page, `Anmeldefehler ${schema}`);
    await bild(page, `status-py-anmelden-fehler-1280-${schema}`);
  }
});
