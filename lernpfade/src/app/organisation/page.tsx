import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { OrbitMark } from '@/components/learning-os/orbit';
import { AnlegenFormular } from '@/components/organisation/formulare';
import { AnmeldenHinweis, ZweiterFaktorHinweis } from '@/components/organisation/hinweise';
import { ROLLEN_NAME, TESTPHASE_PLAETZE } from '@/domain/organisation/regeln';
import { aktualisiereAnzeigename, organisationenVon } from '@/server/organisation/dienst';
import { anmeldeAdresse, orgZugang, zweiterFaktorAdresse } from '@/server/organisation/zugang';

/**
 * E5.1 — Organisationen: eigene Mitgliedschaften und eine neue Organisation
 * anlegen. Ohne gemeinsames Konto oder Datenbank gibt es die Seite nicht.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organisation',
  description:
    'Lernpfade für Teams: eine Organisation für alle Pfade, Einladungen per Link, Rollen und Plätze. Der Lernstand bleibt bei jeder Person.',
};

export default async function OrganisationenSeite(): Promise<React.ReactElement> {
  const zugang = await orgZugang();
  if (!zugang) notFound();
  const { db, konto, person } = zugang;
  if (person) await aktualisiereAnzeigename(db, person);
  const eigene = person ? await organisationenVon(db, person.sub) : [];

  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="los-app los-flow org-page">
        <header className="los-head">
          <div className="los-head-grid">
            <div className="los-head-copy">
              <p className="eyebrow">Für Teams und Unternehmen</p>
              <h1>
                Gemeinsam <em>lernen</em>
              </h1>
              <p>
                Eine Organisation für alle Lernpfade: Ladet euer Team per Link ein, verteilt Rollen und behaltet
                die Plätze im Blick. Der Lernstand bleibt bei jeder Person in ihren Pfaden; eure Organisation
                sieht Einzelwerte nur mit deren Einwilligung.
              </p>
            </div>
            <div className="los-head-side">
              <OrbitMark />
              <ul className="los-head-facts" aria-label="So funktionieren Organisationen">
                <li>
                  <strong>Ein Konto</strong>
                  Privat und im Team mit demselben Lernpfade-Konto.
                </li>
                <li>
                  <strong>Nur mit Einwilligung</strong>
                  Ohne Zustimmung nur Summen, und erst ab drei Personen.
                </li>
                <li>
                  <strong>Testphase</strong>
                  {TESTPHASE_PLAETZE} Plätze für Lernende, kostenlos.
                </li>
              </ul>
            </div>
          </div>
        </header>

        {!person ? (
          <section className="los-section" aria-labelledby="org-anmelden">
            <h2 id="org-anmelden">Deine Organisationen</h2>
            <AnmeldenHinweis
              adresse={anmeldeAdresse('/organisation')}
              text="Melde dich mit deinem Lernpfade-Konto an, um deine Organisationen zu sehen oder eine neue anzulegen."
            />
          </section>
        ) : (
          <>
            <section className="los-section" aria-labelledby="org-eigene">
              <h2 id="org-eigene">Deine Organisationen</h2>
              {eigene.length === 0 ? (
                <p className="org-leer">Du bist noch in keiner Organisation. Mit einem Einladungslink trittst du bei.</p>
              ) : (
                <ul className="org-liste">
                  {eigene.map((o) => (
                    <li key={o.kuerzel}>
                      <a href={`/organisation/${o.kuerzel}`}>{o.name}</a>
                      <span className="org-rolle">{ROLLEN_NAME[o.rolle]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="los-section" aria-labelledby="org-neu">
              <h2 id="org-neu">Neue Organisation anlegen</h2>
              <p className="org-text">
                Wer anlegt, wird Admin. In der Testphase stehen {TESTPHASE_PLAETZE} Plätze für Lernende bereit;
                Admins und Lehrkräfte belegen keinen Platz.
              </p>
              {person.zweiFaktoren ? (
                <AnlegenFormular />
              ) : (
                <ZweiterFaktorHinweis
                  einrichten={zweiterFaktorAdresse(konto)}
                  erneutAnmelden={anmeldeAdresse('/organisation', true)}
                />
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
