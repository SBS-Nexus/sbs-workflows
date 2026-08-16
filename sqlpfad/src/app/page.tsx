import type { Metadata } from 'next';
import { ButtonLink, Card } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/icon';
import { HeroVisual } from '@/components/marketing/hero-visual';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';
import { BRAND } from '@/lib/brand';

/**
 * Kanonische Adresse.
 *
 * Die Startseite ist über mehrere Wege erreichbar – mit und ohne `www`, mit
 * und ohne Anhängsel. Ohne diesen Verweis behandeln Suchmaschinen jede
 * Variante als eigene Seite. Er gehört auf die Seite und nicht ins Layout,
 * sonst behauptete jede Unterseite, sie sei die Startseite.
 */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/', title: BRAND.title, description: BRAND.description },
};

/*
 * Landingpage.
 *
 * Sie hat eine Aufgabe, die bei PythonPfad nicht anfiel: erklären, wo die
 * Abfragen eigentlich laufen. Python läuft dort im Browser der Lernenden, und
 * das ist eine Nebensächlichkeit. T-SQL braucht ein echtes Datenbankmodul,
 * also läuft es auf einem Server – mit einer eigenen Übungsdatenbank je Person.
 * Wer das erst nach der Anmeldung erfährt, fühlt sich zu Recht überrumpelt.
 * Deshalb steht es hier, im Abschnitt „Wo deine Abfragen laufen".
 */

const SCHRITTE: ReadonlyArray<{ titel: string; text: string; icon: IconName }> = [
  {
    titel: 'Eine Frage an die Daten',
    text: 'Jede Lektion beginnt mit einer Frage, die jemand wirklich stellen würde – „Welche Kundinnen haben seit März nichts mehr bestellt?" – und nicht mit einer Syntaxregel.',
    icon: 'gluehbirne',
  },
  {
    titel: 'Die Tabellen ansehen',
    text: 'Bevor du schreibst, siehst du die Tabellen: Spalten, Datentypen, Beziehungen und ein paar echte Zeilen. Wer die Daten nicht kennt, rät beim Abfragen.',
    icon: 'karte',
  },
  {
    titel: 'Das Ergebnis vorhersagen',
    text: 'Du sagst voraus, welche Zeilen herauskommen, bevor du auf „Ausführen" drückst. Der Unterschied zwischen Vorhersage und Ergebnis ist die eigentliche Lernstelle.',
    icon: 'funke',
  },
  {
    titel: 'Selbst schreiben',
    text: 'Zuerst mit Lücken im fertigen Gerüst, dann mit weniger Vorgaben, am Ende ganz ohne Vorlage – gegen eine Übungsdatenbank, die nur dir gehört.',
    icon: 'tastatur',
  },
  {
    titel: 'Fehlermeldungen verstehen',
    text: 'Msg 8120 wird nicht einfach angezeigt. Du liest die Originalmeldung, dazu auf Deutsch, was sie bedeutet, woran es liegen kann und wo du suchst.',
    icon: 'suchen',
  },
  {
    titel: 'Zur richtigen Zeit wiederholen',
    text: 'Was du gelernt hast, kommt nach einem Tag, drei Tagen, einer Woche wieder – abgestimmt auf deinen Verlauf, ohne Serie, die reißen kann.',
    icon: 'wiederholen',
  },
];

const MODULE: ReadonlyArray<{ titel: string; text: string }> = [
  {
    titel: 'Tabellen und Daten',
    text: 'Was eine Zeile ist, was eine Spalte verspricht, warum NULL nicht „leer" heißt und wieso Datentypen später über Stunden entscheiden.',
  },
  {
    titel: 'Abfragen',
    text: 'SELECT, WHERE, ORDER BY – und die Reihenfolge, in der SQL Server das tatsächlich abarbeitet. Die ist eine andere als die, in der man es schreibt.',
  },
  {
    titel: 'Verbinden und Gruppieren',
    text: 'JOIN, GROUP BY, HAVING. Die Stelle, an der die meisten aussteigen, bekommt hier den meisten Platz.',
  },
  {
    titel: 'Ändern und Struktur',
    text: 'INSERT, UPDATE, DELETE, Transaktionen, Schlüssel und Einschränkungen – an einer Datenbank, an der nichts kaputtgehen kann.',
  },
];

