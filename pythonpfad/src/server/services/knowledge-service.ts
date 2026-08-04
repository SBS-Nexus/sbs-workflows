import 'server-only';
import { prisma } from '@/server/db/prisma';
import { describeMastery, masteryBand, type MasteryBand } from '@/domain/mastery/mastery';
import { layoutConceptMap, dependentsOf, type MapLayout } from '@/domain/knowledge/map-layout';
import {
  REVIEW_TARGET_RETENTION,
  buildForecast,
  daysUntilBelow,
  describeForecast,
  retentionNow,
  type ForecastPoint,
} from '@/domain/knowledge/retention';

/**
 * Fachdienst für Wissenslandkarte und Behaltensprognose.
 *
 * Beide arbeiten auf denselben Daten: dem Konzeptgraphen des Kurses und dem
 * persönlichen Kompetenzstand. Sie werden zusammen geladen, weil sie
 * nebeneinander angezeigt werden – die Landkarte sagt, was zusammenhängt, die
 * Prognose, was demnächst Aufmerksamkeit braucht.
 */

export interface KnowledgeNode {
  slug: string;
  name: string;
  description: string;
  masteryScore: number;
  band: MasteryBand;
  bandLabel: string;
  /** Geschätzte Abrufwahrscheinlichkeit heute, 0–100. */
  retentionPercent: number;
  /** In wie vielen Tagen eine Auffrischung sich lohnt. Null, wenn schon jetzt. */
  daysUntilRefresh: number | null;
  lastPracticedAt: Date | null;
  nextReviewAt: Date | null;
  /** Lektionen, in denen das Konzept vorkommt. */
  lessons: Array<{ slug: string; title: string }>;
  prerequisiteNames: string[];
  /** Wofür dieses Konzept die Grundlage bildet, direkt und indirekt. */
  dependentNames: string[];
}

export interface KnowledgeMapData {
  layout: MapLayout;
  nodes: Record<string, KnowledgeNode>;
  forecast: ForecastPoint[];
  forecastMessage: string;
  /** Anteil begonnener Konzepte am Gesamtgraphen, 0–100. */
  startedPercent: number;
  targetRetentionPercent: number;
}

export async function getKnowledgeMap(
  userId: string,
  now: Date = new Date(),
): Promise<KnowledgeMapData> {
  const [concepts, mastery] = await Promise.all([
    prisma.concept.findMany({
      select: {
        slug: true,
        name: true,
        description: true,
        difficulty: true,
        prerequisiteIds: true,
        lessons: {
          select: { lesson: { select: { slug: true, title: true, order: true } } },
          orderBy: { lesson: { order: 'asc' } },
        },
      },
      orderBy: { slug: 'asc' },
    }),
    prisma.conceptMastery.findMany({
      where: { userId },
      select: {
        masteryScore: true,
        stability: true,
        lastPracticedAt: true,
        nextReviewAt: true,
        concept: { select: { slug: true } },
      },
    }),
  ]);

  // `prerequisiteIds` enthält Slugs, nicht Datenbankkennungen – so steht es im
  // Schema und so wird es beim Seeding befüllt. Der Feldname ist historisch.
  const eingaben = concepts.map((concept) => ({
    slug: concept.slug,
    name: concept.name,
    prerequisiteSlugs: concept.prerequisiteIds,
    difficulty: concept.difficulty,
  }));

  const layout = layoutConceptMap(eingaben);
  const nameBySlug = new Map(concepts.map((concept) => [concept.slug, concept.name]));
  const masteryBySlug = new Map(mastery.map((row) => [row.concept.slug, row]));

  const nodes: Record<string, KnowledgeNode> = {};
  for (const concept of concepts) {
    const stand = masteryBySlug.get(concept.slug);
    const score = stand?.masteryScore ?? 0;
    const eingabe = {
      stability: stand?.stability ?? 1,
      lastPracticedAt: stand?.lastPracticedAt ?? null,
      masteryScore: score,
    };
    const restTage = stand?.lastPracticedAt ? daysUntilBelow(eingabe, undefined, now) : null;

    nodes[concept.slug] = {
      slug: concept.slug,
      name: concept.name,
      description: concept.description,
      masteryScore: Math.round(score),
      band: masteryBand(score),
      bandLabel: describeMastery(score).label,
      retentionPercent: Math.round(retentionNow(eingabe, now) * 100),
      daysUntilRefresh: restTage === null ? null : Math.round(restTage),
      lastPracticedAt: stand?.lastPracticedAt ?? null,
      nextReviewAt: stand?.nextReviewAt ?? null,
      lessons: concept.lessons.map((link) => ({
        slug: link.lesson.slug,
        title: link.lesson.title,
      })),
      prerequisiteNames: concept.prerequisiteIds
        .map((slug) => nameBySlug.get(slug))
        .filter((name): name is string => name !== undefined),
      dependentNames: dependentsOf(eingaben, concept.slug)
        .map((slug) => nameBySlug.get(slug))
        .filter((name): name is string => name !== undefined),
    };
  }

  const forecast = buildForecast(
    mastery.map((row) => ({
      stability: row.stability,
      lastPracticedAt: row.lastPracticedAt,
      masteryScore: row.masteryScore,
    })),
    30,
    now,
  );

  const begonnen = mastery.filter((row) => row.lastPracticedAt !== null).length;

  return {
    layout,
    nodes,
    forecast,
    forecastMessage: describeForecast(forecast),
    startedPercent: concepts.length === 0 ? 0 : Math.round((begonnen / concepts.length) * 100),
    targetRetentionPercent: Math.round(REVIEW_TARGET_RETENTION * 100),
  };
}
