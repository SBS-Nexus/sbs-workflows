import { expect, test } from '@playwright/test';

/**
 * E6.3 — Fehlerbericht (docs/learning-fehlerbericht/). In dieser Suite ist
 * keine `SENTRY_DSN` gesetzt: Die Route nimmt Berichte an, gibt aber nichts
 * weiter. Geprüft wird, dass der Browser unbehandelte Fehler ohne Cookies an
 * die eigene Route meldet und die Route nur Berichte der eigenen Herkunft
 * annimmt.
 */
test('Unbehandelter Browserfehler geht ohne Cookies an die eigene Route', async ({ page }) => {
  await page.goto('/');
  const bericht = page.waitForRequest(
    (anfrage) => anfrage.url().endsWith('/api/fehlerbericht') && anfrage.method() === 'POST',
  );
  await page.evaluate(() => {
    setTimeout(() => {
      throw new TypeError('E2E-Testfehler');
    }, 0);
  });
  const anfrage = await bericht;
  const koerper = anfrage.postDataJSON() as Record<string, unknown>;
  expect(koerper).toMatchObject({ typ: 'TypeError', meldung: 'E2E-Testfehler', pfad: '/' });
  expect(Object.keys(koerper).sort()).toEqual(['meldung', 'pfad', 'stapel', 'typ']);
  expect(await anfrage.headerValue('cookie')).toBeNull();
  const antwort = await anfrage.response();
  expect(antwort?.status()).toBe(204);
});

test('Route nimmt nur Berichte der eigenen Herkunft als JSON an', async ({ request }) => {
  const bericht = { typ: 'Error', meldung: 'x' };
  expect((await request.post('/api/fehlerbericht', { data: bericht })).status()).toBe(204);
  expect(
    (
      await request.post('/api/fehlerbericht', {
        data: bericht,
        headers: { origin: 'https://boese.example' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post('/api/fehlerbericht', {
        data: 'x',
        headers: { 'content-type': 'text/plain' },
      })
    ).status(),
  ).toBe(415);
  expect((await request.post('/api/fehlerbericht', { data: { typ: 'Error' } })).status()).toBe(400);
});
