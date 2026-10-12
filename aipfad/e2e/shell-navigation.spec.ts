import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { onboardingAbschliessen, registriere } from './helfer';
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
 * LP-03A — Lernpfade-Shell in AIPfad gegen den echten Produktionsbuild.
 *
 * Gleiche Bereiche in derselben Reihenfolge wie PythonPfad und SQLPfad (ohne
 * Projekte und Profil, mit getrenntem Fortschritt). „Mehr" und Abmelden sind
 * auf jeder Breite erreichbar — vorher schnitt die seitlich scrollende Liste
 * das aufklappende „Mehr" ab, und unter 640 px fehlten beide. Hub-Ziele der
 * Dachleiste sind lokale Testziele — kein Beleg für Live-Betrieb.
 */

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const LANGER_NAME = 'Maximiliane-Alexandra von Testhausen-Langenberg';
const VERTRAG = ['Überblick', 'Lernen', 'Labs', 'Wiederholen', 'Fortschritt'];
const MEHR = ['Wissenslandkarte', 'Nachschlagen', 'Glossar', 'Setup'];
const BREITEN = [375, 639, 640, 700, 900, 1279, 1280];
const SHOTS = 'test-results/screenshots';

async function anmelden(page: Page): Promise<void> {
  await registriere(page, LANGER_NAME);
  await onboardingAbschliessen(page);
}

/** „Mehr": ab 640 px in der Hauptnavigation, darunter oben rechts im Kopf. */
function mehr(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: /^Mehr/ });
}

