import 'server-only';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
// Kein `import type`: `Prisma.PrismaClientKnownRequestError` wird als Wert für
// die `instanceof`-Prüfung gebraucht.
import { Prisma } from '@/generated/prisma/client';
import { enforceRateLimit, RATE_LIMITS } from '@/server/security/rate-limit';
import { gradeSubmission, toPublicPayload } from '@/domain/grading/grade';
import {
  exercisePayloadSchema,
  submissionSchema,
  hintSchema,
  type Hint,
  type Submission,
} from '@/domain/content/exercise-payload';
import { evaluateHintAvailability } from '@/domain/hints/hint-ladder';
import {
  DEFAULT_MASTERY_CONFIG,
  INITIAL_MASTERY_STATE,
  masteryBand,
  updateMastery,
  type ConfidenceLevel,
  type MasteryState,
} from '@/domain/mastery/mastery';
import { scheduleNextReview } from '@/domain/scheduling/spaced-repetition';
import type { ExerciseTypeName } from '@/domain/content/schema';

/**
 * Aufgaben-Dienst: verbindet die reinen Domainfunktionen (grade/mastery/
 * scheduling) mit Persistenz. Muster aus PythonPfad/SQLPfad
 * (`server/services/exercise-service.ts`): `domain/` bleibt frei von Prisma,
 * dieser Dienst lädt Zustand, ruft die reinen Funktionen auf und speichert
 * das Ergebnis.
 */

export interface PublicExercise {
  id: string;
  slug: string;
  type: ExerciseTypeName;
  title: string;
  prompt: string;
  payload: unknown;
  difficulty: number;
  scaffoldLevel: number;
  transferContext: string | null;
  /**
   * Nur die Stufennummern der vorhandenen Hinweise — genug, damit der Client
   * weiß, wie viele Stufen es gibt und ob noch weitere folgen. Die
   * eigentlichen Hinweistexte werden erst über `revealNextHint()` einzeln und
   * geprüft ausgeliefert (siehe docs/LERNMODELL.md §4: "Nicht freigegebene
   * Hinweise verlassen den Server gar nicht erst").
   */
  hintLevels: number[];
}

/** Lädt eine Aufgabe OHNE Lösungsdaten — sicher für den Client. */
export async function getPublicExercise(slug: string): Promise<PublicExercise | null> {
  const exercise = await prisma.exercise.findUnique({ where: { slug } });
  if (!exercise || exercise.status !== 'PUBLISHED') return null;

  const payload = exercisePayloadSchema.parse(exercise.payload);
  const hints = z.array(hintSchema).parse(exercise.hints);

  return {
    id: exercise.id,
    slug: exercise.slug,
    type: exercise.type,
    title: exercise.title,
    prompt: exercise.prompt,
    payload: toPublicPayload(payload),
    difficulty: exercise.difficulty,
    scaffoldLevel: exercise.scaffoldLevel,
    transferContext: exercise.transferContext,
    hintLevels: hints.map((h) => h.level).sort((a, b) => a - b),
  };
}

export type RevealHintResult = { hint: Hint } | { blocked: true; reason: string };

/**
 * Gibt den jeweils NÄCHSTEN Hinweis frei, sofern die Hinweisleiter das
 * erlaubt. Bewusst ohne einen vom Client gewählten Ziel-Level: eine frühere
 * Fassung ließ den Client die gewünschte Stufe angeben und leitete
 * `revealedLevel` daraus ab (`requestedLevel - 1`) — das machte die
 * Reihenfolgeprüfung wirkungslos, ein direkter Aufruf mit `requestedLevel: 5`
 * hätte bei ausreichender Versuchszahl sofort die Musterlösung
 * ausgeliefert, ohne die Stufen 1–4 je gesehen zu haben (Code-Review auf
 * PR #29). Jetzt bestimmt ausschließlich die Datenbank, welche Stufe als
 * Nächstes an der Reihe ist: `revealedLevel` kommt aus echten
 * `HintReveal`-Zeilen, `attempts` aus echten `Attempt`-Zeilen — beides für
 * diesen Nutzer und diese Aufgabe, nichts davon vom Client beeinflussbar.
 * Eine erfolgreich freigegebene Stufe wird sofort persistiert, damit sie
 * beim nächsten Aufruf (auch nach einem Seitenneuladen) nicht erneut als
 * "nächste" gilt.
 */
