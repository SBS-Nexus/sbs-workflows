import { expect, test } from '@playwright/test';

/**
 * Die vier Dateien, die eine Seite unter eigener Domain braucht.
 *
 * `robots.txt`, `sitemap.xml`, das Manifest und das Vorschaubild. Sie haben
 * eine unangenehme Gemeinsamkeit: **Niemand ruft sie auf.** Fehlen sie oder
 * stehen falsche Adressen darin, merkt das keine Lernende und kein Test der
 * Anwendung – es merken Suchmaschinen und Messenger, und die sagen nichts.
 *
 * Der teuerste Fehler wäre eine falsche Adresse: Wird ohne die richtige
 * `APP_URL` gebaut, stünde dort eine Adresse, die es nicht gibt – und die
 * Datei sähe trotzdem gültig aus. Deshalb steht in beiden Routen
 * `dynamic = 'force-dynamic'`, und deshalb prüft dieser Test die Adresse und
 * nicht nur den Statuscode.
 */

/** Dieselbe Adresse, aus der `siteUrl()` auf dem Server liest. */
const ERWARTETE_BASIS = (process.env.APP_URL ?? '').replace(/\/+$/, '');

test('robots.txt sperrt den angemeldeten Bereich und nennt das Verzeichnis', async ({
  request,
}) => {
  const antwort = await request.get('/robots.txt');
  expect(antwort.status()).toBe(200);

  const text = await antwort.text();

  // Keine Zugangssicherung – die steht in requireUser(). Aber ein Suchtreffer,
  // der zur Anmeldemaske führt, ist für niemanden ein Treffer.
  for (const gesperrt of ['/lernen', '/ueben', '/wiederholen', '/profil', '/admin']) {
    expect(text, `${gesperrt} fehlt in den Disallow-Regeln`).toContain(`Disallow: ${gesperrt}`);
  }

  expect(text).toContain('Allow: /');
  expect(text).toContain(`Sitemap: ${ERWARTETE_BASIS}/sitemap.xml`);
});

test('sitemap.xml führt nur öffentlich erreichbare Adressen', async ({ request }) => {
  const antwort = await request.get('/sitemap.xml');
  expect(antwort.status()).toBe(200);

  const text = await antwort.text();

  /*
   * Ohne Schrägstrich am Ende: `absoluteUrl('/')` liefert die Basis
   * unverändert, damit kein `//` entsteht. Beide Formen sind gültig – der Test
   * hält fest, welche diese Anwendung wählt.
   */
  expect(text).toContain(`<loc>${ERWARTETE_BASIS}</loc>`);
  expect(text).toContain(`<loc>${ERWARTETE_BASIS}/anmelden</loc>`);
  expect(text).toContain(`<loc>${ERWARTETE_BASIS}/registrieren</loc>`);

  /*
   * Die eigentliche Aussage des Tests. Alle fünfzehn Lektionen einzutragen ist
   * verlockend – „mehr Seiten im Index". Sie sind aber ohne Anmeldung nicht
   * erreichbar, und ein Verzeichnis voller Weiterleitungen zur Anmeldung
   * beschädigt das Vertrauen in die ganze Datei.
   */
  expect(text).not.toContain('/lernen');
  expect(text).not.toContain('/ueben');
  expect(text).not.toContain('/admin');
});

test('das Manifest beschreibt eine installierbare Anwendung', async ({ request }) => {
  const antwort = await request.get('/manifest.webmanifest');
  expect(antwort.status()).toBe(200);

  const manifest = (await antwort.json()) as {
    name: string;
    start_url: string;
    icons: unknown[];
  };

  expect(manifest.name).toContain('SQLPfad');
  // Wer die Anwendung auf den Startbildschirm legt, will weiterlernen und
  // nicht das Werbeversprechen noch einmal lesen.
  expect(manifest.start_url).toBe('/lernen');
  // Ohne Symbole ist ein Manifest nicht installierbar - und genau das fiele
  // erst auf einem Telefon auf.
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test('die im Manifest genannten Symbole gibt es wirklich', async ({ request }) => {
  /*
   * Gegenprobe zum Test darüber: Dass Symbole *eingetragen* sind, heißt nicht,
   * dass sie ausgeliefert werden. Ein Manifest, das auf eine 404 zeigt, ist
   * schlimmer als eines ohne Symbole.
   */
  for (const pfad of ['/icon.svg', '/icon-maskable.svg']) {
    const antwort = await request.get(pfad);
    expect(antwort.status(), `${pfad} wird nicht ausgeliefert`).toBe(200);
  }
});

test('geteilte Verweise bekommen ein Vorschaubild', async ({ request }) => {
  // In den Kopfdaten steht `summary_large_image`. Ohne Bild ist das ein großes
  // leeres Kästchen - die schlechteste aller Varianten.
  const antwort = await request.get('/opengraph-image');
  expect(antwort.status()).toBe(200);
  expect(antwort.headers()['content-type']).toContain('image/png');
});
