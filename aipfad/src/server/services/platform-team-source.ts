import 'server-only';
import { prisma } from '@/server/db/prisma';
import type { PlatformProgressSource } from '@/server/platform/progress-source-http';
import { readPlatformProgressSource } from '@/server/services/platform-progress-source';

/**
 * E5.2 — Stand je Person eines Teams, die diese App kennt (über
 * `User.authSubject` aus dem gemeinsamen Konto). Dieselbe Rechnung wie die
 * Fortschrittsquelle der Person; zusammengefasst wird in
 * `src/server/platform/team-source-http.ts`. Unbekannte Personen fehlen.
 */
export async function readTeamStaende(
  subs: readonly string[],
  query: { now: Date },
): Promise<Map<string, PlatformProgressSource>> {
  const staende = new Map<string, PlatformProgressSource>();
  if (subs.length === 0) return staende;
  const nutzer = await prisma.user.findMany({
    where: { authSubject: { in: [...subs] } },
    select: { id: true, authSubject: true },
  });
  // In kleinen Gruppen: Jede Person braucht mehrere Abfragen; das schont den Verbindungspool.
  for (let i = 0; i < nutzer.length; i += 5) {
    const gruppe = nutzer.slice(i, i + 5);
    const ergebnisse = await Promise.all(
      gruppe.map((n) => readPlatformProgressSource(n.id, query)),
    );
    gruppe.forEach((n, j) => {
      const stand = ergebnisse[j];
      if (n.authSubject && stand) staende.set(n.authSubject, stand);
    });
  }
  return staende;
}
