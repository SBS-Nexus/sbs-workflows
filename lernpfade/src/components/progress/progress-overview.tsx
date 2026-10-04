'use client';

import { useEffect, useState } from 'react';
import type { ProgressSource, SourceProgress } from '@/domain/progress/contract';
import { fetchProgressSource } from '@/domain/progress/fetch-progress';
import {
  backlogTotal,
  initialSourceStates,
  resolveSourceOutcome,
  summarizeVocabulary,
  type BacklogTotal,
  type SourceState,
  type VocabularyState,
  type VocabularySummary,
} from '@/domain/progress/federation';
import { browserBackend } from '@/domain/vocabulary/idb-backend';
import { loadVocabStorage } from '@/domain/vocabulary/storage';

/**
 * LP-07 — Plattformfortschritt, schreibgeschützt.
 *
 * Jede entfernte Quelle wird für sich geladen und für sich angezeigt: Eine
 * langsame oder ausgefallene Quelle hält weder die anderen noch die lokalen
 * Vokabeln auf. Die Reihenfolge der Karten ist fest. Nichts hier schreibt —
 * weder in eine App noch in den Vokabelspeicher.
 */

export type ProgressSourceConfig = {
  source: ProgressSource;
  label: string;
  appName: string;
  /** Freigeschaltete, geprüfte Basisadresse; `null` = nicht verbunden. */
  baseUrl: string | null;
  /** Adresse der App für einen Link, auch wenn sie nicht verbunden ist. */
  appUrl: string | null;
  /** Kurzer, quellspezifischer Zusatz unter der Überschrift. */
  note?: string;
};

const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function labelOf(key: ProgressSource | 'vocabulary', configs: readonly ProgressSourceConfig[]): string {
  if (key === 'vocabulary') return 'Vokabeln';
  return configs.find((config) => config.source === key)?.label ?? key;
}

function BacklogSummary({
  total,
  configs,
}: {
  total: BacklogTotal;
  configs: readonly ProgressSourceConfig[];
}): React.ReactElement {
  return (
    <section className="progress-summary" aria-labelledby="progress-summary-title" aria-live="polite">
      <h2 id="progress-summary-title">Fällig insgesamt</h2>
      {total.status === 'pending' ? <p className="progress-muted">Wird zusammengezählt …</p> : null}
      {total.status === 'complete' ? (
        <>
          <p className="progress-total">
            <strong>{total.due}</strong> fällig
          </p>
          <p className="progress-muted">
            {total.parts.map((part) => `${labelOf(part.key, configs)} ${part.due}`).join(' · ')} — je
            Quelle gezählt: Wiederholungen in den Apps, Abfragen im VokabelPfad. Kein Gesamtprozent.
          </p>
        </>
      ) : null}
      {total.status === 'incomplete' ? (
        <p className="progress-muted">
          Keine Gesamtzahl, solange{' '}
          {total.missing.map((key) => labelOf(key, configs)).join(', ')} nicht lesbar{' '}
          {total.missing.length === 1 ? 'ist' : 'sind'} — eine Teilsumme sähe vollständig aus. Die
          einzelnen Pfade stehen unten.
        </p>
      ) : null}
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }): React.ReactElement {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <span className="progress-value">{value}</span>
        {hint ? <span className="progress-hint">{hint}</span> : null}
      </dd>
    </div>
  );
}

function conceptMetric(progress: SourceProgress, appName: string): React.ReactElement {
  const { observed, ready, criterion } = progress.concepts;
  return criterion === 'all-assessable-tasks-last-passed' ? (
    <Metric
      label="Konzepte bearbeitet"
      value={`${observed}, davon ${ready} „sitzt"`}
      hint={`„Sitzt" heißt in ${appName}: alle beurteilbaren Aufgaben zuletzt gelöst.`}
    />
  ) : (
    <Metric
      label="Konzepte geübt"
      value={`${observed}, davon ${ready} gefestigt`}
      hint={`Gefestigt heißt in ${appName}: Grundlage für die nächsten Schritte erreicht.`}
    />
  );
}