export async function revealNextHint(
  userId: string,
  exerciseSlug: string,
): Promise<RevealHintResult> {
  enforceRateLimit(`hint:${userId}`, RATE_LIMITS.hintReveal);

  const exercise = await prisma.exercise.findUnique({ where: { slug: exerciseSlug } });
  if (!exercise || exercise.status !== 'PUBLISHED') {
    throw new Error('Aufgabe nicht gefunden.');
  }

  const hints = z.array(hintSchema).parse(exercise.hints);

  const [attempts, revealedLevel] = await Promise.all([
    prisma.attempt.count({ where: { userId, exerciseId: exercise.id } }),
    highestRevealedHintLevel(userId, exercise.id),
  ]);

  const nextLevel = revealedLevel + 1;
  const target = hints.find((h) => h.level === nextLevel);
  if (!target) {
    return { blocked: true, reason: 'Es gibt für diese Aufgabe keine weiteren Hinweise.' };
  }

  const availability = evaluateHintAvailability(hints, { revealedLevel, attempts });
  const status = availability.find((a) => a.level === nextLevel);

  if (!status?.available) {
    return {
      blocked: true,
      reason: status?.blockedReason ?? 'Dieser Hinweis ist noch nicht freigegeben.',
    };
  }

  // `revealedAt` wird bei einer erneuten Freigabe bewusst aktualisiert: Der
  // Unique-Index lässt je Stufe nur eine Zeile zu, und ohne Auffrischung
  // fiele eine in dieser Episode neu angeforderte Hilfe aus der
  // Episodenzählung heraus (Codex-Review auf PR #29, 43c8a17).
  await prisma.hintReveal.upsert({
    where: { userId_exerciseId_level: { userId, exerciseId: exercise.id, level: nextLevel } },
    create: { userId, exerciseId: exercise.id, level: nextLevel },
    update: { revealedAt: new Date() },
  });

  return { hint: target };
}

/**
 * Die bereits freigegebenen Hinweise dieser Person zu dieser Aufgabe.
 *
 * Ohne das startet die Hinweisleiter nach jedem Seitenneuladen wieder bei
 * null, obwohl die `HintReveal`-Zeilen serverseitig fortbestehen: der Client
 * fragt dann erneut nach Stufe 1, bekommt vom Server aber die nächste noch
 * nicht gesehene Stufe — der bereits gelesene Hinweis wäre nicht mehr
 * erreichbar und die Anzeige liefe dauerhaft aus dem Tritt (Codex-Review auf
 * PR #29). Es werden ausschließlich Hinweise ausgeliefert, für die es eine
 * echte Freigabe in der Datenbank gibt.
 */
export async function getRevealedHints(userId: string, exerciseSlug: string): Promise<Hint[]> {
  const exercise = await prisma.exercise.findUnique({
    where: { slug: exerciseSlug },
    select: { id: true, hints: true, status: true },
  });
  if (!exercise || exercise.status !== 'PUBLISHED') return [];

  const hints = z.array(hintSchema).parse(exercise.hints);
  // Die derzeit offenliegenden Hinweise. Nach einer abgeschlossenen Episode
  // sind das keine mehr, innerhalb eines Anlaufs überstehen sie dagegen ein
  // Seitenneuladen.
  const reveals = await prisma.hintReveal.findMany({
    where: { userId, exerciseId: exercise.id },
    select: { level: true },
  });

  const revealedLevels = new Set(reveals.map((r) => r.level));
  return hints.filter((h) => revealedLevels.has(h.level)).sort((a, b) => a.level - b.level);
}

/** Höchste derzeit offenliegende Hinweisstufe (0 = keine). */
async function highestRevealedHintLevel(userId: string, exerciseId: string): Promise<number> {
  const latest = await prisma.hintReveal.findFirst({
    where: { userId, exerciseId },
    orderBy: { level: 'desc' },
    select: { level: true },
  });
  return latest?.level ?? 0;
}

