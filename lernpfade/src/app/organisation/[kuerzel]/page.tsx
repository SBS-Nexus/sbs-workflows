import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  EinladenFormular,
  FreigabeSchalter,
  MitgliedVerwalten,
  TeamAnlegenFormular,
  UmbenennenFormular,
  VerlassenKnopf,
  WiderrufenKnopf,
} from '@/components/organisation/formulare';
import { AnmeldenHinweis, ZweiterFaktorHinweis } from '@/components/organisation/hinweise';
import { Rahmen } from '@/components/organisation/rahmen';
import { ProgressBar } from '@/components/ui/primitives';
import { brauchtZweitenFaktor, darf, darfEinladenAls, ROLLEN, ROLLEN_NAME } from '@/domain/organisation/regeln';
import { aktualisiereAnzeigename, kontext, protokoll, uebersicht, type OrgKontext } from '@/server/organisation/dienst';
import { eigeneTeams, teamsVon } from '@/server/organisation/teams';
import { eigeneLernplaene } from '@/server/organisation/lernplan';
import { EigenerLernplan } from '@/components/organisation/eigener-lernplan';
import { normalizeSourceBaseUrl } from '@/domain/review/fetch-source';
import { REVIEW_SOURCE_APP_URLS } from '@/lib/catalog';
import { anmeldeAdresse, orgZugang, zweiterFaktorAdresse } from '@/server/organisation/zugang';

