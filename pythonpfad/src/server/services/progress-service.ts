import 'server-only';
import { prisma } from '@/server/db/prisma';
import {
  describeMastery,
  masteryBand,
  summarizeCalibration,
  type CalibrationSummary,
  type ConfidenceLevel,
  type MasteryBand,
} from '@/domain/mastery/mastery';
import { determineNextStep, type NextStep } from '@/domain/path/learning-path';

/**
 * Fachdienst für Fortschritt und Dashboard.
 *
 * Grundsatz aus dem Produktkonzept: sichtbarer Fortschritt ohne manipulative
 * Gamification. Es gibt keine Verlustmechanik, keine Ranglisten und keine
 * Beschämung bei Unterbrechungen. Eine unterbrochene Serie wird neutral
 * dargestellt.
 */

export interface DashboardData {
  path: { title: string; rationale: string; lessonSlugs: string[] } | null;
  lessons: Array<{
    slug: string;
    title: string;
    moduleTitle: string;
    estimatedMinutes: number;
    state: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
  nextStep: NextStep;
  dueReviews: number;
  masteryByConcept: Array<{
    slug: string;
    name: string;
    score: number;
    band: MasteryBand;
    label: string;
    meaning: string;
    nextStep: string;
    nextReviewAt: Date | null;
  }>;
  /** Aggregat je Modul für die Themenübersicht. */
  moduleProgress: Array<{
    slug: string;
    title: string;
    completed: number;
    total: number;
    averageMastery: number;
  }>;
  errorPatterns: Array<{ type: string; label: string; count: number; advice: string }>;
  weeklyActivity: Array<{ date: string; label: string; activities: number; minutes: number }>;
  totals: {
    lessonsCompleted: number;
    lessonsTotal: number;
    exercisesPassed: number;
    attempts: number;
    activeMinutes: number;
    projectsAccepted: number;
  };
  calibration: CalibrationSummary;
  /** Freiwillige Serie – ohne Druck dargestellt. */
  streak: { currentDays: number; longestDays: number; message: string };
  milestones: Array<{ id: string; label: string; reached: boolean; description: string }>;
}

const ERROR_LABELS: Record<string, { label: string; advice: string }> = {
  SYNTAX: {
    label: 'Schreibweise (SyntaxError)',
    advice:
      'Meist fehlt ein Doppelpunkt oder eine Klammer. Schau bei der genannten Zeile auch eine Zeile darüber.',
  },
  INDENTATION: {
    label: 'Einrückung',
    advice:
      'Prüfe bei jedem Block: Welche Zeilen sollen dazugehören? Vier Leerzeichen je Ebene, durchgehend gleich.',
  },
  NAME: {
    label: 'Unbekannter Name',
    advice:
      'Suche im Programm, wo der Name zum ersten Mal einen Wert bekommt. Achte auf Groß- und Kleinschreibung.',
  },
  TYPE: {
    label: 'Datentyp passt nicht',
    advice:
      'Gib den fraglichen Wert testweise mit print(type(wert)) aus. Fehlt vielleicht eine Umwandlung mit int() oder float()?',
  },
  INDEX: {
    label: 'Position außerhalb der Liste',
    advice: 'Positionen beginnen bei 0. Prüfe die Grenzen deiner Schleife mit len().',
  },
  KEY: {
    label: 'Schlüssel nicht vorhanden',
    advice: 'Gib das Dictionary aus und vergleiche die Schreibweise der Schlüssel.',
  },
  VALUE: {
    label: 'Wert nicht umwandelbar',
    advice: 'Prüfe den genauen Text vor der Umwandlung – auch auf Leerzeichen und Kommas.',
  },
  LOGIC: {
    label: 'Programm läuft, Ergebnis stimmt nicht',
    advice:
      'Gehe den Code mit einem konkreten Beispielwert Zeile für Zeile durch und notiere die Werte der Variablen.',
  },
  CONCEPT: {
    label: 'Konzept noch nicht gefestigt',
    advice:
      'Die zugehörige Lektion noch einmal durchzugehen bringt hier mehr als weitere Versuche.',
  },
  TIMEOUT: {
    label: 'Endlosschleife',
    advice:
      'Suche die Variable in der Schleifenbedingung und prüfe, ob sie sich im Rumpf verändert.',
  },
  ZERO_DIVISION: {
    label: 'Division durch null',
    advice: 'Gib den Nenner vor der Division aus. Kann er in einem Fall 0 werden?',
  },
  ATTRIBUTE: {
    label: 'Methode passt nicht zum Typ',
    advice: 'Prüfe mit print(type(objekt)), welchen Typ der Wert an dieser Stelle wirklich hat.',
  },
  RUNTIME_OTHER: {
    label: 'Sonstiger Laufzeitfehler',
    advice: 'Lies die Meldung von unten nach oben. Die letzte Zeile nennt den Fehlertyp.',
  },
  EMPTY_SUBMISSION: {
    label: 'Leere Abgabe',
    advice: 'Auch ein unvollständiger Anfang ist besser als eine leere Abgabe.',
  },
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();

  const [path, allLessons, progressRows, mastery, attempts, sessions, submissions] =
    await Promise.all([
      prisma.learningPath.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { title: true, rationale: true, lessonSlugs: true },
      }),
      prisma.lesson.findMany({
        where: { status: 'PUBLISHED' },
        include: { module: { select: { title: true, slug: true, order: true } } },
        orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
      }),
      prisma.lessonProgress.findMany({ where: { userId } }),
      prisma.conceptMastery.findMany({
        where: { userId },
        include: { concept: { select: { slug: true, name: true } } },
        orderBy: { masteryScore: 'asc' },
      }),
      prisma.attempt.findMany({
        where: { userId },
        select: {
          result: true,
          errorType: true,
          createdAt: true,
          durationMs: true,
          confidenceBefore: true,
          exerciseId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.learningSession.findMany({
        where: { userId, startedAt: { gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000) } },
      }),
      prisma.projectSubmission.findMany({ where: { userId }, select: { status: true } }),
    ]);

  const dueReviews = await prisma.reviewQueueItem.count({
    where: { userId, dueAt: { lte: now } },
  });

  const progressByLessonId = new Map(progressRows.map((p) => [p.lessonId, p]));
  const pathSlugs = path?.lessonSlugs ?? allLessons.map((l) => l.slug);

  const lessonBySlug = new Map(allLessons.map((l) => [l.slug, l]));
  const lessons = pathSlugs
    .map((slug) => lessonBySlug.get(slug))
    .filter((l): l is (typeof allLessons)[number] => Boolean(l))
    .map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      moduleTitle: lesson.module.title,
      estimatedMinutes: lesson.estimatedMinutes,
      state: progressByLessonId.get(lesson.id)?.state ?? ('NOT_STARTED' as const),
    }));

  const completedSlugs = lessons.filter((l) => l.state === 'COMPLETED').map((l) => l.slug);
  const inProgress = lessons.find((l) => l.state === 'IN_PROGRESS');

  // --- Modulaggregat --------------------------------------------------------
  const masteryByConceptSlug = new Map(mastery.map((m) => [m.concept.slug, m.masteryScore]));
  const moduleMap = new Map<
    string,
    { slug: string; title: string; completed: number; total: number; scores: number[] }
  >();

  for (const lesson of allLessons) {
    const entry = moduleMap.get(lesson.module.slug) ?? {
      slug: lesson.module.slug,
      title: lesson.module.title,
      completed: 0,
      total: 0,
      scores: [],
    };
    entry.total += 1;
    if (progressByLessonId.get(lesson.id)?.state === 'COMPLETED') entry.completed += 1;
    moduleMap.set(lesson.module.slug, entry);
  }

  const lessonConcepts = await prisma.lessonConcept.findMany({
    where: { isPrimary: true },
    include: {
      concept: { select: { slug: true } },
      lesson: { include: { module: { select: { slug: true } } } },
    },
  });

  for (const lc of lessonConcepts) {
    const entry = moduleMap.get(lc.lesson.module.slug);
    if (entry) entry.scores.push(masteryByConceptSlug.get(lc.concept.slug) ?? 0);
  }

  const moduleProgress = [...moduleMap.values()].map((m) => ({
    slug: m.slug,
    title: m.title,
    completed: m.completed,
    total: m.total,
    averageMastery:
      m.scores.length > 0
        ? Math.round(m.scores.reduce((sum, s) => sum + s, 0) / m.scores.length)
        : 0,
  }));

  // --- Fehlermuster ---------------------------------------------------------
  const errorCounts = new Map<string, number>();
  for (const attempt of attempts) {
    if (attempt.errorType === 'NONE') continue;
    errorCounts.set(attempt.errorType, (errorCounts.get(attempt.errorType) ?? 0) + 1);
  }
  const errorPatterns = [...errorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({
      type,
      label: ERROR_LABELS[type]?.label ?? type,
      count,
      advice: ERROR_LABELS[type]?.advice ?? 'Gehe den Code Schritt für Schritt durch.',
    }));

  // --- Wochenübersicht ------------------------------------------------------
  const weeklyActivity = buildWeeklyActivity(attempts, sessions, now);

  // --- Serie ---------------------------------------------------------------
  const streak = buildStreak(attempts, now);

  // --- Metakognition --------------------------------------------------------
  const calibration = summarizeCalibration(
    attempts
      .filter((a) => a.confidenceBefore !== null && a.result !== 'SOLUTION_REVEALED')
      .map((a) => ({
        confidence: a.confidenceBefore as ConfidenceLevel,
        passed: a.result === 'PASSED',
      })),
  );

  const passedExercises = new Set(
    attempts.filter((a) => a.result === 'PASSED').map((a) => a.exerciseId),
  ).size;

  const activeMinutes = sessions.reduce((sum, s) => sum + s.activeMinutes, 0);
  const projectsAccepted = submissions.filter((s) => s.status === 'ACCEPTED').length;

  const totals = {
    lessonsCompleted: completedSlugs.length,
    lessonsTotal: lessons.length,
    exercisesPassed: passedExercises,
    attempts: attempts.length,
    activeMinutes,
    projectsAccepted,
  };

  return {
    path: path ? { title: path.title, rationale: path.rationale, lessonSlugs: pathSlugs } : null,
    lessons,
    nextStep: determineNextStep({
      lessonSlugs: pathSlugs,
      completedLessonSlugs: completedSlugs,
      inProgressLessonSlug: inProgress?.slug ?? null,
      dueReviewCount: dueReviews,
    }),
    dueReviews,
    masteryByConcept: mastery.map((m) => {
      const description = describeMastery(m.masteryScore);
      return {
        slug: m.concept.slug,
        name: m.concept.name,
        score: Math.round(m.masteryScore),
        band: masteryBand(m.masteryScore),
        label: description.label,
        meaning: description.meaning,
        nextStep: description.nextStep,
        nextReviewAt: m.nextReviewAt,
      };
    }),
    moduleProgress,
    errorPatterns,
    weeklyActivity,
    totals,
    calibration,
    streak,
    milestones: buildMilestones(totals, mastery.length),
  };
}

