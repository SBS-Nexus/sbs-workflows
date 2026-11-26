import { SiteHeader } from '@/components/site-header';
import { STAND } from '@/lib/rechtliches';

/**
 * E6.1 — Rahmen der Rechtsseiten: ruhiger Fließtext, gut lesbare Zeilen,
 * Inhaltsverzeichnis bei langen Seiten. Keine Bilder, keine Skripte.
 */
export function Rechtsseite({
  titel,
  einleitung,
  inhalt,
  children,
}: {
  titel: string;
  einleitung?: React.ReactNode;
  inhalt?: ReadonlyArray<{ id: string; titel: string }>;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="los-app los-flow recht-seite">
        <header className="los-head">
          <div className="los-head-copy">
            <p className="eyebrow">Rechtliches</p>
            <h1>{titel}</h1>
            {einleitung ? <p>{einleitung}</p> : null}
            <p className="recht-stand">Stand: {STAND}</p>
          </div>
        </header>
        {inhalt && inhalt.length > 0 ? (
          <nav className="los-section recht-inhalt" aria-label="Inhalt">
            <ol>
              {inhalt.map((abschnitt) => (
                <li key={abschnitt.id}>
                  <a href={`#${abschnitt.id}`}>{abschnitt.titel}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <article className="los-section recht-text">{children}</article>
      </main>
    </>
  );
}
