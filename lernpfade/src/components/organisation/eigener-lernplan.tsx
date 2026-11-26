'use client';

import { useEffect, useState } from 'react';
import { eintragsStatus, heuteTag, PFAD_NAME, PFADE, STATUS_TEXT, zielText, type Pfad } from '@/domain/lernplan/regeln';
import { parseSourceProgress } from '@/domain/progress/contract';
import { fetchProgressViaHub } from '@/domain/progress/fetch-progress';

/**
 * E5.3 — „Dein Lernplan“: die Pläne der eigenen Teams mit dem eigenen Stand.
 * Der Stand kommt wie auf /fortschritt über den Hub-Server (ein Abruf, mit
 * dem Zugriffstoken der Person); gerechnet wird hier im Browser. Die
 * Organisation sieht davon nichts.
 */

type PlanDaten = {
  team: string;
  plan: { name: string; eintraege: Array<{ id: string; pfad: Pfad; ziel: number | null; faellig: string | null }> };
};
type Stand = { abgeschlossen: number; gesamt: number } | null;
type Laden = { art: 'laedt' } | { art: 'fertig'; staende: Record<Pfad, Stand | 'nicht-verfuegbar'> } | { art: 'abgelaufen' };

const tag = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'UTC' });

export function EigenerLernplan({
  plaene,
  appAdressen,
  anmelden,
}: {
  plaene: readonly PlanDaten[];
  appAdressen: Readonly<Record<Pfad, string | null>>;
  anmelden: string;
}): React.ReactElement {
  const [laden, setLaden] = useState<Laden>({ art: 'laedt' });
  const [heute] = useState(() => heuteTag(new Date()));

  useEffect(() => {
    let aktiv = true;
    void fetchProgressViaHub([...PFADE], (url, init) => fetch(url, init)).then(({ abgemeldet, outcomes }) => {
      if (!aktiv) return;
      if (abgemeldet) return setLaden({ art: 'abgelaufen' });
      const staende = Object.fromEntries(
        outcomes.map((o) => {
          if (o.status === 'unauthenticated') return [o.source, null];
          if (o.status !== 'ok') return [o.source, 'nicht-verfuegbar'];
          try {
            const p = parseSourceProgress(o.body, o.source);
            return [o.source, { abgeschlossen: p.lessons.completed, gesamt: p.lessons.total }];
          } catch {
            return [o.source, 'nicht-verfuegbar'];
          }
        }),
      ) as Record<Pfad, Stand | 'nicht-verfuegbar'>;
      setLaden({ art: 'fertig', staende });
    });
    return () => {
      aktiv = false;
    };
  }, []);

  return (
    <section className="los-section" aria-labelledby="org-lernplan">
      <h2 id="org-lernplan">Dein Lernplan</h2>
      {laden.art === 'abgelaufen' ? (
        <p className="org-text">
          Deine Anmeldung bei Lernpfade ist abgelaufen. <a href={anmelden}>Erneut anmelden</a>
        </p>
      ) : null}
      {plaene.map(({ team, plan }) => (
        <div key={team} className="org-plan-block">
          <h3 className="org-unterkopf">
            {plan.name} <span className="org-gedaempft">· Team {team}</span>
          </h3>
          <ol className="org-tabelle org-plan" aria-label={`Lernplan ${plan.name}`}>
            {plan.eintraege.map((e, i) => {
              const s = laden.art === 'fertig' ? laden.staende[e.pfad] : undefined;
              const status = s !== undefined && s !== 'nicht-verfuegbar' ? eintragsStatus(e, s, heute) : null;
              const adresse = appAdressen[e.pfad];
              return (
                <li key={e.id}>
                  <span>
                    <strong>
                      {i + 1}. {PFAD_NAME[e.pfad]}
                    </strong>{' '}
                    · {zielText(e.ziel)}
                    {e.faellig ? ` · fällig ${tag.format(new Date(`${e.faellig}T00:00:00Z`))}` : ''}
                  </span>
                  <span className="org-gedaempft" role={laden.art === 'laedt' ? 'status' : undefined}>
                    {laden.art === 'laedt'
                      ? 'Stand wird geladen …'
                      : s === 'nicht-verfuegbar'
                        ? 'Stand gerade nicht verfügbar'
                        : status
                          ? `${s ? `${s.abgeschlossen} von ${e.ziel ?? s.gesamt} · ` : ''}`
                          : ''}
                    {status ? <span className={`org-status org-status-${status}`}>{STATUS_TEXT[status]}</span> : null}
                  </span>
                  {adresse && status !== 'erreicht' ? (
                    <a className="org-weiter" href={adresse}>
                      In {PFAD_NAME[e.pfad]} weiterlernen
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
