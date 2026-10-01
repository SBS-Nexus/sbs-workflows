import type { Metadata } from 'next';
import { ReviewSession } from '@/components/review/review-session';

export const metadata: Metadata = {
  title: 'Wiederholen',
  description:
    'Pfadübergreifende Daily-Review-Demo für Vokabeln, Python, SQL, Git & GitHub und AI.',
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
        <ReviewSession />
      </main>
    </>
  );
}