/**
 * Wie viele Hinweisstufen für diese Aufgabe gerade offenliegen.
 *
 * `HintReveal` beschreibt bewusst NICHT die Vorgeschichte, sondern den
 * aktuell gewährten Hilfestand: Die Zeilen werden am Ende einer
 * Übungsepisode gelöscht (siehe `beendeHinweisEpisode`). Dadurch ist die
 * Zählung eine schlichte Abfrage ohne Zeitvergleich — und ohne jede Angabe
 * des Clients.
 *
 * Frühere Fassungen leiteten die Episodengrenze zur Lesezeit her, erst aus
 * dem letzten Erfolg, dann zusätzlich aus `ReviewQueueItem.dueAt`. Beides
 * war brüchig: `dueAt` wird bei jedem Versuch neu gesetzt, und der
 * Wiederholungszusammenhang kam vom Client. Beides ließ sich zu
 * `hintsUsed === 0` verbiegen, obwohl Hilfe sichtbar war (Codex-Review auf
 * PR #29, 7cb2d48).
 */
async function revealedHintCount(
  tx: Prisma.TransactionClient,
  userId: string,
  exerciseId: string,
): Promise<number> {
  return tx.hintReveal.count({ where: { userId, exerciseId } });
}

/**
 * Schliesst die Hilfestellung dieser Aufgabe ab: Die offenliegenden
 * Hinweisstufen werden zurückgenommen, damit der nächste Anlauf wieder bei
 * Stufe 1 beginnt und nicht als hinweisgestützt gilt.
 *
 * Aufgerufen, wenn die Aufgabe bestanden ist oder die nächste Wiederholung
 * erst nach einer echten Pause ansteht. Bleibt die Wiederholung dagegen in
 * derselben Lerneinheit, bleiben die Hinweise stehen — sie sind auf dem
 * Bildschirm ja weiterhin sichtbar und müssen deshalb weiter zählen.
 *
 * Was die Person tatsächlich an Hilfe genutzt hat, bleibt dauerhaft im
 * jeweiligen `Attempt.hintsUsed` erhalten; hier wird nur der offene
 * Hilfestand geräumt.
 */
async function beendeHinweisEpisode(
  tx: Prisma.TransactionClient,
  userId: string,
  exerciseId: string,
): Promise<void> {
  await tx.hintReveal.deleteMany({ where: { userId, exerciseId } });
}

/**
 * Wie oft ein Serialisierungskonflikt neu versucht wird, bevor er
 * durchgereicht wird. Konflikte brauchen zwei gleichzeitige Einreichungen
 * derselben Person zum selben Konzept und sind daher selten; treffen mehrere
 * aufeinander, genügen drei Anläufe aber nicht zuverlässig — die
 * wiederholenden Transaktionen kollidieren sonst erneut miteinander.
 */
const MAX_TRANSAKTIONSVERSUCHE = 6;

/**
 * Führt `arbeit` in einer serialisierbaren Transaktion aus und wiederholt sie,
 * wenn PostgreSQL sie wegen eines Schreibkonflikts abbricht.
 *
 * Serialisierbarkeit ohne Wiederholung wäre keine Verbesserung: Die Datenbank
 * verhindert den verlorenen Schreibvorgang dann zwar, aber um den Preis, dass
 * eine der beiden Einreichungen mit einem Fehler endet. Erst der zweite
 * Anlauf — er liest den inzwischen geschriebenen Stand — führt beide
 * Einreichungen zum richtigen Ergebnis.
 *
 * WICHTIG für Aufrufer: `arbeit` kann mehrfach ausgeführt werden und muss
 * deshalb frei von Nebenwirkungen außerhalb der Transaktion sein.
 */
