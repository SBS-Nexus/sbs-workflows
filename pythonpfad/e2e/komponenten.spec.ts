import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';
import { erwarteKeineSchwerenAxeBefunde } from './feedback-pruefung';
import {
  AKZENT,
  GEFAHR,
  erwarte404,
  erwarteEinsinken,
  erwarteFokusring,
  erwarteFortschritt,
  erwarteGesperrt,
  erwarteLeerzustand,
  erwarteOhneUebergang,
  erwarteTragenderKnopf,
  horizontalOverflow,
  messe,
} from './komponenten-pruefung';

/**
 * LP-03C — Button, Card, ProgressBar, EmptyState und ErrorState in
 * PythonPfad aus dem gemeinsamen Komponentenvertrag, geprüft an echten
 * Seiten mit einem synthetischen Konto (keine Testgalerie). Gleiche
 * Bausteine müssen in allen Lernpfaden gleich aussehen und sich gleich
 * anfühlen; die Werte stehen in `komponenten-pruefung.ts`.
 */

const SHOTS = 'test-results/screenshots';

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function anmelden(page: Page): Promise<void> {
  await register(page, freshAccount());
  await completeOnboarding(page);
}

test('Knopf und Leerzustand auf /wiederholen: Pfad-Akzent, Unterkante, Einsinken, Fokus — hell und dunkel', async ({
  page,
}) => {
  await anmelden(page);
  for (const schema of ['light', 'dark'] as const) {
    for (const breite of [375, 1280]) {
      await test.step(`${schema} ${breite} px`, async () => {
        await page.emulateMedia({ colorScheme: schema });
        await page.setViewportSize({ width: breite, height: 900 });
        await page.goto('/wiederholen');
        const leer = page.locator('.lp-ui-empty');
        await erwarteLeerzustand(leer, 'done', `Wiederholen ${schema} ${breite}`);
        const knopf = leer.getByRole('link', { name: 'Zum Lernpfad' });
        await expect(knopf).toHaveAttribute('data-lp-variant', 'primary');
        await erwarteTragenderKnopf(knopf, AKZENT.python[schema]!, `Primär ${schema}`);
        await erwarteEinsinken(page, knopf, `Primär ${schema}`);
        await erwarteFokusring(page, knopf, `Primär ${schema}`);
        expect(await horizontalOverflow(page), 'kein waagerechtes Scrollen').toBeLessThanOrEqual(0);
        await bild(page, `komponenten-py-wiederholen-${breite}-${schema}`);
      });
    }
    await erwarteKeineSchwerenAxeBefunde(page, `/wiederholen ${schema}`);
  }
});

test('Bewegung reduzieren: kein Übergang, der Zustand „gedrückt" bleibt sichtbar', async ({
  page,
}) => {
  await anmelden(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/wiederholen');
  const knopf = page.locator('.lp-ui-empty').getByRole('link', { name: 'Zum Lernpfad' });
  await erwarteOhneUebergang(knopf, 'System');
  await erwarteEinsinken(page, knopf, 'System, reduziert');
});

test('Fortschritt je Modul auf /fortschritt: sprechbarer Wert „x von y" und Bereichsfarbe', async ({
  page,
}) => {
  await anmelden(page);
  await page.goto('/fortschritt');
  const balken = page.locator('.lp-ui-progress');
  await expect(balken.first()).toBeVisible();
  expect(await balken.count(), 'Balken je Modul').toBeGreaterThan(1);
  const erster = balken.first();
  await erwarteFortschritt(erster, /^\d+ von \d+$/, 'Modul 1');
  // Die Bereichsfarbe kommt über --lp-ui-area aus themeStyle(): Zwei Module
  // haben verschiedene Füllfarben, obwohl beide den Ton „module" tragen.
  const farben = await balken.evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).getPropertyValue('--lp-ui-progress-fill').trim()),
  );
  expect(new Set(farben).size, 'Bereichsfarben je Modul').toBeGreaterThan(1);
  await bild(page, 'komponenten-py-fortschritt-1280-light');
});

test('Gesperrter Knopf in der Einstufung ist flach und sinkt nicht ein', async ({ page }) => {
  await register(page, freshAccount());
  await page.getByRole('radio', { name: /noch nie programmiert/i }).check();
  await page.getByRole('radio', { name: /Büroaufgaben automatisieren/i }).check();
  await page.getByRole('radio', { name: '20 Minuten' }).check();
  await page.getByRole('radio', { name: /Gleichmäßig/ }).check();
  await page.getByRole('button', { name: /Weiter zur Einstufung/ }).click();
  await page.waitForURL('**/einstufung');
  const zurueck = page.getByRole('button', { name: 'Zurück' });
  await expect(zurueck).toHaveAttribute('data-lp-variant', 'secondary');
  await erwarteGesperrt(page, zurueck, 'Zurück auf Frage 1');
});

test('Konto löschen: Karte mit Gefahrenrand, Einstieg als danger-secondary', async ({ page }) => {
  await anmelden(page);
  for (const schema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.goto('/profil');
    const karte = page.locator('.lp-ui-card[data-lp-emphasis="danger"]');
    await expect(karte).toContainText('Konto löschen');
    const rand = await karte.evaluate((node) => getComputedStyle(node).borderTopWidth);
    expect(rand, 'betonter Rand').toBe('2px');
    expect((await messe(karte)).edge, 'Gefahrenfarbe').toBe(GEFAHR[schema][0]);
    const einstieg = karte.getByRole('button', { name: 'Löschung vorbereiten' });
    await expect(einstieg).toHaveAttribute('data-lp-variant', 'danger-secondary');
    expect((await messe(einstieg)).contrast, 'Beschriftung lesbar').toBeGreaterThanOrEqual(4.5);
  }
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
      AKZENT.python[schema]!,
      `404 ${schema}`,
    );
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await erwarteKeineSchwerenAxeBefunde(page, `404 ${schema} ${breite}`);
    await bild(page, `komponenten-py-404-${breite}-${schema}`);
  }
});