function buildWeeklyActivity(
  attempts: Array<{ createdAt: Date; durationMs: number }>,
  sessions: Array<{ startedAt: Date; activeMinutes: number }>,
  now: Date,
): DashboardData['weeklyActivity'] {
  const days: DashboardData['weeklyActivity'] = [];
  const formatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayAttempts = attempts.filter((a) => a.createdAt >= day && a.createdAt < nextDay);
    const daySessions = sessions.filter((s) => s.startedAt >= day && s.startedAt < nextDay);

    days.push({
      date: day.toISOString().slice(0, 10),
      label: formatter.format(day),
      activities: dayAttempts.length,
      minutes:
        daySessions.reduce((sum, s) => sum + s.activeMinutes, 0) ||
        Math.round(dayAttempts.reduce((sum, a) => sum + a.durationMs, 0) / 60000),
    });
  }

  return days;
}

function buildStreak(attempts: Array<{ createdAt: Date }>, now: Date): DashboardData['streak'] {
  const activeDays = new Set(attempts.map((a) => a.createdAt.toISOString().slice(0, 10)));

  let current = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  // Der heutige Tag zählt nur mit, wenn schon etwas passiert ist – sonst würde
  // die Serie fälschlich als unterbrochen erscheinen, bevor der Tag vorbei ist.
  if (!activeDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...activeDays].sort();
  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const day of sorted) {
    const date = new Date(`${day}T00:00:00Z`);
    if (previous && date.getTime() - previous.getTime() === 24 * 3600 * 1000) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  const message =
    current === 0
      ? 'Heute noch nichts geübt. Das ist völlig in Ordnung – auch zehn Minuten zählen.'
      : current === 1
        ? 'Heute schon geübt.'
        : `${current} Tage in Folge geübt.`;

  return { currentDays: current, longestDays: longest, message };
}

