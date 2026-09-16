import 'server-only';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { placementQuestions } from '@/content/placement';
import {
  antwortFehler,
  evaluatePlacement,
  oeffentlicheFragen,
  pfadBegruendung,
  placementQuestionSchema,
  type OeffentlicheFrage,
  type PlacementBand,
  type PlacementResult,
} from '@/domain/placement/placement';

/**
 * Dienst für Onboarding und Einstufung.
 *
 * Die Einstufung markiert Konzepte nur als "wahrscheinlich bekannt" — sie
 * werden dadurch nie übersprungen, nur als kurze Auffrischung gekennzeichnet
 * (siehe docs/LERNMODELL.md §4). Diese Ausbaustufe speichert Punktzahl und
 * Band am Konto; eine feinere Markierung je Lektion ist ein dokumentierter
 * nächster Schritt.
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

export interface OnboardingErgebnis {
  /** `null`, wenn die Einstufung übersprungen wurde. */
  platzierung: PlacementResult | null;
  /** Erklärungen zu den Fragen — erst nach Abschluss, nie vorher. */
  erklaerungen: { questionId: string; question: string; explanation: string; richtig: boolean }[];
}

/**
 * Schließt das Onboarding ab: Einstellungen, Einstufung und Lernpfad in
 * EINEM Schritt.
 *
 * Bis hierher wurde nichts gespeichert. Damit gibt es keinen Zwischenstand,
 * in dem `placementCompleted` gesetzt ist, die Punktzahl aber fehlt, oder
 * `onboardingCompleted` steht, ohne dass ein Pfad existiert — die Zustände,
 * die einen Lernenden sonst zwischen zwei Seiten stranden lassen.
 *
 * Ein erneuter Aufruf ist unbedenklich: Er schreibt denselben Endzustand.
 * Wer das Onboarding bereits abgeschlossen hat, verliert seine Einstufung
 * nicht — dieser Fall wird vorher abgewiesen.
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
    await tx.user.update({
      where: { id: userId },
      data: {
        ...einstellungen,
        onboardingCompleted: true,
        placementCompleted: true,
        placementScore: ergebnis ? ergebnis.score : null,
      },
    });

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

  return {
    platzierung: ergebnis,
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
