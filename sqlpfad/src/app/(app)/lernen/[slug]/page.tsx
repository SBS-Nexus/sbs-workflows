import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { Lektionstext } from '@/components/inhalt/lektionstext';
import { SchemaExplorer } from '@/components/sql/schema-explorer';
import { UEBUNGSDATEN } from '@/content';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { type AufgabenAnsicht } from '@/components/aufgabe/aufgaben-karte';
import { Lektionsverlauf } from '@/components/aufgabe/lektionsverlauf';
import { ladeLektionsstand } from '@/server/lernen/lektionsstand';
import { baueAufgabenAnsicht } from '@/server/lernen/aufgaben-ansicht';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lektion = await prisma.lesson.findUnique({ where: { slug }, select: { title: true } });
  return { title: lektion?.title ?? 'Lektion' };
}

/**
 * Eine Lektion.
 *
 * Links der Erklärtext, rechts die Tabellen – dieselbe Aufteilung wie auf der
 * Werkbank, damit man sich nicht umgewöhnen muss. Die Aufgaben stehen unter
 * dem Text und nicht daneben: Sie kommen nach dem Lesen, nicht daneben.
 *
 * Der Fortschritt wird beim Öffnen auf IN_PROGRESS gesetzt, aber ein bereits
 * abgeschlossener Stand wird **nicht** zurückgesetzt. Wer eine Lektion zum
 * Nachschlagen erneut öffnet, verliert sonst eine Angabe, die er sich verdient
 * hat.
 */
export default async function LektionsSeite({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { slug } = await params;

  const lektion = await prisma.lesson.findUnique({
    where: { slug },
    include: {
      module: { select: { title: true, slug: true } },
      practiceSchema: { select: { slug: true } },
      exercises: { where: { status: 'PUBLISHED' }, orderBy: { order: 'asc' } },
    },
  });

  if (!lektion || lektion.status !== 'PUBLISHED') notFound();

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: lektion.id } },
    create: {
      userId: user.id,
      lessonId: lektion.id,
      state: 'IN_PROGRESS',
      startedAt: new Date(),
    },
    // Kein `state` im Update: Ein COMPLETED bliebe sonst nicht bestehen.
    update: {},
  });

  const datensatz = UEBUNGSDATEN.find((eintrag) => eintrag.slug === lektion.practiceSchema?.slug);
  // Nach dem Anlegen des Fortschritts oben gelesen – sonst fehlte er beim ersten Besuch.
  const stand = await ladeLektionsstand(user.id, lektion.id);
  const lernziele = Array.isArray(lektion.objectives) ? (lektion.objectives as string[]) : [];

  /*
   * Was an den Browser geht - und was ausdrücklich nicht.
   *
   * Die Nutzlast einer Aufgabe enthält neben den Optionen auch `richtig` und
   * `aufloesung`. Beides bleibt auf dem Server; die Ansicht baut
   * `baueAufgabenAnsicht` Feld für Feld, mit der Anzeigereihenfolge der
   * Optionen für diese Person.
   */
  const aufgaben = lektion.exercises.flatMap((aufgabe): AufgabenAnsicht[] => {
    const ansicht = baueAufgabenAnsicht(aufgabe, user.id);
    return ansicht ? [ansicht] : [];
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/lernen"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <Icon name="zurueck" size={16} />
          {lektion.module.title}
        </Link>
        <h1 className="mt-3 text-display-sm font-black leading-tight tracking-[-0.02em]">
          {lektion.title}
        </h1>
        {/*
         * Die Leitfrage steht groß über allem. Sie ist der Grund, warum die
         * Lektion existiert - eine Überschrift allein sagt nur, wie sie heißt.
         */}
        <p className="mt-3 max-w-2xl text-lg text-[var(--text-muted)]">{lektion.leadingQuestion}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          {lernziele.length > 0 ? (
            <Card>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">
                Danach kannst du
              </h2>
              <ul className="mt-3 space-y-1.5">
                {lernziele.map((ziel) => (
                  <li key={ziel} className="flex gap-2.5">
                    <Icon name="haken" size={16} className="mt-1 shrink-0 text-[var(--accent)]" />
                    <span>{ziel}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Lektionstext text={lektion.body} />

          <section aria-labelledby="aufgaben">
            <SectionHeading id="aufgaben">Aufgaben</SectionHeading>
            <Lektionsverlauf aufgaben={aufgaben} datensatz={datensatz} anfangsstand={stand} />
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Zum freien Ausprobieren mit denselben Tabellen gibt es{' '}
              <Link href="/abfrage" className="font-medium text-[var(--accent)] underline">
                Abfrage schreiben
              </Link>
              .
            </p>
          </section>
        </div>

        <div className="min-w-0">
          {datensatz ? (
            <SchemaExplorer datensatz={datensatz} />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Zu dieser Lektion gehört kein Übungsdatensatz.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
