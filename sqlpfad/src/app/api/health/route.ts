import { NextResponse } from 'next/server';

/**
 * Lebenszeichen, übernommen aus PythonPfad.
 *
 * Beantwortet nur die Frage, ob der Prozess überhaupt Anfragen entgegennimmt.
 * Railway fragt diese Adresse beim Ausrollen ab und schaltet die neue
 * Bereitstellung erst frei, wenn sie mit 200 antwortet.
 *
 * Bewusst ohne Datenbankzugriff: Ein Neustart, weil die Datenbank kurz nicht
 * erreichbar war, macht die Lage schlimmer statt besser – der Prozess selbst
 * ist ja gesund.
 */
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json(
    { status: 'ok', service: 'sqlpfad', time: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
