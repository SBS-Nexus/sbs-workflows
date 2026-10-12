import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { completeOnboarding, freshAccount, register } from './helpers';
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
 * LP-03A — Lernpfade-Shell in PythonPfad gegen den echten Produktionsbuild.
 *
 * Geprüft wird, was Lernende sehen und bedienen: dieselben Bereiche in
 * derselben Reihenfolge wie in SQLPfad und AIPfad, auf jeder Breite
 * erreichbar, Sitzungs- und Zusatzziele nicht abgeschnitten, Tastatur vom
 * Skip-Link bis zum Ziel. Die Hub-Ziele der Dachleiste sind lokale Testziele
 * (`NEXT_PUBLIC_LEARNING_HUB_URL`) — das belegt keinen Live-Betrieb.
 */

const LANGER_NAME = 'Maximiliane-Alexandra von Testhausen-Langenberg';
const VERTRAG = ['Überblick', 'Lernen', 'Üben', 'Projekte', 'Wiederholen', 'Profil'];
const MENUE = [
  'Profil und Einstellungen',
  'Code-Labor',
  'Organisationen',
  'Tastaturkürzel',
  'Abmelden',
];
const BREITEN = [375, 639, 640, 700, 900, 1279, 1280];
const SHOTS = 'test-results/screenshots';

async function anmelden(page: Page): Promise<string> {
  const konto = { ...freshAccount(), name: LANGER_NAME };
  await register(page, konto);
  await completeOnboarding(page);
  return konto.email;
}

function menueKnopf(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: LANGER_NAME, exact: true });
}

function menueEintrag(page: Page, name: string) {
  return page
    .getByRole('banner')
    .getByRole('link', { name, exact: true })
    .or(page.getByRole('banner').getByRole('button', { name, exact: true }));
}

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test('Vertrag auf jeder Breite: gleiche Bereiche, gleiche Reihenfolge, alles erreichbar', async ({
  page,
}) => {
  await anmelden(page);

  for (const breite of BREITEN) {
    await test.step(`${breite} px`, async () => {
      await page.setViewportSize({ width: breite, height: 860 });
      await page.goto('/fortschritt');
      await expect(page.getByRole('heading', { name: 'Dein Lernstand' })).toBeVisible();
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

      // Sitzung und Zusatzziele: über das Menü, im Bild, nicht abgeschnitten.
      const knopf = menueKnopf(page);
      await erwarteWirklichSichtbar(knopf, `${breite} px: Menüknopf`);
      await knopf.click();
      await expect(knopf).toHaveAttribute('aria-expanded', 'true');
      for (const name of MENUE)
        await erwarteWirklichSichtbar(menueEintrag(page, name), `${breite} px: ${name}`);
      // Suche: ab 768 px als Knopf im Kopf, darunter im Menü.
      const suche =
        breite >= 768
          ? page.getByRole('banner').getByRole('button', { name: /^Suchen/ })
          : menueEintrag(page, 'Suchen und springen');
      await erwarteWirklichSichtbar(suche, `${breite} px: Suche`);
      await expect(page.getByText(`Angemeldet als ${LANGER_NAME}`)).toBeVisible();
      if (breite === 375 || breite === 1280) await bild(page, `shell-python-${breite}-menue`);

      await page.keyboard.press('Escape');
      await expect(knopf).toHaveAttribute('aria-expanded', 'false');
      await expect(menueEintrag(page, 'Abmelden')).toBeHidden();
    });
  }
});

