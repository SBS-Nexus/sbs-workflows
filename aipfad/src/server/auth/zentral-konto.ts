import 'server-only';
import { prisma } from '@/server/db/prisma';
// Kein `import type`: die Fehlerklasse wird als Wert für `instanceof` gebraucht.
import { Prisma } from '@/generated/prisma/client';
import type { ZentraleIdentitaet } from '@/server/auth/zentral-identitaet';

/**
 * Ordnet eine Identität des gemeinsamen Kontos einem Konto der App zu
 * (E4.2, docs/E4-2-BAUPLAN.md, Abschnitt 2):
 *
 *  1. Treffer über `sub`: Das ist dieselbe Person, ganz gleich, welche
 *     Adresse sie inzwischen hat.
 *  2. Ohne Treffer zählt nur eine bestätigte Adresse. Dann wird ein
 *     vorhandenes Konto mit derselben Adresse verbunden, sonst entsteht ein
 *     neues. Eine unbestätigte Adresse verbindet und erzeugt nie etwas, sonst
 *     könnte jemand mit einer fremden Adresse ein fremdes Konto übernehmen
 *     oder die Adresse für die echte Person blockieren.
 *  3. Ist das Konto mit der Adresse schon mit einem anderen `sub` verbunden,
 *     wird nichts zusammengelegt.
 */

export type KontoZuordnung =
  | {
      ok: true;
      userId: string;
      role: 'LEARNER' | 'ADMIN';
      onboardingCompleted: boolean;
      art: 'bekannt' | 'verbunden' | 'neu';
    }
  | { ok: false; grund: 'adresse-unbestaetigt' | 'adresse-vergeben' };

const AUSWAHL = { id: true, role: true, onboardingCompleted: true, email: true } as const;

function istEindeutigkeitsFehler(fehler: unknown): boolean {
  return fehler instanceof Prisma.PrismaClientKnownRequestError && fehler.code === 'P2002';
}

export async function kontoFuerIdentitaet(
  identitaet: ZentraleIdentitaet,
  versuch = 0,
): Promise<KontoZuordnung> {
  const bekannt = await prisma.user.findUnique({
    where: { authSubject: identitaet.sub },
    select: AUSWAHL,
  });

  if (bekannt) {
    // Hat sich die bestätigte Adresse beim gemeinsamen Konto geändert, zieht
    // die App nach, solange sie hier frei ist. Sonst bleibt die alte stehen.
    if (identitaet.emailBestaetigt && bekannt.email !== identitaet.email) {
      await prisma.user
        .update({ where: { id: bekannt.id }, data: { email: identitaet.email } })
        .catch((fehler: unknown) => {
          if (!istEindeutigkeitsFehler(fehler)) throw fehler;
        });
    }
    return {
      ok: true,
      userId: bekannt.id,
      role: bekannt.role,
      onboardingCompleted: bekannt.onboardingCompleted,
      art: 'bekannt',
    };
  }

  if (!identitaet.emailBestaetigt) return { ok: false, grund: 'adresse-unbestaetigt' };

  const lokal = await prisma.user.findUnique({
    where: { email: identitaet.email },
    select: { ...AUSWAHL, authSubject: true },
  });

  if (lokal) {
    if (lokal.authSubject !== null) return { ok: false, grund: 'adresse-vergeben' };
    // Nur verbinden, solange noch niemand anderes es getan hat.
    const verbunden = await prisma.user.updateMany({
      where: { id: lokal.id, authSubject: null },
      data: { authSubject: identitaet.sub, authLinkedAt: new Date() },
    });
    if (verbunden.count === 1) {
      return {
        ok: true,
        userId: lokal.id,
        role: lokal.role,
        onboardingCompleted: lokal.onboardingCompleted,
        art: 'verbunden',
      };
    }
    return versuch === 0
      ? kontoFuerIdentitaet(identitaet, 1)
      : { ok: false, grund: 'adresse-vergeben' };
  }

  try {
    const neu = await prisma.user.create({
      data: {
        email: identitaet.email,
        name: identitaet.name,
        passwordHash: null,
        authSubject: identitaet.sub,
        authLinkedAt: new Date(),
      },
      select: AUSWAHL,
    });
    return {
      ok: true,
      userId: neu.id,
      role: neu.role,
      onboardingCompleted: neu.onboardingCompleted,
      art: 'neu',
    };
  } catch (fehler) {
    // Zwei Rückkehren zugleich (etwa zwei Tabs): Die zweite findet beim
    // nächsten Durchlauf das eben angelegte Konto.
    if (istEindeutigkeitsFehler(fehler) && versuch === 0) {
      return kontoFuerIdentitaet(identitaet, 1);
    }
    throw fehler;
  }
}
