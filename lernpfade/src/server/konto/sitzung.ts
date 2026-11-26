import 'server-only';
import { createHash } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';

/**
 * Sitzung des Hubs ohne Datenbank (E4.5b): ein verschlüsseltes Cookie (JWE,
 * `dir` + `A256GCM`). Der Browser trägt es, kann es aber weder lesen noch
 * verändern. Darin liegen nur, was der Hub-Server braucht: `sub`, der
 * Anzeigename, das kurzlebige Zugriffstoken, das Aktualisierungstoken und
 * dessen Ablauf. Seit E5.1 dazu die Adresse mit ihrem Bestätigungsstand (für
 * an eine Adresse gebundene Einladungen) und ob mit zweitem Faktor angemeldet
 * wurde (Pflicht für Verwaltungsseiten der Organisationen).
 *
 * Das ID-Token für das Abmelden liegt in einem zweiten Cookie, damit keines
 * an die Größengrenze der Browser (4 KB) stößt.
 */
export interface HubSitzung {
  sub: string;
  name: string;
  zugriffstoken: string;
  aktualisierung: string | null;
  /** Ablauf des Zugriffstokens in Millisekunden seit 1970. */
  gueltigBis: number;
  /** E-Mail-Adresse aus dem Konto; `null`, wenn keine übermittelt wurde. */
  email: string | null;
  /** Hat das Konto die Adresse bestätigt (`email_verified`)? */
  emailBestaetigt: boolean;
  /** Wurde mit zwei Faktoren angemeldet (`amr` enthält `mfa`)? */
  zweiFaktoren: boolean;
}

/** Höchstdauer der Sitzung im Hub; das Konto kann sie früher beenden. */
export const SITZUNG_TAGE = 30;

function schluessel(geheimnis: string, zweck: string): Uint8Array {
  return new Uint8Array(
    createHash('sha256').update(`lernpfade-hub-${zweck}-v1.${geheimnis}`).digest(),
  );
}

async function versiegle(
  inhalt: Record<string, unknown>,
  geheimnis: string,
  zweck: string,
): Promise<string> {
  return new EncryptJWT(inhalt)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${SITZUNG_TAGE}d`)
    .encrypt(schluessel(geheimnis, zweck));
}

async function oeffne(
  wert: string | undefined,
  geheimnis: string,
  zweck: string,
): Promise<Record<string, unknown> | null> {
  if (!wert || wert.length > 4096) return null;
  try {
    const { payload } = await jwtDecrypt(wert, schluessel(geheimnis, zweck), {
      keyManagementAlgorithms: ['dir'],
      contentEncryptionAlgorithms: ['A256GCM'],
    });
    return payload;
  } catch {
    return null;
  }
}

export function versiegleSitzung(sitzung: HubSitzung, geheimnis: string): Promise<string> {
  return versiegle({ ...sitzung }, geheimnis, 'sitzung');
}

export async function oeffneSitzung(
  wert: string | undefined,
  geheimnis: string,
): Promise<HubSitzung | null> {
  const p = await oeffne(wert, geheimnis, 'sitzung');
  if (!p) return null;
  const text = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null);
  const sub = text(p.sub);
  const zugriffstoken = text(p.zugriffstoken);
  if (!sub || !zugriffstoken || typeof p.gueltigBis !== 'number') return null;
  return {
    sub,
    name: text(p.name) ?? '',
    zugriffstoken,
    aktualisierung: text(p.aktualisierung),
    gueltigBis: p.gueltigBis,
    // Ältere Sitzungen (vor E5.1) kennen diese Felder nicht: dann nichts behaupten.
    email: text(p.email),
    emailBestaetigt: p.emailBestaetigt === true,
    zweiFaktoren: p.zweiFaktoren === true,
  };
}

export function versiegleIdToken(idToken: string, geheimnis: string): Promise<string> {
  return versiegle({ idToken }, geheimnis, 'abmelden');
}

export async function oeffneIdToken(
  wert: string | undefined,
  geheimnis: string,
): Promise<string | null> {
  const p = await oeffne(wert, geheimnis, 'abmelden');
  return typeof p?.idToken === 'string' ? p.idToken : null;
}

/** Cookie-Namen; unter https mit `__Host-`-Präfix (kein Unterschieben über Subdomains). */
export function cookieNamen(sicher: boolean): {
  sitzung: string;
  abmelden: string;
  anmeldung: string;
} {
  const p = sicher ? '__Host-' : '';
  return {
    sitzung: `${p}lernpfade_sitzung`,
    abmelden: `${p}lernpfade_abmelden`,
    anmeldung: `${p}lernpfade_anmeldung`,
  };
}