async function bild(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test('Vertrag auf jeder Breite: gleiche Bereiche, „Mehr" und Abmelden erreichbar', async ({
  page,
}) => {
  await anmelden(page);

  for (const breite of BREITEN) {
    await test.step(`${breite} px`, async () => {
      await page.setViewportSize({ width: breite, height: 860 });
      await page.goto('/pfad');
      // AIPfad setzt Seitentitel als h2 (SectionHeading) — vorhandener Inhalt, nicht Teil der Shell.
      await expect(page.getByRole('heading', { name: 'AIPfad Grundlagen' })).toBeVisible();
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

      const knopf = mehr(page);
      await expect(knopf).toHaveCount(1);
      await erwarteWirklichSichtbar(knopf, `${breite} px: „Mehr"`);
      await knopf.click();
      await expect(knopf).toHaveAttribute('aria-expanded', 'true');
      for (const name of MEHR) {
        await erwarteWirklichSichtbar(
          page.getByRole('banner').getByRole('link', { name, exact: true }),
          `${breite} px: ${name}`,
        );
      }
      const abmelden = page
        .getByRole('banner')
        .getByRole('button', { name: 'Abmelden', exact: true });
      await erwarteWirklichSichtbar(abmelden, `${breite} px: Abmelden`);
      if (breite === 375 || breite === 1280) await bild(page, `shell-ai-${breite}-mehr`);
      await page.keyboard.press('Escape');
      await expect(knopf).toHaveAttribute('aria-expanded', 'false');
      await expect(knopf).toBeFocused();
    });
  }
});

test('„Mehr"-Ziel öffnen: Wissenslandkarte auf Desktop und Telefon', async ({ page }) => {
  await anmelden(page);
  for (const breite of [1280, 375]) {
    await page.setViewportSize({ width: breite, height: 860 });
    await page.goto('/pfad');
    // Bewusst über den sichtbaren Text, nicht über die Rolle: Der Test soll am
    // Verhalten scheitern (Liste abgeschnitten, Ziel fehlt), nicht am Markup.
    await page
      .getByRole('banner')
      .getByText('Mehr', { exact: true })
      .filter({ visible: true })
      .click();
    const ziel = page
      .getByRole('banner')
      .getByRole('link', { name: 'Wissenslandkarte', exact: true });
    await erwarteWirklichSichtbar(ziel, `${breite} px: Wissenslandkarte`);
    await ziel.click();
    await expect(page).toHaveURL(/\/wissenslandkarte$/);
    await expect(page.getByRole('heading').first()).toBeVisible();
  }
});

test('Lektion unter /lektion gehört zu „Lernen"; Überblick und Fortschritt getrennt', async ({
  page,
}) => {
  await anmelden(page);
  await page.getByRole('link', { name: 'Weiterlernen' }).click();
  await page.waitForURL(/\/lektion\//);
  for (const breite of [375, 1280]) {
    await page.setViewportSize({ width: breite, height: 860 });
    const nav = await sichtbareHauptnavigation(page);
    await expect(nav.locator('[aria-current="page"]'), `${breite} px`).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Lernen' })).toHaveAttribute('aria-current', 'page');
  }

  await page.goto('/fortschritt');
  const nav = await sichtbareHauptnavigation(page);
  await expect(nav.getByRole('link', { name: 'Fortschritt' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.getByRole('link', { name: 'Überblick' })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('Tastatur: Skip-Link, Plattform, Hauptnavigation, „Mehr" mit Escape und Ziel', async ({
  page,
}) => {
  await anmelden(page);
  for (const breite of [1280, 375]) {
    await test.step(`${breite} px`, async () => {
      await page.setViewportSize({ width: breite, height: 860 });
      await page.goto('/pfad');
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('link', { name: 'Direkt zum Hauptinhalt springen' }),
      ).toBeFocused();
      await erwarteSichtbarenFokus(page, 'Skip-Link');

      const knopf = mehr(page);
      await tabBis(page, knopf, `${breite} px bis „Mehr"`);
      await page.keyboard.press('Enter');
      await expect(knopf).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('banner').getByRole('link', { name: 'Wissenslandkarte', exact: true }),
      ).toBeFocused();
      await erwarteSichtbarenFokus(page, 'erster „Mehr"-Eintrag');
      await page.keyboard.press('Escape');
      await expect(knopf).toHaveAttribute('aria-expanded', 'false');
      await expect(knopf).toBeFocused();

      await page.goto('/pfad');
      const ziel = (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Labs' });
      await tabBis(page, ziel, `${breite} px bis „Labs"`, 80);
      await page.keyboard.press('Enter');
      await page.waitForURL('**/labs');
      await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
      await expect(
        (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Labs' }),
      ).toHaveAttribute('aria-current', 'page');
    });
  }
});

test('Dunkles Systemschema, Bewegung und Fokusfarbe der Shell; axe ohne schwere Befunde', async ({
  page,
}) => {
  await anmelden(page);
  await page.setViewportSize({ width: 1280, height: 860 });
  const kopf = page.locator('header.lp-shell-header');

  for (const schema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.goto('/pfad');
    const nav = await sichtbareHauptnavigation(page);
    const ruhig = nav.getByRole('link', { name: 'Lernen' });
    const aktiv = nav.getByRole('link', { name: 'Überblick' });
    const flaeche = await stil(kopf, 'background-color');
    expect(flaeche).toBe(schema === 'dark' ? 'rgb(21, 26, 36)' : 'rgb(255, 255, 255)');
    expect(
      kontrast(await stil(ruhig, 'color'), flaeche),
      `${schema}: ruhiger Eintrag`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      kontrast(await stil(aktiv, 'color'), await stil(aktiv, 'background-color')),
      `${schema}: aktiver Eintrag`,
    ).toBeGreaterThanOrEqual(4.5);

    await tabBis(page, ruhig, `${schema}: Fokus auf „Lernen"`);
    const fokusfarbe = await stil(ruhig, 'outline-color');
    expect(fokusfarbe).toBe(schema === 'dark' ? 'rgb(147, 197, 253)' : 'rgb(29, 78, 216)');
    expect(kontrast(fokusfarbe, flaeche), `${schema}: Fokusrahmen`).toBeGreaterThanOrEqual(3);
    await bild(page, `shell-ai-1280-${schema}-fokus`);
    await erwarteKeineSchwerenAxeBefunde(page, `1280 px, ${schema}`);

    // Die Navigation bleibt Sans — Monospace gehört den Fachinhalten.
    expect(await stil(ruhig, 'font-family')).not.toMatch(/mono/i);
  }

  const ruhig = (await sichtbareHauptnavigation(page)).getByRole('link', { name: 'Lernen' });
  expect(await stil(ruhig, 'transition-duration')).toMatch(/^(1e-05s|0\.00001s|0s)/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await stil(ruhig, 'transition-duration')).toMatch(/^0\.12s/);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await mehr(page).click();
  await erwarteKeineSchwerenAxeBefunde(page, '1280 px, „Mehr" offen', { nurShell: true });
  await page.setViewportSize({ width: 375, height: 860 });
  await page.goto('/pfad');
  await erwarteKeineSchwerenAxeBefunde(page, '375 px');
  await mehr(page).click();
  await erwarteKeineSchwerenAxeBefunde(page, '375 px, „Mehr" offen', { nurShell: true });
});
