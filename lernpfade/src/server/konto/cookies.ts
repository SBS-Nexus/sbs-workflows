import 'server-only';
import { cookies } from 'next/headers';
import type { HubKonto } from './einstellungen.ts';
import {
  cookieNamen,
  oeffneIdToken,
  oeffneSitzung,
  SITZUNG_TAGE,
  versiegleIdToken,
  versiegleSitzung,
  type HubSitzung,
} from './sitzung.ts';
import { ZUSTAND_GUELTIG_MS } from './zentral-zustand.ts';

/**
 * Cookies des Hubs (E4.5b): `httpOnly`, `SameSite=Lax` (die Rückkehr vom
 * Konto ist eine seitenübergreifende Navigation), unter https `Secure` und
 * `__Host-`. Nur in Route Handlern schreibbar.
 */
function sicher(konto: HubKonto): boolean {
  return konto.basis.startsWith('https://');
}

function optionen(konto: HubKonto, maxAge: number) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: sicher(konto), path: '/', maxAge };
}

export function namen(konto: HubKonto) {
  return cookieNamen(sicher(konto));
}

export async function sitzungLesen(konto: HubKonto): Promise<HubSitzung | null> {
  const wert = (await cookies()).get(namen(konto).sitzung)?.value;
  return oeffneSitzung(wert, konto.sitzungsGeheimnis);
}

export async function idTokenLesen(konto: HubKonto): Promise<string | null> {
  const wert = (await cookies()).get(namen(konto).abmelden)?.value;
  return oeffneIdToken(wert, konto.sitzungsGeheimnis);
}

export async function sitzungSchreiben(
  konto: HubKonto,
  sitzung: HubSitzung,
  idToken?: string,
): Promise<void> {
  const speicher = await cookies();
  const dauer = SITZUNG_TAGE * 24 * 60 * 60;
  speicher.set(
    namen(konto).sitzung,
    await versiegleSitzung(sitzung, konto.sitzungsGeheimnis),
    optionen(konto, dauer),
  );
  if (idToken) {
    speicher.set(
      namen(konto).abmelden,
      await versiegleIdToken(idToken, konto.sitzungsGeheimnis),
      optionen(konto, dauer),
    );
  }
}

export async function sitzungLoeschen(konto: HubKonto): Promise<void> {
  const speicher = await cookies();
  // Löschen mit denselben Attributen wie beim Setzen, sonst ignoriert der
  // Browser es bei `__Host-`-Cookies.
  speicher.set(namen(konto).sitzung, '', optionen(konto, 0));
  speicher.set(namen(konto).abmelden, '', optionen(konto, 0));
}

export async function zustandSchreiben(konto: HubKonto, wert: string): Promise<void> {
  (await cookies()).set(
    namen(konto).anmeldung,
    wert,
    optionen(konto, Math.floor(ZUSTAND_GUELTIG_MS / 1000)),
  );
}

export async function zustandEntnehmen(konto: HubKonto): Promise<string | undefined> {
  const speicher = await cookies();
  const wert = speicher.get(namen(konto).anmeldung)?.value;
  speicher.set(namen(konto).anmeldung, '', optionen(konto, 0));
  return wert;
}