function buildMilestones(
  totals: DashboardData['totals'],
  conceptsTouched: number,
): DashboardData['milestones'] {
  return [
    {
      id: 'first-lesson',
      label: 'Erste Lektion abgeschlossen',
      reached: totals.lessonsCompleted >= 1,
      description: 'Der Anfang ist gemacht.',
    },
    {
      id: 'ten-exercises',
      label: 'Zehn Aufgaben bestanden',
      reached: totals.exercisesPassed >= 10,
      description: 'Genug Übung, dass sich Muster zu zeigen beginnen.',
    },
    {
      id: 'first-module',
      label: 'Ein ganzes Modul abgeschlossen',
      reached: totals.lessonsCompleted >= 5,
      description: 'Ein zusammenhängendes Themengebiet vollständig bearbeitet.',
    },
    {
      id: 'ten-concepts',
      label: 'Zehn Konzepte begonnen',
      reached: conceptsTouched >= 10,
      description: 'Die Bausteine für eigene Programme sind beisammen.',
    },
    {
      id: 'first-project',
      label: 'Erstes Projekt abgenommen',
      reached: totals.projectsAccepted >= 1,
      description: 'Ein vollständiges kleines Programm selbst gebaut.',
    },
  ];
}

/** Nach so vielen Minuten ohne Aktivität gilt eine Lernsitzung als beendet. */
export const SESSION_IDLE_LIMIT_MINUTES = 45;