export default function LandingPage(): React.ReactElement {
  return (
    <div className="min-h-dvh">
      {/* ------------------------------------------------------------------ */}
      {/* Kopfbereich                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="gradient-hero relative isolate overflow-hidden text-white">
        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <p className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm"
              >
                <Icon name="karte" size={20} />
              </span>
              {BRAND.name}
            </p>
            <nav aria-label="Konto" className="flex items-center gap-2">
              {/*
               * Auf sehr schmalen Geräten würde die zweite Schaltfläche die
               * Zeile sprengen. Das Ausblenden sitzt auf einer Hülle und nicht
               * auf dem Knopf: Der Knopf bringt selbst `inline-flex` mit.
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

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/*
           * `min-w-0` ist hier nicht kosmetisch: Ein Rasterfeld ist von Haus
           * aus mindestens so breit wie sein Inhalt. Die lange SQL-Zeile im
           * Beispiel würde die Spalte über die Bildschirmbreite hinausdrücken
           * und die ganze Seite seitlich scrollbar machen.
           */}
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <Icon name="funke" size={16} />
              Für alle, die täglich mit Daten arbeiten – ohne Vorkenntnisse
            </p>

            <h1 className="mt-5 text-display font-black leading-[1.05] tracking-[-0.03em]">
              SQL verstehen.
              <br />
              Abfragen schreiben.
              <br />
              <span className="bg-gradient-to-r from-[#6ed3c7] via-[#93c5fd] to-[#f9a8d4] bg-clip-text text-transparent">
                Daten wirklich nutzen.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-white/80">
              SQLPfad ist kein Videokurs zum Zuschauen. Du liest kurze Erklärungen, sagst Ergebnisse
              voraus und schreibst schon in der ersten Stunde eigene Abfragen – in T-SQL, gegen eine
              echte SQL-Server-Datenbank, die nur dir gehört.
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
              15 bis 30 Minuten am Tag genügen. Dein Fortschritt wird gespeichert, und du kannst auf
              jedem Gerät weitermachen.
            </p>
          </div>

          <HeroVisual />
        </div>
      </div>

      <main id="hauptinhalt">
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
            {SCHRITTE.map((schritt, index) => {
              const theme = moduleTheme(index);
              return (
                <li
                  key={schritt.titel}
                  style={themeStyle(theme)}
                  className="reveal-on-scroll hover-lift karte-flaeche group list-none rounded-2xl border-2 p-6 hover:border-[var(--akzent)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-11 items-center justify-center rounded-2xl bg-[var(--akzent-soft)] text-[var(--akzent)] transition-transform duration-200 group-hover:scale-110"
                    >
                      <Icon name={schritt.icon} size={22} />
                    </span>
                    <span className="text-sm font-bold uppercase tracking-widest text-[var(--akzent)]">
                      Schritt {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-tight">{schritt.titel}</h3>
                  <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">{schritt.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Wo die Abfragen laufen – die ehrliche Auskunft                    */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-labelledby="wo-abfragen-laufen"
          className="border-y border-[var(--border)] bg-[var(--surface-sunken)]"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">
                Ohne Installation, aber nicht ohne Verbindung
              </p>
              <h2
                id="wo-abfragen-laufen"
                className="mt-3 text-display-sm font-black leading-tight tracking-[-0.02em]"
              >
                Wo deine Abfragen laufen
              </h2>
              <p className="mt-4 text-lg text-[var(--text-muted)]">
                Du brauchst nichts einzurichten – keinen SQL Server, kein Management Studio, keine
                Testdaten. Was du brauchst, ist eine Internetverbindung. Warum, steht hier, statt
                dich nach der Anmeldung zu überraschen.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              <Card className="border-2">
                <h3 className="text-lg font-bold tracking-tight">Eine Datenbank für dich allein</h3>
                <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">
                  Du bekommst eine eigene Übungsdatenbank. Du kannst darin Zeilen ändern, Tabellen
                  anlegen und Dinge kaputt machen – niemand außer dir merkt etwas davon, und ein
                  Klick setzt alles zurück.
                </p>
              </Card>

              <Card className="border-2">
                <h3 className="text-lg font-bold tracking-tight">
                  Getrennt von allem, was dich betrifft
                </h3>
                <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">
                  Konten, Fortschritt und Lerndaten liegen in einem anderen System, das dein SQL nie
                  zu sehen bekommt. Diese Trennung ist die wichtigste Sicherheitsentscheidung der
                  ganzen Anwendung.
                </p>
              </Card>

              <Card className="border-2">
                <h3 className="text-lg font-bold tracking-tight">
                  Offline geht vieles, nicht alles
                </h3>
                <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">
                  Erklärungen, der Lernpfad und deine Entwürfe bleiben ohne Verbindung nutzbar.
                  Abfragen ausführen nicht – dafür braucht es das Datenbankmodul. Wir behaupten
                  nirgends, SQL liefe im Browser.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Module                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="module" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">
              Der Weg
            </p>
            <h2
              id="module"
              className="mt-3 text-display-sm font-black leading-tight tracking-[-0.02em]"
            >
              Vier Module, aufeinander aufgebaut
            </h2>
            <p className="mt-4 text-lg text-[var(--text-muted)]">
              Jedes Modul endet mit einem Projekt: einer Auswertung, die du von der ersten Frage bis
              zum fertigen Ergebnis selbst schreibst.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 sm:grid-cols-2">
            {MODULE.map((modul, index) => {
              const theme = moduleTheme(index);
              return (
                <li
                  key={modul.titel}
                  style={themeStyle(theme)}
                  className="reveal-on-scroll karte-flaeche list-none rounded-2xl border-2 p-6"
                >
                  <span className="text-sm font-bold uppercase tracking-widest text-[var(--akzent)]">
                    Modul {index + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-bold tracking-tight">{modul.titel}</h3>
                  <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">{modul.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Was es hier nicht gibt                                            */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-labelledby="nicht"
          className="border-t border-[var(--border)] bg-[var(--surface-sunken)]"
        >
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <h2 id="nicht" className="text-display-sm font-black leading-tight tracking-[-0.02em]">
              Was es hier nicht gibt
            </h2>
            <p className="mt-4 text-lg text-[var(--text-muted)]">
              Keine Serie, die reißt. Keine Nachricht, die dich zurückholen will. Keine Rangliste,
              auf der du gegen Fremde antrittst. Keine Punkte, die etwas wert sein sollen, das sie
              nicht sind. Lernen funktioniert nicht besser, wenn man Angst hat, etwas zu verlieren.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/registrieren" size="lg">
                Lernpfad beginnen
                <Icon name="vor" size={18} />
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-[var(--text-muted)] sm:px-6">
          {BRAND.name} – {BRAND.claim}
        </div>
      </footer>
    </div>
  );
}
