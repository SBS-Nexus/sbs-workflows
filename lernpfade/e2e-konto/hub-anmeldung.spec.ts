import { expect, test } from '@playwright/test';
import { anmeldenBeimKonto, testkonten } from './konto';

/**
 * Anmeldung im Hub über das gemeinsame Konto gegen einen echten ZITADEL
 * (E4.5b, docs/E4-5-BAUPLAN.md). Die Kopfzeile fragt `/auth/status` ab und
 * zeigt „Anmelden“ oder den Namen mit „Abmelden“.
 */
test.describe.configure({ mode: 'serial' });

test('anmelden im Hub, Name im Kopf, Sitzung verschlüsselt, abmelden', async ({
  page,
  context,
}) => {
  const { bestaetigt } = testkonten();

  await page.goto('/fortschritt');
  const nav = page.getByRole('navigation', { name: 'Seitennavigation' });
  await nav.getByRole('link', { name: 'Anmelden' }).click();
  await anmeldenBeimKonto(page, bestaetigt);

  // Zurück auf der Seite, von der aus angemeldet wurde.
  await expect(page).toHaveURL('/fortschritt');
  await expect(nav.getByText('Ada Testkonto')).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Abmelden' })).toBeVisible();

  // Die Sitzung liegt verschlüsselt im Cookie: weder Name noch Token lesbar.
  const sitzung = (await context.cookies()).find((c) => c.name === 'lernpfade_sitzung');
  expect(sitzung?.httpOnly).toBe(true);
  expect(sitzung?.value.split('.')).toHaveLength(5);
  expect(sitzung?.value).not.toContain('Ada');

  await nav.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page).toHaveURL('/');
  await expect(
    page
      .getByRole('navigation', { name: 'Seitennavigation' })
      .getByRole('link', { name: 'Anmelden' }),
  ).toBeVisible();
  expect((await context.cookies()).find((c) => c.name === 'lernpfade_sitzung')).toBeUndefined();
});

test('der Anmeldestand ist ohne Sitzung „abgemeldet“', async ({ request }) => {
  const antwort = await request.get('/auth/status');
  expect(antwort.status()).toBe(200);
  expect(await antwort.json()).toEqual({ eingerichtet: true, angemeldet: false });
});
