import { ButtonLink } from '@/components/ui/primitives';
import { TEAM_SOURCES, type TeamSourceName } from '@/domain/team/contract';
import { PFAD_NAME } from '@/domain/team/csv';
import type { QuellenStand, TeamStand } from '@/server/organisation/teamstand';

/**
 * E5.2 — Stand des Teams über alle Pfade. Je Pfad Summen (ab drei Personen,
 * die den Pfad nutzen), darunter eine Zeile je Person mit Einwilligung. Kein
 * Gesamtprozent, keine Rangliste, keine Uhrzeiten.
 */

const tag = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'UTC' });
const zahl = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

function letzterTag(wert: string | null): string {
  return wert ? `zuletzt ${tag.format(new Date(`${wert}T00:00:00Z`))}` : 'noch keine Aktivität';
}

function Pfadkarte({ quelle, stand }: { quelle: TeamSourceName; stand: QuellenStand }): React.ReactElement {
  return (
    <article className="org-pfad" aria-labelledby={`stand-${quelle}`}>
      <h3 id={`stand-${quelle}`}>{PFAD_NAME[quelle]}</h3>
      {stand.status === 'ok' ? (
        <>
          <p className="org-gedaempft">
            {stand.quelle.bekannt} von {stand.quelle.angefragt} Personen lernen in {PFAD_NAME[quelle]}.
          </p>
          {stand.quelle.summen ? (
            <dl className="org-kennzahlen">
              <div>
                <dt>Aktiv</dt>
                <dd>
                  {stand.quelle.summen.aktiv} von {stand.quelle.summen.personen}
                </dd>
              </div>
              <div>
                <dt>Lektionen je Person</dt>
                <dd>
                  Ø {zahl.format(stand.quelle.summen.lektionen.abgeschlossen / stand.quelle.summen.personen)} von{' '}
                  {stand.quelle.summen.lektionen.jePerson}
                </dd>
              </div>
              <div>
                <dt>Fällige Wiederholungen</dt>
                <dd>{stand.quelle.summen.wiederholungenFaellig}</dd>
              </div>
            </dl>
          ) : (
            <p className="org-text">
              Summen erscheinen ab drei Personen, die {PFAD_NAME[quelle]} nutzen. Bei weniger wären es Aussagen über
              Einzelne.
            </p>
          )}
        </>
      ) : (
        <p className="org-text">
          {stand.status === 'nicht-eingerichtet'
            ? 'Noch nicht mit der Plattform verbunden.'
            : stand.status === 'nicht-erreichbar'
              ? 'Gerade nicht erreichbar. Die anderen Pfade bleiben sichtbar.'
              : 'Die Antwort war unvollständig; angezeigt wird deshalb nichts.'}
        </p>
      )}
    </article>
  );
}

export function TeamstandAnzeige({ stand, csvAdresse }: { stand: TeamStand; csvAdresse: string }): React.ReactElement {
  const benannt = stand.personen.filter((p) => p.freigabe);
  const wert = (quelle: TeamSourceName, sub: string): string => {
    const q = stand.quellen[quelle];
    if (q.status !== 'ok') return '—';
    const b = q.quelle.benannt.find((x) => x.sub === sub);
    if (!b) return 'nicht begonnen';
    return `${b.lektionen.completed} von ${b.lektionen.total} Lektionen · ${b.wiederholungenFaellig} fällig · ${letzterTag(b.letzteAktivitaet)}`;
  };
  return (
    <>
      <div className="org-pfade">
        {TEAM_SOURCES.map((q) => (
          <Pfadkarte key={q} quelle={q} stand={stand.quellen[q]} />
        ))}
      </div>
      <h3 className="org-unterkopf">Namentlich, mit Einwilligung</h3>
      {benannt.length === 0 ? (
        <p className="org-leer">Noch niemand im Team zeigt den eigenen Stand namentlich.</p>
      ) : (
        <ul className="org-tabelle" aria-label="Stand namentlich">
          {benannt.map((p) => (
            <li key={p.sub} className="org-person">
              <strong>{p.name}</strong>
              <ul className="org-person-pfade">
                {TEAM_SOURCES.map((q) => (
                  <li key={q}>
                    <span className="org-gedaempft">{PFAD_NAME[q]}:</span> {wert(q, p.sub)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="org-aktionen">
        <ButtonLink variant="secondary" href={csvAdresse}>
          Als CSV herunterladen
        </ButtonLink>
      </p>
    </>
  );
}
