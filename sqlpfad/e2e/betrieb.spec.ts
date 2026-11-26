import { expect, test } from '@playwright/test';

/**
 * Betriebsendpunkt für den Healthcheck der Bereitstellung.
 *
 * Bewusst ohne Anmeldung: Der Healthcheck der Plattform hat kein Konto.
 */
test.describe('Betrieb', () => {
  test('meldet Lebenszeichen ohne Anmeldung und ohne Zwischenspeicher', async ({ request }) => {
    const antwort = await request.get('/api/health');
    expect(antwort.status()).toBe(200);
    expect(antwort.headers()['cache-control']).toContain('no-store');

    const daten = (await antwort.json()) as { status: string; service: string };
    expect(daten.status).toBe('ok');
    expect(daten.service).toBe('sqlpfad');
  });
});
