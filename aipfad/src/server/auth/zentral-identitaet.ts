import 'server-only';
import { jwtVerify, type JWTVerifyGetKey } from 'jose';

/**
 * Was AIPfad aus den Token des gemeinsamen Kontos liest, und wie es die
 * Rückkanal-Abmeldung prüft (E4.2, docs/E4-2-BAUPLAN.md). Ohne Netz und ohne
 * Datenbank, damit sich jede Regel einzeln testen lässt.
 */

export interface ZentraleIdentitaet {
  /** Stabile Kennung beim gemeinsamen Konto. */
  sub: string;
  /** Kleingeschrieben. */
  email: string;
  emailBestaetigt: boolean;
  /** 2 bis 80 Zeichen, wie bei der Registrierung in AIPfad. */
  name: string;
  /** Sitzung beim gemeinsamen Konto, für die Rückkanal-Abmeldung. */
  sid: string | null;
  /** Wurde mit zwei Faktoren angemeldet (`amr` enthält `mfa`)? */
  zweiFaktoren: boolean;
}

const MAX_EMAIL = 200;
const MAX_NAME = 80;

function text(wert: unknown): string | null {
  return typeof wert === 'string' && wert.trim().length > 0 ? wert.trim() : null;
}

function nameAus(claims: Record<string, unknown>, email: string): string {
  const kandidaten = [
    text(claims.name),
    [text(claims.given_name), text(claims.family_name)].filter(Boolean).join(' ') || null,
    text(claims.preferred_username),
  ];
  for (const kandidat of kandidaten) {
    if (kandidat && kandidat.length >= 2 && !kandidat.includes('@')) {
      return kandidat.slice(0, MAX_NAME).trim();
    }
  }
  const lokal = email.split('@')[0] ?? '';
  return lokal.length >= 2 ? lokal.slice(0, MAX_NAME) : 'Lernende Person';
}

/**
 * Liest die Identität aus den Claims (ID-Token, bei Bedarf ergänzt um
 * UserInfo). Ohne `sub` oder ohne brauchbare Adresse gibt es keine
 * Identität: Ein Konto ohne Adresse kann AIPfad nicht zuordnen.
 */
export function identitaetAusClaims(claims: Record<string, unknown>): ZentraleIdentitaet | null {
  const sub = text(claims.sub);
  const emailRoh = text(claims.email);
  if (!sub || sub.length > 255 || !emailRoh) return null;

  const email = emailRoh.toLowerCase();
  if (email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+$/.test(email)) return null;

  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const sid = text(claims.sid);

  return {
    sub,
    email,
    // Nur ein echtes `true` zählt, kein "true" als Text.
    emailBestaetigt: claims.email_verified === true,
    name: nameAus(claims, email),
    sid: sid && sid.length <= 255 ? sid : null,
    zweiFaktoren: amr.includes('mfa'),
  };
}

export const RUECKKANAL_EREIGNIS = 'http://schemas.openid.net/event/backchannel-logout';

export interface AbmeldeAuftrag {
  sid: string | null;
  sub: string | null;
}

export class UngueltigesAbmeldeToken extends Error {
  constructor(grund: string) {
    super(`Abmelde-Token abgelehnt: ${grund}`);
    this.name = 'UngueltigesAbmeldeToken';
  }
}

/**
 * Prüft ein Logout-Token nach OpenID Connect Back-Channel Logout 1.0,
 * Abschnitt 2.6: Signatur, Aussteller, Zielgruppe, Alter, `jti`, das
 * Ereignis, `sid` oder `sub`, und kein `nonce` (sonst könnte ein ID-Token
 * als Abmeldung durchgehen).
 */
export async function pruefeAbmeldeToken(
  token: string,
  optionen: {
    aussteller: string;
    zielgruppe: string;
    schluessel: JWTVerifyGetKey;
    jetzt?: Date;
  },
): Promise<AbmeldeAuftrag> {
  if (token.length > 8192) throw new UngueltigesAbmeldeToken('zu lang');

  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(token, optionen.schluessel, {
      issuer: optionen.aussteller,
      audience: optionen.zielgruppe,
      algorithms: ['RS256', 'ES256', 'EdDSA'],
      requiredClaims: ['iat', 'jti', 'events'],
      maxTokenAge: '5m',
      clockTolerance: 60,
      ...(optionen.jetzt ? { currentDate: optionen.jetzt } : {}),
    }));
  } catch (fehler) {
    throw new UngueltigesAbmeldeToken(fehler instanceof Error ? fehler.name : 'Signatur');
  }

  const ereignisse = payload.events;
  if (
    typeof ereignisse !== 'object' ||
    ereignisse === null ||
    typeof (ereignisse as Record<string, unknown>)[RUECKKANAL_EREIGNIS] !== 'object'
  ) {
    throw new UngueltigesAbmeldeToken('Ereignis fehlt');
  }
  if ('nonce' in payload) throw new UngueltigesAbmeldeToken('nonce vorhanden');

  const sid = text(payload.sid);
  const sub = text(payload.sub);
  if (!sid && !sub) throw new UngueltigesAbmeldeToken('weder sid noch sub');

  return { sid, sub };
}
