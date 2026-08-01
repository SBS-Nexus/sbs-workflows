import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma, createTestUser, deleteTestUser } from './helpers';
import {
  getGradingBundle,
  getPublicExercise,
  revealHint,
  revealSolution,
  saveDraft,
  submitAttempt,
} from '@/server/services/exercise-service';
import {
  checkLessonCompletion,
  completeLesson,
  getLessonView,
  markLessonStarted,
  saveSection,
} from '@/server/services/lesson-service';
import {
  SESSION_IDLE_LIMIT_MINUTES,
  getDashboardData,
  touchLearningSession,
} from '@/server/services/progress-service';
import { getReviewCenterData } from '@/server/services/review-service';
import { rebuildLearningPath } from '@/server/actions/onboarding-actions';

/**
 * Integrationstests für den vollständigen Lernablauf: Aufgabe laden, einreichen,
 * Kompetenz fortschreiben, Wiederholung planen, Lektion abschließen, Dashboard
 * lesen. Alles gegen eine echte Datenbank.
 */

let userId: string;

beforeEach(async () => {
  const user = await createTestUser();
  userId = user.id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Aufgaben laden', () => {
  it('liefert eine Aufgabe ohne die richtige Antwort', async () => {
    const exercise = await getPublicExercise(userId, 'e1-print-vorhersage');
    expect(exercise).not.toBeNull();

    const serialisiert = JSON.stringify(exercise);
    expect(serialisiert).not.toContain('expectedOutput');
    expect(serialisiert).not.toContain('Die mittlere Zeile beginnt');
    expect(exercise?.revealedHints).toEqual([]);
  });

  it('liefert bei Code-Aufgaben nur die sichtbaren Tests', async () => {
    const exercise = await getPublicExercise(userId, 'e1-var-rechnung-schreiben');

    expect(exercise?.publicTests).toHaveLength(1);
    expect(exercise?.hiddenTestCount).toBe(1);
    expect(JSON.stringify(exercise)).not.toContain('assert gesamt ==');
  });

  it('liefert versteckte Tests erst über das Prüfbündel', async () => {
    const bundle = await getGradingBundle('e1-var-rechnung-schreiben');
    expect(bundle?.tests).toHaveLength(2);
    expect(JSON.stringify(bundle)).toContain('assert gesamt ==');
  });

  it('gibt für unveröffentlichte oder unbekannte Aufgaben nichts zurück', async () => {
    expect(await getPublicExercise(userId, 'gibt-es-nicht')).toBeNull();
    expect(await getGradingBundle('gibt-es-nicht')).toBeNull();
  });
});

