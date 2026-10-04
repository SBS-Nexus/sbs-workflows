import type { Metadata } from 'next';
import { LiveReview, type LiveSourceConfig } from '@/components/review/live-review';
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
    'Fällige Wiederholungen aus PythonPfad, SQLPfad und AIPfad an einem Ort – plus ein Demo-Deck für Vokabeln und Technik.',
};

export default function ReviewPage(): React.ReactElement {
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="/" aria-label="Lernpfade Startseite">
            <span className="brand-mark" aria-hidden="true">
              LP
            </span>
            <span>
              <strong>Lernpfade</strong>
              <small>SBS Nexus Learning</small>
            </span>
          </a>
          <nav aria-label="Seitennavigation">
            <a href="/">Pfade</a>
            <a href="/wiederholen" aria-current="page">
              Wiederholen
            </a>
          </nav>
        </div>
      </header>

      <main id="hauptinhalt" className="shell review-page">
        <div className="review-shell">
          <p className="eyebrow">Daily Review</p>
          <h1 className="review-page-title">Wiederholen über alle Lernpfade</h1>
        </div>
        <LiveReview sources={liveSources()} />
        <ReviewSession />
      </main>
    </>
  );
}
