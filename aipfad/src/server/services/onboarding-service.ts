import 'server-only';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { placementQuestions } from '@/content/placement';
import {
  antwortFehler,
  evaluatePlacement,
  oeffentlichesErgebnis,
  oeffentlicheFragen,
  pfadBegruendung,
  placementQuestionSchema,
  type OeffentlicheFrage,
  type PlacementBand,
  type PlacementResult,
  type OeffentlichesPlacementErgebnis,
} from '@/domain/placement/placement';

/**
 * Dienst für Onboarding und Einstufung.
 *
 * Die Einstufung ändert nichts am Umfang des Pfads (siehe
 * docs/LERNMODELL.md §4): Er enthält für jedes Band dieselben Lektionen,
 * verschieden ist allein der Begründungstext. Konzepte werden derzeit
 * NICHT je Lektion markiert — `evaluatePlacement()` berechnet zwar
 * `demonstratedConceptSlugs`, aber niemand speichert sie; das bleibt ein
 * nächster Schritt.
 *
 * Gespeichert wird allein die Punktzahl, damit es keine zweite Spalte gibt,
 * die vom Band abweichen könnte. `bandZuPunktzahl()` kann sie jederzeit
 * wieder einordnen — bisher tut das im laufenden Betrieb allerdings
 * niemand: Die Punktzahl wird geschrieben und noch nirgends gelesen.
 *
 * Bewertet wird ausschließlich hier. Der Browser schickt Kennungen von
 * Fragen und Optionen, niemals eine Punktzahl — eine mitgeschickte Zahl gäbe
 * es zu manipulieren.
 */

/** Die maßgeblichen Fragen, einmal geprüft. */
const FRAGEN = placementQuestions.map((frage) => placementQuestionSchema.parse(frage));

/** Was die Maske anzeigen darf: ohne Lösung, mit "Weiß ich nicht". */
export function placementFragenFuerBrowser(): OeffentlicheFrage[] {
  return oeffentlicheFragen(FRAGEN);
}

