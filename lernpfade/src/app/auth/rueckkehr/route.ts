import { NextResponse, type NextRequest } from 'next/server';
import { sitzungSchreiben, zustandEntnehmen } from '@/server/konto/cookies';
import { hubKonto } from '@/server/konto/einstellungen';
import { AnmeldungAbgebrochen, RUECKKEHR_PFAD, schliesseAnmeldungAb } from '@/server/konto/oidc';
import { nachVerlorenemZustand, oeffneZustand } from '@/server/konto/zentral-zustand';

/**
 * Rückkehr vom gemeinsamen Konto in den Hub (E4.5b). Wie in den Apps: Zustand
 * gilt einmal; geht er verloren, startet die Anmeldung einmal selbst neu.
 * Danach liegt die Sitzung verschlüsselt im Cookie.
 */
export const dynamic = 'force-dynamic';

const KEIN_CACHE = { 'Cache-Control': 'no-store' };

function protokoll(stufe: 'info' | 'warn' | 'error', meldung: string, felder = {}): void {
  const zeile = JSON.stringify({
    level: stufe,
    message: meldung,
    bereich: 'hub-anmeldung',
    ...felder,
  });
  if (stufe === 'error') console.error(zeile);
  else if (stufe === 'warn') console.warn(zeile);
  else console.info(zeile);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const konto = hubKonto();
  if (!konto) return new NextResponse('Nicht gefunden.', { status: 404, headers: KEIN_CACHE });
  const weiter = (pfad: string) =>
    NextResponse.redirect(`${konto.basis}${pfad}`, { status: 303, headers: KEIN_CACHE });

  const zustand = oeffneZustand(await zustandEntnehmen(konto), konto.sitzungsGeheimnis);
  if (!zustand) {
    const weg = nachVerlorenemZustand(request.nextUrl.searchParams);
    protokoll('warn', 'Rückkehr ohne gültigen Anmeldezustand', { weg });
    return weg === 'neu-starten'
      ? weiter('/auth/anmelden?erneut=1')
      : weiter('/?anmeldung=abgelaufen');
  }

  try {
    const ergebnis = await schliesseAnmeldungAb(
      konto,
      new URL(`${RUECKKEHR_PFAD}${request.nextUrl.search}`, konto.basis),
      zustand,
    );
    if (!ergebnis) {
      protokoll('warn', 'Rückkehr ohne verwertbare Identität');
      return weiter('/?anmeldung=fehlgeschlagen');
    }
    await sitzungSchreiben(konto, ergebnis.sitzung, ergebnis.idToken);
    protokoll('info', 'Anmeldung im Hub');
    return weiter(zustand.ziel ?? '/fortschritt');
  } catch (fehler) {
    if (fehler instanceof AnmeldungAbgebrochen) {
      protokoll('info', 'Anmeldung im Hub beendet', { code: fehler.code });
      return weiter('/?anmeldung=abgebrochen');
    }
    protokoll('error', 'Rückkehr in den Hub fehlgeschlagen', {
      errorType: fehler instanceof Error ? fehler.name : 'unbekannt',
    });
    return weiter('/?anmeldung=fehlgeschlagen');
  }
}
