import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { istSqlRunnerVerfuegbar } from '@/server/env';
import { ButtonLink, Callout, Card, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { Wissenslandkarte, type KonzeptZeile } from '@/components/fortschritt/wissenslandkarte';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import { bewerteKonzept, type AufgabenErgebnis } from '@/domain/aufgabe/kompetenz';
import { amErgebnisPruefbar } from '@/domain/aufgabe/ausfuehrung';
import type { Versuchsergebnis } from '@/domain/aufgabe/auswahl';
import { minutenHeute } from '@/server/lernsitzung';
import { formatiereDauer } from '@/domain/lernsitzung';

/** So viele Begriffe sieht, wer noch nichts geübt hat; der Rest liegt hinter einem Aufklapper. */
const ERSTE_BEGRIFFE = 4;

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

  const [lektionen, bearbeiteteAufgaben, abgeschlossen, sandbox, konzepte, heuteMinuten] =
    await Promise.all([
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
                  allowedStatementClasses: true,
                  expectedResultset: true,
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
      minutenHeute(user.id),
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
        amErgebnisPruefbar: amErgebnisPruefbar({
          art,
          erlaubteKlassen: bezug.exercise.allowedStatementClasses,
          hatErwartetesErgebnis: bezug.exercise.expectedResultset !== null,
        }),
      });
    }

    return {
      slug: konzept.slug,
      titel: konzept.title,
      beschreibung: konzept.description,
      kompetenz: bewerteKonzept(ergebnisse, { uebungsserver: runnerBereit }),
    };
  });

  /*
   * Wer noch nichts geübt hat, bekommt nicht alle Begriffe als Wand aus
   * „Noch offen" zu sehen, sondern die nächsten in Lehrplanreihenfolge. Der
   * Rest bleibt eine Zeile weiter erreichbar.
   */
  const nochNichtsGeuebt = landkarte.every(
    (konzept) =>
      konzept.kompetenz.stand === 'ungeuebt' || konzept.kompetenz.stand === 'nicht-beurteilbar',
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">
          Hallo, {user.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-lg text-[var(--text-muted)]">
          {bearbeiteteAufgaben === 0
            ? 'Dein Überblick füllt sich mit der ersten bearbeiteten Aufgabe. Am besten startest du mit Modul 1.'
            : `Du hast bisher ${bearbeiteteAufgaben} ${bearbeiteteAufgaben === 1 ? 'Aufgabe' : 'Aufgaben'} bearbeitet.`}
        </p>
        {bearbeiteteAufgaben === 0 ? (
          <ButtonLink href="/lernen" className="mt-5">
            Mit Modul 1 beginnen
          </ButtonLink>
        ) : null}
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
            action={<ButtonLink href="/lernen">Zum Lernpfad</ButtonLink>}
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
            {/*
             * Die Lernzeit steht neben den anderen Zahlen und nicht als Ziel
             * mit Balken darüber. Sie beantwortet „wie lange war ich dran?" -
             * ein Tagesziel würde daraus eine Vorgabe machen, die man verfehlt.
             */}
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Heute gelernt</p>
              <p className="mt-1 text-3xl font-black tracking-tight">
                {formatiereDauer(heuteMinuten)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Gemessen ab der letzten Aktivität – eine offen liegende Seite zählt nicht mit.
              </p>
            </Card>
          </div>
        )}
      </section>

      {landkarte.length > 0 ? (
        <section aria-labelledby="landkarte">
          <SectionHeading id="landkarte">Was schon sitzt</SectionHeading>
          {nochNichtsGeuebt ? (
            <>
              <p className="text-[0.95rem] text-[var(--text-muted)]">
                Im Kurs lernst du {landkarte.length} Begriffe. Jeder zeigt dir hier in einem Wort,
                wie sicher er sitzt, sobald du Aufgaben dazu bearbeitet hast. Als Erstes sind diese
                dran:
              </p>
              <Wissenslandkarte konzepte={landkarte.slice(0, ERSTE_BEGRIFFE)} />
              {landkarte.length > ERSTE_BEGRIFFE ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-[0.95rem] font-semibold text-[var(--accent)]">
                    Alle weiteren {landkarte.length - ERSTE_BEGRIFFE} Begriffe ansehen
                  </summary>
                  <Wissenslandkarte
                    konzepte={landkarte.slice(ERSTE_BEGRIFFE)}
                    bezeichnung="Weitere Begriffe des Kurses"
                  />
                </details>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-[0.95rem] text-[var(--text-muted)]">
                Jeder Begriff zeigt in einem Wort, wie sicher er sitzt – gestützt auf deine
                bisherigen Aufgaben, ohne Prozente, die genauer klängen, als sie sind.
              </p>
              <Wissenslandkarte konzepte={landkarte} />
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
