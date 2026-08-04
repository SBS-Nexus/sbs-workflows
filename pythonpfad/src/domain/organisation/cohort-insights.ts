import { MIN_COHORT_SIZE_FOR_AGGREGATES, mayShowAggregates } from './permissions';

/**
 * Auswertung einer Kohorte.
 *
 * Zweck: einer Lehrkraft zeigen, wo die Gruppe steht und woran sie hängt –
 * damit der nächste Unterricht dort ansetzt. Ausdrücklich nicht: einzelne
 * Personen bewerten oder vergleichen.
 *
 * Zwei Vorkehrungen setzen das durch:
 *  1. Unterhalb einer Mindestgröße wird gar nichts ausgewiesen. Ein
 *     Durchschnitt aus zwei Werten ist kein Summenwert.
 *  2. Die Auswertung nennt nie eine Person. Auch „eine Person hängt bei
 *     Schleifen" wäre in einer kleinen Gruppe eine Identifizierung, deshalb
 *     werden Anteile und keine Einzelzahlen ausgegeben, sobald es eng wird.
 */

export interface LearnerSnapshot {
  /** Nur zur Zuordnung innerhalb der Berechnung, wird nie ausgegeben. */
  userId: string;
  lessonsCompleted: number;
  exercisesPassed: number;
  /** Kompetenzwerte je Konzept-Slug, 0–100. */
  masteryByConcept: Readonly<Record<string, number>>;
  /** Wann zuletzt etwas bearbeitet wurde. */
  lastActiveAt: Date | null;
}

export interface ConceptDifficulty {
  slug: string;
  name: string;
  /** Anteil der Kohorte, der hier unter der Schwelle liegt, 0–1. */
  strugglingShare: number;
  /** Wie viele der Kohorte das Konzept überhaupt begonnen haben. */
  startedShare: number;
}

export interface CohortInsights {
  memberCount: number;
  /** Wie viele ihre Einwilligung zur namentlichen Ansicht gegeben haben. */
  consentedCount: number;
  /** Erst ab der Mindestgröße gefüllt. */
  aggregates: {
    lessonsCompletedMedian: number;
    exercisesPassedMedian: number;
    /** Anteil, der in den letzten sieben Tagen etwas bearbeitet hat, 0–1. */
    activeShareLast7Days: number;
  } | null;
  /** Höchstens fünf Konzepte, bei denen die Gruppe am ehesten hängt. */
  hardestConcepts: ConceptDifficulty[];
  /** Was der Lehrkraft aus den Zahlen zu raten ist – in ganzen Sätzen. */
  guidance: string;
}

/** Ab diesem Kompetenzwert gilt ein Konzept als tragfähig. Wie im Kompetenzmodell. */
const THRESHOLD = 70;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sortiert = [...values].sort((a, b) => a - b);
  const mitte = Math.floor(sortiert.length / 2);
  if (sortiert.length % 2 === 1) return sortiert[mitte] ?? 0;
  return Math.round((((sortiert[mitte - 1] ?? 0) + (sortiert[mitte] ?? 0)) / 2) * 10) / 10;
}

/**
 * Warum der Median und nicht der Durchschnitt: Eine einzelne sehr aktive
 * Person hebt den Durchschnitt so weit an, dass er die Gruppe nicht mehr
 * beschreibt. Der Median sagt, wo die Mitte steht – und genau das ist die
 * Frage, wenn der nächste Unterricht geplant wird.
 */
