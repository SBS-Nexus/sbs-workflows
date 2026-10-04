import type { Metadata } from 'next';
import { LiveReview, type LiveSourceConfig } from '@/components/review/live-review';
import { SiteHeader } from '@/components/site-header';
import { ReviewSession } from '@/components/review/review-session';
import { normalizeSourceBaseUrl, parseEnabledSources } from '@/domain/review/fetch-source';
import { REVIEW_SOURCE_APP_URLS } from '@/lib/catalog';

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

export default function ReviewPage(): React.ReactElement {
  return (
    <>
      <SiteHeader current="wiederholen" />

      <main id="hauptinhalt" className="shell review-page">
        <div className="review-shell">
          <p className="eyebrow">Daily Review</p>
          <h1 className="review-page-title">Wiederholen über alle Lernpfade</h1>
        </div>
        <LiveReview sources={liveSources()} />
        <section className="vocab-pointer" aria-labelledby="vocab-pointer-title">
          <div>
            <p className="eyebrow">Eigene Vokabeln</p>
            <h2 id="vocab-pointer-title">VokabelPfad: deine eigenen Decks</h2>
            <p>
              Englisch ↔ Deutsch mit eigenen Karten, beiden Lernrichtungen und täglicher Wiederholung. Deine
              Vokabeldaten bleiben getrennt von den Live-Quellen und vom Demo-Deck – nur in diesem Browser.
            </p>
          </div>
          <a className="button button-primary" href="/vokabeln">
            Zum VokabelPfad
          </a>
        </section>
        <ReviewSession />
      </main>
    </>
  );
}
