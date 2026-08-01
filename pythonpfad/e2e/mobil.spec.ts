import { expect, test } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';

/**
 * Mobile Nutzbarkeit.
 *
 * Geprüft wird, was auf einem Telefon tatsächlich schiefgehen kann: eine
 * verdeckte Navigation, waagerechtes Scrollen der ganzen Seite und zu kleine
 * Bedienflächen.
 */
test('lässt sich auf dem Telefon vollständig bedienen', async ({ page }) => {
  const account = freshAccount();
  await register(page, account);
  await completeOnboarding(page);

  await test.step('Die untere Navigationsleiste ist erreichbar', async () => {
    const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' }).last();
    await expect(navigation.getByRole('link', { name: 'Lernen' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Fortschritt' })).toBeVisible();

    await navigation.getByRole('link', { name: 'Fortschritt' }).click();
    await page.waitForURL('**/fortschritt');
    await expect(page.getByRole('heading', { name: 'Dein Lernstand' })).toBeVisible();
  });

  await test.step('Bedienflächen sind groß genug', async () => {
    const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' }).last();
    const link = navigation.getByRole('link', { name: 'Lernen' });
    const box = await link.boundingBox();

    expect(box).not.toBeNull();
    // Empfehlung aus WCAG 2.2 (2.5.8 Target Size, Minimum): mindestens 24 CSS-Pixel;
    // hier deutlich darüber, weil die Leiste mit dem Daumen bedient wird.
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  await test.step('Die Seite scrollt nicht waagerecht', async () => {
    for (const pfad of ['/lernen', '/fortschritt', '/wiederholen', '/projekte']) {
      await page.goto(pfad);
      const ueberbreite = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(ueberbreite, `Seite ${pfad} scrollt waagerecht`).toBeLessThanOrEqual(1);
    }
  });

  await test.step('Die Lektion ist in Abschnitte gegliedert statt in schmale Spalten', async () => {
    await page.goto('/lernen/was-ist-ein-programm');

    const abschnitte = page.getByRole('navigation', { name: 'Abschnitte der Lektion' });
    await expect(abschnitte).toBeVisible();
    await expect(abschnitte.getByRole('button', { name: 'Aufgaben' })).toBeVisible();

    await abschnitte.getByRole('button', { name: 'Aufgaben' }).click();
    await expect(page.getByRole('heading', { name: 'Aufgaben' })).toBeVisible();
  });
});

test('bietet eine Sprungmarke zum Hauptinhalt', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const sprungmarke = page.getByRole('link', { name: /Direkt zum Hauptinhalt springen/ });
  await expect(sprungmarke).toBeFocused();
});
