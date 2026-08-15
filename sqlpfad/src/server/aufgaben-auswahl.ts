import { prisma } from '@/server/db/prisma';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import type { Kandidat, Versuchsstand } from '@/domain/aufgabe/auswahl';
import type { AufgabenAnsicht } from '@/components/aufgabe/aufgaben-karte';
import type { UebungsDatensatz } from '@/domain/sql/schema';
import { UEBUNGSDATEN } from '@/content';

/**
 * Aufgaben und Versuchsstand für die Übungs- und Wiederholungsseite laden.
 *
 * Beide Seiten brauchen dasselbe: alle veröffentlichten Aufgaben in der
 * Reihenfolge des Lehrplans und je Aufgabe das **letzte** Ergebnis. Zwei
 * getrennte Ladewege wären zwei Gelegenheiten, unterschiedlich zu filtern – und
 * dann übt jemand auf der einen Seite etwas, das die andere für erledigt hält.
 *
 * Die Auswahl selbst trifft `src/domain/aufgabe/auswahl.ts`. Hier steht nur,
 * was ohne Datenbank nicht geht.
 */

export interface AufgabenVorrat {
  kandidaten: Kandidat[];
  staende: Map<string, Versuchsstand>;
  ansichten: Map<string, AufgabenAnsicht>;
  datensaetze: Map<string, UebungsDatensatz | undefined>;
}

export async function ladeAufgabenVorrat(userId: string): Promise<AufgabenVorrat> {
  const aufgaben = await prisma.exercise.findMany({
    where: { status: 'PUBLISHED', lesson: { status: 'PUBLISHED' } },
    orderBy: [
      { lesson: { module: { order: 'asc' } } },
      { lesson: { order: 'asc' } },
      { order: 'asc' },
    ],
    include: {
      lesson: { select: { slug: true } },
      practiceSchema: { select: { slug: true } },
    },
  });

  /*
   * Nur der jeweils letzte Versuch je Aufgabe.
   *
   * Absteigend sortiert und beim ersten Treffer stehen geblieben - wer
   * stattdessen aufsummiert, hält eine Aufgabe für gekonnt, die vor einem Monat
   * einmal saß und seitdem dreimal misslang.
   */
  const versuche = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { exerciseId: true, result: true, createdAt: true },
  });

  const letzteJeAufgabe = new Map<string, { result: string; createdAt: Date }>();
  for (const versuch of versuche) {
    if (!letzteJeAufgabe.has(versuch.exerciseId)) {
      letzteJeAufgabe.set(versuch.exerciseId, {
        result: versuch.result,
        createdAt: versuch.createdAt,
      });
    }
  }

  const kandidaten: Kandidat[] = [];
  const staende = new Map<string, Versuchsstand>();
  const ansichten = new Map<string, AufgabenAnsicht>();
  const datensaetze = new Map<string, UebungsDatensatz | undefined>();

  for (const aufgabe of aufgaben) {
    const art = ausDatenmodellArt(aufgabe.type);
    if (!art || !aufgabe.lesson) continue;

    kandidaten.push({ aufgabeSlug: aufgabe.slug, lektionSlug: aufgabe.lesson.slug });

    const letzter = letzteJeAufgabe.get(aufgabe.id);
    if (letzter) {
      staende.set(aufgabe.slug, {
        letztesErgebnis: letzter.result as Versuchsstand['letztesErgebnis'],
        zuletztAm: letzter.createdAt,
      });
    }

    // Dieselbe Beschränkung wie auf der Lektionsseite: Die richtige Antwort
    // bleibt auf dem Server, es geht nur, was zur Anzeige gebraucht wird.
    const nutzlast = aufgabe.payload as { optionen?: unknown } | null;
    ansichten.set(aufgabe.slug, {
      slug: aufgabe.slug,
      art,
      titel: aufgabe.title,
      aufgabenstellung: aufgabe.prompt,
      optionen: Array.isArray(nutzlast?.optionen)
        ? nutzlast.optionen.filter((eintrag): eintrag is string => typeof eintrag === 'string')
        : [],
      startSql: aufgabe.starterSql ?? '',
      hinweise: Array.isArray(aufgabe.hints)
        ? aufgabe.hints.filter((eintrag): eintrag is string => typeof eintrag === 'string')
        : [],
      hatLoesung: Boolean(aufgabe.solutionSql ?? aufgabe.solutionNotes),
    });

    datensaetze.set(
      aufgabe.slug,
      UEBUNGSDATEN.find((eintrag) => eintrag.slug === aufgabe.practiceSchema?.slug),
    );
  }

  return { kandidaten, staende, ansichten, datensaetze };
}
