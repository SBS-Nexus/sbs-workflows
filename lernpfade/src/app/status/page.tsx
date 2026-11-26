import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { DIENST_TEXT, GESAMT_TEXT } from '@/domain/status/status';
import { plattformPruefungen } from '@/server/status/dienste';
import { statusbericht } from '@/server/status/pruefung';

/**
 * E6.2 — Öffentliche Statusseite: Zustand und Antwortzeit je Dienst, höchstens
 * 30 Sekunden alt. Keine Interna (Adressen, Versionen, Fehlermeldungen).
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Status',
  description: 'Ob Lernpfade, das Lernpfade-Konto und die einzelnen Pfade gerade erreichbar sind.',
};

const zeit = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Europe/Berlin' });

export default async function StatusSeite(): Promise<React.ReactElement> {
  const bericht = await statusbericht(plattformPruefungen);
  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="los-app los-flow status-page">
        <header className="los-head">
          <div className="los-head-copy">
            <p className="eyebrow">Status</p>
            <h1>
              <span className={`status-punkt status-${bericht.gesamt}`} aria-hidden="true" /> {GESAMT_TEXT[bericht.gesamt]}
            </h1>
            <p>
              Geprüft am <time dateTime={bericht.geprueftAm}>{zeit.format(new Date(bericht.geprueftAm))}</time>. Die Seite
              misst höchstens alle 30 Sekunden neu.
            </p>
          </div>
        </header>
        <section className="los-section" aria-labelledby="status-dienste">
          <h2 id="status-dienste">Dienste</h2>
          <ul className="org-tabelle status-liste" aria-label="Dienste">
            {bericht.dienste.map((d) => (
              <li key={d.id}>
                <span>
                  <strong>{d.name}</strong>
                  {d.kritisch ? <span className="org-gedaempft"> · für die Anmeldung nötig</span> : null}
                </span>
                <span className={`status-marke status-${d.status}`}>{DIENST_TEXT[d.status]}</span>
                <span className="org-gedaempft">{d.ms !== null ? `${d.ms} ms` : '—'}</span>
              </li>
            ))}
          </ul>
          <p className="org-text">
            Fällt ein einzelner Pfad aus, bleiben die anderen nutzbar. Dein Lernstand liegt sicher in den Pfaden, auch
            wenn diese Seite eine Störung zeigt.
          </p>
        </section>
      </main>
    </>
  );
}
