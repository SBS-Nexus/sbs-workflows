import type { Metadata } from 'next';
import { requireAdmin } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { LEHRPLAN } from '@/content';
import { pruefeLehrplan } from '@/content/validator';
import { Badge, Callout, Card, SectionHeading } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Redaktion' };

/**
 * Redaktionsbereich – nur für ADMIN.
 *
 * ## Wofür er da ist
 *
 * Inhalte werden als versionierte Dateien unter `src/content` gepflegt und über
 * den Seed in die Datenbank gespielt. Damit gibt es zwei Stände derselben
 * Sache, und die Frage, die diese Seite beantwortet, ist genau die eine, die
 * sich sonst niemand stellt: **Stimmen sie noch überein?**
 *
 * Ein Lehrplan, der in den Dateien eine Aufgabe mehr hat als in der Datenbank,
 * sieht in der Anwendung völlig unauffällig aus – die Aufgabe fehlt eben. Wer
 * sie sucht, sucht sie im Inhaltsverzeichnis und nicht im Seed-Protokoll.
 *
 * ## Was hier bewusst nicht steht
 *
 * **Keine personenbezogenen Daten.** Es gibt Zählungen, aber keine Namen, keine
 * Adressen, keine Versuchsverläufe einzelner Lernender. Ein Adminbereich, der
 * beim Öffnen zeigt, wer was wann falsch gemacht hat, macht aus einer
 * Lernplattform eine Überwachungsanlage – und niemand braucht das, um zu
 * erkennen, ob eine Lektion schlecht geschrieben ist.
 *
 * **Kein Bearbeiten.** Inhalte werden im Repository geändert, nicht hier. Eine
 * Änderung über die Oberfläche hätte keinen Verlauf, keine Begründung und
 * keinen Weg zurück – und beim nächsten Seed wäre sie wieder weg.
 */
