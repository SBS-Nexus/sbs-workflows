import { expect, test } from '@playwright/test';
import { onboardingAbschliessen } from '../e2e/helfer';
import { ANMELDUNG, anmeldenBeimKonto, kontoApi, testkonten } from './konto';

/**
 * AIPfad am gemeinsamen Konto gegen einen echten ZITADEL (E4.2, Schritt 4;
 * docs/E4-2-BAUPLAN.md, Abschnitt 5). Schalter `an`: /anmelden und
 * /registrieren leiten zum Konto.
 *
 * Seriell: Der zweite Test nutzt das Konto, das der erste verbunden hat.
 */
test.describe.configure({ mode: 'serial' });

test('anmelden über das Konto, Onboarding, abmelden beendet beide Sitzungen', async ({ page }) => {
  const { bestaetigt } = testkonten();
  const beginn = Date.now();

  // Geschützte Seite → AIPfad merkt sich das Ziel → Anmeldung beim Konto.
  await page.goto('/pfad');
  await anmeldenBeimKonto(page, bestaetigt);

  // Neues Konto: zuerst ins Onboarding, nicht ans gemerkte Ziel.
  await expect(page).toHaveURL('/onboarding');
  await onboardingAbschliessen(page);

  // Abmelden in AIPfad meldet auch beim Konto ab und führt zur Startseite.
  await page.getByRole('button', { name: 'Abmelden' }).first().click();
  await expect(page).toHaveURL('/');

  // Beide Sitzungen sind weg. AIPfad schickt wieder zum Konto, statt still
  // anzumelden; das Konto bietet die Adresse höchstens zur Auswahl an und
  // fragt dann erneut nach dem Passwort.
  await page.goto('/pfad');
  await expect(page).toHaveURL(new RegExp(`^${ANMELDUNG}/(loginname|accounts)`));

  // Beim Konto ist keine Sitzung aus diesem Test mehr offen.
  const { sessions = [] } = (await kontoApi('POST', '/v2/sessions/search', {
    queries: [{ userIdQuery: { id: bestaetigt.userId } }],
  })) as { sessions?: Array<{ creationDate: string }> };
  expect(sessions.filter((s) => Date.parse(s.creationDate) >= beginn - 5000)).toEqual([]);
});

test('der zweite Besuch kennt das Konto, und die Rückkanal-Abmeldung beendet die Sitzung', async ({
  page,
}) => {
  const { bestaetigt } = testkonten();

  await page.goto('/anmelden');
  await anmeldenBeimKonto(page, bestaetigt);
  // Das Konto ist schon verbunden (erster Test): kein Onboarding mehr.
  await expect(page).toHaveURL('/pfad');

  // Die Sitzung beim Konto endet von außen, etwa durch Abmelden in einer
  // anderen App. ZITADEL schickt dann ein Logout-Token an AIPfad.
  const { sessions = [] } = (await kontoApi('POST', '/v2/sessions/search', {
    queries: [{ userIdQuery: { id: bestaetigt.userId } }],
  })) as { sessions?: Array<{ id: string }> };
  expect(sessions.length).toBeGreaterThan(0);
  for (const sitzung of sessions) {
    await kontoApi('DELETE', `/v2/sessions/${sitzung.id}`, {});
  }

  // Die Zustellung läuft im Hintergrund von ZITADEL; geprüft wird, bis
  // AIPfad die Sitzung nicht mehr kennt.
  await expect
    .poll(async () => (await page.request.get('/pfad', { maxRedirects: 0 })).status(), {
      timeout: 30_000,
      intervals: [500, 1000, 2000],
    })
    .not.toBe(200);
});

test('ohne bestätigte Adresse geht es nicht in AIPfad', async ({ page }) => {
  const { unbestaetigt } = testkonten();

  await page.goto('/anmelden');
  await anmeldenBeimKonto(page, unbestaetigt);

  // Die Anmelde-App verlangt erst die Bestätigung (EMAIL_VERIFICATION=true).
  await expect(page).toHaveURL(new RegExp(`^${ANMELDUNG}/verify`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E-Mail-Adresse bestätigen');
});

test('registrieren öffnet die Registrierung beim Konto', async ({ page }) => {
  await page.goto('/registrieren');
  await expect(page).toHaveURL(new RegExp(`^${ANMELDUNG}/register`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konto erstellen');
});