describe('Abgabe und Bewertung', () => {
  it('speichert eine richtige Abgabe und erhöht den Kompetenzwert', async () => {
    const result = await submitAttempt({
      userId,
      exerciseSlug: 'e1-print-vorhersage',
      submission: { kind: 'predictOutput', output: 'Start\nEnde' },
      hintsUsed: 0,
      durationMs: 45_000,
      confidenceBefore: 'RATHER_SURE',
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.grading.outcome).toBe('PASSED');
    expect(result.masteryChanges.length).toBeGreaterThan(0);
    expect(result.masteryChanges[0]!.after).toBeGreaterThan(result.masteryChanges[0]!.before);
    expect(result.nextReview).not.toBeNull();

    const attempt = await prisma.attempt.findFirst({ where: { userId } });
    expect(attempt?.result).toBe('PASSED');
    expect(attempt?.confidenceBefore).toBe('RATHER_SURE');
  });

  it('plant nach einer falschen Abgabe eine sofortige Wiederholung', async () => {
    const result = await submitAttempt({
      userId,
      exerciseSlug: 'e1-print-vorhersage',
      submission: { kind: 'predictOutput', output: 'Start\nMitte\nEnde' },
      hintsUsed: 0,
      durationMs: 20_000,
    });

    if ('error' in result) throw new Error(result.error);

    expect(result.grading.outcome).toBe('FAILED');
    expect(result.nextReview?.reason).toContain('Lerneinheit');

    const item = await prisma.reviewQueueItem.findFirst({ where: { userId } });
    expect(item).not.toBeNull();
    expect(item!.dueAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('verlängert das Intervall nach wiederholtem Erfolg', async () => {
    for (let i = 0; i < 3; i += 1) {
      await submitAttempt({
        userId,
        exerciseSlug: 'e1-print-vorhersage',
        submission: { kind: 'predictOutput', output: 'Start\nEnde' },
        hintsUsed: 0,
        durationMs: 10_000,
      });
    }

    const item = await prisma.reviewQueueItem.findFirstOrThrow({ where: { userId } });
    expect(item.repetition).toBe(3);
    expect(item.dueAt.getTime()).toBeGreaterThan(Date.now() + 24 * 3600 * 1000);
  });

  it('bewertet Code-Abgaben anhand der gemeldeten Testergebnisse', async () => {
    const result = await submitAttempt({
      userId,
      exerciseSlug: 'e1-var-rechnung-schreiben',
      submission: {
        kind: 'code',
        code: 'grundgebuehr = 40\nstundenpreis = 12\nstunden = 5\ngesamt = grundgebuehr + stundenpreis * stunden\nprint(gesamt)',
        testResults: [
          { id: 't1', name: 'Die Gesamtkosten betragen 100', passed: true },
          { id: 't2', name: 'Die Berechnung nutzt die Variablen', passed: true },
        ],
        runtimeError: null,
      },
      hintsUsed: 0,
      durationMs: 120_000,
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.grading.outcome).toBe('PASSED');
    expect(result.grading.totalTests).toBe(2);
  });

  it('erkennt einen Verstoß gegen die Quelltextregel serverseitig', async () => {
    const result = await submitAttempt({
      userId,
      exerciseSlug: 'e1-var-rechnung-schreiben',
      submission: {
        kind: 'code',
        // Die Tests würden bestehen, die Variable grundgebuehr fehlt aber.
        code: 'print(100)',
        testResults: [
          { id: 't1', name: 'Die Gesamtkosten betragen 100', passed: true },
          { id: 't2', name: 'Die Berechnung nutzt die Variablen', passed: true },
        ],
        runtimeError: null,
      },
      hintsUsed: 0,
      durationMs: 10_000,
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.grading.outcome).not.toBe('PASSED');
    expect(result.grading.feedback.some((f) => f.message.includes('grundgebuehr'))).toBe(true);
  });

  it('lehnt eine Abgabe zu einer unbekannten Aufgabe ab', async () => {
    const result = await submitAttempt({
      userId,
      exerciseSlug: 'gibt-es-nicht',
      submission: { kind: 'freeText', text: 'egal' },
      hintsUsed: 0,
      durationMs: 0,
    });

    expect('error' in result).toBe(true);
  });
});

describe('Hinweisleiter', () => {
  it('gibt Stufe 1 sofort und Stufe 2 erst nach einem Versuch frei', async () => {
    const stufe1 = await revealHint(userId, 'e1-var-rechnung-schreiben', 1);
    expect('hint' in stufe1).toBe(true);

    const stufe2Zufrueh = await revealHint(userId, 'e1-var-rechnung-schreiben', 2);
    expect('error' in stufe2Zufrueh).toBe(true);

    await submitAttempt({
      userId,
      exerciseSlug: 'e1-var-rechnung-schreiben',
      submission: { kind: 'code', code: 'print(0)', testResults: [], runtimeError: null },
      hintsUsed: 1,
      durationMs: 5000,
    });

    const stufe2 = await revealHint(userId, 'e1-var-rechnung-schreiben', 2);
    expect('hint' in stufe2).toBe(true);
  });

  it('gibt die Musterlösung erst nach mehreren Versuchen und voller Leiter frei', async () => {
    const zuFrueh = await revealSolution(userId, 'e1-var-rechnung-schreiben');
    expect('error' in zuFrueh).toBe(true);

    for (let level = 1; level <= 5; level += 1) {
      await submitAttempt({
        userId,
        exerciseSlug: 'e1-var-rechnung-schreiben',
        submission: { kind: 'code', code: 'print(0)', testResults: [], runtimeError: null },
        hintsUsed: level,
        durationMs: 5000,
      });
    }

    const freigegeben = await revealSolution(userId, 'e1-var-rechnung-schreiben');
    expect('solution' in freigegeben).toBe(true);
    if (!('solution' in freigegeben)) return;
    expect(freigegeben.followUp.reason).toContain('ohne Vorlage');
  });

  it('deckelt den Kompetenzwert nach dem Ansehen der Musterlösung', async () => {
    for (let level = 1; level <= 5; level += 1) {
      await submitAttempt({
        userId,
        exerciseSlug: 'e1-var-rechnung-schreiben',
        submission: { kind: 'code', code: 'print(0)', testResults: [], runtimeError: null },
        hintsUsed: level,
        durationMs: 5000,
      });
    }

    await revealSolution(userId, 'e1-var-rechnung-schreiben');

    const eintraege = await prisma.attempt.findMany({
      where: { userId, result: 'SOLUTION_REVEALED' },
    });
    expect(eintraege).toHaveLength(1);

    const mastery = await prisma.conceptMastery.findMany({ where: { userId } });
    for (const eintrag of mastery) {
      expect(eintrag.masteryScore).toBeLessThanOrEqual(59);
    }
  });
});

describe('Lektionsfortschritt', () => {
  it('schließt eine Lektion erst ab, wenn jede Aufgabe bestanden ist', async () => {
    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { slug: 'was-ist-ein-programm' },
      include: { exercises: { select: { slug: true } } },
    });

    await markLessonStarted(userId, 'was-ist-ein-programm');

    const vorher = await checkLessonCompletion(userId, 'was-ist-ein-programm');
    expect(vorher.completed).toBe(false);
    expect(vorher.totalCount).toBe(lesson.exercises.length);

    const nichtAbgeschlossen = await completeLesson(userId, 'was-ist-ein-programm');
    expect(nichtAbgeschlossen.completed).toBe(false);

    // Alle Aufgaben der Lektion korrekt lösen.
    await submitAttempt({
      userId,
      exerciseSlug: 'g0-programm-definition',
      submission: { kind: 'singleChoice', optionId: 'a' },
      hintsUsed: 0,
      durationMs: 5000,
    });
    await submitAttempt({
      userId,
      exerciseSlug: 'g0-quellcode-interpreter',
      submission: { kind: 'multipleChoice', optionIds: ['a', 'b', 'd'] },
      hintsUsed: 0,
      durationMs: 5000,
    });
    await submitAttempt({
      userId,
      exerciseSlug: 'g0-reihenfolge-parsons',
      submission: {
        kind: 'parsons',
        orderedLineIds: ['l1', 'l2', 'l3', 'l4'],
        indents: [0, 0, 0, 0],
      },
      hintsUsed: 0,
      durationMs: 5000,
    });
    await submitAttempt({
      userId,
      exerciseSlug: 'g0-erklaeren-reihenfolge',
      submission: {
        kind: 'freeText',
        text: 'Python arbeitet die Zeilen von oben nach unten der Reihe nach ab. Ein Wert muss vorher existieren, damit eine spätere Zeile ihn verwenden kann.',
      },
      hintsUsed: 0,
      durationMs: 60_000,
    });

    const abgeschlossen = await completeLesson(
      userId,
      'was-ist-ein-programm',
      'Mir war neu, dass …',
    );
    expect(abgeschlossen.completed).toBe(true);

    const progress = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });
    expect(progress.state).toBe('COMPLETED');
    expect(progress.completedAt).not.toBeNull();
  });

  // Regression: Das bloße Wiederöffnen einer abgeschlossenen Lektion darf sie
  // nicht auf IN_PROGRESS zurücksetzen. Sonst verschwindet sie aus den
  // Abschlusszahlen, der nächste Schritt im Dashboard ändert sich, und
  // Wiederholungssets werden wieder gesperrt.
  it('behält den Abschluss beim erneuten Öffnen einer Lektion', async () => {
    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { slug: 'was-ist-ein-programm' },
      select: { id: true },
    });

    await prisma.lessonProgress.create({
      data: {
        userId,
        lessonId: lesson.id,
        state: 'COMPLETED',
        completedAt: new Date(),
        lastSection: 'reflection',
      },
    });

    await markLessonStarted(userId, 'was-ist-ein-programm');

    const nachOeffnen = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });
    expect(nachOeffnen.state).toBe('COMPLETED');
    expect(nachOeffnen.completedAt).not.toBeNull();

    // Auch das Blättern durch die Abschnitte darf den Abschluss nicht aufheben –
    // der zuletzt gelesene Abschnitt wird trotzdem festgehalten.
    await saveSection(userId, 'was-ist-ein-programm', 'beispiel');

    const nachAbschnitt = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });
    expect(nachAbschnitt.state).toBe('COMPLETED');
    expect(nachAbschnitt.lastSection).toBe('beispiel');

    // Und der Abschluss bleibt auch in der Auswertung sichtbar.
    const data = await getDashboardData(userId);
    expect(data.totals.lessonsCompleted).toBe(1);
  });

  it('markiert eine noch nicht abgeschlossene Lektion als begonnen', async () => {
    await markLessonStarted(userId, 'was-ist-ein-programm');
    await saveSection(userId, 'was-ist-ein-programm', 'aufgaben');

    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { slug: 'was-ist-ein-programm' },
      select: { id: true },
    });
    const progress = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });

    expect(progress.state).toBe('IN_PROGRESS');
    expect(progress.lastSection).toBe('aufgaben');
  });

  it('speichert den Zwischenstand im Editor und liefert ihn zurück', async () => {
    await saveDraft(userId, 'variablen-und-zuweisung', 'e1-var-rechnung-schreiben', 'gesamt = 1');

    const exercise = await getPublicExercise(userId, 'e1-var-rechnung-schreiben');
    expect(exercise?.draftCode).toBe('gesamt = 1');
  });

  it('liefert eine vollständige Lektionsansicht mit Nachbarschaftsnavigation', async () => {
    await rebuildLearningPath({
      userId,
      placementScore: 0,
      demonstratedConceptSlugs: [],
      learningGoal: 'GENERAL',
      dailyTimeBudget: 20,
      pace: 'STEADY',
    });

    const view = await getLessonView(userId, 'variablen-und-zuweisung');
    expect(view).not.toBeNull();
    expect(view!.exercises.length).toBeGreaterThan(0);
    expect(view!.workedExample.annotations.length).toBeGreaterThan(0);
    expect(view!.previousSlug).toBe('ausgabe-und-kommentare');
    expect(view!.nextSlug).toBe('zahlen-und-rechnen');
  });
});

