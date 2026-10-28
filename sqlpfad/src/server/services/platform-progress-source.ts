import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db/prisma';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import { bewerteKonzept, type AufgabenErgebnis } from '@/domain/aufgabe/kompetenz';
import type { Versuchsergebnis } from '@/domain/aufgabe/auswahl';
import {
  buildPlatformProgressSource,
  latestDate,
  type PlatformProgressSource,
} from '@/server/platform/progress-source-http';

/**
 * LP-07 — SQLPfad als schreibgeschützte Fortschrittsquelle.
 *
 * SQLPfad bleibt das System der Wahrheit. Dieser Leser zählt nur; er ruft
 * keine schreibende Funktion auf (kein `haltAktivitaetFest`, kein
 * `planeWiederholung`) und gibt nur Aggregate hinaus.
 *
 * SQLPfad hat bewusst KEIN Kompetenzprozentmodell (siehe
 * `src/domain/aufgabe/kompetenz.ts`). Deshalb:
 *  - Konzepte: dieselbe Ableitung wie die Wissenslandkarte auf `/fortschritt`
 *    — je Konzept die veröffentlichten Aufgaben mit bekannter Art und ihr
 *    letztes eigenes Ergebnis, bewertet mit `bewerteKonzept`.
 *    beobachtet = beurteilbare Konzepte mit mindestens einer bearbeiteten
 *    Aufgabe (Stand `angefangen`, `wackelig` oder `sitzt`);
 *    bereit = nur Stand `sitzt`. `ConceptMastery.masteryScore` wird weder
 *    gelesen noch weitergegeben — SQLPfad schreibt ihn nicht.
 *  - Wiederholungen: fällige, übbare Konzepte über
 *    `ConceptMastery.nextReviewAt` — dieselbe Bedingung wie die
 *    Wiederholungsquelle (LP-05B).
 *  - Lektionen: veröffentlichte Lektionen wie im eigenen Überblick; Zähler und
 *    Nenner meinen denselben Bestand.
 *  - Projekte: `submitted` — veröffentlichte Projekte mit Abgabe im Status
 *    `SUBMITTED`. SQLPfad nimmt Abgaben nicht fachlich ab; „abgegeben" ist
 *    nicht „abgenommen".
 *  - Letzte Aktivität: der späteste erfasste Lernvorgang — Versuch,
 *    Lernsitzung (`haltAktivitaetFest`) oder Lektionsabschluss.
 */

/** Ein Konzept ist übbar, wenn eine veröffentlichte Aufgabe in einer veröffentlichten Lektion es übt. */
const UEBBAR = {
  exercises: { some: { exercise: { status: 'PUBLISHED', lesson: { status: 'PUBLISHED' } } } },
} satisfies Prisma.ConceptWhereInput;

export async function readPlatformProgressSource(
  userId: string,
  query: { now: Date },
): Promise<PlatformProgressSource> {
  const { now } = query;
  if (!userId) throw new TypeError('userId is required');

  const [
    lessonsTotal,
    lessonsCompleted,
    startedLessons,
    reviewsDue,
    konzepte,
    projectsTotal,
    projectsSubmitted,
    lastAttempt,
    lastSession,
    lastCompletion,
  ] = await Promise.all([
    prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
    prisma.lessonProgress.count({
      where: { userId, state: 'COMPLETED', lesson: { status: 'PUBLISHED' } },
    }),
    prisma.lessonProgress.count({ where: { userId, state: { not: 'NOT_STARTED' } } }),
    prisma.conceptMastery.count({
      where: { userId, nextReviewAt: { not: null, lte: now }, concept: UEBBAR },
    }),
    // Dieselbe Abfrage wie die Wissenslandkarte, ohne Anzeigetexte.
    prisma.concept.findMany({
      select: {
        exercises: {
          select: {
            exercise: {
              select: {
                type: true,
                status: true,
                attempts: {
                  where: { userId },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: { result: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.project.count({ where: { status: 'PUBLISHED' } }),
    prisma.projectSubmission.count({
      where: { userId, status: 'SUBMITTED', project: { status: 'PUBLISHED' } },
    }),
    prisma.attempt.aggregate({ where: { userId }, _max: { createdAt: true } }),
    prisma.learningSession.aggregate({ where: { userId }, _max: { lastActiveAt: true } }),
    prisma.lessonProgress.aggregate({ where: { userId }, _max: { completedAt: true } }),
  ]);

  let observed = 0;
  let ready = 0;
  for (const konzept of konzepte) {
    const ergebnisse: AufgabenErgebnis[] = [];
    for (const bezug of konzept.exercises) {
      if (bezug.exercise.status !== 'PUBLISHED') continue;
      const art = ausDatenmodellArt(bezug.exercise.type);
      if (!art) continue;
      ergebnisse.push({
        art,
        letztesErgebnis: bezug.exercise.attempts[0]?.result as Versuchsergebnis | undefined,
      });
    }
    const { stand } = bewerteKonzept(ergebnisse);
    if (stand === 'angefangen' || stand === 'wackelig' || stand === 'sitzt') observed += 1;
    if (stand === 'sitzt') ready += 1;
  }

  return buildPlatformProgressSource(
    'sql',
    {
      lessons: { completed: lessonsCompleted, total: lessonsTotal },
      startedLessons,
      reviewsDue,
      concepts: { observed, ready },
      lastActiveAt: latestDate(
        lastAttempt._max.createdAt,
        lastSession._max.lastActiveAt,
        lastCompletion._max.completedAt,
      ),
      projects: { done: projectsSubmitted, total: projectsTotal },
    },
    now,
  );
}
