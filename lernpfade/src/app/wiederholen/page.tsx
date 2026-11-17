import type { Metadata } from 'next';
import { LiveReview, type LiveSourceConfig } from '@/components/review/live-review';
import { SiteHeader } from '@/components/site-header';
import { ReviewSession } from '@/components/review/review-session';
import { OrbitMark } from '@/components/learning-os/orbit';
import { normalizeSourceBaseUrl, parseEnabledSources } from '@/domain/review/fetch-source';
import { REVIEW_SOURCE_APP_URLS } from '@/lib/catalog';
import { ButtonLink } from '@/components/ui/primitives';

/**
 * Welche Apps als Live-Quelle angefragt werden: nur ausdrücklich
 * freigeschaltete (`NEXT_PUBLIC_REVIEW_FEDERATION_SOURCES=python,sql,ai`) mit
 * konfigurierter Adresse. Ohne Freischaltung bleibt es beim Demo-Deck.
 */
function liveSources(): LiveSourceConfig[] {
  const enabled = new Set(parseEnabledSources(process.env.NEXT_PUBLIC_REVIEW_FEDERATION_SOURCES));
  const base = (source: 'python' | 'sql' | 'ai'): string | null =>
    enabled.has(source) ? normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS[source]) : null;

  return [
    { source: 'python', label: 'Python', appName: 'PythonPfad', baseUrl: base('python') },
    { source: 'sql', label: 'SQL', appName: 'SQLPfad', baseUrl: base('sql') },
    { source: 'ai', label: 'AI', appName: 'AIPfad', baseUrl: base('ai') },
  ];
}

export const metadata: Metadata = {
  title: 'Wiederholen',
  description:
    'Fällige Wiederholungen aus PythonPfad, SQLPfad und AIPfad an einem Ort, der Weg zu deinen eigenen Vokabeldecks und ein Demo-Deck.',
};

/**
 * Drei getrennte Bahnen, nie vermischt und nie synchronisiert: LIVE (nur
 * gelesen aus den angemeldeten Apps), LOKAL (VokabelPfad in diesem Browser),
 * DEMO (Beispielkarten, lokaler Demo-Stand).
 */
export default function ReviewPage(): React.ReactElement {
  return (
    <>
      <SiteHeader current="wiederholen" />

      <main id="hauptinhalt" className="los-app los-flow review-page">
        <header className="los-head review-head">
          <div className="los-head-grid">
            <div className="los-head-copy">
              <p className="eyebrow">Daily Review</p>
              <h1 className="review-page-title">
                Wiederholen über <em>alle Lernpfade</em>
              </h1>
              <p>
                Drei Quellen auf einer Seite, sauber getrennt: Nichts wird vermischt, nichts zwischen ihnen
                synchronisiert.
              </p>
            </div>
            <div className="los-head-side">
              <OrbitMark />
              <dl className="los-lanes">
                <div>
                  <dt>
                    <span className="los-lane-dot" data-lane="live" aria-hidden="true" />
                    LIVE
                  </dt>
                  <dd>Aus PythonPfad, SQLPfad und AIPfad – mit deiner Anmeldung dort, nur gelesen.</dd>
                </div>
                <div>
                  <dt>
                    <span className="los-lane-dot" data-lane="local" aria-hidden="true" />
                    LOKAL
                  </dt>
                  <dd>Deine eigenen VokabelPfad-Decks, nur in diesem Browser.</dd>
                </div>
                <div>
                  <dt>
                    <span className="los-lane-dot" data-lane="demo" aria-hidden="true" />
                    DEMO
                  </dt>
                  <dd>Beispielkarten zum Ausprobieren; ändert nichts in den Apps.</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        <LiveReview sources={liveSources()} />

        <section className="los-section vocab-pointer" aria-labelledby="vocab-pointer-title">
          <div>
            <p className="los-lane-label">
              <span className="los-lane-dot" data-lane="local" aria-hidden="true" />
              LOKAL · nur in diesem Browser
            </p>
            <h2 id="vocab-pointer-title">VokabelPfad: deine eigenen Decks</h2>
            <p>
              Englisch ↔ Deutsch mit eigenen Karten, beiden Lernrichtungen und täglicher Wiederholung. Deine
              Vokabeldaten bleiben getrennt von den Live-Quellen und vom Demo-Deck – nur in diesem Browser.
            </p>
          </div>
          <ButtonLink href="/vokabeln">
            Zum VokabelPfad
          </ButtonLink>
        </section>

        <ReviewSession />
      </main>
    </>
  );
}
