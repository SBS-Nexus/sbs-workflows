import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keine Verbindung',
  robots: { index: false, follow: false },
};

/**
 * Wird angezeigt, wenn eine Seite ohne Netzverbindung aufgerufen wird.
 *
 * Bewusst ohne jeden Datenzugriff und ohne Anmeldeprüfung: Die Seite muss aus
 * dem Zwischenspeicher heraus funktionieren, und zwar auch dann, wenn der
 * Server gar nicht erreichbar ist. Sie enthält deshalb nichts
 * Personenbezogenes – nicht einmal den Namen.
 *
 * Der Text sagt, was jetzt geht und was nicht. Eine Fehlerseite, die nur
 * „offline" meldet, lässt die lesende Person mit der Frage allein, ob ihre
 * bisherige Arbeit verloren ist.
 */
export default function OfflinePage(): React.ReactElement {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gerade keine Verbindung</h1>

      <p className="mt-3 text-[var(--text-muted)]">
        Diese Seite braucht eine Internetverbindung, weil sie deinen persönlichen Lernstand lädt.
        Sobald du wieder online bist, geht es genau dort weiter, wo du aufgehört hast.
      </p>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
        <h2 className="text-base font-semibold">Ist etwas verloren gegangen?</h2>
        <p className="mt-1 text-[0.9375rem]">
          Nein. Alles, was du eingereicht hast, liegt auf dem Server. Nur die Seite, die du gerade
          öffnen wolltest, lässt sich ohne Verbindung nicht laden.
        </p>

        <h2 className="mt-4 text-base font-semibold">Warum wird nichts zwischengespeichert?</h2>
        <p className="mt-1 text-[0.9375rem]">
          Deine Lernseiten enthalten deinen Fortschritt, deinen Namen und deine Kohorten. Solche
          Daten legen wir absichtlich nicht im Browser-Cache ab – dort blieben sie auch nach dem
          Abmelden und auf geteilten Geräten liegen.
        </p>

        <h2 className="mt-4 text-base font-semibold">Was trotzdem funktioniert</h2>
        <p className="mt-1 text-[0.9375rem]">
          Die Python-Laufzeit liegt bereits auf deinem Gerät. Sobald eine Seite mit Editor geladen
          ist, kannst du darin auch ohne Verbindung Code ausführen.
        </p>
      </div>

      <p className="mt-6">
        {/*
         * Bewusst ein gewöhnlicher Verweis und kein Link aus next/link: Diese
         * Seite kommt aus dem Zwischenspeicher, während die Anwendung im
         * Browser womöglich gar nicht vollständig geladen ist. Ein
         * vollständiger Seitenaufruf ist hier der zuverlässige Weg zurück –
         * eine seiteninterne Navigation hätte nichts, worauf sie aufsetzen kann.
         */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/lernen"
          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-4 font-semibold text-[var(--text-inverse)]"
        >
          Erneut versuchen
        </a>
      </p>
    </div>
  );
}