function projectMetric(progress: SourceProgress, appName: string): React.ReactElement {
  const projects = progress.projects;
  switch (projects.kind) {
    case 'accepted':
      return <Metric label="Projekte abgenommen" value={`${projects.done} von ${projects.total}`} />;
    case 'submitted':
      return (
        <Metric
          label="Projekte abgegeben"
          value={`${projects.done} von ${projects.total}`}
          hint={`${appName} nimmt Projekte nicht fachlich ab.`}
        />
      );
    case 'unsupported':
      return <Metric label="Projekte" value="—" hint={`${appName} hat keine Projekte.`} />;
  }
}

function SourceCard({ config, state }: { config: ProgressSourceConfig; state: SourceState }): React.ReactElement {
  const titleId = `progress-${config.source}`;
  const openUrl = config.baseUrl ?? config.appUrl;

  return (
    <article className="progress-card" aria-labelledby={titleId}>
      <div className="progress-card-head">
        <h3 id={titleId}>{config.appName}</h3>
        {state.status === 'ok' ? (
          <span className={`review-domain domain-${config.source}`}>LIVE · {config.label}</span>
        ) : null}
      </div>
      {config.note ? <p className="progress-muted">{config.note}</p> : null}

      {state.status === 'loading' ? (
        <p className="progress-state" role="status">
          Fortschritt aus {config.appName} wird geladen …
        </p>
      ) : null}

      {state.status === 'not_configured' ? (
        <p className="progress-state progress-state-off">
          Nicht mit dem Hub verbunden. Dein Fortschritt in {config.appName} ist dort weiterhin
          vollständig sichtbar.
        </p>
      ) : null}

      {state.status === 'unauthenticated' ? (
        <p className="progress-state progress-state-auth">
          In {config.appName} bist du nicht angemeldet. Ohne Anmeldung zeigt der Hub hier nichts — das
          heißt nicht, dass du dort keinen Fortschritt hast.
        </p>
      ) : null}

      {state.status === 'unavailable' ? (
        <p className="progress-state progress-state-down">
          {config.appName} ist derzeit nicht erreichbar. Die anderen Pfade bleiben nutzbar.
        </p>
      ) : null}

      {state.status === 'ok' ? <SourceMetrics progress={state.progress} appName={config.appName} /> : null}

      <div className="progress-actions">
        {state.status === 'unauthenticated' && config.baseUrl ? (
          <a className="button button-primary" href={`${config.baseUrl}/anmelden`}>
            In {config.appName} anmelden
          </a>
        ) : null}
        {openUrl ? (
          <a className="button button-secondary" href={`${openUrl}/fortschritt`}>
            In {config.appName} öffnen
          </a>
        ) : null}
      </div>
    </article>
  );
}

function SourceMetrics({ progress, appName }: { progress: SourceProgress; appName: string }): React.ReactElement {
  const { completed, total } = progress.lessons;
  return (
    <>
      {!progress.hasActivity ? (
        <p className="progress-state">Noch keine Lernaktivität in {appName} erfasst.</p>
      ) : null}
      <dl className="progress-metrics">
        <Metric
          label="Lektionen abgeschlossen"
          value={
            <>
              {completed} von {total}
              {total > 0 ? (
                <progress
                  className="progress-bar"
                  max={total}
                  value={completed}
                  aria-label={`Lektionsfortschritt in ${appName}: ${completed} von ${total}`}
                />
              ) : null}
            </>
          }
        />
        <Metric
          label="Wiederholungen fällig"
          value={progress.reviewsDue}
          hint={progress.source === 'sql' ? `In ${appName} je Konzept gezählt.` : undefined}
        />
        {conceptMetric(progress, appName)}
        {projectMetric(progress, appName)}
        <Metric
          label="Zuletzt aktiv"
          value={progress.lastActiveAt ? dateTime.format(new Date(progress.lastActiveAt)) : 'noch nie'}
        />
      </dl>
    </>
  );
}

