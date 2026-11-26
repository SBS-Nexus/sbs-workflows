import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations, horizontalOverflow } from './helpers';

/**
 * E6.1 — Rechtsseiten: von jeder Seite in einem Klick erreichbar, mit den
 * Pflichtangaben, ohne schwere axe-Befunde und ohne seitliches Scrollen.
 */
for (const start of ['/', '/vokabeln', '/fortschritt', '/status']) {
  test(`von ${start} aus führt „Impressum“ zur Anbieterkennzeichnung`, async ({ page }) => {
    await page.goto(start);
    const rechtliches = page.getByRole('navigation', { name: 'Rechtliches' });
    await expect(rechtliches.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute('href', '/datenschutz');
    await rechtliches.getByRole('link', { name: 'Impressum' }).click();
    await expect(page).toHaveURL('/impressum');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Impressum');
  });
}

test('Impressum nennt Anbieter, Vertretung, Register, USt-IdNr. und Verantwortlichen', async ({ page }) => {
  await page.goto('/impressum');
  const main = page.getByRole('main');
  for (const angabe of [
    'SBS Deutschland GmbH & Co. KG',
    'In der Dell 19',
    '69469 Weinheim',
    'Andreas Schenk',
    'HRA 706204',
    'DE345927327',
    'Luis Schenk',
    '§ 36 VSBG',
  ]) {
    await expect(main).toContainText(angabe);
  }
  await expect(main.getByRole('link', { name: 'info@sbsdeutschland.com' })).toHaveAttribute('href', 'mailto:info@sbsdeutschland.com');
  await expectNoSeriousA11yViolations(page, 'Impressum');
});

test('Datenschutzhinweise beschreiben die echten Verarbeitungen', async ({ page }) => {
  await page.goto('/datenschutz');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 2 })).toHaveCount(12);
  for (const angabe of ['Railway', 'Scaleway', 'STRATO', 'Sentry', 'Ihr Browser stellt keine Verbindung zu Sentry her', 'Keine KI-Dienste Dritter', 'aipfad_session', 'lernpfade-vokabeln', 'poststelle@lfdi.bwl.de', 'Ein Datenschutzbeauftragter ist derzeit nicht bestellt']) {
    await expect(main).toContainText(angabe);
  }
  // Das Inhaltsverzeichnis springt zu den Abschnitten.
  await page.getByRole('navigation', { name: 'Inhalt' }).getByRole('link', { name: 'Organisationen, Teams und Lernpläne' }).click();
  await expect(page).toHaveURL(/#organisationen$/);
  await expectNoSeriousA11yViolations(page, 'Datenschutz');
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await horizontalOverflow(page)).toBe(0);
});

test('AVV-Vorlage nennt Gegenstand, Maßnahmen und Unterauftragsverarbeiter', async ({ page }) => {
  await page.goto('/avv');
  const main = page.getByRole('main');
  await expect(main).toContainText('Art. 28 DSGVO');
  await expect(main.getByRole('heading', { name: '5. Unterauftragsverarbeiter' })).toBeVisible();
  await expect(main).toContainText('Railway Corporation');
  await expect(main).toContainText('Functional Software, Inc. (Sentry)');
  await expectNoSeriousA11yViolations(page, 'AVV');
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await horizontalOverflow(page)).toBe(0);
});
