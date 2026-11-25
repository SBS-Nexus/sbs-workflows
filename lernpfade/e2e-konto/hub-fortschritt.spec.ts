import { expect, test } from '@playwright/test';
import { anmeldenBeimKonto, testkonten } from './konto';

/**
 * Tor von E4.5 (docs/E4-5-BAUPLAN.md): `/fortschritt` im Hub zeigt echte Daten
 * der angemeldeten Person. Gegen einen echten ZITADEL und ein laufendes AIPfad
 * (Schalter `an`, nimmt das Zugriffstoken des Hubs an). Der Hub-Server fragt
 * AIPfad mit seinem Token, der Browser nur den Hub.
 */
const AIPFAD = 'http://127.0.0.1:3101';

test('nach einmaligem Verbinden zeigt /fortschritt die echten Werte aus AIPfad', async ({
  page,
}) => {
  const { bestaetigt } = testkonten();

  await page.goto('/fortschritt');
  await page.getByRole('link', { name: 'Mit Lernpfade-Konto anmelden' }).click();
  await anmeldenBeimKonto(page, bestaetigt);
  await expect(page).toHaveURL('/fortschritt');

  // AIPfad kennt die Person noch nicht: Das ist kein „0 Fortschritt“, sondern ein Hinweis.
  const ai = page.getByRole('article', { name: 'AIPfad' });
  await expect(ai.getByText('kennt dein Lernpfade-Konto noch nicht')).toBeVisible();

  // Einmal in AIPfad anmelden: ohne Passwort (Sitzung beim Konto); AIPfad legt das Konto an.
  await ai.getByRole('link', { name: 'In AIPfad anmelden' }).click();
  await expect(page).toHaveURL(`${AIPFAD}/onboarding`);

  // Zurück im Hub: Die Werte kommen aus AIPfad, über den Hub-Server.
  await page.goto('/fortschritt');
  await expect(ai.getByText('Lektionen abgeschlossen')).toBeVisible();
  await expect(ai.getByText('Noch keine Lernaktivität in AIPfad erfasst.')).toBeVisible();
  await expect(ai.getByText('kennt dein Lernpfade-Konto noch nicht')).toHaveCount(0);
});

test('ohne Sitzung im Hub liefert die Sammelroute nichts', async ({ request }) => {
  const antwort = await request.get('/api/hub/fortschritt');
  expect(antwort.status()).toBe(401);
});