function VocabularyCard({ state }: { state: VocabularyState }): React.ReactElement {
  return (
    <article className="progress-card" aria-labelledby="progress-vocabulary">
      <div className="progress-card-head">
        <h3 id="progress-vocabulary">VokabelPfad</h3>
        <span className="review-domain domain-language">LOKAL · nur in diesem Browser</span>
      </div>
      <p className="progress-muted">
        Deine eigenen Decks liegen nur in diesem Browser. Sie werden an keine App und keinen Server gesendet.
      </p>

      {state.status === 'loading' ? (
        <p className="progress-state" role="status">
          Vokabelstand wird gelesen …
        </p>
      ) : null}

      {state.status === 'error' ? (
        <p className="progress-state progress-state-down">
          {state.reason === 'corrupt'
            ? 'Deine Vokabeldaten in diesem Browser lassen sich nicht lesen. Sie wurden nicht verändert.'
            : state.reason === 'future'
              ? 'Deine Vokabeldaten stammen aus einer neueren Version von VokabelPfad und werden hier nicht gelesen.'
              : 'Der Browser erlaubt gerade keinen Zugriff auf den lokalen Speicher.'}{' '}
          Ein Fortschritt von 0 wäre deshalb falsch — prüfe den Stand im VokabelPfad.
        </p>
      ) : null}

      {state.status === 'ok' ? <VocabularyMetrics summary={state.summary} /> : null}

      <div className="progress-actions">
        <a className="button button-secondary" href="/vokabeln">
          {state.status === 'error' ? 'Im VokabelPfad prüfen' : 'Zum VokabelPfad'}
        </a>
      </div>
    </article>
  );
}

function VocabularyMetrics({ summary }: { summary: VocabularySummary }): React.ReactElement {
  return (
    <>
      {summary.cards === 0 ? <p className="progress-state">Noch keine eigenen Vokabeln.</p> : null}
      <dl className="progress-metrics">
        <Metric label="Karten" value={`${summary.cards} in ${plural(summary.decks, 'Deck', 'Decks')}`} />
        <Metric label="Fällig Englisch → Deutsch" value={summary.dueEnDe} />
        <Metric label="Fällig Deutsch → Englisch" value={summary.dueDeEn} />
        <Metric label="Heute bewertet" value={summary.ratedToday} />
      </dl>
    </>
  );
}

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function ProgressOverview({ sources }: { sources: readonly ProgressSourceConfig[] }): React.ReactElement {
  const enabled = sources.filter((config) => config.baseUrl).map((config) => config.source);
  const [states, setStates] = useState<Record<ProgressSource, SourceState>>(() => initialSourceStates(enabled));
  const [vocabulary, setVocabulary] = useState<VocabularyState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    // Jede Quelle für sich: Wer zuerst antwortet, erscheint zuerst; niemand wartet auf andere.
    for (const config of sources) {
      if (!config.baseUrl) continue;
      void fetchProgressSource({ source: config.source, baseUrl: config.baseUrl }, (url, init) =>
        fetch(url, init),
      ).then((outcome) => {
        if (!cancelled) setStates((current) => ({ ...current, [outcome.source]: resolveSourceOutcome(outcome) }));
      });
    }

    // Lokale Vokabeln: nur lesen, mit der vorhandenen, geprüften Statistik.
    void loadVocabStorage(browserBackend()).then((outcome) => {
      if (!cancelled) setVocabulary(summarizeVocabulary(outcome, new Date(), browserTimeZone()));
    });

    return () => {
      cancelled = true;
    };
    // Die Quellen stehen beim Seitenaufruf fest: genau ein Abruf je Quelle.
  }, []);

  const total = backlogTotal(states, vocabulary);

  return (
    <>
      <BacklogSummary total={total} configs={sources} />
      <section className="progress-paths" aria-labelledby="progress-paths-title">
        <h2 id="progress-paths-title">Deine Pfade</h2>
        <div className="progress-grid">
          {sources.map((config) => (
            <SourceCard key={config.source} config={config} state={states[config.source]} />
          ))}
          <VocabularyCard state={vocabulary} />
        </div>
      </section>
    </>
  );
}
