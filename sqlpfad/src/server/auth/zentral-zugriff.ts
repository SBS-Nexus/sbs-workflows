import 'server-only';
import { prisma } from '@/server/db/prisma';
import { oeffentlicheSchluessel, zentralerZugang } from '@/server/auth/zentral';
import {
  pruefeDiensttoken,
  pruefeHubToken,
  UngueltigesZugriffstoken,
} from '@/server/auth/zentral-identitaet';
import { neueAnfrageId, protokoll } from '@/server/auth/zentral-protokoll';

/**
 * Zugriff des Lernpfade-Hubs auf die schreibgeschützten Plattformquellen
 * (E4.5, docs/E4-5-BAUPLAN.md). Der Hub ruft von seinem Server aus mit
 * `Authorization: Bearer <Zugriffstoken>` ab; die Person ergibt sich aus
 * `sub` des Tokens und `User.authSubject`.
 *
 * Hat eine Anfrage diesen Kopf, gilt nur das Token, ohne Rückfall auf die
 * Sitzung der App. Ohne `AUTH_HUB_CLIENT_ID` werden Token abgelehnt.
 */
export type HubZugriff = { art: 'ohne-token' } | { art: 'token'; userId: string | null };

const BEARER = /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/;

export async function nutzerAusHubToken(request: Request): Promise<HubZugriff> {
  const kopf = request.headers.get('authorization');
  if (kopf === null) return { art: 'ohne-token' };

  const requestId = neueAnfrageId();
  const token = BEARER.exec(kopf)?.[1];
  const zugang = zentralerZugang();
  if (!token || !zugang?.hubClientId) {
    protokoll.warn('Zugriffstoken des Hubs abgelehnt', {
      requestId,
      grund: token ? 'kein Hub eingerichtet' : 'Kopf unbrauchbar',
    });
    return { art: 'token', userId: null };
  }

  try {
    const { aussteller, schluessel } = await oeffentlicheSchluessel(zugang);
    const sub = await pruefeHubToken(token, {
      aussteller,
      hubClientId: zugang.hubClientId,
      schluessel,
    });
    const nutzer = await prisma.user.findUnique({
      where: { authSubject: sub },
      select: { id: true },
    });
    // Kein Konto hier: Die Person war in dieser App noch nie über das
    // gemeinsame Konto angemeldet. Für den Hub heißt das „nicht verbunden“.
    return { art: 'token', userId: nutzer?.id ?? null };
  } catch (fehler) {
    protokoll.warn('Zugriffstoken des Hubs abgelehnt', {
      requestId,
      grund:
        fehler instanceof UngueltigesZugriffstoken
          ? fehler.message
          : fehler instanceof Error
            ? fehler.name
            : 'unbekannt',
    });
    return { art: 'token', userId: null };
  }
}

/**
 * E5.2: Ist die Anfrage von der Plattform selbst (Diensttoken)? Nur dann gibt
 * die Team-Quelle etwas heraus. Ohne `AUTH_PLATTFORM_SUB` immer `false`.
 */
export async function istPlattformDienst(request: Request): Promise<boolean> {
  const token = BEARER.exec(request.headers.get('authorization') ?? '')?.[1];
  const zugang = zentralerZugang();
  const requestId = neueAnfrageId();
  if (!token || !zugang?.plattformSub) {
    protokoll.warn('Diensttoken der Plattform abgelehnt', {
      requestId,
      grund: token ? 'keine Plattform eingerichtet' : 'Kopf fehlt oder unbrauchbar',
    });
    return false;
  }
  try {
    const { aussteller, schluessel } = await oeffentlicheSchluessel(zugang);
    await pruefeDiensttoken(token, { aussteller, plattformSub: zugang.plattformSub, schluessel });
    return true;
  } catch (fehler) {
    protokoll.warn('Diensttoken der Plattform abgelehnt', {
      requestId,
      grund:
        fehler instanceof UngueltigesZugriffstoken
          ? fehler.message
          : fehler instanceof Error
            ? fehler.name
            : 'unbekannt',
    });
    return false;
  }
}
