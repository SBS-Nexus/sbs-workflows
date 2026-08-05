import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { ButtonLink, Callout } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/icon';
import {
  IllustrationBranch,
  IllustrationBuild,
  IllustrationLoop,
  IllustrationSequence,
} from '@/components/ui/illustration';
import { AuroraBackdrop, HeroVisual } from '@/components/marketing/hero-visual';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';
import { contentStats } from '@/content';
import { BRAND } from '@/lib/brand';
import type { Metadata } from 'next';

/**
 * Kanonische Adresse.
 *
 * Die Startseite ist über mehrere Wege erreichbar – mit und ohne `www`, mit
 * und ohne Anhängsel wie `?geloescht=1`. Ohne diesen Verweis behandeln
 * Suchmaschinen jede Variante als eigene Seite und verteilen die Bewertung
 * darauf. Er gehört auf die Seite und nicht ins Layout, sonst würde jede
 * Unterseite behaupten, sie sei die Startseite.
 */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/', title: BRAND.title, description: BRAND.description },
};

/**
 * Landingpage.
 *
 * Sie erklärt in wenigen Sätzen, wie hier gelernt wird, und führt direkt in die
 * Anwendung. Angemeldete Personen landen sofort auf ihrem Lernpfad.
 *
 * Zur Gestaltung: Der Kopfbereich ist dunkel und farbig, alles darunter hell.
 * Dieser Wechsel ist kein Selbstzweck – er trennt das Versprechen („so sieht
 * es aus") von der Erklärung („so läuft es ab"). Farbe und Bewegung sind
 * reichlich vorhanden, tragen aber nie allein eine Aussage: Zu jedem farbigen
 * Element gehört Text, und jede Bewegung lässt sich abschalten.
 */

const SCHRITTE: ReadonlyArray<{ title: string; text: string; icon: IconName }> = [
  {
    title: 'Ein Problem aus dem Alltag',
    text: 'Jede Lektion beginnt mit einer Situation, die du kennst – nicht mit einer Syntaxregel.',
    icon: 'gluehbirne',
  },
  {
    title: 'Ein Beispiel, Zeile für Zeile',
    text: 'Du siehst fertigen Code und erfährst zu jeder wichtigen Zeile, was dort passiert und warum.',
    icon: 'code',
  },
  {
    title: 'Ausgabe vorhersagen',
    text: 'Bevor du auf „Ausführen" drückst, sagst du voraus, was herauskommt. Der Unterschied ist die Lernstelle.',
    icon: 'funke',
  },
  {
    title: 'Selbst schreiben',
    text: 'Zuerst mit Lücken, dann mit weniger Vorgaben, am Ende ganz ohne Vorlage.',
    icon: 'tastatur',
  },
  {
    title: 'Fehler verstehen statt raten',
    text: 'Jede Fehlermeldung wird auf Deutsch erklärt: was sie bedeutet, was die Ursache sein kann und wie du sie eingrenzt.',
    icon: 'suchen',
  },
  {
    title: 'Zur richtigen Zeit wiederholen',
    text: 'Was du gelernt hast, kommt nach einem Tag, drei Tagen, einer Woche wieder – abgestimmt auf deinen Verlauf.',
    icon: 'wiederholen',
  },
];

