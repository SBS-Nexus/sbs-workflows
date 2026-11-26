import { createHash, createPrivateKey, randomBytes, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

/**
 * Hilfen für die Strecke gegen den Test-ZITADEL. Werte kommen aus
 * konto/pruefung/e2e/starte.sh ($KONTO_E2E_DIR).
 */

export const KONTO = 'http://localhost:8080';
export const ANMELDUNG = 'http://localhost:3000/ui/v2/login';

interface Testkonto {
  email: string;
  passwort: string;
  userId: string;
}

function ordner(): string {
  const dir = process.env.KONTO_E2E_DIR;
  if (!dir) throw new Error('KONTO_E2E_DIR fehlt.');
  return dir;
}

export function testkonten(): { bestaetigt: Testkonto; unbestaetigt: Testkonto } {
  return JSON.parse(readFileSync(path.join(ordner(), 'testkonten.json'), 'utf8'));
}

/** Füllt Adresse und Passwort auf den Seiten der Anmelde-App aus. */
export async function anmeldenBeimKonto(page: Page, konto: Testkonto): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`^${ANMELDUNG}/loginname`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Willkommen zurück');
  await page.getByLabel('E-Mail-Adresse').fill(konto.email);
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dein Passwort');
  await page.getByLabel('Passwort', { exact: true }).fill(konto.passwort);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

function b64url(daten: string | Buffer): string {
  return Buffer.from(daten).toString('base64url');
}

/** Aufruf der ZITADEL-API als befristeter System-Nutzer der Testinstanz. */
export async function kontoApi(methode: string, pfad: string, koerper?: unknown): Promise<unknown> {
  const jetzt = Math.floor(Date.now() / 1000);
  const kopf = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const inhalt = b64url(
    JSON.stringify({
      iss: 'einrichtung',
      sub: 'einrichtung',
      aud: KONTO,
      iat: jetzt,
      exp: jetzt + 300,
    }),
  );
  const schluessel = createPrivateKey(readFileSync(path.join(ordner(), 'einrichtung.pem')));
  const signatur = sign('RSA-SHA256', Buffer.from(`${kopf}.${inhalt}`), schluessel);

  const antwort = await fetch(`${KONTO}${pfad}`, {
    method: methode,
    headers: {
      authorization: `Bearer ${kopf}.${inhalt}.${b64url(signatur)}`,
      'content-type': 'application/json',
    },
    body: koerper === undefined ? undefined : JSON.stringify(koerper),
  });
  if (!antwort.ok) throw new Error(`${methode} ${pfad}: ${antwort.status} ${await antwort.text()}`);
  return antwort.json();
}

/** Adresse, unter der der Hub in der Strecke registriert ist (E4.5). */
export const HUB_BASIS = 'http://127.0.0.1:3210';

/**
 * Holt für die angemeldete Person ein echtes Zugriffstoken des Hubs: Code-Flow
 * mit PKCE in derselben Browsersitzung beim Konto (die Anmelde-App schließt
 * mit der bestehenden Sitzung ohne Rückfrage ab), die
 * Rückkehr zum (hier nicht laufenden) Hub nimmt ein kleiner Server auf
 * 127.0.0.1:3210 an, eingelöst wird der Code mit dem Client-Secret des Hubs.
 */
export async function hubZugriffstoken(page: Page): Promise<string> {
  const { AUTH_CLIENT_ID: id, AUTH_CLIENT_SECRET: geheim } = JSON.parse(
    readFileSync(path.join(ordner(), 'hub.json'), 'utf8'),
  ) as { AUTH_CLIENT_ID: string; AUTH_CLIENT_SECRET: string };
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const rueckkehr = `${HUB_BASIS}/auth/rueckkehr`;

  // Ein echter kleiner Server statt `page.route`: Die Rückkehr kommt als
  // Weiterleitung von ZITADEL, und die fing `page.route` in der CI nicht ab
  // (ERR_CONNECTION_REFUSED auf dem leeren Port). Hier läuft kein Hub; in der
  // Strecke der Apps ist der Port frei.
  let code: string | null = null;
  const hub = createServer((anfrage, antwort) => {
    const adresse = new URL(anfrage.url ?? '/', HUB_BASIS);
    if (adresse.pathname === '/auth/rueckkehr') code = adresse.searchParams.get('code');
    antwort.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    antwort.end('Hub (Strecke)');
  });
  await new Promise<void>((bereit, fehler) => {
    hub.once('error', fehler);
    hub.listen(Number(new URL(HUB_BASIS).port), new URL(HUB_BASIS).hostname, () => bereit());
  });
  const start = new URL(`${KONTO}/oauth/v2/authorize`);
  for (const [k, v] of Object.entries({
    client_id: id,
    redirect_uri: rueckkehr,
    response_type: 'code',
    scope: 'openid',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: randomBytes(8).toString('hex'),
  })) {
    start.searchParams.set(k, v);
  }
  try {
    await page.goto(start.href);
    await expect.poll(() => code, { timeout: 20_000 }).not.toBeNull();
  } finally {
    hub.close();
  }

  const antwort = await fetch(`${KONTO}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${encodeURIComponent(id)}:${encodeURIComponent(geheim)}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code ?? '',
      redirect_uri: rueckkehr,
      code_verifier: verifier,
    }),
  });
  if (!antwort.ok) throw new Error(`Token des Hubs: ${antwort.status} ${await antwort.text()}`);
  const { access_token: token } = (await antwort.json()) as { access_token: string };
  return token;
}