describe('Dashboard und Wiederholungscenter', () => {
  it('zeigt den Fortschritt nach einer bearbeiteten Aufgabe', async () => {
    await rebuildLearningPath({
      userId,
      placementScore: 0,
      demonstratedConceptSlugs: [],
      learningGoal: 'GENERAL',
      dailyTimeBudget: 20,
      pace: 'STEADY',
    });

    await submitAttempt({
      userId,
      exerciseSlug: 'e1-print-vorhersage',
      submission: { kind: 'predictOutput', output: 'Start\nEnde' },
      hintsUsed: 0,
      durationMs: 30_000,
      confidenceBefore: 'RATHER_SURE',
    });

    const data = await getDashboardData(userId);

    expect(data.lessons.length).toBeGreaterThanOrEqual(12);
    expect(data.masteryByConcept.length).toBeGreaterThan(0);
    expect(data.totals.exercisesPassed).toBe(1);
    expect(data.weeklyActivity).toHaveLength(7);
    expect(data.moduleProgress.length).toBeGreaterThanOrEqual(3);
    expect(data.milestones.some((m) => m.id === 'first-lesson')).toBe(true);
  });

  it('sammelt Fehlermuster für die Rückmeldung', async () => {
    await submitAttempt({
      userId,
      exerciseSlug: 'e1-var-rechnung-schreiben',
      submission: {
        kind: 'code',
        code: 'grundgebuehr = 40\nprint(x)',
        testResults: [{ id: 't1', name: 'Die Gesamtkosten betragen 100', passed: false }],
        runtimeError: { type: 'NameError', message: "name 'x' is not defined", line: 2 },
      },
      hintsUsed: 0,
      durationMs: 20_000,
    });

    const data = await getDashboardData(userId);
    expect(data.errorPatterns.some((p) => p.type === 'NAME')).toBe(true);
    expect(data.errorPatterns[0]?.advice.length).toBeGreaterThan(20);
  });

  it('führt fällige Wiederholungen im Wiederholungscenter auf', async () => {
    await submitAttempt({
      userId,
      exerciseSlug: 'e1-print-vorhersage',
      submission: { kind: 'predictOutput', output: 'falsch' },
      hintsUsed: 0,
      durationMs: 10_000,
    });

    const review = await getReviewCenterData(userId);
    expect(review.due.length).toBe(1);
    expect(review.due[0]?.exerciseSlug).toBe('e1-print-vorhersage');
    expect(review.sets.length).toBeGreaterThanOrEqual(3);
    expect(review.sets.every((s) => !s.available)).toBe(true);
  });

  it('meldet keine fälligen Wiederholungen für ein frisches Konto', async () => {
    const review = await getReviewCenterData(userId);
    expect(review.due).toEqual([]);
    expect(review.totalScheduled).toBe(0);
  });
});

