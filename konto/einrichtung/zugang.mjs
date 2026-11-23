// Zugang als befristeter System-Nutzer (ZITADEL_SYSTEMAPIUSERS): ein selbst
// signiertes JWT (RS256), zehn Minuten gültig. Gemeinsam genutzt von
// einrichten.mjs und den Prüfskripten unter konto/pruefung/.
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const b64url = (daten) => Buffer.from(daten).toString('base64url');

/** `aussteller` ist die öffentliche Adresse der Instanz (Zielgruppe des Tokens). */
export function systemToken({ nutzer, aussteller, schluesselPfad }) {
  const jetzt = Math.floor(Date.now() / 1000);
  const kopf = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const inhalt = b64url(
    JSON.stringify({ iss: nutzer, sub: nutzer, aud: aussteller, iat: jetzt, exp: jetzt + 600 }),
  );
  const schluessel = createPrivateKey(readFileSync(schluesselPfad));
  const signatur = sign('RSA-SHA256', Buffer.from(`${kopf}.${inhalt}`), schluessel);
  return `${kopf}.${inhalt}.${b64url(signatur)}`;
}

/** Ein JSON-Aufruf gegen die Instanz; wirft nicht, sondern liefert Status und Daten. */
export function apiMit(ziel, token) {
  return async function api(methode, pfad, koerper, { orgId } = {}) {
    const kopf = { authorization: `Bearer ${token}`, accept: 'application/json' };
    if (koerper !== undefined) kopf['content-type'] = 'application/json';
    if (orgId) kopf['x-zitadel-orgid'] = orgId;
    const antwort = await fetch(ziel + pfad, {
      method: methode,
      headers: kopf,
      body: koerper === undefined ? undefined : JSON.stringify(koerper),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await antwort.text();
    let daten = {};
    try {
      daten = text ? JSON.parse(text) : {};
    } catch {
      daten = { message: text.slice(0, 200) };
    }
    return { status: antwort.status, ok: antwort.ok, daten };
  };
}
