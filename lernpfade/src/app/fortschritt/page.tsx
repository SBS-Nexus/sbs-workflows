import type { Metadata } from 'next';
import { ProgressOverview, type ProgressSourceConfig } from '@/components/progress/progress-overview';
import { SiteHeader } from '@/components/site-header';
import { OrbitMark } from '@/components/learning-os/orbit';
import { parseProgressSources } from '@/domain/progress/fetch-progress';
import { normalizeSourceBaseUrl } from '@/domain/review/fetch-source';
import { REVIEW_SOURCE_APP_URLS } from '@/lib/catalog';

/**
 * LP-07 — `/fortschritt`: Plattformfortschritt, schreibgeschützt.
 *
 * Welche Apps als Fortschrittsquelle angefragt werden, entscheidet eine eigene
 * Freischaltung, getrennt von LP-05B: `PROGRESS_FEDERATION_SOURCES=python,sql,ai`
 * (Vorgabe leer = aus) plus die vorhandenen `NEXT_PUBLIC_*_URL`. Gelesen wird
 * sie zur Laufzeit auf dem Server — deshalb dynamisch gerendert; die Seite
 * selbst enthält keine personenbezogenen Daten, die kommen erst im Browser.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fortschritt',
  description:
    'Dein Stand in PythonPfad, SQLPfad und AIPfad sowie deine lokalen Vokabeln — schreibgeschützt, jede App behält ihr eigenes Konto.',
};

function progressSources(): ProgressSourceConfig[] {
  const enabled = new Set(parseProgressSources(process.env.PROGRESS_FEDERATION_SOURCES));
  const config = (source: 'python' | 'sql' | 'ai', label: string, appName: string, note?: string): ProgressSourceConfig => {
    const appUrl = normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS[source]);
    return {
      source,
      label,
      appName,
      baseUrl: enabled.has(source) ? appUrl : null,
      appUrl,
      ...(note ? { note } : {}),
    };
  };
  return [
    config('python', 'Python', 'PythonPfad'),
    config('sql', 'SQL', 'SQLPfad'),
    config('ai', 'AI', 'AIPfad', 'Enthält derzeit auch Git & GitHub.'),
  ];
}

export default function ProgressPage(): React.ReactElement {
  return (
    <>
      <SiteHeader current="fortschritt" />
      <main id="hauptinhalt" className="los-app los-flow progress-page">
        <header className="los-head progress-intro">
          <div className="los-head-grid">
            <div className="los-head-copy">
              <p className="eyebrow">Plattformfortschritt</p>
              <h1>
                Dein <em>Fortschritt</em>
              </h1>
              <p>
                Jeder Pfad behält sein eigenes Konto und seine eigene Anmeldung. Lernpfade liest den Stand nur
                und zeigt ihn hier zusammen — es gibt kein gemeinsames Konto, keinen synchronisierten Lernstand
                und keinen Gesamtwert über alle Pfade. Bearbeitet wird in der jeweiligen App.
              </p>
            </div>
            <div className="los-head-side">
              <OrbitMark />
              <ul className="los-head-facts" aria-label="So entsteht diese Übersicht">
                <li>
                  <strong>Nur gelesen</strong>
                  Kein Wert wird hier geändert oder an eine App zurückgeschrieben.
                </li>
                <li>
                  <strong>Je Pfad für sich</strong>
                  Eine fehlende oder langsame Quelle hält die anderen nicht auf.
                </li>
                <li>
                  <strong>Kein Gesamtprozent</strong>
                  Gezählt wird nur, was jede Quelle selbst meldet.
                </li>
              </ul>
            </div>
          </div>
        </header>
        <ProgressOverview sources={progressSources()} />
      </main>
    </>
  );
}