/**
 * E5.1 — eine Organisation. Lernende sehen ihre Rolle und können austreten.
 * Admin und Lehrkraft sehen Plätze, Mitglieder und Einladungen (mit zweitem
 * Faktor); Admins zusätzlich Rollen, Name und Prüfprotokoll.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Organisation' };

const datum = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'Europe/Berlin' });
const zeitpunkt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });

export default async function OrganisationSeite({
  params,
}: {
  params: Promise<{ kuerzel: string }>;
}): Promise<React.ReactElement> {
  const { kuerzel } = await params;
  const zugang = await orgZugang();
  if (!zugang) notFound();
  const { db, konto, person } = zugang;
  const hier = `/organisation/${kuerzel}`;

  if (!person) {
    return (
      <Rahmen titel="Organisation">
        <AnmeldenHinweis adresse={anmeldeAdresse(hier)} text="Melde dich an, um diese Organisation zu öffnen." />
      </Rahmen>
    );
  }

  await aktualisiereAnzeigename(db, person);
  const k = await kontext(db, person.sub, kuerzel);
  // Wer nicht Mitglied ist, erfährt nicht, ob es die Organisation gibt.
  if (!k) notFound();

  const leitung = brauchtZweitenFaktor(k.rolle);
  if (leitung && !person.zweiFaktoren) {
    return (
      <Rahmen titel={k.name} rolle={ROLLEN_NAME[k.rolle]}>
        <ZweiterFaktorHinweis einrichten={zweiterFaktorAdresse(konto)} erneutAnmelden={anmeldeAdresse(hier, true)} />
        <section className="los-section" aria-labelledby="org-austreten">
          <h2 id="org-austreten">Mitgliedschaft</h2>
          <VerlassenKnopf kuerzel={k.kuerzel} name={k.name} />
        </section>
      </Rahmen>
    );
  }

  const [meineTeams, meinePlaene] = await Promise.all([eigeneTeams(db, k, person), eigeneLernplaene(db, k, person)]);
  const lernplan =
    meinePlaene.length > 0 ? (
      <EigenerLernplan
        plaene={meinePlaene}
        anmelden={anmeldeAdresse(hier)}
        appAdressen={{
          python: normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS.python),
          sql: normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS.sql),
          ai: normalizeSourceBaseUrl(REVIEW_SOURCE_APP_URLS.ai),
        }}
      />
    ) : null;

  if (!leitung) {
    return (
      <Rahmen titel={k.name} rolle={ROLLEN_NAME[k.rolle]}>
        <section className="los-section" aria-labelledby="org-lernend">
          <h2 id="org-lernend">Du lernst hier mit</h2>
          <p className="org-text">
            Deine Organisation sieht von dir ohne deine Einwilligung keine Einzelwerte – nur Summen über Teams ab
            drei Personen. Dein Lernstand bleibt in deinen Pfaden und bei dir, auch wenn du austrittst.
          </p>
        </section>
        {lernplan}
        <EigeneTeams kuerzel={k.kuerzel} teams={meineTeams} />
        <section className="los-section" aria-labelledby="org-austreten">
          <h2 id="org-austreten">Mitgliedschaft</h2>
          <VerlassenKnopf kuerzel={k.kuerzel} name={k.name} />
        </section>
      </Rahmen>
    );
  }

  const [u, eintraege, teams] = await Promise.all([
    uebersicht(db, k, person),
    darf(k.rolle, 'protokoll.lesen') ? protokoll(db, k, person) : Promise.resolve(null),
    teamsVon(db, k, person),
  ]);
  const offeneTeams = teams.filter((t) => !t.archiviert).map((t) => ({ id: t.id, name: t.name }));
  const verwaltet = darf(k.rolle, 'mitglieder.verwalten');
  const einladbar = ROLLEN.filter((r) => darfEinladenAls(k.rolle, r)).map((r) => ({ wert: r, name: ROLLEN_NAME[r] }));

  return (
    <Rahmen titel={k.name} rolle={ROLLEN_NAME[k.rolle]}>
      <section className="los-section" aria-labelledby="org-plaetze">
        <h2 id="org-plaetze">Plätze</h2>
        <ProgressBar
          value={u.plaetze.belegt}
          max={Math.max(u.plaetze.gesamt, u.plaetze.belegt)}
          label={`${u.plaetze.belegt} von ${u.plaetze.gesamt} Plätzen für Lernende belegt`}
        />
        <p className="org-text">
          {u.plaetze.frei > 0
            ? `${u.plaetze.frei} ${u.plaetze.frei === 1 ? 'Platz ist' : 'Plätze sind'} frei. Admins und Lehrkräfte belegen keinen Platz.`
            : 'Alle Plätze sind belegt. Weitere Lernende können erst beitreten, wenn ein Platz frei wird.'}
        </p>
      </section>

      <section className="los-section" aria-labelledby="org-einladen">
        <h2 id="org-einladen">Einladen</h2>
        <EinladenFormular kuerzel={k.kuerzel} rollen={einladbar} freiePlaetze={u.plaetze.frei} teams={offeneTeams} />
        {u.einladungen.length > 0 ? (
          <>
            <h3 className="org-unterkopf">Offene Einladungen</h3>
            <ul className="org-tabelle" aria-label="Offene Einladungen">
              {u.einladungen.map((e) => (
                <li key={e.id}>
                  <span>
                    <strong>{ROLLEN_NAME[e.rolle]}</strong>
                    {e.email ? ` · für ${e.email}` : ` · ${e.nutzungen} von ${e.maxNutzungen} genutzt`}
                    {e.team ? ` · Team ${e.team}` : ''}
                  </span>
                  <span className="org-gedaempft">gilt bis {datum.format(e.gueltigBis)}</span>
                  {darfEinladenAls(k.rolle, e.rolle) ? <WiderrufenKnopf kuerzel={k.kuerzel} einladung={e.id} /> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="los-section" aria-labelledby="org-teams">
        <h2 id="org-teams">Teams</h2>
        <p className="org-text">
          Teams bündeln Personen, etwa eine Abteilung oder einen Kurs. Den Stand eines Teams gibt es nur als Summe ab
          drei Personen; namentlich nur von denen, die es selbst erlauben.
        </p>
        {teams.length > 0 ? (
          <ul className="org-tabelle" aria-label="Teams">
            {teams.map((t) => (
              <li key={t.id}>
                <span>
                  <a href={`/organisation/${k.kuerzel}/teams/${t.kuerzel}`}>
                    <strong>{t.name}</strong>
                  </a>
                  {t.archiviert ? ' · archiviert' : ''}
                </span>
                <span className="org-gedaempft">
                  {t.mitglieder} {t.mitglieder === 1 ? 'Person' : 'Personen'} · {t.freigaben} namentlich sichtbar
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <TeamAnlegenFormular kuerzel={k.kuerzel} />
      </section>

      <section className="los-section" aria-labelledby="org-mitglieder">
        <h2 id="org-mitglieder">Mitglieder ({u.mitglieder.length})</h2>
        <ul className="org-tabelle" aria-label="Mitglieder">
          {u.mitglieder.map((m) => (
            <li key={m.id}>
              <span>
                <strong>{m.name}</strong>
                {m.selbst ? ' (du)' : ''}
              </span>
              <span className="org-gedaempft">
                {ROLLEN_NAME[m.rolle]} · seit {datum.format(m.seit)}
              </span>
              {verwaltet && !m.selbst ? (
                <MitgliedVerwalten kuerzel={k.kuerzel} mitglied={m.id} name={m.name} rolle={m.rolle} />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {darf(k.rolle, 'organisation.umbenennen') ? (
        <section className="los-section" aria-labelledby="org-einstellungen">
          <h2 id="org-einstellungen">Einstellungen</h2>
          <UmbenennenFormular kuerzel={k.kuerzel} name={k.name} />
        </section>
      ) : null}

      {eintraege ? (
        <section className="los-section" aria-labelledby="org-protokoll">
          <h2 id="org-protokoll">Prüfprotokoll</h2>
          <p className="org-text">Wer wann was verwaltet hat. Was jemand gelernt hat, steht hier nie.</p>
          <ol className="org-protokoll">
            {eintraege.map((e, i) => (
              <li key={i}>
                <time dateTime={e.wann.toISOString()}>{zeitpunkt.format(e.wann)}</time>
                <span>{e.satz}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {lernplan}
      {meineTeams.length > 0 ? <EigeneTeams kuerzel={k.kuerzel} teams={meineTeams} /> : null}

      <section className="los-section" aria-labelledby="org-austreten">
        <h2 id="org-austreten">Mitgliedschaft</h2>
        <VerlassenKnopf kuerzel={k.kuerzel} name={k.name} />
      </section>
    </Rahmen>
  );
}

/** Eigene Teams mit der Einwilligung, die nur die Person selbst ändert. */
function EigeneTeams({
  kuerzel,
  teams,
}: {
  kuerzel: OrgKontext['kuerzel'];
  teams: Awaited<ReturnType<typeof eigeneTeams>>;
}): React.ReactElement {
  return (
    <section className="los-section" aria-labelledby="org-eigene-teams">
      <h2 id="org-eigene-teams">Deine Teams</h2>
      {teams.length === 0 ? (
        <p className="org-leer">Du bist noch in keinem Team.</p>
      ) : (
        <>
          <p className="org-text">
            Du entscheidest je Team, ob Admins und Lehrkräfte deinen Stand namentlich sehen: abgeschlossene Lektionen,
            fällige Wiederholungen und den Tag deiner letzten Aktivität – nie Versuche, Zeiten oder Code. Ohne deine
            Einwilligung zählst du nur in Summen ab drei Personen. Du kannst sie jederzeit zurücknehmen.
          </p>
          <ul className="org-tabelle" aria-label="Deine Teams">
            {teams.map((t) => (
              <li key={t.teamMitgliedId}>
                <span>
                  <strong>{t.team}</strong>
                  {t.archiviert ? ' · archiviert' : ''}
                </span>
                <span className="org-gedaempft">
                  {t.freigabe
                    ? `namentlich sichtbar${t.seit ? ` seit ${datum.format(t.seit)}` : ''}`
                    : 'nur in Summen'}
                </span>
                <FreigabeSchalter kuerzel={kuerzel} teamMitglied={t.teamMitgliedId} team={t.team} freigabe={t.freigabe} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