const BAUSTEINE = [
  {
    title: 'Reihenfolge',
    text: 'Ein Programm arbeitet Schritt für Schritt. Du siehst jeden davon einzeln – mit allen Werten, die sich dabei ändern.',
    Bild: IllustrationSequence,
  },
  {
    title: 'Entscheidungen',
    text: 'Wenn dies, dann das. Du lernst, Bedingungen zu lesen, bevor du sie schreibst.',
    Bild: IllustrationBranch,
  },
  {
    title: 'Wiederholungen',
    text: 'Schleifen sind die Stelle, an der die meisten aussteigen. Deshalb bekommen sie hier den meisten Platz.',
    Bild: IllustrationLoop,
  },
  {
    title: 'Eigene Projekte',
    text: 'Am Ende jedes Moduls baust du etwas Ganzes: einen Rechner, ein Quiz, eine kleine Auswertung.',
    Bild: IllustrationBuild,
  },
] as const;

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
      {/* ------------------------------------------------------------------ */}
      {/* Kopfbereich: dunkel, farbig, in Bewegung                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="gradient-hero relative isolate overflow-hidden text-white">
        <AuroraBackdrop />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <p className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm"
              >
                <Icon name="schritte" size={20} />
              </span>
              PythonPfad
            </p>
            <nav aria-label="Konto" className="flex items-center gap-2">
              {/*
               * Auf sehr schmalen Geräten würde die zweite Schaltfläche die
               * Zeile sprengen. Wer schon ein Konto hat, findet den Weg auch
               * über die Schaltfläche weiter unten im Kopfbereich.
               *
               * Das Ausblenden sitzt auf einer Hülle und nicht auf dem Knopf:
               * Der Knopf bringt selbst `inline-flex` mit, und zwei
               * Display-Angaben auf demselben Element entscheidet nicht die
               * Reihenfolge im Attribut, sondern die im erzeugten Stylesheet.
               */}
              <span className="hidden sm:contents">
                <ButtonLink href="/anmelden" variant="onDarkGhost" size="sm">
                  Anmelden
                </ButtonLink>
              </span>
              <ButtonLink href="/registrieren" variant="onDark" size="sm">
                Kostenlos starten
              </ButtonLink>
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <Icon name="funke" size={16} />
              Für Menschen, die noch nie programmiert haben
            </p>

            <h1 className="mt-5 text-display font-black leading-[1.05] tracking-[-0.03em]">
              Python verstehen.
              <br />
              Selbst schreiben.
              <br />
              <span className="bg-gradient-to-r from-[#7ee2b8] via-[#93c5fd] to-[#f9a8d4] bg-clip-text text-transparent">
                Wirklich anwenden.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-white/80">
              PythonPfad ist kein Videokurs zum Zuschauen. Du liest kurze Erklärungen, sagst
              Programmausgaben voraus, veränderst fertigen Code und schreibst schon in der ersten
              Stunde eigene Zeilen – direkt im Browser, ohne Installation.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/registrieren" variant="onDark" size="lg">
                Lernpfad beginnen
                <Icon name="vor" size={18} />
              </ButtonLink>
              <ButtonLink href="/anmelden" variant="onDarkGhost" size="lg">
                Ich habe schon ein Konto
              </ButtonLink>
            </div>

            <p className="mt-5 flex items-start gap-2 text-sm text-white/65">
              <Icon name="haken" size={16} className="mt-1 shrink-0" />
              10 bis 30 Minuten am Tag genügen. Dein Fortschritt wird gespeichert, und du kannst auf
              jedem Gerät weitermachen.
            </p>
          </div>

          <HeroVisual />
        </div>

        {/* Zahlenband – der Übergang vom dunklen in den hellen Bereich. */}
        <div className="relative z-10 border-t border-white/10 bg-black/20">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
            {[
              { label: 'Lektionen', value: stats.lessons },
              { label: 'Interaktive Aufgaben', value: stats.exercises },
              { label: 'Konzepte im Lernmodell', value: stats.concepts },
              { label: 'Projekte', value: stats.projects },
            ].map((item) => (
              <div key={item.label}>
                <dd className="text-3xl font-black tracking-tight sm:text-4xl">{item.value}</dd>
                <dt className="mt-0.5 text-sm text-white/65">{item.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <main id="hauptinhalt">
        {params.geloescht === '1' ? (
          <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
            <Callout tone="success" title="Konto gelöscht">
              Dein Konto und alle zugehörigen Lerndaten wurden vollständig entfernt.
            </Callout>
          </div>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Ablauf einer Lektion                                              */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-labelledby="so-lernst-du"
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">
              Der Ablauf
            </p>
            <h2
              id="so-lernst-du"
              className="mt-3 text-display-sm font-black leading-tight tracking-[-0.02em]"
            >
              Sechs Schritte, jedes Mal dieselben
            </h2>
            <p className="mt-4 text-lg text-[var(--text-muted)]">
              Der Aufbau wiederholt sich bewusst. Wer weiß, was als Nächstes kommt, kann die ganze
              Aufmerksamkeit auf den Inhalt richten statt auf die Bedienung.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SCHRITTE.map((item, index) => {
              const theme = moduleTheme(index);
              return (
                <li
                  key={item.title}
                  style={themeStyle(theme)}
                  className="reveal-on-scroll hover-lift group list-none rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-raised)] p-6 hover:border-[var(--akzent)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-11 items-center justify-center rounded-2xl bg-[var(--akzent-soft)] text-[var(--akzent)] transition-transform duration-200 group-hover:scale-110"
                    >
                      <Icon name={item.icon} size={22} />
                    </span>
                    <span className="text-sm font-bold uppercase tracking-widest text-[var(--akzent)]">
                      Schritt {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">{item.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Bausteine, mit Illustrationen                                     */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-labelledby="bausteine"
          className="border-y border-[var(--border)] bg-[var(--surface-sunken)]"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">
                Der Stoff
              </p>
              <h2
                id="bausteine"
                className="mt-3 text-display-sm font-black leading-tight tracking-[-0.02em]"
              >
                Vier Bausteine, aus denen alles besteht
              </h2>
              <p className="mt-4 text-lg text-[var(--text-muted)]">
                Programmieren sieht nach unendlich vielen Regeln aus. Tatsächlich sind es wenige
                Ideen, die immer wiederkehren.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {BAUSTEINE.map(({ title, text, Bild }, index) => {
                const theme = moduleTheme(index);
                return (
                  <article
                    key={title}
                    style={themeStyle(theme)}
                    className="reveal-on-scroll glow-soft hover-lift overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-raised)]"
                  >
                    <div className="bg-[var(--akzent-soft)] px-8 pb-2 pt-8">
                      <Bild className="mx-auto max-w-[15rem]" />
                    </div>
                    <div className="p-6 sm:p-8">
                      <h3 className="text-xl font-bold tracking-tight text-[var(--akzent)]">
                        {title}
                      </h3>
                      <p className="mt-2 text-[var(--text-muted)]">{text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Haltung: was hier gemacht wird – und was nicht                    */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-labelledby="haltung"
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="reveal-on-scroll rounded-3xl border-2 border-[var(--border)] bg-[var(--surface-raised)] p-7 sm:p-9">
              <h2 id="haltung" className="text-2xl font-black tracking-tight">
                Warum das kein Tutorial ist
              </h2>
              <ul className="mt-6 space-y-5">
                {[
                  'Eine Lektion gilt erst als abgeschlossen, wenn du jede Aufgabe einmal selbst gelöst hast. Durchklicken zählt nicht.',
                  'Hilfen kommen in Stufen: erst eine Frage, dann ein Konzepthinweis, dann eine Struktur. Die Musterlösung erst ganz zuletzt – und danach folgt eine ähnliche Aufgabe ohne Vorlage.',
                  'Python läuft in deinem Browser. Es wird nichts installiert und kein Code an einen fremden Server geschickt.',
                ].map((text) => (
                  <li key={text} className="flex gap-3.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-[var(--text-inverse)]"
                    >
                      <Icon name="haken" size={14} />
                    </span>
                    <span className="text-[0.975rem]">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dunkle Kontrastfläche. Hier steht bewusst, was fehlt. */}
            <div className="reveal-on-scroll relative isolate overflow-hidden rounded-3xl bg-[var(--color-ink-950)] p-7 text-white sm:p-9">
              <div
                aria-hidden="true"
                className="animate-drift absolute -right-20 -top-20 -z-10 size-64 rounded-full bg-[var(--color-wiederholen)] opacity-25 blur-3xl"
              />
              <h2 className="text-2xl font-black tracking-tight">Und was du hier nicht findest</h2>
              <ul className="mt-6 space-y-5">
                {[
                  [
                    'Keine Verlustmechanik',
                    'Keine Herzen, die aufgebraucht werden, und nichts, was beim Fehler verschwindet.',
                  ],
                  [
                    'Keine Drucknachrichten',
                    'Eine unterbrochene Serie wird nicht kommentiert. Du fängst dort an, wo du aufgehört hast.',
                  ],
                  [
                    'Keine Ranglisten',
                    'Dein Fortschritt wird mit niemandem verglichen. Er gehört dir.',
                  ],
                ].map(([titel, text]) => (
                  <li key={titel} className="flex gap-3.5">
                    <span
                      aria-hidden="true"
                      /* Fester Farbwert: Diese Fläche ist in beiden Schemata
                         dunkel, die Variable wäre im hellen Schema ein dunkles
                         Oliv – auf Schwarz nicht mehr lesbar. */
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[#bef264] text-[#bef264]"
                    >
                      <Icon name="schliessen" size={12} />
                    </span>
                    <span>
                      <b className="font-bold">{titel}.</b>{' '}
                      <span className="text-white/70">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-7 border-t border-white/15 pt-5 text-sm text-white/60">
                Lernen braucht Wiederkommen, nicht Angst vor dem Wegbleiben.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Abschluss                                                         */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="gradient-hero relative isolate overflow-hidden rounded-[2rem] px-7 py-14 text-center text-white sm:px-12 sm:py-20">
            <AuroraBackdrop />
            <div className="relative z-10">
              <h2 className="mx-auto max-w-2xl text-display-sm font-black leading-tight tracking-[-0.02em]">
                Bereit für die erste Zeile Code?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                Nach einer kurzen Einstufung – ohne Fachbegriffe – bekommst du einen Lernpfad, der
                zu deinem Ziel und deiner verfügbaren Zeit passt.
              </p>
              <div className="mt-9 flex justify-center">
                <ButtonLink href="/registrieren" variant="onDark" size="lg">
                  Jetzt starten
                  <Icon name="vor" size={18} />
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-[var(--text-muted)] sm:px-6">
          <p className="flex items-center gap-2 font-semibold text-[var(--text)]">
            <Icon name="schritte" size={18} className="text-[var(--accent)]" />
            PythonPfad
          </p>
          <p className="mt-2">
            Eine Lernumgebung für deutschsprachige Python-Einsteigerinnen und -Einsteiger.
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