describe('Lernsitzungen', () => {
  // Regression: Die Untätigkeitsspanne wird ab der letzten Aktivität gemessen,
  // nicht ab dem Sitzungsbeginn. Sonst würde eine Person, die durchgehend
  // arbeitet, nach Erreichen der Höchstdauer mitten in der Arbeit als untätig
  // gelten – die Sitzung würde geteilt und die aktive Zeit unterschätzt.
  it('führt eine durchgehend aktive Sitzung über die Höchstdauer hinaus fort', async () => {
    const start = new Date('2026-05-01T09:00:00Z');
    await touchLearningSession(userId, start);

    // Alle 20 Minuten eine Aktivität, insgesamt 80 Minuten am Stück.
    for (const minute of [20, 40, 60, 80]) {
      await touchLearningSession(userId, new Date(start.getTime() + minute * 60_000));
    }

    const sessions = await prisma.learningSession.findMany({ where: { userId } });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.activitiesCompleted).toBe(5);
    expect(sessions[0]!.activeMinutes).toBe(80);
    expect(sessions[0]!.endedAt).toBeNull();
  });

  it('beginnt nach einer echten Pause eine neue Sitzung', async () => {
    const start = new Date('2026-05-01T09:00:00Z');
    await touchLearningSession(userId, start);
    await touchLearningSession(userId, new Date(start.getTime() + 10 * 60_000));

    // Pause über der Grenze.
    const nachPause = new Date(start.getTime() + (10 + SESSION_IDLE_LIMIT_MINUTES + 5) * 60_000);
    await touchLearningSession(userId, nachPause);

    const sessions = await prisma.learningSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'asc' },
    });

    expect(sessions).toHaveLength(2);
    // Die erste Sitzung endet mit ihrer letzten Aktivität, nicht erst jetzt.
    expect(sessions[0]!.endedAt?.toISOString()).toBe(
      new Date(start.getTime() + 10 * 60_000).toISOString(),
    );
    expect(sessions[0]!.activeMinutes).toBe(10);
    expect(sessions[1]!.endedAt).toBeNull();
    expect(sessions[1]!.activitiesCompleted).toBe(1);
  });

  it('zählt die aktive Zeit im Dashboard', async () => {
    // Innerhalb des Zeitfensters, das das Dashboard auswertet (30 Tage).
    const start = new Date(Date.now() - 60 * 60_000);
    await touchLearningSession(userId, start);
    await touchLearningSession(userId, new Date(start.getTime() + 30 * 60_000));

    const data = await getDashboardData(userId);
    expect(data.totals.activeMinutes).toBe(30);
  });
});