test('Detailroute: genau ein aktiver Eintrag; fremde Seiten markieren nichts', async ({ page }) => {
  await anmelden(page);
  await page.goto('/lernen');
  const lektion = page.locator('main a[href^="/lernen/"]').first();
  await lektion.click();
  await page.waitForURL(/\/lernen\/[^/]+/);

  for (const breite of [375, 1280]) {
    await page.setViewportSize({ width: breite, height: 860 });
    const nav = await sichtbareHauptnavigation(page);
    await expect(nav.locator('[aria-current="page"]'), `${breite} px`).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Lernen' })).toHaveAttribute('aria-current', 'page');
  }

  await page.goto('/labor');
  await expect(
    page.getByRole('navigation', { name: 'Hauptnavigation' }).locator('[aria-current="page"]'),
  ).toHaveCount(0);
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

      const knopf = menueKnopf(page);
      await tabBis(page, knopf, `${breite} px bis zum Menü`);
      await page.keyboard.press('Enter');
      await expect(knopf).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Tab');
      await expect(menueEintrag(page, 'Profil und Einstellungen')).toBeFocused();
      await erwarteSichtbarenFokus(page, 'erster Menüeintrag');
      await page.keyboard.press('Escape');
      await expect(knopf).toHaveAttribute('aria-expanded', 'false');
      await expect(knopf).toBeFocused();

      // Wer aus dem offenen Menü hinaus tabbt, lässt es nicht offen zurück.
      await page.keyboard.press('Enter');
      for (let i = 0; i < MENUE.length + 3; i += 1) await page.keyboard.press('Tab');
      await expect(knopf).toHaveAttribute('aria-expanded', 'false');

      // Vom Seitenanfang bis zum Ziel — unten liegt die Leiste hinter dem Inhalt.
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

test('Befehlspalette und Kürzel heißen „Überblick" — g f und das Ziel bleiben', async ({
  page,
}) => {
  await anmelden(page);
  await page.keyboard.press('g');
  await page.keyboard.press('f');
  await page.waitForURL('**/fortschritt');

  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog');
  await palette.getByRole('combobox', { name: 'Suchen und springen' }).fill('Fortschritt');
  await expect(palette.getByRole('option', { name: /^Überblick/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.keyboard.press('?');
  const hilfe = page.getByRole('dialog');
  await expect(hilfe.getByText('Überblick', { exact: true })).toBeVisible();
  await expect(hilfe.getByText('Fortschritt', { exact: true })).toHaveCount(0);
});

test('Fällige Wiederholungen stehen als Zahl in der Navigation — auch mobil', async ({ page }) => {
  const email = await anmelden(page);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const eingetragen = await db.query(
      `INSERT INTO review_queue_items (id, "userId", "exerciseId", "dueAt")
       SELECT 'e2e-shell-' || md5(random()::text), u.id, e.id, now() - interval '1 hour'
       FROM users u, (SELECT id FROM exercises ORDER BY id LIMIT 1) e WHERE u.email = $1`,
      [email],
    );
    expect(eingetragen.rowCount, 'eine fällige Wiederholung angelegt').toBe(1);
  } finally {
    await db.end();
  }

  for (const breite of [375, 1280]) {
    await page.setViewportSize({ width: breite, height: 860 });
    await page.goto('/fortschritt');
    const wiederholen = (await sichtbareHauptnavigation(page)).locator('a[href="/wiederholen"]');
    await expect(wiederholen, `${breite} px`).toHaveAccessibleName(/1 fällige Wiederholungen/);
    await expect(wiederholen.locator('.lp-shell-badge'), `${breite} px: Zahl sichtbar`).toHaveText(
      /^1/,
    );
    await erwarteWirklichSichtbar(wiederholen.locator('.lp-shell-badge'), `${breite} px: Badge`);
  }
});

test('Theme, Bewegung und Fokusfarbe der Shell; axe ohne schwere Befunde', async ({ page }) => {
  await anmelden(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto('/fortschritt');

  const kopf = page.locator('header.lp-shell-header');
  const aktiv = (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Überblick' });
  const ruhig = (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Lernen' });

  // Vorhandene Nutzereinstellung: der Theme-Schalter des Kopfs.
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

    // Neu laden (das Farbschema bleibt gespeichert) und vom Seitenanfang tabben.
    await page.goto('/fortschritt');
    await expect(page.locator('html')).toHaveAttribute('data-theme', thema);
    await tabBis(page, ruhig, `${thema}: Fokus auf „Lernen"`);
    const fokusfarbe = await stil(ruhig, 'outline-color');
    expect(fokusfarbe).toBe(thema === 'dark' ? 'rgb(147, 197, 253)' : 'rgb(29, 78, 216)');
    expect(kontrast(fokusfarbe, flaeche), `${thema}: Fokusrahmen`).toBeGreaterThanOrEqual(3);
    await bild(page, `shell-python-1280-${thema}-fokus`);
  }

  // System-Einstellung „Bewegung reduzieren" gilt auch für die Shell.
  expect(await stil(ruhig, 'transition-duration')).toMatch(/^(1e-05s|0\.00001s|0s)/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await stil(ruhig, 'transition-duration')).toMatch(/^0\.12s/);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await erwarteKeineSchwerenAxeBefunde(page, '1280 px, dunkel');
  await menueKnopf(page).click();
  await erwarteKeineSchwerenAxeBefunde(page, '1280 px, Menü offen', { nurShell: true });
  await page.setViewportSize({ width: 375, height: 860 });
  await page.keyboard.press('Escape');
  await page.goto('/fortschritt');
  await erwarteKeineSchwerenAxeBefunde(page, '375 px');
  await menueKnopf(page).click();
  await erwarteKeineSchwerenAxeBefunde(page, '375 px, Menü offen', { nurShell: true });
});