export function buildCohortInsights(
  learners: readonly LearnerSnapshot[],
  consentedCount: number,
  conceptNames: ReadonlyMap<string, string>,
  now: Date = new Date(),
): CohortInsights {
  const memberCount = learners.length;

  if (!mayShowAggregates(memberCount)) {
    return {
      memberCount,
      consentedCount,
      aggregates: null,
      hardestConcepts: [],
      guidance:
        `Für eine Auswertung braucht es mindestens ${MIN_COHORT_SIZE_FOR_AGGREGATES} Mitglieder. ` +
        'Bei weniger wären die Zahlen keine Summenwerte mehr, sondern Aussagen über einzelne Menschen.',
    };
  }

  const siebenTage = new Date(now);
  siebenTage.setDate(siebenTage.getDate() - 7);

  const aktive = learners.filter(
    (learner) => learner.lastActiveAt !== null && learner.lastActiveAt >= siebenTage,
  ).length;

  // Schwierigkeit je Konzept: Anteil derer, die es begonnen haben und dabei
  // unter der Schwelle liegen. Wer es nie begonnen hat, hängt nicht daran –
  // er ist nur noch nicht dort.
  const proKonzept = new Map<string, { begonnen: number; unterSchwelle: number }>();
  for (const learner of learners) {
    for (const [slug, score] of Object.entries(learner.masteryByConcept)) {
      const eintrag = proKonzept.get(slug) ?? { begonnen: 0, unterSchwelle: 0 };
      eintrag.begonnen += 1;
      if (score < THRESHOLD) eintrag.unterSchwelle += 1;
      proKonzept.set(slug, eintrag);
    }
  }

  const hardestConcepts: ConceptDifficulty[] = [...proKonzept.entries()]
    .map(([slug, zahlen]) => ({
      slug,
      name: conceptNames.get(slug) ?? slug,
      strugglingShare: zahlen.begonnen === 0 ? 0 : zahlen.unterSchwelle / zahlen.begonnen,
      startedShare: zahlen.begonnen / memberCount,
    }))
    // Nur Konzepte, die ein nennenswerter Teil der Gruppe überhaupt erreicht
    // hat. Sonst steht ganz oben, was genau eine Person angefangen hat.
    .filter((eintrag) => eintrag.startedShare >= 0.5 && eintrag.strugglingShare > 0)
    .sort((a, b) => {
      if (b.strugglingShare !== a.strugglingShare) return b.strugglingShare - a.strugglingShare;
      return a.name.localeCompare(b.name, 'de');
    })
    .slice(0, 5);

  return {
    memberCount,
    consentedCount,
    aggregates: {
      lessonsCompletedMedian: median(learners.map((learner) => learner.lessonsCompleted)),
      exercisesPassedMedian: median(learners.map((learner) => learner.exercisesPassed)),
      activeShareLast7Days: aktive / memberCount,
    },
    hardestConcepts,
    guidance: buildGuidance(hardestConcepts, aktive / memberCount),
  };
}

/**
 * Empfehlung an die Lehrkraft.
 *
 * Sagt, was zu tun ist, und bewertet weder die Gruppe noch die Lehrkraft. Eine
 * geringe Aktivität wird als Beobachtung benannt und nicht als Versäumnis.
 */
function buildGuidance(hardest: readonly ConceptDifficulty[], activeShare: number): string {
  const teile: string[] = [];

  const spitze = hardest[0];
  if (spitze && spitze.strugglingShare >= 0.5) {
    teile.push(
      `Bei „${spitze.name}" liegen ${Math.round(spitze.strugglingShare * 100)} Prozent derer, die es begonnen haben, noch unter der tragfähigen Schwelle. Das ist der Punkt, an dem eine gemeinsame Erklärung am meisten bringt.`,
    );
  } else if (spitze) {
    teile.push(`Die Gruppe kommt breit voran. Am ehesten hakt es noch bei „${spitze.name}".`);
  } else {
    teile.push('Es gibt zurzeit kein Konzept, an dem die Gruppe erkennbar hängt.');
  }

  if (activeShare < 0.5) {
    teile.push(
      `In den letzten sieben Tagen war ${Math.round(activeShare * 100)} Prozent der Kohorte aktiv. Ob das passt, hängt vom vereinbarten Rhythmus ab.`,
    );
  }

  return teile.join(' ');
}
