import 'server-only';
import { prisma } from '@/server/db/prisma';
import { oeffentlicheSchluessel, zentralerZugang } from '@/server/auth/zentral';
import { pruefeHubToken, UngueltigesZugriffstoken } from '@/server/auth/zentral-identitaet';
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
