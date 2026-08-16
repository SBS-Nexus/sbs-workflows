import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { istSqlRunnerVerfuegbar } from '@/server/env';
import { Callout, Card, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { Wissenslandkarte, type KonzeptZeile } from '@/components/fortschritt/wissenslandkarte';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import { bewerteKonzept, type AufgabenErgebnis } from '@/domain/aufgabe/kompetenz';
import type { Versuchsergebnis } from '@/domain/aufgabe/auswahl';

export const metadata: Metadata = { title: 'Überblick' };

/**
 * Der Überblick.
 *
 * Solange noch keine Inhalte geseedet sind, sagt diese Seite das – statt
 * Platzhalterzahlen zu zeigen. Eine „0 von 0" mit vollem Fortschrittsbalken
 * ist keine freundliche Geste, sondern eine Falschauskunft.
 *
 * Die Wissenslandkarte wird bei jedem Aufruf aus den Versuchen gerechnet und
 * nicht aus einer gepflegten Kompetenztabelle gelesen. Die Begründung steht im
 * Kopf von `src/domain/aufgabe/kompetenz.ts`: Ein Gedächtnismodell gibt es
 * noch nicht, und Felder dafür mit gerundeten Zahlen zu füllen hieße, sich
 * später auf Werte zu verlassen, die nie gerechnet wurden.
 */
export default async function FortschrittPage(): Promise<React.ReactElement> {
  const user = await requireUser();

  const [lektionen, bearbeiteteAufgaben, abgeschlossen, sandbox, konzepte] = await Promise.all([
    prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
    /*
     * Verschiedene Aufgaben, nicht Versuche.
     *
     * `attempt.count` zählte jeden Anlauf einzeln - wer eine Aufgabe dreimal
     * probiert hat, las „3 Aufgaben bearbeitet". Die Zahl war nicht falsch
     * gerechnet, sondern falsch beschriftet, und das ist schlimmer: Sie sah
     * nach Fortschritt aus, wo jemand festhing.
     */
    prisma.attempt
      .findMany({ where: { userId: user.id }, distinct: ['exerciseId'], select: { id: true } })
      .then((zeilen) => zeilen.length),
    prisma.lessonProgress.count({ where: { userId: user.id, state: 'COMPLETED' } }),
    prisma.sandbox.findFirst({
      where: { userId: user.id },
      select: { state: true, stateReason: true, lastResetAt: true },
    }),
    prisma.concept.findMany({
      orderBy: [{ difficulty: 'asc' }, { title: 'asc' }],
      select: {
        slug: true,
        title: true,
        description: true,
        exercises: {
          select: {
            exercise: {
              select: {
                type: true,
                status: true,
                attempts: {
                  where: { userId: user.id },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: { result: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const runnerBereit = istSqlRunnerVerfuegbar();

  const landkarte: KonzeptZeile[] = konzepte.map((konzept) => {
    const ergebnisse: AufgabenErgebnis[] = [];
    for (const bezug of konzept.exercises) {
      if (bezug.exercise.status !== 'PUBLISHED') continue;
      const art = ausDatenmodellArt(bezug.exercise.type);
      if (!art) continue;
      ergebnisse.push({
        art,
        letztesErgebnis: bezug.exercise.attempts[0]?.result as Versuchsergebnis | undefined,
      });
    }

    return {
      slug: konzept.slug,
      titel: konzept.title,
      beschreibung: konzept.description,
      kompetenz: bewerteKonzept(ergebnisse),
    };
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">
          Hallo, {user.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-lg text-[var(--text-muted)]">
          {bearbeiteteAufgaben === 0
            ? 'Hier siehst du künftig, wo du stehst und was als Nächstes dran ist.'
            : `Du hast bisher ${bearbeiteteAufgaben} ${bearbeiteteAufgaben === 1 ? 'Aufgabe' : 'Aufgaben'} bearbeitet.`}
        </p>
      </div>

      {/* Zustand der Ausführung – ehrlich, auch wenn er unbequem ist. */}
      {!runnerBereit ? (
        <Callout tone="caution" title="Abfragen ausführen ist gerade nicht möglich">
          Die Übungsumgebung ist auf dieser Installation noch nicht eingeschaltet. Lektionen,
          Erklärungen und Aufgaben zur Ergebnisvorhersage funktionieren; eigene Abfragen auszuführen
          geht erst, wenn der Übungsserver bereitsteht. Es gibt bewusst keinen Ersatzweg, der so
          tut, als liefe deine Abfrage.
        </Callout>
      ) : sandbox?.state === 'FAILED' ? (
        <Callout tone="alert" title="Deine Übungsdatenbank konnte nicht bereitgestellt werden">
          {sandbox.stateReason ?? 'Der Grund ist nicht bekannt.'}
        </Callout>
      ) : null}

      <section aria-labelledby="stand">
        <SectionHeading id="stand">Wo du stehst</SectionHeading>
        {lektionen === 0 ? (
          <EmptyState
            title="Noch keine Lektionen eingespielt"
            description="Auf dieser Installation sind noch keine Inhalte vorhanden. Sobald sie eingespielt sind, steht hier dein Lernpfad."
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Lektionen im Kurs</p>
              <p className="mt-1 text-3xl font-black tracking-tight">{lektionen}</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Davon bearbeitet</p>
              <p className="mt-1 text-3xl font-black tracking-tight">{abgeschlossen}</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Bearbeitete Aufgaben</p>
              <p className="mt-1 text-3xl font-black tracking-tight">{bearbeiteteAufgaben}</p>
            </Card>
          </div>
        )}
      </section>

      {landkarte.length > 0 ? (
        <section aria-labelledby="landkarte">
          <SectionHeading id="landkarte">Was schon sitzt</SectionHeading>
          <p className="text-[0.95rem] text-[var(--text-muted)]">
            Ein Wort je Begriff und die Zahlen dahinter – keine Prozente. Was hier vorliegt, sind
            ein paar Aufgabenergebnisse; &bdquo;73 % JOIN&ldquo; wäre eine Genauigkeit, die es nicht
            gibt.
          </p>
          <Wissenslandkarte konzepte={landkarte} />
        </section>
      ) : null}
    </div>
  );
}
