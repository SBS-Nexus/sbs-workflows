import { NextResponse } from 'next/server';

/**
 * Lebenszeichen. Beantwortet nur, ob der Prozess überhaupt Anfragen
 * entgegennimmt – bewusst ohne Datenbankzugriff. Für die Frage, ob die
 * Anwendung Verkehr bekommen soll, ist /api/ready da.
 */
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json(
    { status: 'ok', service: 'aipfad', time: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
