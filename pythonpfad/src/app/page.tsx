import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { ButtonLink, Callout, Card } from '@/components/ui/primitives';
import { contentStats } from '@/content';

/**
 * Landingpage.
 *
 * Sie erklärt in wenigen Sätzen, wie hier gelernt wird, und führt direkt in die
 * Anwendung. Angemeldete Personen landen sofort auf ihrem Lernpfad.
 */
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ geloescht?: string }>;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardingCompleted ? '/lernen' : '/onboarding');

  const params = await searchParams;
  const stats = contentStats();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="text-lg font-bold tracking-tight">PythonPfad</p>
          <nav aria-label="Konto" className="flex items-center gap-2">
            <ButtonLink href="/anmelden" variant="ghost">
              Anmelden
            </ButtonLink>
            <ButtonLink href="/registrieren">Kostenlos starten</ButtonLink>
          </nav>
        </div>
      </header>

      <main id="hauptinhalt" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        {params.geloescht === '1' ? (
          <Callout tone="success" title="Konto gelöscht" className="mb-8">
            Dein Konto und alle zugehörigen Lerndaten wurden vollständig entfernt.
          </Callout>
        ) : null}

        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Für Menschen, die noch nie programmiert haben
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Python verstehen. Selbst schreiben. Wirklich anwenden.
          </h1>
          <p className="mt-5 text-lg text-[var(--text-muted)]">
            PythonPfad ist kein Videokurs zum Zuschauen. Du liest kurze Erklärungen, sagst
            Programmausgaben voraus, veränderst fertigen Code und schreibst schon in der ersten
            Stunde eigene Zeilen – direkt im Browser, ohne Installation.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/registrieren">Lernpfad beginnen</ButtonLink>
            <ButtonLink href="/anmelden" variant="secondary">
              Ich habe schon ein Konto
            </ButtonLink>
          </div>

          <p className="mt-4 text-sm text-[var(--text-muted)]">
            10 bis 30 Minuten am Tag genügen. Dein Fortschritt wird gespeichert, und du kannst auf
            jedem Gerät weitermachen.
          </p>
        </section>

        <section aria-labelledby="so-lernst-du" className="mt-16">
          <h2 id="so-lernst-du" className="text-2xl font-semibold tracking-tight">
            So läuft eine Lektion ab
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Ein Problem aus dem Alltag',
                text: 'Jede Lektion beginnt mit einer Situation, die du kennst – nicht mit einer Syntaxregel.',
              },
              {
                title: 'Ein Beispiel, Zeile für Zeile erklärt',
                text: 'Du siehst fertigen Code und erfährst zu jeder wichtigen Zeile, was dort passiert und warum.',
              },
              {
                title: 'Ausgabe vorhersagen',
                text: 'Bevor du auf "Ausführen" drückst, sagst du voraus, was herauskommt. Der Unterschied ist die Lernstelle.',
              },
              {
                title: 'Selbst schreiben',
                text: 'Zuerst mit Lücken, dann mit weniger Vorgaben, am Ende ganz ohne Vorlage.',
              },
              {
                title: 'Fehler verstehen statt raten',
                text: 'Jede Fehlermeldung wird auf Deutsch erklärt: was sie bedeutet, was die Ursache sein kann und wie du sie eingrenzt.',
              },
              {
                title: 'Zur richtigen Zeit wiederholen',
                text: 'Was du gelernt hast, kommt nach einem Tag, drei Tagen, einer Woche wieder – abgestimmt auf deinen Verlauf.',
              },
            ].map((item, index) => (
              <Card as="li" key={item.title} className="list-none">
                <p className="text-sm font-semibold text-[var(--accent)]">Schritt {index + 1}</p>
                <h3 className="mt-1 font-semibold">{item.title}</h3>
                <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">{item.text}</p>
              </Card>
            ))}
          </ol>
        </section>

        <section aria-labelledby="anders" className="mt-16 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 id="anders" className="text-xl font-semibold">
              Warum das anders ist als ein Tutorial
            </h2>
            <ul className="mt-4 space-y-3 text-[0.95rem]">
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-[var(--success)]">
                  ✓
                </span>
                <span>
                  Eine Lektion gilt erst als abgeschlossen, wenn du jede Aufgabe einmal selbst
                  gelöst hast. Durchklicken zählt nicht.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-[var(--success)]">
                  ✓
                </span>
                <span>
                  Hilfen kommen in Stufen: erst eine Frage, dann ein Konzepthinweis, dann eine
                  Struktur. Die Musterlösung erst ganz zuletzt – und danach folgt eine ähnliche
                  Aufgabe ohne Vorlage.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="text-[var(--success)]">
                  ✓
                </span>
                <span>
                  Kein Punktesammeln, keine Verlustmechanik, keine Drucknachrichten. Eine
                  unterbrochene Serie ist kein Problem.
                </span>
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Was schon bereitsteht</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              {[
                { label: 'Lektionen', value: stats.lessons },
                { label: 'Interaktive Aufgaben', value: stats.exercises },
                { label: 'Konzepte im Lernmodell', value: stats.concepts },
                { label: 'Projekte', value: stats.projects },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-sm text-[var(--text-muted)]">{item.label}</dt>
                  <dd className="text-2xl font-bold">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Python läuft direkt in deinem Browser. Es wird nichts auf deinem Rechner installiert
              und kein Code an einen fremden Server geschickt.
            </p>
          </Card>
        </section>

        <section className="mt-16 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Bereit für die erste Zeile Code?</h2>
          <p className="mt-2 max-w-prose text-[var(--text-muted)]">
            Nach einer kurzen Einstufung – ohne Fachbegriffe – bekommst du einen Lernpfad, der zu
            deinem Ziel und deiner verfügbaren Zeit passt.
          </p>
          <div className="mt-5">
            <ButtonLink href="/registrieren">Jetzt starten</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto max-w-6xl px-4 text-sm text-[var(--text-muted)] sm:px-6">
          <p>
            PythonPfad – eine Lernumgebung für deutschsprachige Python-Einsteigerinnen und
            -Einsteiger.
          </p>
          <p className="mt-2">
            Deine Lerndaten kannst du jederzeit vollständig exportieren oder löschen. Weitere
            Angaben findest du nach der Anmeldung unter{' '}
            <Link href="/profil" className="underline">
              Profil
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