export const onboardingSchema = z.object({
  learningGoal: z.enum(['GENERAL', 'DEVELOPER', 'PRODUCT_ROLE', 'GOVERNANCE_ROLE', 'LEADERSHIP']),
  experience: z.enum(['NONE', 'USED_CHATBOTS', 'TECHNICAL_BACKGROUND', 'AI_PRACTITIONER']),
  dailyTimeBudget: z.coerce.number().int().min(5).max(240),
  pace: z.enum(['RELAXED', 'STEADY', 'FOCUSED']),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/**
 * Die Einstufung ist freiwillig (docs/LERNMODELL.md §4). Beide Wege führen
 * zum selben Abschluss.
 */
export const platzierungSchema = z.discriminatedUnion('art', [
  z.object({ art: z.literal('uebersprungen') }),
  z.object({
    art: z.literal('beantwortet'),
    antworten: z
      .array(z.object({ questionId: z.string().min(1), optionId: z.string().min(1) }))
      .min(1)
      .max(FRAGEN.length),
  }),
]);

export type PlatzierungEingabe = z.infer<typeof platzierungSchema>;

/**
 * Was nach dem Abschluss in den Browser geht — und sonst nichts.
 *
 * Bewusst nicht `PlacementResult`: Das vollständige Ergebnis trägt `band`,
 * `byArea`, `demonstratedConceptSlugs` und `version` mit sich, und über eine
 * Serveraktion landet jedes Feld eines zurückgegebenen Objekts im Browser,
 * auch wenn die Anzeige es nie liest. Hier steht deshalb aufgezählt, was
 * hinausgeht; jedes weitere Feld muss jemand ausdrücklich hinzufügen.
 *
 * Die Erklärungen sind Absicht, kein Versehen: VOR dem Absenden verlässt
 * keine den Server (siehe `oeffentlicheFragen()`), NACH dem Abschluss sind
 * sie die Rückmeldung, für die Lernende die Fragen beantwortet haben.
 */
export interface OnboardingErgebnis {
  /** `null`, wenn die Einstufung übersprungen wurde. */
  platzierung: OeffentlichesPlacementErgebnis | null;
  /** Erklärungen zu den Fragen — erst nach Abschluss, nie vorher. */
  erklaerungen: { questionId: string; question: string; explanation: string; richtig: boolean }[];
}

/**
 * Schließt das Onboarding ab: Einstellungen, Einstufung und Lernpfad in
 * EINEM Schritt.
 *
 * Bis hierher wurde nichts gespeichert. Damit gibt es keinen Zwischenstand,
 * in dem `onboardingCompleted` steht, ohne dass ein Pfad existiert — der
 * Zustand, der einen Lernenden sonst zwischen zwei Seiten stranden ließe.
 * (`placementCompleted` OHNE Punktzahl ist dagegen ein gültiger Endzustand:
 * Er heißt "bewusst übersprungen".)
 *
 * Ein zweiter Aufruf wird hier abgewiesen, nicht nur in der Aktion davor.
 * Sonst überschriebe ein späterer Aufruf mit `uebersprungen` eine vorhandene
 * Punktzahl mit `null` — die Einstufung wäre stillschweigend weg, und der
 * Schutz hinge daran, dass jeder künftige Aufrufer daran denkt.
 */
export async function finalisiereOnboarding(
  userId: string,
  einstellungen: OnboardingInput,
  platzierung: PlatzierungEingabe,
): Promise<OnboardingErgebnis> {
  let ergebnis: PlacementResult | null = null;

  if (platzierung.art === 'beantwortet') {
    // Jede Antwort gegen die maßgeblichen Fragen prüfen, bevor irgendetwas
    // gespeichert wird. Eine erfundene Kennung ist ein Fehler, keine falsche
    // Antwort.
    for (const antwort of platzierung.antworten) {
      const fehler = antwortFehler(FRAGEN, antwort);
      if (fehler) throw new PlatzierungUngueltig(fehler);
    }
    const doppelte = platzierung.antworten.map((a) => a.questionId);
    if (new Set(doppelte).size !== doppelte.length) {
      throw new PlatzierungUngueltig('Zu einer Frage liegen mehrere Antworten vor.');
    }
    ergebnis = evaluatePlacement(FRAGEN, platzierung.antworten);
  }

  const band: PlacementBand | null = ergebnis ? ergebnis.band : null;

  await prisma.$transaction(async (tx) => {
    // Erst prüfen, ob es das Konto überhaupt gibt: Sonst wäre ein
    // unbekanntes Konto von einem bereits abgeschlossenen nicht zu
    // unterscheiden — beide schrieben null Zeilen.
    await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true } });

    // Die Sperre steckt in der Bedingung des Schreibvorgangs, nicht in einem
    // Lesen davor. Ein `SELECT` und danach ein `UPDATE` wäre hier zu wenig:
    // PostgreSQL arbeitet standardmäßig mit READ COMMITTED, ein einfaches
    // Lesen sperrt keine Zeile, und der wartende Schreibvorgang prüft seine
    // Bedingung nach dem Freiwerden erneut — `where: { id }` passt dann
    // weiterhin. Zwei gleichzeitige Abschlüsse kämen beide durch, und der
    // zweite setzte eine gerade gespeicherte Punktzahl wieder auf null.
    // Nachgestellt gegen eine echte Datenbank, bevor das hier stand.
    //
    // Mit `onboardingCompleted: false` in der Bedingung prüft genau dieser
    // erneute Durchlauf die Sperre mit: Der zweite Schreibvorgang trifft
    // keine Zeile mehr und meldet 0.
    //
    // Das gilt, solange die Bedingung unmittelbar in der WHERE-Klausel des
    // UPDATE landet. Stünde sie in einer Unterabfrage, prüfte der erneute
    // Durchlauf sie gegen die alte Momentaufnahme und der Verlust käme
    // zurück. Der Integrationstest zu zwei gleichzeitigen Abschlüssen hält
    // das fest — er ist die Sicherung für den Tag, an dem Prisma sein SQL
    // ändert.
    const { count } = await tx.user.updateMany({
      where: { id: userId, onboardingCompleted: false },
      data: {
        ...einstellungen,
        onboardingCompleted: true,
        placementCompleted: true,
        placementScore: ergebnis ? ergebnis.score : null,
      },
    });
    if (count === 0) {
      throw new OnboardingBereitsAbgeschlossen();
    }

    // Der Pfad gehört in denselben Schritt: Sonst stünde das Onboarding auf
    // "fertig", während der Pfad noch fehlt.
    const vorhanden = await tx.learningPath.findFirst({ where: { userId } });
    if (vorhanden) {
      await tx.learningPath.update({
        where: { id: vorhanden.id },
        data: { rationale: pfadBegruendung(band) },
      });
      await tx.user.update({ where: { id: userId }, data: { currentPathId: vorhanden.id } });
      return;
    }

    const course = await tx.course.findFirst({
      where: { status: 'PUBLISHED' },
      include: {
        modules: {
          where: { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          include: { lessons: { where: { status: 'PUBLISHED' }, orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!course) {
      throw new Error('Kein veröffentlichter Kurs vorhanden — wurde die Datenbank geseedet?');
    }

    const pfad = await tx.learningPath.create({
      data: {
        userId,
        courseId: course.id,
        title: course.title,
        lessonSlugs: course.modules.flatMap((mod) => mod.lessons.map((lesson) => lesson.slug)),
        rationale: pfadBegruendung(band),
      },
    });
    await tx.user.update({ where: { id: userId }, data: { currentPathId: pfad.id } });
  });

  // Das vollständige Ergebnis bleibt hier: Es hat oben das Band und den
  // Begründungstext bestimmt und die Punktzahl geliefert. Hinaus geht nur
  // die Projektion.
  return {
    platzierung: ergebnis === null ? null : oeffentlichesErgebnis(ergebnis),
    erklaerungen:
      platzierung.art === 'beantwortet'
        ? FRAGEN.map((frage) => ({
            questionId: frage.id,
            question: frage.question,
            explanation: frage.explanation,
            richtig:
              platzierung.antworten.find((a) => a.questionId === frage.id)?.optionId ===
              frage.correctOptionId,
          }))
        : [],
  };
}

/** Eine Antwort, die es so nicht geben kann. */
export class PlatzierungUngueltig extends Error {}

/**
 * Das Onboarding lief schon einmal durch.
 *
 * Kein Fehler des Aufrufers, sondern ein zweiter Anlauf — nacheinander oder
 * gleichzeitig. Die Aktion fängt das ab und leitet auf den Pfad weiter,
 * statt eine Fehlermeldung zu zeigen.
 */
export class OnboardingBereitsAbgeschlossen extends Error {}
