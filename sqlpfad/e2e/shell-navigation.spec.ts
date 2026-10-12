import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import {
  beschriftungen,
  erwarteKeineSchwerenAxeBefunde,
  erwartePlattformleiste,
  erwarteSichtbarenFokus,
  erwarteWirklichSichtbar,
  horizontalOverflow,
  kontrast,
  sichtbareHauptnavigation,
  stil,
  tabBis,
} from './shell-pruefung';

/**
 * LP-03A — Lernpfade-Shell in SQLPfad gegen den echten Produktionsbuild.
 *
 * Gleiche Bereiche in derselben Reihenfolge wie PythonPfad, auf jeder Breite
 * erreichbar; Konto und Abmelden auch auf schmalen Bildschirmen (vorher erst
 * ab 768 px); die Redaktion für die vorhandene Rolle auch mobil. Hub-Ziele
 * der Dachleiste sind lokale Testziele — kein Beleg für Live-Betrieb.
 */

const LANGER_NAME = 'Maximiliane-Alexandra von Testhausen-Langenberg';
const PASSWORT = 'nordwind-treppe-hafen-41';
const VERTRAG = ['Überblick', 'Lernen', 'Üben', 'Projekte', 'Wiederholen', 'Profil'];
const BREITEN = [375, 639, 640, 700, 767, 768, 900, 1279, 1280];
const SHOTS = 'test-results/screenshots';

async function anmelden(page: Page): Promise<string> {
  const adresse = `e2e-shell-${Date.now()}-${Math.floor(Math.random() * 10_000)}@beispiel.test`;
  await page.goto('/registrieren');
  await page.fill('#name', LANGER_NAME);
  await page.fill('#email', adresse);
  await page.fill('#password', PASSWORT);
  await page.getByRole('button', { name: /Konto anlegen|Weiter|Los/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: /Los geht/i }).click();
  await expect(page).toHaveURL(/\/fortschritt$/);
  return adresse;
}

async function macheZuAdmin(adresse: string): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ergebnis = await client.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [
      adresse,
    ]);
    expect(ergebnis.rowCount, 'die Rolle wurde an keinem Konto gesetzt').toBe(1);
  } finally {
    await client.end();
  }
}

