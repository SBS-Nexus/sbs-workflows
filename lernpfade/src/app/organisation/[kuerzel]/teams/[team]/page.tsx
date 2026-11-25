import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AusTeamNehmenKnopf, TeamArchivierenKnopf, TeamAufnehmenFormular } from '@/components/organisation/formulare';
import { AnmeldenHinweis, ZweiterFaktorHinweis } from '@/components/organisation/hinweise';
import { Rahmen } from '@/components/organisation/rahmen';
import { darf, ROLLEN_NAME } from '@/domain/organisation/regeln';
import { aktualisiereAnzeigename, kontext } from '@/server/organisation/dienst';
import { team } from '@/server/organisation/teams';
import { ladeTeamStand, teamstandEingerichtet } from '@/server/organisation/teamstand-zugang';
import { TeamstandAnzeige } from '@/components/organisation/teamstand';
import { anmeldeAdresse, orgZugang, zweiterFaktorAdresse } from '@/server/organisation/zugang';

/**
 * E5.2 — ein Team: Personen mit ihrer Einwilligung, aufnehmen, herausnehmen,
 * archivieren. Nur für Admin und Lehrkraft. Der Stand über alle Pfade folgt
 * auf dieser Seite (Summen ab drei Personen, namentlich nur mit Einwilligung).
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamSeite({
  params,
}: {
  params: Promise<{ kuerzel: string; team: string }>;
}): Promise<React.ReactElement> {
  const { kuerzel, team: teamKuerzel } = await params;
  const zugang = await orgZugang();
  if (!zugang) notFound();
  const { db, konto, person } = zugang;
  const hier = `/organisation/${kuerzel}/teams/${teamKuerzel}`;

  if (!person) {
    return (
      <Rahmen titel="Team">
        <AnmeldenHinweis adresse={anmeldeAdresse(hier)} text="Melde dich an, um dieses Team zu öffnen." />
      </Rahmen>
    );
  }
  await aktualisiereAnzeigename(db, person);
  const k = await kontext(db, person.sub, kuerzel);
  if (!k || !darf(k.rolle, 'teams.verwalten')) notFound();
  const zurueck = { href: `/organisation/${k.kuerzel}`, text: k.name };

  if (!person.zweiFaktoren) {
    return (
      <Rahmen titel="Team" rolle={ROLLEN_NAME[k.rolle]} zurueck={zurueck}>
        <ZweiterFaktorHinweis einrichten={zweiterFaktorAdresse(konto)} erneutAnmelden={anmeldeAdresse(hier, true)} />
      </Rahmen>
    );
  }

  const t = await team(db, k, person, teamKuerzel);
  if (!t) notFound();
  const stand = teamstandEingerichtet() && t.mitglieder > 0 ? await ladeTeamStand(db, k, person, t.id) : null;

  return (
    <Rahmen titel={t.name} rolle={ROLLEN_NAME[k.rolle]} zurueck={zurueck}>
      <section className="los-section" aria-labelledby="team-personen">
        <h2 id="team-personen">
          {t.mitglieder} {t.mitglieder === 1 ? 'Person' : 'Personen'}
          {t.archiviert ? ' · archiviert' : ''}
        </h2>
        <p className="org-text">
          {t.freigaben} von {t.mitglieder} zeigen ihren Stand namentlich. Die übrigen zählen nur in Summen, und Summen
          gibt es erst ab drei Personen. Ob jemand namentlich erscheint, entscheidet allein die Person selbst.
        </p>
        {t.personen.length > 0 ? (
          <ul className="org-tabelle" aria-label="Personen im Team">
            {t.personen.map((p) => (
              <li key={p.teamMitgliedId}>
                <span>
                  <strong>{p.name}</strong> · {ROLLEN_NAME[p.rolle]}
                </span>
                <span className="org-gedaempft">{p.freigabe ? 'namentlich sichtbar' : 'nur in Summen'}</span>
                <AusTeamNehmenKnopf kuerzel={k.kuerzel} teamMitglied={p.teamMitgliedId} name={p.name} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="org-leer">Noch niemand im Team. Nimm Mitglieder auf oder lade direkt in dieses Team ein.</p>
        )}
        {!t.archiviert && t.kandidaten.length > 0 ? (
          <TeamAufnehmenFormular
            kuerzel={k.kuerzel}
            team={t.id}
            kandidaten={t.kandidaten.map((c) => ({ ...c, rolle: ROLLEN_NAME[c.rolle] }))}
          />
        ) : null}
      </section>

      <section className="los-section" aria-labelledby="team-stand">
        <h2 id="team-stand">Stand des Teams</h2>
        <p className="org-text">
          Je Pfad als Summe ab drei Personen; namentlich nur, wer es selbst erlaubt. Gelesen aus den Pfaden, nichts
          wird hier gespeichert oder verändert.
        </p>
        {stand ? (
          <TeamstandAnzeige stand={stand} csvAdresse={`/organisation/${k.kuerzel}/teams/${t.kuerzel}/export`} />
        ) : (
          <p className="org-leer">
            {t.mitglieder === 0
              ? 'Sobald Personen im Team sind, erscheint hier ihr Stand.'
              : 'Die Verbindung zu den Lernpfaden ist noch nicht eingerichtet.'}
          </p>
        )}
      </section>

      <section className="los-section" aria-labelledby="team-verwaltung">
        <h2 id="team-verwaltung">Team verwalten</h2>
        <p className="org-text">
          {t.archiviert
            ? 'Archivierte Teams bleiben lesbar, nehmen aber niemanden auf. Einladungen in dieses Team führen nur noch in die Organisation.'
            : 'Archivieren beendet das Team, ohne etwas zu löschen. Du kannst es jederzeit wieder öffnen.'}
        </p>
        <TeamArchivierenKnopf kuerzel={k.kuerzel} team={t.id} archiviert={t.archiviert} />
      </section>
    </Rahmen>
  );
}
