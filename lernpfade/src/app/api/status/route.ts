import { NextResponse } from 'next/server';
import { plattformPruefungen } from '@/server/status/dienste';
import { statusbericht } from '@/server/status/pruefung';

/**
 * E6.2 — Maschinenlesbarer Status für externe Überwachung. 503 nur bei einer
 * Störung eines kritischen Dienstes (das gemeinsame Konto), sonst 200 mit dem
 * Zustand je Dienst. Nichts Personenbezogenes, keine Fehlermeldungen.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const bericht = await statusbericht(plattformPruefungen);
  return NextResponse.json(bericht, {
    status: bericht.gesamt === 'stoerung' ? 503 : 200,
    headers: { 'Cache-Control': 'public, max-age=15', 'X-Content-Type-Options': 'nosniff' },
  });
}
