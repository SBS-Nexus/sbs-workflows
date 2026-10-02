import 'server-only';
import { prisma } from '@/server/db/prisma';
import { naechsterTermin, waehleAufgabenZuKonzepten } from '@/server/wiederholung';
import {
  buildPlatformReviewBatch,
  type PlatformReviewBatch,
  type PlatformReviewItemInput,
} from '@/server/platform/review-source-http';

/**
 * LP-05B — SQLPfad als schreibgeschützte Wiederholungsquelle.
 *
 * SQLPfad bleibt das System der Wahrheit. Geplant wird je KONZEPT
 * (`ConceptMastery.nextReviewAt`, SM-2 in `src/domain/wiederholung/sm2.ts`),
 * nicht je Aufgabe — Begründung in `src/server/wiederholung.ts`.
 *
 * Deshalb ist die kanonische Identität hier das Konzept:
 * `source=sql`, `sourceKind=concept`, `sourceItemId=<conceptId>`.
 *
 * Die Aufgabe, an der das Konzept geübt wird, wählt die bestehende,
 * deterministische Auswahl `waehleAufgabenZuKonzepten` — dieselbe wie auf
 * `/wiederholen` der App. Sie geht nur als Darstellungsangabe (`practice`)
 * mit hinaus und ersetzt NIE die Identität. Zwei Konzepte, die auf dieselbe
 * Aufgabe fallen, bleiben zwei Einträge.
 *
 * Nur lesend: kein `planeWiederholung`, kein `ConceptMastery`-Update, und
 * `ReviewQueueItem` bleibt — wie in der App — leer; es wird nichts
 * ausmaterialisiert.
 *
 * Ein fälliges Konzept ohne veröffentlichte Übungsaufgabe wird ausgelassen,
 * wie auf der Wiederholungsseite der App: Es ließe sich dort gar nicht üben.
 *
 * Als „Antwort" geht die öffentliche Konzepterklärung hinaus
 * (`Concept.description`), nie `solutionSql` oder `solutionNotes`.
 */

export async function readPlatformReviewSource(
  userId: string,
  query: { limit: number; now: Date },
): Promise<PlatformReviewBatch> {
  const { limit, now } = query;
  if (!userId) throw new TypeError('userId is required');
  if (!Number.isInteger(limit) || limit < 1)
    throw new RangeError('limit must be a positive integer');

  // Wie `ladeFaelligeKonzepte`, aber mit stabiler Nachrangordnung und einer
  // Zeile mehr als erbeten, damit „es gibt noch mehr" ehrlich gemeldet wird.
  const rows = await prisma.conceptMastery.findMany({
    where: { userId, nextReviewAt: { not: null, lte: now } },
    orderBy: [{ nextReviewAt: 'asc' }, { conceptId: 'asc' }],
    take: limit + 1,
    select: {
      conceptId: true,
      nextReviewAt: true,
      repetitions: true,
      concept: { select: { title: true, description: true } },
    },
  });

  const page = rows.slice(0, limit);
  const auswahl = await waehleAufgabenZuKonzepten(
    userId,
    page.map((row) => row.conceptId),
  );

  const slugs = [...new Set(auswahl.values())].sort();
  const aufgaben =
    slugs.length === 0
      ? []
      : await prisma.exercise.findMany({
          where: { slug: { in: slugs }, status: 'PUBLISHED', lesson: { status: 'PUBLISHED' } },
          select: { slug: true, title: true },
        });
  const aufgabeNachSlug = new Map(aufgaben.map((aufgabe) => [aufgabe.slug, aufgabe]));

  const items: PlatformReviewItemInput[] = page.flatMap((row) => {
    const slug = auswahl.get(row.conceptId);
    const aufgabe = slug ? aufgabeNachSlug.get(slug) : undefined;
    if (!aufgabe || !row.nextReviewAt) return [];
    return [
      {
        sourceKind: 'concept',
        sourceItemId: row.conceptId,
        conceptIds: [row.conceptId],
        title: row.concept.title,
        prompt: `Erkläre „${row.concept.title}" in eigenen Worten: Was leistet es, und wann brauchst du es?`,
        answer: row.concept.description,
        dueAt: row.nextReviewAt,
        repetition: row.repetitions,
        practice: { exerciseSlug: aufgabe.slug, exerciseTitle: aufgabe.title },
      },
    ];
  });

  return buildPlatformReviewBatch('sql', {
    items,
    truncated: rows.length > limit,
    nextDueAt: await naechsterTermin(userId, now),
    now,
  });
}
