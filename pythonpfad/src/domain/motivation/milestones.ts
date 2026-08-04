/**
 * Meilensteine.
 *
 * Grundregel: Ein Meilenstein steht für eine gewonnene Fähigkeit, nie für
 * aufgewendete Zeit und nie für Regelmäßigkeit. Es gibt deshalb bewusst
 * keinen Meilenstein für „sieben Tage in Folge" – das wäre eine Belohnung
 * für Anwesenheit, und Anwesenheit ist keine Kompetenz. Wer in zwei langen
 * Sitzungen so weit kommt wie jemand anders in zwei Wochen, hat dasselbe
 * gelernt.
 *
 * Zweite Regel: Jeder Meilenstein muss aus den ohnehin erhobenen Daten
 * hervorgehen. Nichts wird zusätzlich gemessen, nur um eine Auszeichnung
 * vergeben zu können.
 *
 * Dritte Regel: Die Beschreibung sagt, was die Person jetzt kann – nicht, wie
 * toll das ist. „Du hast einen Fehler selbst gefunden und behoben" statt
 * „Fehlerjäger, Stufe 1".
 */

export interface MilestoneStats {
  lessonsCompleted: number;
  exercisesPassed: number;
  /** Bestanden im ersten Versuch, ohne Hinweise. */
  exercisesPassedFirstTry: number;
  /** Bestandene Transferaufgaben – der Kernbeleg für übertragbares Verständnis. */
  transferPassed: number;
  /** Konzepte, deren Kompetenzwert die Schwelle für Voraussetzungen erreicht. */
  conceptsAtThreshold: number;
  /** Aufgaben, die nach mindestens einem Fehlversuch ohne Musterlösung gelöst wurden. */
  recoveredWithoutSolution: number;
  /** Abgeschlossene geplante Wiederholungen. */
  reviewsCompleted: number;
  projectsAccepted: number;
  /** Bestandene Aufgaben der höchsten Gerüststufe, also ganz ohne Vorlage. */
  solvedWithoutTemplate: number;
}

export interface MilestoneDefinition {
  key: string;
  label: string;
  /** Was die Person jetzt kann. Ein Satz, ohne Bewertung. */
  description: string;
  /** Was zählt. Wird in der Oberfläche als Fortschritt angezeigt. */
  target: number;
  progress: (stats: MilestoneStats) => number;
}

export const MILESTONES: readonly MilestoneDefinition[] = [
  {
    key: 'erste-lektion',
    label: 'Erste Lektion abgeschlossen',
    description: 'Du hast eine Lektion vollständig bearbeitet, einschließlich aller Aufgaben.',
    target: 1,
    progress: (stats) => stats.lessonsCompleted,
  },
  {
    key: 'erster-eigener-fund',
    label: 'Einen Fehler selbst behoben',
    description:
      'Eine Aufgabe ist beim ersten Versuch schiefgegangen, und du hast sie ohne Musterlösung zum Laufen gebracht.',
    target: 1,
    progress: (stats) => stats.recoveredWithoutSolution,
  },
  {
    key: 'zehn-aufgaben',
    label: 'Zehn Aufgaben gelöst',
    description: 'Genug bearbeitet, dass sich wiederkehrende Muster zu zeigen beginnen.',
    target: 10,
    progress: (stats) => stats.exercisesPassed,
  },
  {
    key: 'ohne-vorlage',
    label: 'Fünfmal ohne Vorlage geschrieben',
    description:
      'Du hast Aufgaben der höchsten Stufe gelöst – ohne Gerüst, ohne Lückentext, von der leeren Zeile aus.',
    target: 5,
    progress: (stats) => stats.solvedWithoutTemplate,
  },
  {
    key: 'erster-transfer',
    label: 'Erste Transferaufgabe bestanden',
    description:
      'Du hast ein Konzept auf eine Aufgabe angewandt, die anders aussah als die zum Üben.',
    target: 1,
    progress: (stats) => stats.transferPassed,
  },
  {
    key: 'zehn-konzepte-gefestigt',
    label: 'Zehn Konzepte gefestigt',
    description:
      'Zehn Bausteine haben den Wert erreicht, ab dem sie als Voraussetzung für Weiteres taugen.',
    target: 10,
    progress: (stats) => stats.conceptsAtThreshold,
  },
  {
    key: 'wiederholungen',
    label: 'Zwanzig Wiederholungen bearbeitet',
    description:
      'Du bist geplanten Wiederholungen nachgegangen – der Teil des Lernens, der langfristig am meisten trägt.',
    target: 20,
    progress: (stats) => stats.reviewsCompleted,
  },
  {
    key: 'erstes-projekt',
    label: 'Erstes Projekt abgenommen',
    description: 'Ein vollständiges kleines Programm, das alle geforderten Punkte erfüllt.',
    target: 1,
    progress: (stats) => stats.projectsAccepted,
  },
  {
    key: 'sicher-im-ersten-anlauf',
    label: 'Fünfundzwanzig Aufgaben im ersten Anlauf',
    description: 'So oft hast du eine Aufgabe gleich beim ersten Versuch und ohne Hinweise gelöst.',
    target: 25,
    progress: (stats) => stats.exercisesPassedFirstTry,
  },
  {
    key: 'alle-projekte',
    label: 'Alle Projekte abgenommen',
    description:
      'Jedes Projekt des Kurses erfüllt seine Anforderungen, einschließlich des Debugging-Labors.',
    target: 4,
    progress: (stats) => stats.projectsAccepted,
  },
];

