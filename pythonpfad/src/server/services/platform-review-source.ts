import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db/prisma';
import {
  buildPlatformReviewBatch,
  type PlatformReviewBatch,
  type PlatformReviewItemInput,
} from '@/server/platform/review-source-http';

/**
 * LP-05B — PythonPfad als schreibgeschützte Wiederholungsquelle.
 *
 * PythonPfad bleibt das System der Wahrheit: Geplant (`ReviewQueueItem`),
 * abgeschlossen (`completeReviewItem`) und umgeplant wird ausschließlich hier.
 * Dieser Leser liest nur; er ruft keine Abschluss- oder Planungsfunktion auf.
 *
 * Identität: die Aufgabe (`ReviewQueueItem -> Exercise`).
 *
 * Gelesen werden die eigenen (`userId` aus der Sitzung), fälligen, NICHT
 * abgeschlossenen Zeilen. Das Wiederholungscenter (`getReviewCenterData`)
 * filtert `completedAt` nicht; für den Hub ist „offen" aber Vertragsbestandteil,
 * deshalb steht der Filter hier ausdrücklich.
 *
 * Veröffentlichung: PythonPfad hat kein zentrales Prädikat wie AIPfad; die
 * Dienste prüfen den Status je Ebene. Hier gilt die ganze Kette — Aufgabe,
 * Lektion, Modul, Kurs. Das ist strenger als jede einzelne Prüfung der App,
 * nie lockerer.
 *
 * Als „Antwort" geht NIE die Musterlösung hinaus: keine `solution`, keine
 * `solutionNotes` (die die App erst nach der Hinweisleiter freigibt), keine
 * Hinweise, keine Tests. Die Antwortseite ist die öffentliche
 * Konzepterklärung (`Concept.description`).
 */

const veroeffentlichteAufgabe = {
  status: 'PUBLISHED',
  OR: [
    { lessonId: null },
    {
      lesson: {
        is: {
          status: 'PUBLISHED',
          module: { is: { status: 'PUBLISHED', course: { is: { status: 'PUBLISHED' } } } },
        },
      },
    },
  ],
} satisfies Prisma.ExerciseWhereInput;

const OHNE_KONZEPT =
  'Zu dieser Aufgabe ist keine Konzepterklärung hinterlegt. Löse sie in PythonPfad, um sie zu wiederholen.';

export async function readPlatformReviewSource(
  userId: string,
  query: { limit: number; now: Date },
): Promise<PlatformReviewBatch> {
  const { limit, now } = query;
  if (!userId) throw new TypeError('userId is required');
  if (!Number.isInteger(limit) || limit < 1)
    throw new RangeError('limit must be a positive integer');

  // Eine Zeile mehr als erbeten: Ist sie da, gibt es weitere fällige Einträge.
  const rows = await prisma.reviewQueueItem.findMany({
    where: {
      userId,
      completedAt: null,
      dueAt: { lte: now },
      exercise: veroeffentlichteAufgabe,
    },
    orderBy: [{ dueAt: 'asc' }, { exerciseId: 'asc' }],
    take: limit + 1,
    select: {
      exerciseId: true,
      dueAt: true,
      repetition: true,
      reason: true,
      exercise: {
        select: {
          slug: true,
          title: true,
          prompt: true,
          concepts: {
            orderBy: { conceptId: 'asc' },
            select: { concept: { select: { id: true, name: true, description: true } } },
          },
        },
      },
    },
  });

  const next = await prisma.reviewQueueItem.findFirst({
    where: {
      userId,
      completedAt: null,
      dueAt: { gt: now },
      exercise: veroeffentlichteAufgabe,
    },
    orderBy: [{ dueAt: 'asc' }, { exerciseId: 'asc' }],
    select: { dueAt: true },
  });

  const items: PlatformReviewItemInput[] = rows.slice(0, limit).map((row) => {
    const concepts = row.exercise.concepts.map((link) => link.concept);
    return {
      sourceKind: 'exercise',
      sourceItemId: row.exerciseId,
      conceptIds: concepts.map((concept) => concept.id),
      title: row.exercise.title,
      prompt: row.exercise.prompt,
      answer:
        concepts.length > 0
          ? concepts.map((concept) => `${concept.name}: ${concept.description}`).join('\n\n')
          : OHNE_KONZEPT,
      dueAt: row.dueAt,
      repetition: row.repetition,
      reason: row.reason,
      practice: { exerciseSlug: row.exercise.slug, exerciseTitle: row.exercise.title },
    };
  });

  return buildPlatformReviewBatch('python', {
    items,
    truncated: rows.length > limit,
    nextDueAt: next?.dueAt ?? null,
    now,
  });
}
