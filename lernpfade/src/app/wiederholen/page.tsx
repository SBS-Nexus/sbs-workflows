import type { Metadata } from 'next';
import { ReviewSession } from './review-session';

export const metadata: Metadata = {
  title: 'Daily 5',
  description:
    'Pfadübergreifende Wiederholung für Python, SQL, Git, AI und später Sprachen.',
};

export default function WiederholenPage(): React.ReactElement {
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
            <a href="/">Alle Pfade</a>
            <a aria-current="page" href="/wiederholen">
              Daily 5
            </a>
          </nav>
        </div>
      </header>

      <main id="hauptinhalt" className="review-page">
        <div className="shell review-layout">
          <div className="review-intro">
            <p className="eyebrow">Pfadübergreifend wiederholen</p>
            <h1>Fünf Karten. Aktiver Abruf. Jeden Tag ein bisschen.</h1>
            <p>
              Python, SQL, Git, AI und später echte Fremdsprachen nutzen denselben Mechanismus.
              Nicht erneut lesen – zuerst selbst erinnern, dann vergleichen.
            </p>
          </div>
          <ReviewSession />
        </div>
      </main>
    </>
  );
}
