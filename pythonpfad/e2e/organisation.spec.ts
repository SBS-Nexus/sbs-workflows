import { expect, test } from '@playwright/test';
import { completeOnboarding, freshAccount, register } from './helpers';

/**
 * Organisationsbereich von der Anlage bis zur Einladung.
 *
 * Der Durchlauf ist bewusst zusammenhängend: Der Wert liegt darin, dass der
 * Einladungslink aus dem einen Schritt im nächsten wirklich funktioniert.
 */
test('legt eine Organisation an, lädt ein und wahrt dabei die Datensparsamkeit', async ({
  page,
  browser,
}) => {
  const inhaberin = freshAccount();
  await register(page, inhaberin);
  await completeOnboarding(page);

  await test.step('Organisation anlegen', async () => {
    await page.goto('/organisation');
    await page.getByLabel('Name der Organisation').fill('Volkshochschule Beispielstadt');
    await page.getByRole('button', { name: 'Organisation anlegen' }).click();
    await expect(page.getByText(/Organisation angelegt/)).toBeVisible();

    await page.reload();
    await page.getByRole('link', { name: 'Volkshochschule Beispielstadt' }).click();
    await expect(
      page.getByRole('heading', { name: 'Volkshochschule Beispielstadt' }),
    ).toBeVisible();
    await expect(page.getByText('Inhaberin oder Inhaber').first()).toBeVisible();
  });

  await test.step('Kohorte anlegen', async () => {
    const abschnitt = page.getByRole('region', { name: 'Kohorte anlegen' });
    await abschnitt.getByLabel('Name der Kohorte').fill('Kurs Herbst 2026');
    await abschnitt.getByRole('button', { name: 'Kohorte anlegen' }).click();
    await expect(abschnitt.getByText(/Kohorte „Kurs Herbst 2026" angelegt/)).toBeVisible();

    // Dieselbe Handlung steht danach im Prüfprotokoll – das ist der Zweck des
    // Protokolls und zugleich der Beleg, dass es geschrieben wird.
    await expect(
      page.getByRole('region', { name: 'Prüfprotokoll' }).getByText(/Kurs Herbst 2026/),
    ).toBeVisible();
  });

  let einladungsLink = '';
  await test.step('Einladung erstellen', async () => {
    await page.reload();
    const abschnitt = page.getByRole('region', { name: 'Jemanden einladen' });
    await abschnitt.getByRole('radio', { name: /Lernende Person/ }).check();
    // Direkt in die Kohorte aufnehmen – sonst gehört die Person zwar zur
    // Organisation, aber zu keiner Gruppe, und es gäbe nichts zu sehen.
    await abschnitt
      .getByLabel('Direkt in eine Kohorte aufnehmen')
      .selectOption({ label: 'Kurs Herbst 2026' });
    await abschnitt.getByRole('button', { name: 'Einladungslink erstellen' }).click();

    const link = page.getByText(/^\/einladung\//);
    await expect(link).toBeVisible();
    einladungsLink = (await link.textContent()) ?? '';
    expect(einladungsLink).toMatch(/^\/einladung\/[\w-]{20,}$/);

    // Der Hinweis muss klarstellen, dass der Link nicht wiederkommt.
    await expect(page.getByText(/nur jetzt angezeigt/)).toBeVisible();
  });

  await test.step('Zweite Person löst die Einladung ein', async () => {
    const kontext = await browser.newContext();
    const zweiteSeite = await kontext.newPage();
    const lernende = freshAccount();
    await register(zweiteSeite, lernende);
    await completeOnboarding(zweiteSeite);

    await zweiteSeite.goto(einladungsLink);
    await expect(zweiteSeite.getByText(/Dein persönlicher Verlauf bleibt privat/)).toBeVisible();
    await zweiteSeite.getByRole('button', { name: 'Einladung annehmen' }).click();
    await expect(zweiteSeite.getByText(/Du gehörst jetzt zu/)).toBeVisible();

    // Standardmäßig keine namentliche Freigabe.
    await zweiteSeite.goto('/profil');
    await expect(zweiteSeite.getByText(/fließt ausschließlich in Summenwerte ein/)).toBeVisible();
    await expect(zweiteSeite.getByRole('button', { name: 'Namentlich freigeben' })).toBeVisible();

    await kontext.close();
  });

  await test.step('Kohorte zeigt keine Namen und keine Summen bei zu wenigen Mitgliedern', async () => {
    await page.goto('/organisation');
    await page.getByRole('link', { name: 'Volkshochschule Beispielstadt' }).click();
    await page.getByRole('link', { name: 'Kurs Herbst 2026' }).click();

    await expect(page.getByRole('heading', { name: 'Kurs Herbst 2026' })).toBeVisible();
    // Eine Person – unterhalb der Mindestgröße für Summenwerte.
    await expect(page.getByText(/Summenwerte werden erst ab drei angezeigt/)).toBeVisible();
    await expect(page.getByText(/hat der namentlichen Anzeige zugestimmt/)).toBeVisible();
  });
});

test('verbirgt eine fremde Organisation vollständig', async ({ page }) => {
  await register(page, freshAccount());
  await completeOnboarding(page);

  // Ein geratener Bezeichner darf nicht verraten, ob es die Organisation gibt.
  //
  // Geprüft wird das Sichtbare und nicht der HTTP-Status: Die Seite streamt,
  // der Kopf der Antwort ist also längst gesendet, wenn die Berechtigungsprüfung
  // greift. Entscheidend ist ohnehin, was ankommt.
  await page.goto('/organisation/irgendeine-fremde-organisation');
  await expect(page.getByText('Diese Seite gibt es nicht')).toBeVisible();
});
