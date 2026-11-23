import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
