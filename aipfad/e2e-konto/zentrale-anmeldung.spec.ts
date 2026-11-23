import { expect, test } from '@playwright/test';
import { abmelden, ANMELDE_COOKIE, onboardingAbschliessen, STARTSEITE } from './app';
import { ANMELDUNG, anmeldenBeimKonto, kontoApi, testkonten } from './konto';

/**
 * Eine App am gemeinsamen Konto gegen einen echten ZITADEL (Vertrag
 * docs/learning-auth/; E4.2 Schritt 4, E4.4). Schalter `an`: /anmelden und
 * /registrieren leiten zum Konto. App-eigen ist nur `./app.ts`: Startseite,
 * Cookie-Name, Onboarding und wo „Abmelden“ steht.
 *
 * Seriell: Der zweite Test nutzt das Konto, das der erste verbunden hat.
 */
test.describe.configure({ mode: 'serial' });

test('anmelden über das Konto, Onboarding, abmelden beendet beide Sitzungen', async ({ page }) => {
  const { bestaetigt } = testkonten();
  const beginn = Date.now();

  // Geschützte Seite → die App merkt sich das Ziel → Anmeldung beim Konto.
  await page.goto(STARTSEITE);
  await anmeldenBeimKonto(page, bestaetigt);

  // Neues Konto: zuerst ins Onboarding, nicht ans gemerkte Ziel.
  await expect(page).toHaveURL('/onboarding');
  await onboardingAbschliessen(page);

  // Abmelden in der App meldet auch beim Konto ab und führt zur Startseite.
  await abmelden(page);
  await expect(page).toHaveURL('/');

  // Beide Sitzungen sind weg. Die App schickt wieder zum Konto, statt still
  // anzumelden; das Konto bietet die Adresse höchstens zur Auswahl an und
  // fragt dann erneut nach dem Passwort.
  await page.goto(STARTSEITE);
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
  await expect(page).toHaveURL(STARTSEITE);

  // Die Sitzung beim Konto endet von außen, etwa durch Abmelden in einer
  // anderen App. ZITADEL schickt dann ein Logout-Token an die App.
  const { sessions = [] } = (await kontoApi('POST', '/v2/sessions/search', {
    queries: [{ userIdQuery: { id: bestaetigt.userId } }],
  })) as { sessions?: Array<{ id: string }> };
  expect(sessions.length).toBeGreaterThan(0);
  for (const sitzung of sessions) {
    await kontoApi('DELETE', `/v2/sessions/${sitzung.id}`, {});
  }

  // Die Zustellung läuft im Hintergrund von ZITADEL; geprüft wird, bis
  // die App die Sitzung nicht mehr kennt.
  await expect
    .poll(async () => (await page.request.get(STARTSEITE, { maxRedirects: 0 })).status(), {
      timeout: 30_000,
      intervals: [500, 1000, 2000],
    })
    .not.toBe(200);
});

test('geht der Anmeldezustand verloren, startet die App die Anmeldung selbst neu', async ({
  page,
  context,
}) => {
  const { bestaetigt } = testkonten();

  await page.goto('/anmelden');
  await expect(page).toHaveURL(new RegExp(`^${ANMELDUNG}/loginname`));
  // Wie nach mehr als dreißig Minuten auf der Seite des Kontos.
  await context.clearCookies({ name: ANMELDE_COOKIE });

  await anmeldenBeimKonto(page, bestaetigt);
  // Kein Hinweis „zu lange gedauert“: Die App startet neu, das Konto
  // bestätigt ohne Rückfrage, und es geht weiter.
  await expect(page).toHaveURL(STARTSEITE);
});

test('ohne bestätigte Adresse geht es nicht in die App', async ({ page }) => {
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
