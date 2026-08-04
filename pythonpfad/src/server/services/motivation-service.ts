import 'server-only';
import { prisma } from '@/server/db/prisma';
import { DEFAULT_MASTERY_CONFIG } from '@/domain/mastery/mastery';
import {
  buildRhythm,
  toIsoDay,
  type DayActivity,
  type RhythmSummary,
} from '@/domain/motivation/rhythm';
import {
  evaluateMilestones,
  newlyReached,
  nextMilestone,
  type MilestoneState,
  type MilestoneStats,
} from '@/domain/motivation/milestones';

/**
 * Fachdienst für Lernrhythmus und Meilensteine.
 *
 * Die Auswertung selbst liegt in der Domainschicht und ist ohne Datenbank
 * prüfbar. Hier wird ausschließlich erhoben und gespeichert.
 *
 * Ab welcher Gerüst-Stufe eine Aufgabe als „ohne Vorlage" gilt: Die Skala
 * reicht von 1 (vollständig gelöst vorgegeben) bis 6 (Transfer ohne Hilfen).
 * Ab Stufe 5 gibt es keine Vorlage mehr, sondern höchstens eine Beschreibung
 * dessen, was herauskommen soll.
 */
const OHNE_VORLAGE_AB_STUFE = 5;

export interface MotivationSummary {
  rhythm: RhythmSummary;
  milestones: MilestoneState[];
  /** Der nächste erreichbare – bewusst nur einer. */
  next: MilestoneState | null;
  /** In diesem Aufruf neu vergeben. Die Oberfläche kann sie hervorheben. */
  freshlyAwarded: MilestoneState[];
}

/**
 * Erhebt alles, wertet aus und vergibt fällige Meilensteine.
 *
 * Das Vergeben passiert beim Lesen und nicht in einem Hintergrundlauf: Es gibt
 * keinen Zeitpunkt, an dem ein Meilenstein „verpasst" werden könnte, und die
 * Anwendung braucht keinen zusätzlichen Dienst, der laufen muss.
 */
export async function getMotivationSummary(
  userId: string,
  now: Date = new Date(),
): Promise<MotivationSummary> {
  const [user, stats, days, awardedRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { dailyTimeBudget: true } }),
    collectStats(userId),
    collectDailyActivity(userId, now),
    prisma.milestoneAward.findMany({ where: { userId }, select: { key: true, awardedAt: true } }),
  ]);

  const awarded = new Map(awardedRows.map((row) => [row.key, row.awardedAt]));
  const faellig = newlyReached(stats, awarded);

  if (faellig.length > 0) {
    // createMany mit skipDuplicates: Zwei gleichzeitige Aufrufe (etwa zwei
    // offene Tabs) dürfen nicht an der Eindeutigkeit scheitern.
    await prisma.milestoneAward.createMany({
      data: faellig.map((key) => ({ userId, key, awardedAt: now })),
      skipDuplicates: true,
    });
    for (const key of faellig) awarded.set(key, now);
  }

  const milestones = evaluateMilestones(stats, awarded);

  return {
    rhythm: buildRhythm(days, user?.dailyTimeBudget ?? 0, now),
    milestones,
    next: nextMilestone(milestones),
    freshlyAwarded: milestones.filter((state) => faellig.includes(state.key)),
  };
}

/**
 * Tagesweise Aktivität der letzten dreißig Tage.
 *
 * Grundlage sind die Lernsitzungen, weil dort die tatsächlich aktive Zeit
 * steht. Die Zuordnung zum Kalendertag erfolgt über den Beginn der Sitzung –
 * eine Sitzung, die um kurz vor Mitternacht anfängt, zählt zu dem Tag, an dem
 * sie begonnen wurde. Alles andere wäre für die lernende Person überraschend.
 */
