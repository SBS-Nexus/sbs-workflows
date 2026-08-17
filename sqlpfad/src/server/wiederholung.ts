import { prisma } from '@/server/db/prisma';
import {
  FRISCH,
  VERFAHREN,
  guete,
  plane,
  type Gedaechtnisstand,
  type Versuchsergebnis,
} from '@/domain/wiederholung/sm2';

/**
 * Die Wiederholungsplanung an die Datenbank anschließen.
 *
 * Die Rechnung selbst steht in `src/domain/wiederholung/sm2.ts` und kennt
 * weder Prisma noch Sitzung. Hier liegt nur, was ohne Datenbank nicht geht:
 * den gespeicherten Stand holen, rechnen lassen, das Ergebnis zurückschreiben.
 *
 * ## Geplant wird je Konzept, nicht je Aufgabe
 *
 * Vergessen wird ein Konzept, nicht eine Aufgabennummer. Wer „LEFT JOIN"
 * verstanden hat, hat es für alle Aufgaben verstanden, die darauf zielen –
 * und wer es vergisst, vergisst es für alle. Eine Planung je Aufgabe würde
 * dieselbe Erinnerung fünfmal getrennt verwalten und fünfmal getrennt
 * abfragen; das wäre mehr Wiederholung derselben Sache, nicht mehr Wissen.
 *
 * Deshalb zahlt ein Versuch auf **alle** Konzepte der Aufgabe ein.
 * `ExerciseConcept.weight` wird dabei ausdrücklich **nicht** ausgewertet:
 * SM-2 kennt keine Gewichte, und eines einzuführen hieße, das Verfahren um
 * eine Zutat zu erweitern, für die es keine Begründung gibt.
 *
 * ## `ReviewQueueItem` bleibt leer
 *
 * Das Datenmodell hat eine Tabelle für eine ausmaterialisierte Warteschlange.
 * Sie wird nicht gefüllt. Ein zweites Verzeichnis der Fälligkeiten neben
 * `ConceptMastery.nextReviewAt` wäre eine zweite Liste derselben Wahrheit –
 * und die zweite ist irgendwann die falsche. Die fällige Menge wird bei jedem
 * Aufruf aus dem Termin abgeleitet; das ist ein Index-Scan über
 * `[userId, nextReviewAt]` und keine Sparmaßnahme wert.
 */

/**
 * Einen Versuch in die Planung aufnehmen.
 *
 * Wird nur für Versuche aufgerufen, zu denen es ein **Urteil** gibt. Eine
 * Freitextantwort ohne maschinelles Urteil erzeugt keinen Versuch und darf
 * deshalb auch keinen Termin verschieben – sonst verschöbe sich der Termin
 * aufgrund von etwas, das niemand geprüft hat.
 */
export async function planeWiederholung(
  userId: string,
  exerciseId: string,
  ergebnis: Versuchsergebnis,
  hinweiseGenutzt: number,
  jetzt: Date = new Date(),
): Promise<void> {
  const zuordnungen = await prisma.exerciseConcept.findMany({
    where: { exerciseId },
    select: { conceptId: true },
  });
  if (zuordnungen.length === 0) return;

  const conceptIds = zuordnungen.map((zuordnung) => zuordnung.conceptId);
  const bewertung = guete(ergebnis, hinweiseGenutzt);

  const vorhandene = await prisma.conceptMastery.findMany({
    where: { userId, conceptId: { in: conceptIds } },
  });
  const nachKonzept = new Map(vorhandene.map((zeile) => [zeile.conceptId, zeile]));

  for (const conceptId of conceptIds) {
    const zeile = nachKonzept.get(conceptId);

    const vorher: Gedaechtnisstand = zeile
      ? {
          wiederholungen: zeile.repetitions,
          intervallTage: zeile.stability,
          leichtigkeit: zeile.difficulty,
        }
      : FRISCH;

    const planung = plane(vorher, bewertung, jetzt);

    const felder = {
      repetitions: planung.stand.wiederholungen,
      stability: planung.stand.intervallTage,
      difficulty: planung.stand.leichtigkeit,
      lastPracticedAt: jetzt,
      nextReviewAt: planung.faelligAm,
      algorithmVersion: VERFAHREN,
    };

    await prisma.conceptMastery.upsert({
      where: { userId_conceptId: { userId, conceptId } },
      create: {
        userId,
        conceptId,
        ...felder,
        successfulRetrievals: planung.gelungen ? 1 : 0,
        failedRetrievals: planung.gelungen ? 0 : 1,
      },
      update: {
        ...felder,
        // Lebenszähler, nicht SM-2s `n`: Sie werden nie zurückgesetzt und
        // beantworten die Frage „wie oft insgesamt", nicht „wie oft in Folge".
        successfulRetrievals: { increment: planung.gelungen ? 1 : 0 },
        failedRetrievals: { increment: planung.gelungen ? 0 : 1 },
      },
    });
  }
}

