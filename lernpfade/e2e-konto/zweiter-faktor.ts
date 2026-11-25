import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { anmeldenBeimKonto } from './konto';

/**
 * E5.1: Testkonto mit Authenticator-App (konto/pruefung/testkonten.mjs). Nur
 * im Hub; die bytegleiche Vertragskopie `konto.ts` bleibt unberührt.
 */
export interface KontoMitZweitemFaktor {
  email: string;
  passwort: string;
  userId: string;
  totpGeheimnis: string;
}

export function kontoMitZweitemFaktor(): KontoMitZweitemFaktor {
  const dir = process.env.KONTO_E2E_DIR;
  if (!dir) throw new Error('KONTO_E2E_DIR fehlt.');
  const konten = JSON.parse(readFileSync(path.join(dir, 'testkonten.json'), 'utf8')) as {
    zweiFaktoren?: KontoMitZweitemFaktor;
  };
  if (!konten.zweiFaktoren) throw new Error('testkonten.json ohne Konto mit zweitem Faktor (starte.sh neu ausführen).');
  return konten.zweiFaktoren;
}

function base32(text: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let wert = 0;
  const bytes: number[] = [];
  for (const zeichen of text.replace(/=+$/, '').toUpperCase()) {
    const i = alphabet.indexOf(zeichen);
    if (i < 0) continue;
    wert = (wert << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((wert >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** TOTP nach RFC 6238 (SHA-1, 30 Sekunden, sechs Stellen), wie in testkonten.mjs. */
export function totp(geheimnis: string, zeit = Date.now()): string {
  const zaehler = Buffer.alloc(8);
  zaehler.writeBigUInt64BE(BigInt(Math.floor(zeit / 30_000)));
  const h = createHmac('sha1', base32(geheimnis)).update(zaehler).digest();
  const o = h[h.length - 1]! & 15;
  const zahl = ((h[o]! & 127) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(zahl % 1_000_000).padStart(6, '0');
}

/**
 * Zuletzt genutztes 30-Sekunden-Fenster je Schlüssel. ZITADEL nimmt einen Code
 * nur einmal an (Schutz vor Wiederholung); eine zweite Anmeldung im selben
 * Fenster wartet deshalb wie eine echte Authenticator-App auf den nächsten Code.
 */
const zuletztGenutzt = new Map<string, number>();

async function frischerCode(page: Page, geheimnis: string): Promise<string> {
  const fenster = Math.floor(Date.now() / 30_000);
  const letztes = zuletztGenutzt.get(geheimnis);
  if (letztes !== undefined && fenster <= letztes) {
    await page.waitForTimeout((letztes + 1) * 30_000 - Date.now() + 500);
  }
  const jetzt = Date.now();
  zuletztGenutzt.set(geheimnis, Math.floor(jetzt / 30_000));
  return totp(geheimnis, jetzt);
}

/** Adresse, Passwort und Code aus der Authenticator-App. */
export async function anmeldenMitZweitemFaktor(page: Page, konto: KontoMitZweitemFaktor): Promise<void> {
  await anmeldenBeimKonto(page, konto);
  const titel = page.getByRole('heading', { level: 1 });
  await expect(titel).toHaveText(/Code eingeben|Bestätige, dass du es bist/);
  if ((await titel.textContent())?.includes('Bestätige')) {
    await page.getByRole('button', { name: /Authenticator-App/ }).click();
    await expect(titel).toHaveText('Code eingeben');
  }
  await page.getByLabel('Code', { exact: true }).fill(await frischerCode(page, konto.totpGeheimnis));
  await page.getByRole('button', { name: 'Bestätigen' }).click();
}
