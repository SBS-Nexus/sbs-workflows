'use client';

import { useEffect, useState } from 'react';
import {
  REVIEW_FEDERATION_LIMITS,
  federateReviewSources,
  type FederatedReview,
  type FederatedReviewItem,
  type FederatedSource,
  type SourceFetchOutcome,
  type SourceHealth,
} from '@/domain/review/federation';
import {
  fetchReviewSource,
  fetchReviewViaHub,
  type SourceEndpoint,
} from '@/domain/review/fetch-source';
import { ButtonLink } from '@/components/ui/primitives';

/**
 * LP-05B — fällige Wiederholungen aus den Lernpfaden, schreibgeschützt.
 *
 * Die Karten hier sind ANZEIGE. Bearbeitet, bewertet und neu geplant wird
 * ausschließlich in der jeweiligen App; deshalb gibt es hier keine
 * Bewertungsknöpfe, sondern einen Weg zurück in die Quelle.
 *
 * E4.5c: Angemeldet im Hub (`viaHub`) fragt der Browser einmal den eigenen
 * Hub (`/api/hub/wiederholen`); der Hub-Server holt die Quellen mit seinem
 * Zugriffstoken. Geprüft und sortiert wird wie bisher hier.
 */

export type LiveSourceConfig = {
  source: FederatedSource;
  label: string;
  appName: string;
  /** Basisadresse der App; `null` = nicht freigeschaltet oder nicht konfiguriert. */
  baseUrl: string | null;
};

type LoadState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; review: FederatedReview }
  /** Der Hub kennt die Sitzung nicht mehr (beim Konto abgemeldet). */
  | { phase: 'abgelaufen' };

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' });

function dueLabel(dueAt: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(dueAt).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'heute fällig';
  if (days === 1) return 'seit gestern fällig';
  return `seit ${days} Tagen fällig`;
}

function SourceNotice({
  config,
  health,
  viaHub,
}: {
  config: LiveSourceConfig;
  health: SourceHealth;
  viaHub: boolean;
}): React.ReactElement | null {
  const appUrl = config.baseUrl;
  switch (health.status) {
    case 'not_configured':
      return null;
    case 'unauthenticated':
      return (
        <li className="live-notice live-notice-auth">
          <strong>{config.label}:</strong>{' '}
          {viaHub
            ? `${config.appName} kennt dein Lernpfade-Konto noch nicht. Melde dich dort einmal an, dann erscheint hier, was fällig ist.`
            : `In ${config.appName} bist du nicht angemeldet.`}{' '}
          {appUrl ? <a href={`${appUrl}/anmelden`}>In {config.appName} anmelden</a> : null}
        </li>
      );
    case 'unavailable':
      return (
        <li className="live-notice live-notice-down">
          <strong>{config.label} derzeit nicht verfügbar.</strong> Andere Wiederholungen bleiben
          nutzbar.
        </li>
      );
    case 'ok':
      if (health.itemCount === 0) {
        return (
          <li className="live-notice">
            <strong>{config.label}:</strong> nichts fällig
            {health.nextDueAt
              ? ` — als Nächstes am ${dateFormat.format(new Date(health.nextDueAt))}.`
              : '.'}
          </li>
        );
      }
      return health.truncated ? (
        <li className="live-notice">
          <strong>{config.label}:</strong> weitere fällige Wiederholungen in {config.appName}.
        </li>
      ) : null;
  }
}