async function collectDailyActivity(userId: string, now: Date): Promise<DayActivity[]> {
  const von = new Date(now);
  von.setDate(von.getDate() - 30);
  von.setHours(0, 0, 0, 0);

  const sessions = await prisma.learningSession.findMany({
    where: { userId, startedAt: { gte: von } },
    select: { startedAt: true, activeMinutes: true, activitiesCompleted: true },
  });

  const byDay = new Map<string, DayActivity>();
  for (const session of sessions) {
    const key = toIsoDay(session.startedAt);
    const vorhanden = byDay.get(key);
    if (vorhanden) {
      vorhanden.minutes += session.activeMinutes;
      vorhanden.activities += session.activitiesCompleted;
    } else {
      byDay.set(key, {
        date: key,
        minutes: session.activeMinutes,
        activities: session.activitiesCompleted,
      });
    }
  }

  return [...byDay.values()];
}

/**
 * Erhebt die Kennzahlen für die Meilensteine.
 *
 * Bewusst in wenigen, breiten Abfragen statt in vielen kleinen: Die Datenmenge
 * je Person ist überschaubar, und die Auswertung im Anwendungscode ist
 * leichter nachvollziehbar als eine Kette von Aggregatabfragen.
 */
async function collectStats(userId: string): Promise<MilestoneStats> {
  const [lessonsCompleted, attempts, conceptsAtThreshold, reviewsCompleted, projectsAccepted] =
    await Promise.all([
      prisma.lessonProgress.count({ where: { userId, state: 'COMPLETED' } }),
      prisma.attempt.findMany({
        where: { userId },
        select: {
          exerciseId: true,
          result: true,
          hintsUsed: true,
          createdAt: true,
          exercise: { select: { type: true, scaffoldLevel: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.conceptMastery.count({
        // Dieselbe Schwelle, ab der ein Konzept als Voraussetzung für
        // Weiterführendes gilt. Sie steht genau einmal im Kompetenzmodell.
        where: { userId, masteryScore: { gte: DEFAULT_MASTERY_CONFIG.unlockThreshold } },
      }),
      prisma.reviewQueueItem.count({ where: { userId, completedAt: { not: null } } }),
      prisma.projectSubmission.count({ where: { userId, status: 'ACCEPTED' } }),
    ]);

  const bestanden = new Set<string>();
  const bestandenImErstenAnlauf = new Set<string>();
  const transferBestanden = new Set<string>();
  const ohneVorlage = new Set<string>();
  const loesungGesehen = new Set<string>();
  const vorherGescheitert = new Set<string>();
  const selbstBehoben = new Set<string>();
  const ersterVersuch = new Set<string>();

  for (const attempt of attempts) {
    const id = attempt.exerciseId;

    if (attempt.result === 'SOLUTION_REVEALED') {
      loesungGesehen.add(id);
      continue;
    }

    const istErsterVersuch = !ersterVersuch.has(id);
    ersterVersuch.add(id);

    if (attempt.result === 'PASSED') {
      bestanden.add(id);
      if (istErsterVersuch && attempt.hintsUsed === 0) bestandenImErstenAnlauf.add(id);
      if (attempt.exercise.type === 'TRANSFER') transferBestanden.add(id);
      if (attempt.exercise.scaffoldLevel >= OHNE_VORLAGE_AB_STUFE) ohneVorlage.add(id);
      // Zuerst gescheitert, dann selbst zum Laufen gebracht – und zwar ohne
      // dass irgendwann die Musterlösung angesehen wurde.
      if (vorherGescheitert.has(id) && !loesungGesehen.has(id)) selbstBehoben.add(id);
    } else {
      vorherGescheitert.add(id);
    }
  }

  return {
    lessonsCompleted,
    exercisesPassed: bestanden.size,
    exercisesPassedFirstTry: bestandenImErstenAnlauf.size,
    transferPassed: transferBestanden.size,
    conceptsAtThreshold,
    recoveredWithoutSolution: selbstBehoben.size,
    reviewsCompleted,
    projectsAccepted,
    solvedWithoutTemplate: ohneVorlage.size,
  };
}
