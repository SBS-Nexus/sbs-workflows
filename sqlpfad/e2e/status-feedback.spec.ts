import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  erwarteKeineSchwerenAxeBefunde,
  erwarteVertrag,
  horizontalOverflow,
  verschachtelteLiveRegionen,
} from './feedback-pruefung';

/**
 * LP-03B — Badges und Callouts in SQLPfad aus dem gemeinsamen Statusvertrag,
 * geprüft an echten Seiten mit einem synthetischen Konto. Der Hinweis zum
 * abgeschalteten Ausführen ist der vorhandene Warnpfad dieser Installation
 * (`FEATURE_SQL_RUNNER=false`) — keine Änderung am Runner.
 */

const SHOTS = 'test-results/screenshots';
const BREITEN = [375, 640, 1280];

async function anmelden(page: Page): Promise<void> {
  await page.goto('/registrieren');
  await page.fill('#name', 'Statusprüfung');
  await page.fill(
    '#email',
    `e2e-status-${Date.now()}-${Math.floor(Math.random() * 1e4)}@beispiel.test`,
  );
  await page.fill('#password', 'nordwind-treppe-hafen-41');
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
}

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

const STELLEN = [
  {
    route: '/projekte',
    finde: (page: Page) => page.locator('.lp-feedback-badge', { hasText: 'Offen' }).first(),
    tone: 'neutral',
  },
  {
    route: '/fortschritt',
    finde: (page: Page) =>
      page.locator('.lp-feedback-callout', {
        hasText: 'Abfragen ausführen ist gerade nicht möglich',
      }),
    tone: 'warning',
  },
  {
    route: '/abfrage',
    finde: (page: Page) =>
      page.locator('.lp-feedback-callout', {
        hasText: 'Ausführen ist auf dieser Installation abgeschaltet',
      }),
    tone: 'warning',
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
            await bild(page, `status-sql${stelle.route.replace('/', '-')}-${breite}-${schema}`);
        });
      }
      // Ganze Seite, auch /abfrage: Der Editor trägt jetzt einen zugänglichen Namen
      // (vorher war `.cm-content` namenlos und die Prüfung dort auf die Statusanzeigen
      // beschränkt).
      await erwarteKeineSchwerenAxeBefunde(page, `${stelle.route} 1280 px ${schema}`);
    }
  }
});

test('Warnung ohne Live-Region; Handlungsweg bleibt erhalten', async ({ page }) => {
  await anmelden(page);
  await page.goto('/fortschritt');
  const warnung = page.locator('.lp-feedback-callout[data-lp-tone="warning"]', {
    hasText: 'Abfragen ausführen ist gerade nicht möglich',
  });
  await expect(warnung).not.toHaveAttribute('role', /.+/);
  await expect(warnung).not.toHaveAttribute('aria-live', /.+/);
  await expect(warnung.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  // Standardtitel bleiben allgemein; der fachliche Titel steht hier selbst.
  await expect(warnung.locator('.lp-feedback-title')).toHaveText(
    'Abfragen ausführen ist gerade nicht möglich',
  );
});

test('ausgewähltes Farbschema (Umschalter) schlägt das System — in beide Richtungen', async ({
  page,
}) => {
  await anmelden(page);
  const warnung = page.locator('.lp-feedback-callout', {
    hasText: 'Abfragen ausführen ist gerade nicht möglich',
  });
  const schalter = page.getByRole('button', { name: /Farbschema umschalten/ });
  for (const [system, gewaehlt] of [
    ['light', 'dark'],
    ['dark', 'light'],
  ] as const) {
    await page.emulateMedia({ colorScheme: system });
    await page.goto('/fortschritt');
    for (let i = 0; i < 3; i += 1) {
      if ((await page.evaluate(() => document.documentElement.dataset.theme)) === gewaehlt) break;
      await schalter.click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', gewaehlt);
    await erwarteVertrag(warnung, gewaehlt, `System ${system}, gewählt ${gewaehlt}`);
    await bild(page, `status-sql-fortschritt-1280-system-${system}-gewaehlt-${gewaehlt}`);
  }
});

test('Fehler beim Anmelden: danger mit fachlichem Titel, höflich angesagt, kein Fokuswechsel', async ({
  page,
}) => {
  for (const schema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.goto('/anmelden');
    await page.fill('#email', 'gibt-es-nicht-lp03b@beispiel.test');
    await page.fill('#password', 'irgendwas-falsches-123');
    await page.getByRole('button', { name: /Anmelden/i }).click();
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
    await erwarteKeineSchwerenAxeBefunde(page, `Anmeldefehler ${schema}`);
    await bild(page, `status-sql-anmelden-fehler-1280-${schema}`);
  }
});