describe('Datenschutz', () => {
  it('entfernt beim Löschen des Kontos sämtliche abhängigen Daten', async () => {
    await submitAttempt({
      userId,
      exerciseSlug: 'e1-print-vorhersage',
      submission: { kind: 'predictOutput', output: 'Start\nEnde' },
      hintsUsed: 0,
      durationMs: 10_000,
    });
    await markLessonStarted(userId, 'ausgabe-und-kommentare');
    await rebuildLearningPath({
      userId,
      placementScore: 0,
      demonstratedConceptSlugs: [],
      learningGoal: 'GENERAL',
      dailyTimeBudget: 20,
      pace: 'STEADY',
    });

    await prisma.user.delete({ where: { id: userId } });

    expect(await prisma.attempt.count({ where: { userId } })).toBe(0);
    expect(await prisma.conceptMastery.count({ where: { userId } })).toBe(0);
    expect(await prisma.lessonProgress.count({ where: { userId } })).toBe(0);
    expect(await prisma.reviewQueueItem.count({ where: { userId } })).toBe(0);
    expect(await prisma.learningPath.count({ where: { userId } })).toBe(0);
    expect(await prisma.authSession.count({ where: { userId } })).toBe(0);
  });

  it('speichert anonyme Analyseereignisse ohne Nutzerbezug', async () => {
    const spalten = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'analytics_events'`,
    );
    const namen = spalten.map((s) => s.column_name);
    expect(namen).not.toContain('userId');
    expect(namen).not.toContain('user_id');
  });
});
