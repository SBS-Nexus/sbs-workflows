import { prisma } from '@/server/db/prisma';
import { beurteileAktivitaet } from '@/domain/lernsitzung';

/**
 * Die Lernsitzung fortschreiben.
 *
 * Wird bei jeder Aktivität aufgerufen, die tatsächlich Arbeit ist: eine
 * abgegebene Aufgabe, eine Selbsteinschätzung, ein gesicherter Projektstand.
 * **Nicht** beim bloßen Öffnen einer Seite – wer eine Lektion aufschlägt und
 * weggeht, hat nicht gelernt, und eine Zahl, die das behauptet, ist schlimmer
 * als keine.
 *
 * Die Regel selbst steht in `src/domain/lernsitzung.ts` und ist dort
 * vollständig geprüft. Hier liegt nur, was ohne Datenbank nicht geht.
 */
export async function haltAktivitaetFest(userId: string, jetzt = new Date()): Promise<void> {
  const laufende = await prisma.learningSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { lastActiveAt: 'desc' },
    select: { id: true, lastActiveAt: true, activeMinutes: true },
  });

  const entscheidung = beurteileAktivitaet(
    laufende
      ? { lastActiveAt: laufende.lastActiveAt, activeMinutes: laufende.activeMinutes }
      : null,
    jetzt,
  );

  if (entscheidung.art === 'fortsetzen' && laufende) {
    await prisma.learningSession.update({
      where: { id: laufende.id },
      data: { lastActiveAt: jetzt, activeMinutes: entscheidung.aktiveMinuten },
    });
    return;
  }

  /*
   * Die alte Sitzung wird geschlossen, bevor die neue beginnt.
   *
   * `endedAt` bekommt den Zeitpunkt der letzten Aktivität und nicht den von
   * jetzt: Die Sitzung hat damals aufgehört, nicht in dem Moment, in dem
   * jemand zurückkommt.
   */
  if (laufende) {
    await prisma.learningSession.update({
      where: { id: laufende.id },
      data: { endedAt: laufende.lastActiveAt },
    });
  }

  await prisma.learningSession.create({
    data: { userId, startedAt: jetzt, lastActiveAt: jetzt, activeMinutes: 0 },
  });
}

/**
 * Wie lange heute gelernt wurde, in Minuten.
 *
 * „Heute" ist der Kalendertag der Serverzeit. Das ist für eine Anwendung, die
 * sich an deutschsprachige Lernende richtet, genau genug – eine Zeitzone je
 * Konto steht im Datenmodell und wird hier bewusst noch nicht ausgewertet,
 * statt sie halb zu berücksichtigen.
 */
export async function minutenHeute(userId: string, jetzt = new Date()): Promise<number> {
  const tagesbeginn = new Date(jetzt);
  tagesbeginn.setHours(0, 0, 0, 0);

  const sitzungen = await prisma.learningSession.findMany({
    where: { userId, lastActiveAt: { gte: tagesbeginn } },
    select: { activeMinutes: true },
  });

  return sitzungen.reduce((summe, sitzung) => summe + sitzung.activeMinutes, 0);
}
