import { EintragFormular, EintragSteuerung, PlanAnlegenFormular, PlanLoeschenKnopf } from '@/components/organisation/formulare';
import { eintragsStatus, PFAD_NAME, STATUS_TEXT, zielText, type Pfad } from '@/domain/lernplan/regeln';
import type { Plan, PlanEintrag } from '@/server/organisation/lernplan';
import type { TeamStand } from '@/server/organisation/teamstand';

/**
 * E5.3 — Lernplan auf der Teamseite: bearbeiten und sehen, wie weit das Team
 * ist. Summen nur, wo die Team-Quelle sie liefert (ab drei Personen);
 * namentlich nur Personen mit Einwilligung.
 */

const zahl = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const tag = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'UTC' });

export function faelligText(faellig: string | null): string {
  return faellig ? `fällig ${tag.format(new Date(`${faellig}T00:00:00Z`))}` : 'ohne Fälligkeit';
}

function Erfuellung({ eintrag, stand, heute }: { eintrag: PlanEintrag; stand: TeamStand | null; heute: string }): React.ReactElement | null {
  if (!stand) return null;
  const q = stand.quellen[eintrag.pfad as Pfad];
  if (q.status !== 'ok') {
    return <p className="org-gedaempft">Stand aus {PFAD_NAME[eintrag.pfad]} gerade nicht verfügbar.</p>;
  }
  const benannt = stand.personen.filter((p) => p.freigabe);
  return (
    <div className="org-erfuellung">
      <p className="org-gedaempft">
        {q.quelle.summen
          ? `Team: Ø ${zahl.format(q.quelle.summen.lektionen.abgeschlossen / q.quelle.summen.personen)} von ${
              eintrag.ziel ?? q.quelle.summen.lektionen.jePerson
            } Lektionen (${q.quelle.summen.personen} Personen)`
          : 'Team: Summen erscheinen ab drei Personen, die den Pfad nutzen.'}
      </p>
      {benannt.length > 0 ? (
        <ul className="org-person-pfade" aria-label={`Namentlich: ${PFAD_NAME[eintrag.pfad]}`}>
          {benannt.map((p) => {
            const b = q.quelle.benannt.find((x) => x.sub === p.sub);
            const status = eintragsStatus(
              eintrag,
              b ? { abgeschlossen: b.lektionen.completed, gesamt: b.lektionen.total } : null,
              heute,
            );
            return (
              <li key={p.sub}>
                {p.name}: <span className={`org-status org-status-${status}`}>{STATUS_TEXT[status]}</span>
                {b ? ` · ${b.lektionen.completed} von ${eintrag.ziel ?? b.lektionen.total}` : ''}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function LernplanTeam({
  kuerzel,
  teamId,
  plan,
  stand,
  heute,
  archiviert,
}: {
  kuerzel: string;
  teamId: string;
  plan: Plan | null;
  stand: TeamStand | null;
  heute: string;
  archiviert: boolean;
}): React.ReactElement {
  if (!plan) {
    return archiviert ? (
      <p className="org-leer">Dieses Team ist archiviert und hat keinen Lernplan.</p>
    ) : (
      <>
        <p className="org-text">
          Ein Lernplan gibt dem Team Pfade, Reihenfolge und Ziele vor – etwa „PythonPfad, 10 Lektionen, bis 31. März“.
          Jede Person sieht ihn unter „Dein Lernplan“ mit ihrem eigenen Stand.
        </p>
        <PlanAnlegenFormular kuerzel={kuerzel} team={teamId} />
      </>
    );
  }
  return (
    <>
      <h3 className="org-unterkopf">{plan.name}</h3>
      {plan.eintraege.length === 0 ? (
        <p className="org-leer">Noch keine Einträge. Füge den ersten Pfad mit Ziel hinzu.</p>
      ) : (
        <ol className="org-tabelle org-plan" aria-label="Einträge des Lernplans">
          {plan.eintraege.map((e, i) => {
            const beschreibung = `${PFAD_NAME[e.pfad]} (${zielText(e.ziel)})`;
            return (
              <li key={e.id}>
                <span>
                  <strong>
                    {i + 1}. {PFAD_NAME[e.pfad]}
                  </strong>{' '}
                  · {zielText(e.ziel)} · {faelligText(e.faellig)}
                </span>
                <EintragSteuerung
                  kuerzel={kuerzel}
                  eintrag={e.id}
                  erster={i === 0}
                  letzter={i === plan.eintraege.length - 1}
                  beschreibung={beschreibung}
                />
                <Erfuellung eintrag={e} stand={stand} heute={heute} />
              </li>
            );
          })}
        </ol>
      )}
      {!archiviert ? <EintragFormular kuerzel={kuerzel} plan={plan.id} /> : null}
      <p className="org-aktionen">
        <PlanLoeschenKnopf kuerzel={kuerzel} plan={plan.id} name={plan.name} />
      </p>
    </>
  );
}
