import { NextResponse } from 'next/server';
import { sitzungLesen } from '@/server/konto/cookies';
import { hubKonto } from '@/server/konto/einstellungen';

/**
 * Anmeldestand für die Kopfzeile (E4.5b). Die Seiten des Hubs bleiben
 * statisch; die Kopfzeile fragt diesen Stand im Browser ab. Ohne
 * eingerichtete Anmeldung `{ eingerichtet: false }` mit 200, dann zeigt die
 * Kopfzeile nichts. Kein 404: Den meldete der Browser als Konsolenfehler auf
 * jeder Seite.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const konto = hubKonto();
  const kopf = { 'Cache-Control': 'no-store' };
  if (!konto) return NextResponse.json({ eingerichtet: false }, { headers: kopf });
  const sitzung = await sitzungLesen(konto);
  return NextResponse.json(
    sitzung
      ? { eingerichtet: true, angemeldet: true, name: sitzung.name }
      : { eingerichtet: true, angemeldet: false },
    { headers: kopf },
  );
}