async function serialisierbareTransaktion<T>(
  arbeit: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let letzterKonflikt: unknown;

  for (let versuch = 1; versuch <= MAX_TRANSAKTIONSVERSUCHE; versuch += 1) {
    try {
      return await prisma.$transaction(arbeit, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (!istSchreibkonflikt(error)) throw error;
      letzterKonflikt = error;

      // Vor dem nächsten Anlauf kurz warten, mit wachsender und zufällig
      // gestreuter Wartezeit. Ohne diese Streuung starten die beteiligten
      // Transaktionen gleichzeitig neu und kollidieren wieder — ein
      // unmittelbarer Wiederholungslauf scheitert dann verlässlich mit
      // denselben Konflikten statt sie aufzulösen.
      if (versuch < MAX_TRANSAKTIONSVERSUCHE) {
        await warte(2 ** versuch * (5 + Math.random() * 10));
      }
    }
  }

  throw letzterKonflikt;
}

function warte(millisekunden: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, millisekunden));
}

/**
 * P2034 ist Prismas Code für "Transaktion wegen Schreibkonflikt oder Deadlock
 * abgebrochen" — genau der Fall, den ein erneuter Anlauf auflöst. Alles andere
 * ist ein echter Fehler und wird nicht wiederholt.
 */
function istSchreibkonflikt(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

export interface SubmitAttemptInput {
  exerciseSlug: string;
  submission: Submission;
  durationMs: number;
  confidenceBefore?: ConfidenceLevel;
  isReview: boolean;
}

export interface SubmitAttemptResult {
  outcome: 'PASSED' | 'PARTIAL' | 'FAILED' | 'SOLUTION_REVEALED';
  feedback: { tone: 'success' | 'issue' | 'info'; message: string }[];
  marks: Record<string, boolean>;
  masteryUpdates: { conceptSlug: string; delta: number; band: string; reasons: string[] }[];
}

/**
 * Verarbeitet eine eingereichte Antwort: bewertet, aktualisiert die
 * Kompetenz jedes verknüpften Konzepts, plant die nächste Wiederholung.
 */
export async function submitAttempt(
  userId: string,
  input: SubmitAttemptInput,
): Promise<SubmitAttemptResult> {
  enforceRateLimit(`submit:${userId}`, RATE_LIMITS.submitAttempt);

  const exercise = await prisma.exercise.findUnique({
    where: { slug: input.exerciseSlug },
    include: { concepts: { include: { concept: true } } },
  });
  if (!exercise || exercise.status !== 'PUBLISHED') {
    throw new Error('Aufgabe nicht gefunden.');
  }

  const payload = exercisePayloadSchema.parse(exercise.payload);
  const submission = submissionSchema.parse(input.submission);
  const grading = gradeSubmission({ payload, submission });

  const now = new Date();

  // Alle Schreibvorgänge dieses Versuchs gehören zusammen: der Attempt, die
  // Kompetenzstände jedes verknüpften Konzepts und die eingeplante
  // Wiederholung. Ohne gemeinsame Transaktion konnte ein Abbruch nach dem
  // `attempt.create` einen als PASSED verbuchten Versuch hinterlassen, zu dem
  // weder ein Kompetenzstand noch eine Wiederholung existierte —
  // `checkLessonCompletion` zählt bestandene Versuche und hätte die Lektion
  // abgeschlossen, während der Lernstand unberührt blieb (Code-Review auf
  // PR #29).
  //
  // `Serializable` ist hier nicht übervorsichtig, sondern notwendig: Der
  // Kompetenzstand wird gelesen, fortgeschrieben und zurückgeschrieben. Unter
  // der PostgreSQL-Vorgabe `Read Committed` dürfen zwei gleichzeitige
  // Einreichungen derselben Person zum selben Konzept — zwei Tabs, ein
  // wiederholter Request — beide denselben Ausgangsstand lesen; der spätere
  // Schreibvorgang überschreibt dann den früheren, und ein Lernfortschritt
  // geht verloren, obwohl beide Attempts verbucht sind (Codex-Review auf
  // PR #29, dd89677). Die Ergebnisliste entsteht INNERHALB der Transaktion,
  // damit ein Wiederholungslauf sie nicht ein zweites Mal befüllt.
  const masteryUpdates = await serialisierbareTransaktion(async (tx) => {
    const masteryUpdates: SubmitAttemptResult['masteryUpdates'] = [];
    let episodeBeendet = false;
    // Diese beiden Abfragen stehen INNERHALB der Transaktion, damit ein
    // Wiederholungslauf sie erneut ausführt. Lagen sie davor, benutzte der
    // zweite Anlauf weiterhin den Stand von vor dem Konflikt: Bei zwei
    // gleichzeitigen ersten Fehlversuchen mit derselben Fehlerart sah der
    // wiederholte Lauf zwar den inzwischen geschriebenen Kompetenzstand, aber
    // die veraltete Vorgänger-Abfrage — `repeatedErrorType` blieb dann
    // fälschlich false und der zweite Fehler wurde nicht als Wiederholung
    // gewertet (Codex-Review auf PR #29, 301c8c9).
    //
    // Maßgeblich ist die Anzahl serverseitig persistierter Hinweis-Freigaben
    // (HintReveal), nicht eine Angabe des Clients — sonst könnte jemand die
    // volle Hinweisleiter nutzen und trotzdem `hintsUsed: 0` einreichen, und
    // die Kompetenzberechnung würde eine gesehene Musterlösung wie eine
    // eigenständige Lösung werten (Code-Review auf PR #29).
    //
    // Muss VOR dem Anlegen des neuen Attempts ermittelt werden — sonst findet
    // die Abfrage unten den soeben erstellten Versuch als "letzten
    // fehlgeschlagenen Versuch" und stuft jeden ersten Fehler fälschlich als
    // Wiederholung desselben Fehlertyps ein (siehe Codex-Review auf PR #29).
    // Die Konzept-Abfragen sind voneinander unabhängig und laufen parallel
    // statt nacheinander (ebenfalls Code-Review auf PR #29).
    const [hintsUsed, lastFailedAttemptEntries] = await Promise.all([
      revealedHintCount(tx, userId, exercise.id),
      Promise.all(
        exercise.concepts.map(async (link) => {
          const lastFailedAttempt = await tx.attempt.findFirst({
            where: {
              userId,
              exercise: { concepts: { some: { conceptId: link.conceptId } } },
              result: { in: ['FAILED', 'PARTIAL'] },
            },
            orderBy: { createdAt: 'desc' },
            select: { errorType: true },
          });
          return [link.conceptId, lastFailedAttempt] as const;
        }),
      ),
    ]);
    const lastFailedAttemptsByConcept = new Map(lastFailedAttemptEntries);

    await tx.attempt.create({
      data: {
        userId,
        exerciseId: exercise.id,
        submittedAnswer: submission,
        result: grading.outcome,
        errorType: grading.errorType,
        hintsUsed,
        durationMs: input.durationMs,
        confidenceBefore: input.confidenceBefore,
        isReview: input.isReview,
      },
    });

    for (const link of exercise.concepts) {
      const existing = await tx.conceptMastery.findUnique({
        where: { userId_conceptId: { userId, conceptId: link.conceptId } },
      });

      const previousState: MasteryState = existing
        ? {
            masteryScore: existing.masteryScore,
            stability: existing.stability,
            difficulty: existing.difficulty,
            successfulRetrievals: existing.successfulRetrievals,
            failedRetrievals: existing.failedRetrievals,
            transferSuccesses: existing.transferSuccesses,
          }
        : INITIAL_MASTERY_STATE;

      // `null` statt eines großen Platzhalterwerts: ein Konzept, das noch nie
      // geübt wurde, hat keine Pause hinter sich und darf den Bonus für
      // verzögerten Abruf nicht bekommen (Code-Review auf PR #29).
      const daysSinceLastPractice = existing?.lastPracticedAt
        ? (now.getTime() - existing.lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24)
        : null;

      // War der zuletzt aufgezeichnete Fehler beim vorigen Versuch zu diesem
      // Konzept vom selben Typ? Eine grobe, aber ausreichende Näherung: der
      // letzte fehlgeschlagene Versuch zu einer Aufgabe desselben Konzepts,
      // ermittelt VOR dem gerade erstellten Attempt (siehe oben).
      const lastFailedAttempt = lastFailedAttemptsByConcept.get(link.conceptId) ?? null;

      const update = updateMastery(
        previousState,
        {
          outcome:
            grading.outcome === 'PASSED'
              ? 'PASSED'
              : grading.outcome === 'PARTIAL'
                ? 'PARTIAL'
                : 'FAILED',
          score: grading.score,
          hintsUsed,
          exerciseDifficulty: exercise.difficulty,
          exerciseType: exercise.type,
          scaffoldLevel: exercise.scaffoldLevel,
          weight: link.weight,
          daysSinceLastPractice,
          errorType: grading.errorType,
          repeatedErrorType:
            grading.outcome !== 'PASSED' && lastFailedAttempt?.errorType === grading.errorType,
          confidenceBefore: input.confidenceBefore ?? null,
        },
        DEFAULT_MASTERY_CONFIG,
      );

      await tx.conceptMastery.upsert({
        where: { userId_conceptId: { userId, conceptId: link.conceptId } },
        create: {
          userId,
          conceptId: link.conceptId,
          masteryScore: update.state.masteryScore,
          stability: update.state.stability,
          difficulty: update.state.difficulty,
          successfulRetrievals: update.state.successfulRetrievals,
          failedRetrievals: update.state.failedRetrievals,
          transferSuccesses: update.state.transferSuccesses,
          lastPracticedAt: now,
          algorithmVersion: update.algorithmVersion,
        },
        update: {
          masteryScore: update.state.masteryScore,
          stability: update.state.stability,
          difficulty: update.state.difficulty,
          successfulRetrievals: update.state.successfulRetrievals,
          failedRetrievals: update.state.failedRetrievals,
          transferSuccesses: update.state.transferSuccesses,
          lastPracticedAt: now,
          algorithmVersion: update.algorithmVersion,
        },
      });

      masteryUpdates.push({
        conceptSlug: link.concept.slug,
        delta: update.delta,
        band: masteryBand(update.state.masteryScore),
        reasons: update.reasons,
      });
    }

    // --- Nächste Wiederholung planen -----------------------------------------
    const existingReview = await tx.reviewQueueItem.findUnique({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
    });

    const primaryConcept = exercise.concepts[0];
    const conceptMastery = primaryConcept
      ? await tx.conceptMastery.findUnique({
          where: { userId_conceptId: { userId, conceptId: primaryConcept.conceptId } },
        })
      : null;

    if (conceptMastery) {
      const schedule = scheduleNextReview({
        mastery: {
          masteryScore: conceptMastery.masteryScore,
          stability: conceptMastery.stability,
          difficulty: conceptMastery.difficulty,
          successfulRetrievals: conceptMastery.successfulRetrievals,
          failedRetrievals: conceptMastery.failedRetrievals,
          transferSuccesses: conceptMastery.transferSuccesses,
        },
        repetition: existingReview?.repetition ?? 0,
        passed: grading.outcome === 'PASSED',
        hintsUsed,
        errorType: grading.errorType,
        confidenceBefore: input.confidenceBefore ?? null,
        now,
      });

      await tx.reviewQueueItem.upsert({
        where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
        create: {
          userId,
          exerciseId: exercise.id,
          dueAt: schedule.dueAt,
          repetition: schedule.repetition,
          reason: schedule.reason,
        },
        update: {
          dueAt: schedule.dueAt,
          repetition: schedule.repetition,
          reason: schedule.reason,
          completedAt: null,
        },
      });

      // Steht die nächste Wiederholung erst nach einer echten Pause an, ist
      // dieser Anlauf beendet und der Hilfestand wird geräumt. Bleibt sie in
      // derselben Lerneinheit, bleiben die Hinweise stehen — sie sind auf dem
      // Bildschirm weiterhin sichtbar und zählen deshalb weiter.
      if (schedule.dueAt > now) await beendeHinweisEpisode(tx, userId, exercise.id);
      episodeBeendet = schedule.dueAt > now;
    }

    // Ohne Konzeptverknüpfung wird nichts eingeplant; eine bestandene Aufgabe
    // beendet den Anlauf trotzdem.
    if (!episodeBeendet && grading.outcome === 'PASSED') {
      await beendeHinweisEpisode(tx, userId, exercise.id);
    }

    return masteryUpdates;
  });

  return {
    outcome: grading.outcome,
    feedback: grading.feedback,
    marks: grading.marks,
    masteryUpdates,
  };
}
