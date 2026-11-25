import 'server-only';
import { NextResponse } from 'next/server';
import { sitzungLesen, sitzungLoeschen, sitzungSchreiben } from './cookies.ts';
import { hubKonto } from './einstellungen.ts';
import { aktualisiere } from './oidc.ts';
import { protokoll } from './protokoll.ts';
import { frageQuellenAb, quellenProtokoll, type QuellenZiel } from './quellen.ts';

/**
 * E4.5c: Gemeinsamer Ablauf der Sammelrouten `/api/hub/fortschritt` und
 * `/api/hub/wiederholen`. Der Browser fragt nur diese Routen (gleiche
 * Herkunft); der Hub-Server ruft die Plattformquellen der Apps mit seinem
 * Zugriffstoken ab und reicht Status und Antwort je Quelle durch.
 *
 * Läuft das Zugriffstoken bald ab, wird es hier einmal aktualisiert. Lehnt das
 * Konto ab (abgemeldet), endet auch die Sitzung im Hub: 401. Ist das Konto
 * nicht erreichbar, bleibt die Sitzung, und alle Quellen gelten als nicht
 * erreichbar.
 */
const KEIN_CACHE = { 'Cache-Control': 'no-store' };
const VORLAUF_MS = 60_000;

export async function antwortMitQuellen<S extends string>(
  route: 'fortschritt' | 'wiederholen',
  ziele: readonly QuellenZiel<S>[],
  timeoutMs: number,
): Promise<NextResponse> {
  const konto = hubKonto();
  if (!konto) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: KEIN_CACHE });
  }

  let sitzung = await sitzungLesen(konto);
  if (!sitzung) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: KEIN_CACHE });
  }

  if (sitzung.gueltigBis - VORLAUF_MS < Date.now()) {
    let neu: Awaited<ReturnType<typeof aktualisiere>>;
    try {
      neu = await aktualisiere(konto, sitzung);
    } catch (fehler) {
      protokoll('hub-quellen', 'error', 'Zugriffstoken nicht aktualisierbar', {
        route,
        errorType: fehler instanceof Error ? fehler.name : 'unbekannt',
      });
      const quellen = Object.fromEntries(ziele.map(({ quelle }) => [quelle, { status: 503 }]));
      return NextResponse.json({ quellen }, { headers: KEIN_CACHE });
    }
    if (!neu) {
      await sitzungLoeschen(konto);
      protokoll('hub-quellen', 'info', 'Sitzung im Hub beendet: Konto lehnt Aktualisieren ab', {
        route,
      });
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: KEIN_CACHE });
    }
    await sitzungSchreiben(konto, neu);
    sitzung = neu;
  }

  const beginn = Date.now();
  const quellen = await frageQuellenAb(
    ziele,
    sitzung.zugriffstoken,
    (adresse, init) => fetch(adresse, init),
    timeoutMs,
  );
  protokoll('hub-quellen', 'info', 'Quellen über den Hub', {
    route,
    dauerMs: Date.now() - beginn,
    ...quellenProtokoll(quellen),
  });
  return NextResponse.json({ quellen }, { headers: KEIN_CACHE });
}
