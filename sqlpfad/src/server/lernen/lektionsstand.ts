import 'server-only';
import { prisma } from '@/server/db/prisma';
import { istSqlRunnerVerfuegbar } from '@/server/env';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import { fasseLektionZusammen, type AufgabenStand } from '@/domain/aufgabe/abschluss';
import { amErgebnisPruefbar } from '@/domain/aufgabe/ausfuehrung';

/**
 * Wo eine Person in einer Lektion steht – für den Fortschrittsbalken über den
 * Aufgaben und den Abschluss darunter.
 *
 * Gezählt wird nach derselben Regel wie beim Abschluss
 * (`src/domain/aufgabe/abschluss.ts`): Was sich unter den gegebenen
 * Bedingungen beurteilen lässt, zählt; was nur den Übungsserver bräuchte,
 * nicht. Ein Balken, der nie voll werden kann, sähe aus wie ein eigenes
 * Versäumnis.
 */
export interface Lektionsstand {
  geloest: number;
  gesamt: number;
  /** Einmal abgeschlossen bleibt abgeschlossen – siehe pruefeLektionsAbschluss. */
  abgeschlossen: boolean;
  /** Aufgaben, deren letzter Versuch gelöst war – für die Marke an der Karte. */
  geloesteAufgaben: string[];
  /** Die nächste Lektion im Kurs, oder null nach der letzten. */
  naechste: { slug: string; titel: string } | null;
}

export type AufgabenStandMitSlug = AufgabenStand & { slug: string };

/** Die Aufgaben einer Lektion mit dem letzten eigenen Ergebnis. */
export async function ladeAufgabenstaende(
  userId: string,
  lektionId: string,
): Promise<AufgabenStandMitSlug[]> {
  const aufgaben = await prisma.exercise.findMany({
    where: { lessonId: lektionId, status: 'PUBLISHED' },
    orderBy: { order: 'asc' },
    select: {
      slug: true,
      type: true,
      allowedStatementClasses: true,
      expectedResultset: true,
      attempts: {
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { result: true },
      },
    },
  });

  const staende: AufgabenStandMitSlug[] = [];
  for (const aufgabe of aufgaben) {
    const art = ausDatenmodellArt(aufgabe.type);
    if (!art) continue;
    staende.push({
      slug: aufgabe.slug,
      art,
      letztesErgebnis: aufgabe.attempts[0]?.result as AufgabenStand['letztesErgebnis'],
      amErgebnisPruefbar: amErgebnisPruefbar({
        art,
        erlaubteKlassen: aufgabe.allowedStatementClasses,
        hatErwartetesErgebnis: aufgabe.expectedResultset !== null,
      }),
    });
  }
  return staende;
}

export async function ladeLektionsstand(userId: string, lektionId: string): Promise<Lektionsstand> {
  const [staende, fortschritt, lektionen] = await Promise.all([
    ladeAufgabenstaende(userId, lektionId),
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lektionId } },
      select: { state: true },
    }),
    // Kursreihenfolge: Modul, dann Lektion – dieselbe Ordnung wie /lernen.
    prisma.lesson.findMany({
      where: { status: 'PUBLISHED', module: { status: 'PUBLISHED' } },
      orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
      select: { id: true, slug: true, title: true },
    }),
  ]);

  const { geloest, gesamt } = fasseLektionZusammen(staende, {
    uebungsserver: istSqlRunnerVerfuegbar(),
  });
  const position = lektionen.findIndex((lektion) => lektion.id === lektionId);
  const naechste = position >= 0 ? lektionen[position + 1] : undefined;

  return {
    geloest,
    gesamt,
    abgeschlossen: fortschritt?.state === 'COMPLETED',
    geloesteAufgaben: staende
      .filter((stand) => stand.letztesErgebnis === 'PASSED')
      .map((stand) => stand.slug),
    naechste: naechste ? { slug: naechste.slug, titel: naechste.title } : null,
  };
}
