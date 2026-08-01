import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * Prisma-Client als Singleton.
 *
 * Im Entwicklungsmodus lädt Next.js Module bei jeder Änderung neu. Ohne das
 * Zwischenspeichern am globalen Objekt entstünde bei jedem Hot Reload ein
 * neuer Verbindungspool, bis die Datenbank keine Verbindungen mehr annimmt.
 *
 * Seit Prisma 7 läuft die Verbindung über einen Treiber-Adapter. Die
 * Verbindungszeichenfolge steht damit nur noch hier und in prisma.config.ts.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL ist nicht gesetzt. Vorlage: .env.example');
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