function LiveCard({
  item,
  config,
  now,
}: {
  item: FederatedReviewItem;
  config: LiveSourceConfig;
  now: Date;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const answerId = `live-answer-${item.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <li className="live-card">
      <div className="review-card-meta">
        <span className={`review-domain domain-${item.source}`}>LIVE · {config.label}</span>
        <span>{dueLabel(item.dueAt, now)}</span>
      </div>
      <h3 className="live-title">{item.title}</h3>
      <p className="live-prompt">{item.prompt}</p>
      {item.sourceKind === 'concept' && item.practice ? (
        <p className="live-practice">Übung in {config.appName}: {item.practice.exerciseTitle}</p>
      ) : null}

      <div className="live-actions">
        <button
          className="review-reset"
          type="button"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Konzept verbergen' : 'Konzept zeigen'}
        </button>
        {config.baseUrl ? (
          <ButtonLink href={`${config.baseUrl}/wiederholen`}>
            In {config.appName} wiederholen
          </ButtonLink>
        ) : null}
      </div>

      <div id={answerId} className="review-answer live-answer" hidden={!open}>
        <p>{item.answer}</p>
      </div>
    </li>
  );
}

export function LiveReview({
  sources,
  viaHub = false,
  kontoAnmelden = null,
}: {
  sources: readonly LiveSourceConfig[];
  /** E4.5c: Angemeldet im Hub, kommen alle Quellen in einem Abruf über den Hub-Server. */
  viaHub?: boolean;
  /** Anmeldeadresse des Hubs, wenn das gemeinsame Konto eingerichtet ist; sonst `null`. */
  kontoAnmelden?: string | null;
}): React.ReactElement {
  const enabled = sources.filter((source) => source.baseUrl);
  const [state, setState] = useState<LoadState>({ phase: 'idle' });
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (enabled.length === 0) return;
    let cancelled = false;
    setState({ phase: 'loading' });

    if (viaHub) {
      const angefragt = enabled.map((source) => source.source);
      void fetchReviewViaHub(angefragt, (url, init) => fetch(url, init)).then(
        ({ abgemeldet, outcomes }) => {
          if (cancelled) return;
          if (abgemeldet) {
            setState({ phase: 'abgelaufen' });
            return;
          }
          const ohneAdresse: SourceFetchOutcome[] = sources
            .filter((source) => !source.baseUrl)
            .map((source) => ({ source: source.source, status: 'not_configured' }));
          setState({
            phase: 'done',
            review: federateReviewSources([...outcomes, ...ohneAdresse]),
          });
        },
      );
      return () => {
        cancelled = true;
      };
    }

    const endpoints: SourceEndpoint[] = sources.map((source) => ({
      source: source.source,
      baseUrl: source.baseUrl,
    }));

    void Promise.all(
      endpoints.map((endpoint) =>
        fetchReviewSource(endpoint, REVIEW_FEDERATION_LIMITS.perSource, (url, init) =>
          fetch(url, init),
        ),
      ),
    ).then((outcomes) => {
      if (!cancelled) setState({ phase: 'done', review: federateReviewSources(outcomes) });
    });

    return () => {
      cancelled = true;
    };
    // Die Quellen stehen zur Build-Zeit fest: genau ein Abruf je Seitenaufruf.
  }, []);

  const configBySource = new Map(sources.map((source) => [source.source, source]));

  return (
    <section className="los-section live-review" aria-labelledby="live-title">
      <div className="live-heading">
        <p className="los-lane-label">
          <span className="los-lane-dot" data-lane="live" aria-hidden="true" />
          LIVE · nur gelesen aus den Apps
        </p>
        <h2 id="live-title">Fällig in deinen Lernpfaden</h2>
        <p>
          Nur Anzeige: Bearbeitet, bewertet und neu geplant wird in der jeweiligen App. Lernpfade
          schreibt nichts zurück.
        </p>
      </div>

      {enabled.length === 0 && kontoAnmelden && !viaHub ? (
        <div className="live-notice live-notice-auth live-konto">
          <p>
            Mit deinem Lernpfade-Konto siehst du hier, was in PythonPfad, SQLPfad und AIPfad fällig
            ist.
          </p>
          {/* ButtonLink ist ein einfaches <a>: Das Ziel leitet zum gemeinsamen Konto weiter. */}
          <ButtonLink href={kontoAnmelden}>Mit Lernpfade-Konto anmelden</ButtonLink>
        </div>
      ) : null}

      {enabled.length === 0 && !(kontoAnmelden && !viaHub) ? (
        <p className="live-notice live-notice-off">
          Live-Quellen sind noch nicht verbunden. Unten siehst du das Demo-Deck.
        </p>
      ) : null}

      {state.phase === 'abgelaufen' ? (
        <p className="live-notice live-notice-auth" role="status">
          Deine Anmeldung bei Lernpfade ist abgelaufen.{' '}
          {kontoAnmelden ? <a href={kontoAnmelden}>Erneut anmelden</a> : null}
        </p>
      ) : null}

      {state.phase === 'loading' ? (
        <p className="live-notice" role="status">
          Fällige Wiederholungen werden geladen …
        </p>
      ) : null}

      {state.phase === 'done' ? (
        <>
          <ul className="live-notices" aria-live="polite">
            {sources.map((config) => (
              <SourceNotice
                key={config.source}
                config={config}
                health={state.review.sources[config.source]}
                viaHub={viaHub}
              />
            ))}
          </ul>

          {state.review.items.length > 0 ? (
            <ul className="live-cards" aria-label="Fällige Wiederholungen">
              {state.review.items.map((item) => {
                const config = configBySource.get(item.source);
                return config ? <LiveCard key={item.key} item={item} config={config} now={now} /> : null;
              })}
            </ul>
          ) : null}

          {state.review.truncated ? (
            <p className="live-notice">
              Es gibt mehr fällige Wiederholungen, als hier angezeigt werden.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
