import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { erwarteKeineSchwerenAxeBefunde } from './feedback-pruefung';
import {
  AKZENT,
  GEFAHR,
  erwarte404,
  erwarteEinsinken,
  erwarteFokusring,
  erwarteLeerzustand,
  erwarteTragenderKnopf,
  horizontalOverflow,
  messe,
} from './komponenten-pruefung';

/**
 * LP-03C — Button, Card, EmptyState und ErrorState in SQLPfad aus dem
 * gemeinsamen Komponentenvertrag, geprüft an echten Seiten mit einem
 * synthetischen Konto. SQLPfad hatte vorher keine eigene 404-Seite.
 */

const SHOTS = 'test-results/screenshots';

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function anmelden(page: Page): Promise<void> {
  await page.goto('/registrieren');
  await page.fill('#name', 'Komponentenprüfung');
  await page.fill(
    '#email',
    `e2e-komponenten-${Date.now()}-${Math.floor(Math.random() * 1e4)}@beispiel.test`,
  );
  await page.fill('#password', 'nordwind-treppe-hafen-41');
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
}

test('Lektionskarten auf /lernen sind als Ganzes Ziel: Unterkante, Einsinken, Fokus, Modulfarbe', async ({
  page,
}) => {
  await anmelden(page);
  for (const schema of ['light', 'dark'] as const) {
    for (const breite of [375, 1280]) {
      await test.step(`${schema} ${breite} px`, async () => {
        await page.emulateMedia({ colorScheme: schema });
        await page.setViewportSize({ width: breite, height: 900 });
        await page.goto('/lernen');
        const karten = page.locator('a.lp-ui-card[data-lp-card="interactive"]');
        expect(await karten.count(), 'eine Karte je Lektion').toBeGreaterThan(8);
        const erste = karten.first();
        await expect(erste).toHaveAttribute('href', /^\/lernen\//);
        const m = await messe(erste);
        expect(m.edgeWidth, 'taktile Unterkante').toBe(4);
        expect(m.height, 'Zielgröße').toBeGreaterThanOrEqual(44);
        await erwarteEinsinken(page, erste, `Karte ${schema} ${breite}`);
        await erwarteFokusring(page, erste, `Karte ${schema} ${breite}`);
        // Die Modulfarbe kommt über --lp-ui-area: Karten aus verschiedenen
        // Modulen haben verschiedene Kanten.
        const kanten = await karten.evaluateAll((nodes) =>
          nodes.map((node) => getComputedStyle(node).borderBottomColor),
        );
        expect(new Set(kanten).size, 'Modulfarben').toBeGreaterThan(1);
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
        await bild(page, `komponenten-sql-lernen-${breite}-${schema}`);
      });
    }
    await erwarteKeineSchwerenAxeBefunde(page, `/lernen ${schema}`);
  }
});

test('Wiederholen ohne offene Termine ist ein erledigter Stand, kein Mangel', async ({ page }) => {
  await anmelden(page);
  await page.goto('/wiederholen');
  await erwarteLeerzustand(page.locator('.lp-ui-empty'), 'done', 'Nichts offen');
  await expect(page.locator('.lp-ui-empty .lp-ui-empty-title')).toHaveText('Nichts offen');
});

test('Profil: Speichern im Pfad-Akzent, Konto löschen als danger-secondary in betonter Karte', async ({
  page,
}) => {
  await anmelden(page);
  for (const schema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.goto('/profil');
    const speichern = page.getByRole('button', { name: 'Angaben speichern' });
    await erwarteTragenderKnopf(speichern, AKZENT.sql[schema]!, `Speichern ${schema}`);
    const karte = page.locator('.lp-ui-card[data-lp-emphasis="danger"]');
    expect((await messe(karte)).edge, 'Gefahrenrand').toBe(GEFAHR[schema][0]);
    const einstieg = karte.getByRole('button', { name: 'Konto löschen' });
    await expect(einstieg).toHaveAttribute('data-lp-variant', 'danger-secondary');
    expect((await messe(einstieg)).contrast).toBeGreaterThanOrEqual(4.5);
  }
});

test('Unbekannte Adresse: eigene 404-Seite statt der englischen Vorgabe', async ({ page }) => {
  for (const [schema, breite] of [
    ['light', 1280],
    ['dark', 1280],
    ['light', 375],
  ] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.setViewportSize({ width: breite, height: 800 });
    const zustand = await erwarte404(page, '/gibt-es-nicht-lp03c', `404 ${schema} ${breite}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByText('This page could not be found')).toHaveCount(0);
    await erwarteTragenderKnopf(
      zustand.getByRole('link', { name: 'Zum Lernpfad' }),
      AKZENT.sql[schema]!,
      `404 ${schema}`,
    );
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await erwarteKeineSchwerenAxeBefunde(page, `404 ${schema} ${breite}`);
    await bild(page, `komponenten-sql-404-${breite}-${schema}`);
  }
});
