import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';

/**
 * E5.1: Datenbank der Plattform. Ohne `DATABASE_URL` sind Organisationen aus,
 * und der Hub bleibt, wie er war (`null`). Ein Client je Prozess; im
 * Entwicklungsmodus am globalen Objekt, damit Hot Reload keine Pools anhäuft.
 */
const global = globalThis as unknown as { lernpfadeDb?: PrismaClient };

export function datenbank(): PrismaClient | null {
  const adresse = process.env.DATABASE_URL?.trim();
  if (!adresse) return null;
  if (!global.lernpfadeDb) {
    global.lernpfadeDb = new PrismaClient({
      adapter: new PrismaPg({ connectionString: adresse }),
      log: ['error'],
    });
  }
  return global.lernpfadeDb;
}
