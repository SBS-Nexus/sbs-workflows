import { expect, test } from '@playwright/test';

/**
 * Betriebsendpunkte und Offlinefähigkeit.
 *
 * Bewusst ohne Anmeldung: Genau darum geht es – ein Lastverteiler hat kein
 * Konto, und die Offlineseite muss auch dann erscheinen, wenn niemand
 * angemeldet ist.
 */
test.describe('Betrieb', () => {
  test('meldet Lebenszeichen ohne Datenbankzugriff', async ({ request }) => {
    const antwort = await request.get('/api/health');
    expect(antwort.status()).toBe(200);
    expect(antwort.headers()['cache-control']).toContain('no-store');

    const daten = (await antwort.json()) as { status: string; service: string };
    expect(daten.status).toBe('ok');
    expect(daten.service).toBe('pythonpfad');
  });

  test('meldet Bereitschaft samt Inhaltsprüfung', async ({ request }) => {
    const antwort = await request.get('/api/ready');
    expect(antwort.status()).toBe(200);

    const daten = (await antwort.json()) as { status: string; lessons: number };
    expect(daten.status).toBe('ready');
    // Eine erreichbare, aber leere Datenbank wäre für Lernende unbrauchbar.
    expect(daten.lessons).toBeGreaterThan(0);
  });

  test('verrät in der Bereitschaftsantwort keine Betriebsdetails', async ({ request }) => {
    const antwort = await request.get('/api/ready');
    const text = await antwort.text();
    // Weder Verbindungszeichenfolge noch Hostname noch Datenbankmeldung.
    expect(text).not.toMatch(/postgres|localhost|5432|password/i);
  });

  test('liefert ein gültiges Web-App-Manifest', async ({ request }) => {
    const antwort = await request.get('/manifest.webmanifest');
    expect(antwort.status()).toBe(200);

    const manifest = (await antwort.json()) as {
      name: string;
      start_url: string;
      display: string;
      icons: Array<{ src: string }>;
    };
    expect(manifest.name).toContain('PythonPfad');
    expect(manifest.start_url).toBe('/lernen');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('liefert den Service Worker aus', async ({ request }) => {
    const antwort = await request.get('/sw.js');
    expect(antwort.status()).toBe(200);

    const quelltext = await antwort.text();
    // Die zentrale Zusage: Seitenaufrufe werden nie zwischengespeichert.
    expect(quelltext).toContain("request.mode === 'navigate'");
    expect(quelltext).toContain('/pyodide/');
  });

  test('erklärt auf der Offlineseite, was geht und was nicht', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: 'Gerade keine Verbindung' })).toBeVisible();
    await expect(page.getByText(/Nein\. Alles, was du eingereicht hast/)).toBeVisible();
    await expect(page.getByText(/legen wir absichtlich nicht im Browser-Cache ab/)).toBeVisible();
  });
});
