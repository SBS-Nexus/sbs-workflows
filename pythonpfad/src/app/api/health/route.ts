import { NextResponse } from 'next/server';

/**
 * Lebenszeichen.
 *
 * Beantwortet nur die Frage, ob der Prozess überhaupt Anfragen entgegennimmt.
 * Bewusst ohne Datenbankzugriff: Ein Neustart, weil die Datenbank kurz nicht
 * erreichbar war, macht die Lage schlimmer statt besser – der Prozess selbst
 * ist ja gesund.
 *
 * Für die Frage, ob die Anwendung Verkehr bekommen soll, ist /api/ready da.
 */
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json(
    { status: 'ok', service: 'pythonpfad', time: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
