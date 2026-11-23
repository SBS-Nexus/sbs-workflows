import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Zustand zwischen dem Start der Anmeldung beim gemeinsamen Konto und der
 * Rückkehr nach AIPfad (E4.2, docs/E4-2-BAUPLAN.md).
 *
 * Er liegt in einem kurzlebigen httpOnly-Cookie und ist mit HMAC-SHA256
 * signiert. `state` und `nonce` schützen gegen untergeschobene Antworten,
 * `codeVerifier` ist das PKCE-Geheimnis, `ziel` die Seite, auf die es danach
 * weitergeht. Ein verändertes, fremdes oder abgelaufenes Cookie gilt als
 * nicht vorhanden.
 */

export interface AnmeldeZustand {
  state: string;
  nonce: string;
  codeVerifier: string;
  /** Relativer Pfad innerhalb von AIPfad, bereits geprüft. */
  ziel: string | null;
  /** Erstellt in Millisekunden seit 1970. */
  erstellt: number;
}

/**
 * Dreißig Minuten: Eine Registrierung mit Bestätigungsmail, Passwortregeln
 * und einem vertippten Code dauerte beim ersten Rundgang 13 Minuten. Mit den
 * zuvor geltenden zehn Minuten endete sie auf der Hinweisseite.
 */
export const ZUSTAND_GUELTIG_MS = 30 * 60 * 1000;

/**
 * Kennzeichen im OAuth-`state` eines zweiten Versuchs. Es reist über das
 * gemeinsame Konto in der Adresse mit zurück, auch wenn das Cookie fehlt.
 */
export const ZWEITER_VERSUCH = 'w.';

/**
 * Was tun, wenn die Rückkehr ohne gültigen Zustand ankommt (abgelaufen, in
 * einem anderen Browser begonnen, Cookie gelöscht)?
 *
 * Kam ein Code zurück, ist die Person beim Konto angemeldet. Dann startet
 * die Anmeldung einmal neu; das Konto bestätigt ohne Rückfrage, und es geht
 * nahtlos weiter. Der zurückgekommene Code wird dabei nie eingelöst, eine
 * untergeschobene Anmeldung ist so ausgeschlossen. War es schon der zweite
 * Versuch (Kennzeichen im `state`, etwa weil Cookies gesperrt sind), oder
 * kam kein Code, erscheint die Hinweisseite statt einer Schleife.
 */
export function nachVerlorenemZustand(parameter: URLSearchParams): 'neu-starten' | 'hinweis' {
  const state = parameter.get('state') ?? '';
  if (!parameter.get('code') || parameter.has('error')) return 'hinweis';
  return state.startsWith(ZWEITER_VERSUCH) ? 'hinweis' : 'neu-starten';
}

/** Trennt diese Signaturen von allen anderen Verwendungen des Schlüssels. */
const ZWECK = 'aipfad-anmeldung-v1';

function signatur(inhalt: string, geheimnis: string): Buffer {
  return createHmac('sha256', geheimnis).update(`${ZWECK}.${inhalt}`).digest();
}

export function versiegleZustand(zustand: AnmeldeZustand, geheimnis: string): string {
  const inhalt = Buffer.from(JSON.stringify(zustand)).toString('base64url');
  return `${inhalt}.${signatur(inhalt, geheimnis).toString('base64url')}`;
}

function istText(wert: unknown, maximal = 256): wert is string {
  return typeof wert === 'string' && wert.length > 0 && wert.length <= maximal;
}

export function oeffneZustand(
  wert: string | undefined,
  geheimnis: string,
  jetzt: number = Date.now(),
): AnmeldeZustand | null {
  if (!wert || wert.length > 4096) return null;
  const teile = wert.split('.');
  if (teile.length !== 2) return null;
  const [inhalt, mitgeliefert] = teile as [string, string];

  const erwartet = signatur(inhalt, geheimnis);
  const erhalten = Buffer.from(mitgeliefert, 'base64url');
  if (erhalten.length !== erwartet.length || !timingSafeEqual(erhalten, erwartet)) return null;

  let daten: unknown;
  try {
    daten = JSON.parse(Buffer.from(inhalt, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof daten !== 'object' || daten === null) return null;
  const z = daten as Record<string, unknown>;

  if (!istText(z.state) || !istText(z.nonce) || !istText(z.codeVerifier)) return null;
  if (typeof z.erstellt !== 'number' || !Number.isFinite(z.erstellt)) return null;
  // Auch ein Zeitstempel aus der Zukunft ist verdächtig; eine Minute Spiel
  // fängt abweichende Uhren mehrerer Instanzen ab.
  if (z.erstellt > jetzt + 60_000 || jetzt - z.erstellt > ZUSTAND_GUELTIG_MS) return null;

  const ziel = z.ziel === null ? null : sicheresZiel(z.ziel);
  if (z.ziel !== null && ziel === null) return null;

  return {
    state: z.state,
    nonce: z.nonce,
    codeVerifier: z.codeVerifier,
    ziel,
    erstellt: z.erstellt,
  };
}

/** Pfade, auf die eine Anmeldung nie zurückführen darf (sonst Schleifen). */
const KEINE_ZIELE = ['/auth', '/anmelden', '/registrieren', '/api'];

/**
 * Nimmt nur relative Pfade dieser Anwendung an. Alles, was den Browser auf
 * einen anderen Host führen könnte (`//host`, `/\host`, Steuerzeichen,
 * Schemata), wird verworfen; ein offener Redirect ist damit ausgeschlossen.
 */
export function sicheresZiel(roh: unknown): string | null {
  if (typeof roh !== 'string' || roh.length === 0 || roh.length > 512) return null;
  if (!roh.startsWith('/') || roh.startsWith('//') || roh.includes('\\')) return null;
  // eslint-disable-next-line no-control-regex -- genau diese Zeichen sind gemeint
  if (/[\u0000-\u001f\u007f]/.test(roh)) return null;

  const basis = 'https://ziel.invalid';
  let url: URL;
  try {
    url = new URL(roh, basis);
  } catch {
    return null;
  }
  if (url.origin !== basis) return null;
  if (KEINE_ZIELE.some((pfad) => url.pathname === pfad || url.pathname.startsWith(`${pfad}/`))) {
    return null;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