/**
 * Startet oder verlängert die aktuelle Lernsitzung.
 *
 * Die Untätigkeitsspanne wird ab der **letzten Aktivität** gemessen, nicht ab
 * dem Sitzungsbeginn. Sonst würde eine Person, die 50 Minuten am Stück
 * arbeitet, mitten in der Arbeit als untätig gelten: Die Sitzung würde geteilt,
 * und die aktive Zeit der alten Sitzung bliebe beim vorletzten Stand stehen.
 */
export async function touchLearningSession(userId: string, now: Date = new Date()): Promise<void> {
  const recent = await prisma.learningSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { lastActivityAt: 'desc' },
  });

  const idleMinutes = recent
    ? (now.getTime() - recent.lastActivityAt.getTime()) / 60_000
    : Number.POSITIVE_INFINITY;

  if (!recent || idleMinutes > SESSION_IDLE_LIMIT_MINUTES) {
    if (recent) {
      await prisma.learningSession.update({
        where: { id: recent.id },
        // Die Sitzung endete mit ihrer letzten Aktivität, nicht jetzt.
        data: { endedAt: recent.lastActivityAt },
      });
    }
    await prisma.learningSession.create({
      data: {
        userId,
        startedAt: now,
        lastActivityAt: now,
        activitiesCompleted: 1,
        activeMinutes: 1,
      },
    });
    return;
  }

  // Aktive Zeit ist die Spanne vom Sitzungsbeginn bis jetzt – sie wächst
  // dadurch fortlaufend, statt nur den letzten Abstand abzubilden.
  const activeMinutes = Math.max(
    1,
    Math.round((now.getTime() - recent.startedAt.getTime()) / 60_000),
  );

  await prisma.learningSession.update({
    where: { id: recent.id },
    data: {
      activitiesCompleted: { increment: 1 },
      activeMinutes,
      lastActivityAt: now,
    },
  });
}