function kontoMenue(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: /^Konto/ });
}

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test('Vertrag auf jeder Breite: gleiche Bereiche, gleiche Reihenfolge, Abmelden erreichbar', async ({
  page,
}) => {
  await anmelden(page);

  for (const breite of BREITEN) {
    await test.step(`${breite} px`, async () => {
      await page.setViewportSize({ width: breite, height: 860 });
      await page.goto('/fortschritt');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await horizontalOverflow(page), 'kein waagerechtes Scrollen').toBeLessThanOrEqual(0);

      const nav = await sichtbareHauptnavigation(page);
      expect(await beschriftungen(nav)).toEqual(VERTRAG);
      for (const link of await nav.getByRole('link').all()) {
        await erwarteWirklichSichtbar(link, `${breite} px: ${await link.textContent()}`);
      }
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(nav.getByRole('link', { name: 'Überblick' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await erwartePlattformleiste(page);

      const kopf = page.getByRole('banner');
      if (breite >= 768) {
        await erwarteWirklichSichtbar(
          kopf.getByRole('link', { name: LANGER_NAME }),
          `${breite} px: Konto`,
        );
        await erwarteWirklichSichtbar(
          kopf.getByRole('button', { name: 'Abmelden', exact: true }),
          `${breite} px: Abmelden`,
        );
        await expect(kontoMenue(page)).toBeHidden();
      } else {
        const knopf = kontoMenue(page);
        await erwarteWirklichSichtbar(knopf, `${breite} px: Konto-Menü`);
        await knopf.click();
        await expect(knopf).toHaveAttribute('aria-expanded', 'true');
        await expect(kopf.getByText(`Angemeldet als ${LANGER_NAME}`)).toBeVisible();
        await erwarteWirklichSichtbar(
          kopf.getByRole('link', { name: 'Profil und Einstellungen' }),
          `${breite} px: Profil`,
        );
        await erwarteWirklichSichtbar(
          kopf.getByRole('button', { name: 'Abmelden', exact: true }),
          `${breite} px: Abmelden im Menü`,
        );
        if (breite === 375) await bild(page, 'shell-sql-375-menue');
        await page.keyboard.press('Escape');
        await expect(knopf).toHaveAttribute('aria-expanded', 'false');
      }
      if (breite === 1280) await bild(page, 'shell-sql-1280');
    });
  }
});

test('Abmelden auf dem Telefon über das Konto-Menü schließt die Sitzung', async ({ page }) => {
  await anmelden(page);
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('/fortschritt');
  await kontoMenue(page).click();
  await page.getByRole('banner').getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/fortschritt');
  await expect(page).toHaveURL(/\/anmelden$/);
});

test('Redaktion für die vorhandene Rolle: im Kopf ab 640 px, darunter im Konto-Menü', async ({
  page,
}) => {
  const adresse = await anmelden(page);
  await macheZuAdmin(adresse);

  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto('/fortschritt');
  const nav = await sichtbareHauptnavigation(page);
  expect(await beschriftungen(nav)).toEqual([...VERTRAG, 'Redaktion']);

  await page.setViewportSize({ width: 375, height: 860 });
  await page.goto('/fortschritt');
  expect(await beschriftungen(await sichtbareHauptnavigation(page))).toEqual(VERTRAG);
  await kontoMenue(page).click();
  const redaktion = page.getByRole('banner').getByRole('link', { name: 'Redaktion', exact: true });
  await erwarteWirklichSichtbar(redaktion, '375 px: Redaktion im Menü');
  await redaktion.click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Redaktion', level: 1 })).toBeVisible();
  await expect(kontoMenue(page)).toHaveAttribute('aria-expanded', 'false');
});

test('Detailroute: genau ein aktiver Eintrag', async ({ page }) => {
  await anmelden(page);
  await page.goto('/lernen');
  await page.locator('main a[href^="/lernen/"]').first().click();
  await page.waitForURL(/\/lernen\/[^/]+/);
  for (const breite of [375, 1280]) {
    await page.setViewportSize({ width: breite, height: 860 });
    const nav = await sichtbareHauptnavigation(page);
    await expect(nav.locator('[aria-current="page"]'), `${breite} px`).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Lernen' })).toHaveAttribute('aria-current', 'page');
  }
});

test('Tastatur: Skip-Link, Plattform, Hauptnavigation, Menü mit Escape und Ziel', async ({
  page,
}) => {
  await anmelden(page);
  for (const breite of [1280, 375]) {
    await test.step(`${breite} px`, async () => {
      await page.setViewportSize({ width: breite, height: 860 });
      await page.goto('/fortschritt');
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('link', { name: 'Direkt zum Hauptinhalt springen' }),
      ).toBeFocused();
      await erwarteSichtbarenFokus(page, 'Skip-Link');

      if (breite < 768) {
        const knopf = kontoMenue(page);
        await tabBis(page, knopf, `${breite} px bis zum Konto-Menü`);
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await expect(
          page.getByRole('banner').getByRole('link', { name: 'Profil und Einstellungen' }),
        ).toBeFocused();
        await erwarteSichtbarenFokus(page, 'erster Menüeintrag');
        await page.keyboard.press('Escape');
        await expect(knopf).toBeFocused();
        await expect(knopf).toHaveAttribute('aria-expanded', 'false');
      }

      await page.goto('/fortschritt');
      const ziel = (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Projekte' });
      await tabBis(page, ziel, `${breite} px bis „Projekte"`, 80);
      await page.keyboard.press('Enter');
      await page.waitForURL('**/projekte');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(
        (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Projekte' }),
      ).toHaveAttribute('aria-current', 'page');
    });
  }
});

test('Theme, Bewegung und Fokusfarbe der Shell; axe ohne schwere Befunde', async ({ page }) => {
  await anmelden(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto('/fortschritt');

  const kopf = page.locator('header.lp-shell-header');
  const ruhig = (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Lernen' });
  const aktiv = (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Überblick' });
  const schalter = page.getByRole('button', { name: /Farbschema umschalten/ });

  for (const thema of ['light', 'dark'] as const) {
    for (let i = 0; i < 3; i += 1) {
      if ((await page.evaluate(() => document.documentElement.dataset.theme)) === thema) break;
      await schalter.click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', thema);
    const flaeche = await stil(kopf, 'background-color');
    expect(flaeche).toBe(thema === 'dark' ? 'rgb(21, 26, 36)' : 'rgb(255, 255, 255)');
    expect(
      kontrast(await stil(ruhig, 'color'), flaeche),
      `${thema}: ruhiger Eintrag`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      kontrast(await stil(aktiv, 'color'), await stil(aktiv, 'background-color')),
      `${thema}: aktiver Eintrag`,
    ).toBeGreaterThanOrEqual(4.5);

    // Vom Theme-Schalter rückwärts per Tastatur zum Navigationsziel.
    await schalter.focus();
    await tabBis(page, ruhig, `${thema}: Fokus auf „Lernen"`, 20, 'Shift+Tab');
    const fokusfarbe = await stil(ruhig, 'outline-color');
    expect(fokusfarbe).toBe(thema === 'dark' ? 'rgb(147, 197, 253)' : 'rgb(29, 78, 216)');
    expect(kontrast(fokusfarbe, flaeche), `${thema}: Fokusrahmen`).toBeGreaterThanOrEqual(3);
    await bild(page, `shell-sql-1280-${thema}-fokus`);
  }

  expect(await stil(ruhig, 'transition-duration')).toMatch(/^(1e-05s|0\.00001s|0s)/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await stil(ruhig, 'transition-duration')).toMatch(/^0\.12s/);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await erwarteKeineSchwerenAxeBefunde(page, '1280 px, dunkel');
  await page.setViewportSize({ width: 375, height: 860 });
  await page.goto('/fortschritt');
  await erwarteKeineSchwerenAxeBefunde(page, '375 px');
  await kontoMenue(page).click();
  await erwarteKeineSchwerenAxeBefunde(page, '375 px, Menü offen', { nurShell: true });
});