export interface MilestoneState {
  key: string;
  label: string;
  description: string;
  target: number;
  current: number;
  reached: boolean;
  /** Wann er erreicht wurde, falls bereits vergeben. */
  awardedAt: Date | null;
}

/**
 * Wertet alle Meilensteine aus.
 *
 * `awarded` enthält die bereits vergebenen. Ein einmal erreichter Meilenstein
 * bleibt erreicht, auch wenn der zugrunde liegende Wert später sinkt: Ein
 * Kompetenzwert kann durch Vergessen zurückgehen, aber die Person hat das
 * damals wirklich gekonnt. Etwas wieder wegzunehmen wäre genau die
 * Verlustmechanik, die dieses Produkt nicht haben soll.
 */
export function evaluateMilestones(
  stats: MilestoneStats,
  awarded: ReadonlyMap<string, Date>,
): MilestoneState[] {
  return MILESTONES.map((definition) => {
    const current = Math.max(0, definition.progress(stats));
    const awardedAt = awarded.get(definition.key) ?? null;
    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      target: definition.target,
      current: Math.min(current, definition.target),
      reached: awardedAt !== null || current >= definition.target,
      awardedAt,
    };
  });
}

/**
 * Welche Meilensteine jetzt neu vergeben werden müssen.
 *
 * Getrennt von der Auswertung, damit das Schreiben in die Datenbank an genau
 * einer Stelle passiert und die Auswertung ohne Datenbank prüfbar bleibt.
 */
export function newlyReached(stats: MilestoneStats, awarded: ReadonlyMap<string, Date>): string[] {
  return MILESTONES.filter(
    (definition) => !awarded.has(definition.key) && definition.progress(stats) >= definition.target,
  ).map((definition) => definition.key);
}

/**
 * Der nächste erreichbare Meilenstein.
 *
 * Angezeigt wird immer nur einer: eine Liste offener Ziele erzeugt das Gefühl,
 * etwas abarbeiten zu müssen.
 *
 * Ausgewählt wird zuerst nach dem, was absolut noch fehlt. Bei Gleichstand
 * entscheidet der Anteil des bereits Geschafften. Der Unterschied ist nicht
 * theoretisch: „noch eine von zehn Aufgaben" und „einen Fehler selbst beheben"
 * fehlen beide um eins, aber im ersten Fall sind neun Zehntel des Weges
 * zurückgelegt und im zweiten noch gar nichts. Wer kurz vor einem Abschluss
 * steht, soll genau das angezeigt bekommen.
 */
export function nextMilestone(states: readonly MilestoneState[]): MilestoneState | null {
  const offen = states.filter((state) => !state.reached);
  if (offen.length === 0) return null;

  return offen.reduce((bester, kandidat) => {
    const fehltKandidat = kandidat.target - kandidat.current;
    const fehltBester = bester.target - bester.current;
    if (fehltKandidat !== fehltBester) return fehltKandidat < fehltBester ? kandidat : bester;

    const anteilKandidat = kandidat.current / kandidat.target;
    const anteilBester = bester.current / bester.target;
    if (anteilKandidat !== anteilBester) return anteilKandidat > anteilBester ? kandidat : bester;

    // Immer noch gleich: der näher am Kursanfang stehende. Die Reihenfolge in
    // MILESTONES folgt dem Kursverlauf.
    return bester;
  });
}