export interface FaelligesKonzept {
  conceptId: string;
  slug: string;
  titel: string;
  faelligSeit: Date;
  /** Wie oft dieses Konzept schon gelungen ist – für die Einordnung im Text. */
  gelungen: number;
}

/**
 * Welche Konzepte jetzt anstehen – das am längsten Überfällige zuerst.
 *
 * Konzepte ohne Termin kommen hier **nicht** vor. Wer eine Aufgabe noch nie
 * bearbeitet hat, hat nichts zu wiederholen; das gehört auf die Übungsseite.
 */
export async function ladeFaelligeKonzepte(
  userId: string,
  jetzt: Date = new Date(),
  hoechstens = 20,
): Promise<FaelligesKonzept[]> {
  const zeilen = await prisma.conceptMastery.findMany({
    where: { userId, nextReviewAt: { not: null, lte: jetzt } },
    orderBy: { nextReviewAt: 'asc' },
    take: hoechstens,
    select: {
      conceptId: true,
      nextReviewAt: true,
      successfulRetrievals: true,
      concept: { select: { slug: true, title: true } },
    },
  });

  return zeilen.flatMap((zeile) =>
    zeile.nextReviewAt
      ? [
          {
            conceptId: zeile.conceptId,
            slug: zeile.concept.slug,
            titel: zeile.concept.title,
            faelligSeit: zeile.nextReviewAt,
            gelungen: zeile.successfulRetrievals,
          },
        ]
      : [],
  );
}

/**
 * Der nächste Termin, der noch aussteht – für den Satz „als Nächstes am …".
 *
 * Gibt `null` zurück, wenn nichts geplant ist. Das ist der Normalfall am
 * Anfang und wird von der Oberfläche auch so behandelt: kein Rückstand,
 * sondern schlicht noch nichts vorhanden.
 */
export async function naechsterTermin(
  userId: string,
  jetzt: Date = new Date(),
): Promise<Date | null> {
  const zeile = await prisma.conceptMastery.findFirst({
    where: { userId, nextReviewAt: { gt: jetzt } },
    orderBy: { nextReviewAt: 'asc' },
    select: { nextReviewAt: true },
  });
  return zeile?.nextReviewAt ?? null;
}

/**
 * Zu den fälligen Konzepten die Aufgaben finden, an denen sie sich prüfen
 * lassen.
 *
 * Je Konzept **eine** Aufgabe: Die Wiederholungsseite soll die Konzepte
 * abdecken, nicht die Aufgabenliste erschöpfen. Gewählt wird die am längsten
 * nicht bearbeitete – wer dasselbe Beispiel zum dritten Mal sieht, erinnert
 * sich an das Beispiel und nicht an das Konzept.
 */
export async function waehleAufgabenZuKonzepten(
  userId: string,
  conceptIds: readonly string[],
): Promise<Map<string, string>> {
  if (conceptIds.length === 0) return new Map();

  const zuordnungen = await prisma.exerciseConcept.findMany({
    where: {
      conceptId: { in: [...conceptIds] },
      exercise: { status: 'PUBLISHED', lesson: { status: 'PUBLISHED' } },
    },
    select: {
      conceptId: true,
      exercise: {
        select: {
          slug: true,
          order: true,
          attempts: {
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
  });

  const jeKonzept = new Map<string, { slug: string; zuletzt: number; order: number }>();

  for (const zuordnung of zuordnungen) {
    const zuletzt = zuordnung.exercise.attempts[0]?.createdAt.getTime() ?? 0;
    const kandidat = { slug: zuordnung.exercise.slug, zuletzt, order: zuordnung.exercise.order };
    const bisher = jeKonzept.get(zuordnung.conceptId);

    // Älter schlägt jünger; bei gleichem Stand entscheidet die Reihenfolge im
    // Lehrplan, damit die Auswahl ohne Zufall auskommt und prüfbar bleibt.
    if (
      !bisher ||
      kandidat.zuletzt < bisher.zuletzt ||
      (kandidat.zuletzt === bisher.zuletzt && kandidat.order < bisher.order)
    ) {
      jeKonzept.set(zuordnung.conceptId, kandidat);
    }
  }

  return new Map([...jeKonzept].map(([conceptId, wahl]) => [conceptId, wahl.slug]));
}
