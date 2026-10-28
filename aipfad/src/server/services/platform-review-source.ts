import 'server-only';
import { prisma } from '@/server/db/prisma';
import { veroeffentlichteAufgabe } from '@/server/content/publication';
import {
  buildPlatformReviewBatch,
  type PlatformReviewBatch,
  type PlatformReviewItemInput,
} from '@/server/platform/review-source-http';

/**
 * LP-05B — AIPfad als schreibgeschützte Wiederholungsquelle.
 *
 * AIPfad bleibt das System der Wahrheit: Geplant, abgeschlossen und umgeplant
 * wird ausschließlich hier. Dieser Leser liest nur.
 *
 * Identität: die Aufgabe (`ReviewQueueItem -> Exercise`), wie in PythonPfad.
 *
 * Gelesen werden genau die Zeilen, die das eigene Wiederholungscenter zeigt:
 * die eigenen (`userId` aus der Sitzung), fällige, nicht abgeschlossene, und
 * nur Aufgaben, die über die ganze Inhaltskette veröffentlicht sind — mit
 * demselben Prädikat `veroeffentlichteAufgabe` wie `/wiederholen` und
 * `getNextStep()`. Zurückgezogene Inhalte erscheinen deshalb auch im Hub nicht.
 *
 * Als „Antwort" geht NIE die Musterlösung hinaus: keine `solution`, keine
 * `solutionNotes`, keine Hinweise, keine Tests. Die Musterlösung bleibt hinter
 * der Hinweisleiter der App. Die Antwortseite der Karte ist die öffentliche
 * Konzepterklärung (`Concept.description`) — Lehrinhalt, keine Lösung.
 */

const OHNE_KONZEPT =
  'Zu dieser Aufgabe ist keine Konzepterklärung hinterlegt. Löse sie in AIPfad, um sie zu wiederholen.';

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

  return buildPlatformReviewBatch('ai', {
    items,
    truncated: rows.length > limit,
    nextDueAt: next?.dueAt ?? null,
    now,
  });
}