export default async function AdminSeite(): Promise<React.ReactElement> {
  await requireAdmin();

  const befunde = pruefeLehrplan(LEHRPLAN);

  const [module, projekte, konzepteInDb, konten, versuche] = await Promise.all([
    prisma.courseModule.findMany({
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { exercises: true } } },
        },
      },
    }),
    prisma.project.findMany({ orderBy: { order: 'asc' } }),
    prisma.concept.count(),
    prisma.user.count(),
    prisma.attempt.count(),
  ]);

  // --- Abgleich Dateien gegen Datenbank ------------------------------------

  const ausDateien = {
    module: LEHRPLAN.module.length,
    lektionen: LEHRPLAN.module.reduce((summe, modul) => summe + modul.lektionen.length, 0),
    aufgaben: LEHRPLAN.module.reduce(
      (summe, modul) =>
        summe + modul.lektionen.reduce((zahl, lektion) => zahl + lektion.aufgaben.length, 0),
      0,
    ),
    konzepte: LEHRPLAN.konzepte.length,
    projekte: LEHRPLAN.projekte.length,
  };

  const ausDatenbank = {
    module: module.length,
    lektionen: module.reduce((summe, modul) => summe + modul.lessons.length, 0),
    aufgaben: module.reduce(
      (summe, modul) =>
        summe + modul.lessons.reduce((zahl, lektion) => zahl + lektion._count.exercises, 0),
      0,
    ),
    konzepte: konzepteInDb,
    projekte: projekte.length,
  };

  const abgleich = (
    [
      ['Module', ausDateien.module, ausDatenbank.module],
      ['Lektionen', ausDateien.lektionen, ausDatenbank.lektionen],
      ['Aufgaben', ausDateien.aufgaben, ausDatenbank.aufgaben],
      ['Konzepte', ausDateien.konzepte, ausDatenbank.konzepte],
      ['Projekte', ausDateien.projekte, ausDatenbank.projekte],
    ] as const
  ).map(([was, dateien, datenbank]) => ({
    was,
    dateien,
    datenbank,
    gleich: dateien === datenbank,
  }));

  const auseinander = abgleich.filter((zeile) => !zeile.gleich);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Redaktion</h1>
        <p className="mt-2 max-w-2xl text-lg text-[var(--text-muted)]">
          Der Stand der Inhalte – in den Dateien und in der Datenbank. Geändert wird im Repository,
          eingespielt mit <code className="font-mono text-[0.9em]">npm run db:seed</code>.
        </p>
      </div>

      {/* --- Prüfergebnis --------------------------------------------------- */}

      <section className="space-y-3">
        <SectionHeading>Prüfung des Lehrplans</SectionHeading>

        {befunde.length === 0 ? (
          <Callout tone="success" title="Ohne Befund">
            Dieselbe Prüfung läuft im Seed, <strong>bevor</strong> geschrieben wird. Ein Lehrplan
            mit Befunden landet gar nicht erst in der Datenbank – dort fiele er erst auf, wenn eine
            Lernende darüber stolpert.
          </Callout>
        ) : (
          <Callout
            tone="caution"
            title={`${befunde.length} ${befunde.length === 1 ? 'Befund' : 'Befunde'}`}
          >
            <p className="mb-3">
              Solange diese Liste nicht leer ist, bricht <code>npm run db:seed</code> ab. Die
              Datenbank steht dann auf dem letzten guten Stand.
            </p>
            <ul className="space-y-1.5 text-sm">
              {befunde.map((befund) => (
                <li key={`${befund.ort}-${befund.problem}`}>
                  <span className="font-mono text-[0.85em] font-semibold">{befund.ort}</span>
                  {' – '}
                  {befund.problem}
                </li>
              ))}
            </ul>
          </Callout>
        )}
      </section>

      {/* --- Abgleich ------------------------------------------------------- */}

      <section className="space-y-3">
        <SectionHeading>Dateien gegen Datenbank</SectionHeading>

        {auseinander.length > 0 ? (
          <Callout tone="caution" title="Die beiden Stände gehen auseinander">
            Die Datenbank kennt nicht, was in den Dateien steht. Wahrscheinlich fehlt ein{' '}
            <code>npm run db:seed</code> nach der letzten Inhaltsänderung. In der Anwendung sieht
            das nach nichts aus – der fehlende Teil ist einfach nicht da.
          </Callout>
        ) : null}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Anzahl der Inhalte in den Dateien und in der Datenbank
              </caption>
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Was
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">
                    Dateien
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">
                    Datenbank
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Stand
                  </th>
                </tr>
              </thead>
              <tbody>
                {abgleich.map((zeile) => (
                  <tr key={zeile.was} className="border-b border-[var(--border)] last:border-0">
                    <th scope="row" className="py-2 pr-4 text-left font-medium">
                      {zeile.was}
                    </th>
                    <td className="py-2 pr-4 text-right font-mono">{zeile.dateien}</td>
                    <td className="py-2 pr-4 text-right font-mono">{zeile.datenbank}</td>
                    <td className="py-2">
                      <Badge tone={zeile.gleich ? 'success' : 'caution'}>
                        {zeile.gleich ? 'gleich' : 'weicht ab'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* --- Veröffentlichungsstand ----------------------------------------- */}

      <section className="space-y-3">
        <SectionHeading>Veröffentlichungsstand</SectionHeading>

        <div className="space-y-3">
          {module.map((modul) => (
            <Card key={modul.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold tracking-tight">{modul.title}</h3>
                <Badge tone={modul.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                  {modul.status}
                </Badge>
              </div>

              <ul className="mt-3 space-y-1.5 text-sm">
                {modul.lessons.map((lektion) => (
                  <li key={lektion.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[var(--text-muted)]">{lektion.title}</span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {lektion._count.exercises}{' '}
                      {lektion._count.exercises === 1 ? 'Aufgabe' : 'Aufgaben'}
                    </span>
                    {lektion.status !== 'PUBLISHED' ? (
                      <Badge tone="neutral">{lektion.status}</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* --- Nutzung -------------------------------------------------------- */}

      <section className="space-y-3">
        <SectionHeading>Nutzung</SectionHeading>

        <Card>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Konten</dt>
              <dd className="text-2xl font-black tracking-tight">{konten}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Festgehaltene Versuche</dt>
              <dd className="text-2xl font-black tracking-tight">{versuche}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Zwei Zahlen, mehr nicht. Wer was wann falsch gemacht hat, steht hier absichtlich nicht:
            Aus einer Lernplattform wird sonst eine Überwachungsanlage, und ob eine Lektion schlecht
            geschrieben ist, erkennt man auch ohne Namen.
          </p>
        </Card>
      </section>
    </div>
  );
}
