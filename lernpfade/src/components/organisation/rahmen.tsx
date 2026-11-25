import { SiteHeader } from '@/components/site-header';

/**
 * Seitenrahmen der Organisationsseiten: Kopf mit Brotkrumen und Rolle.
 * `zurueck` führt eine Ebene höher (etwa vom Team zur Organisation).
 */
export function Rahmen({
  titel,
  rolle,
  zurueck,
  children,
}: {
  titel: string;
  rolle?: string;
  zurueck?: { href: string; text: string };
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="los-app los-flow org-page">
        <header className="los-head">
          <div className="los-head-copy">
            <p className="eyebrow">
              <a href="/organisation">Organisationen</a>
              {zurueck ? (
                <>
                  {' · '}
                  <a href={zurueck.href}>{zurueck.text}</a>
                </>
              ) : null}
              {rolle ? ` · du bist ${rolle}` : null}
            </p>
            <h1>{titel}</h1>
          </div>
        </header>
        {children}
      </main>
    </>
  );
}
