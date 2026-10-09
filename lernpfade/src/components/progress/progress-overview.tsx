'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProgressSource, SourceProgress } from '@/domain/progress/contract';
import { lastActiveOf } from '@/domain/progress/display';
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
import { VOCAB_CHANNEL, browserBackend } from '@/domain/vocabulary/idb-backend';
import { nextChangeAt } from '@/domain/vocabulary/session';
import { loadVocabStorage, type LoadOutcome, type VocabBackend } from '@/domain/vocabulary/storage';

/**
 * LP-07 — Plattformfortschritt, schreibgeschützt.
 *
 * Jede entfernte Quelle wird für sich geladen und für sich angezeigt: Eine
 * langsame oder ausgefallene Quelle hält weder die anderen noch die lokalen
 * Vokabeln auf. Die Reihenfolge der Karten ist fest. Nichts hier schreibt —
 * weder in eine App noch in den Vokabelspeicher.
 *
 * Aktualität (wie `/vokabeln`): Die Vokabelstatistik wird an der nächsten
 * Grenze neu gerechnet (Fälligkeit oder lokaler Tageswechsel, siehe
 * `nextChangeAt`), höchstens 15 Minuten später. Speichert ein anderer Tab
 * Vokabeln, wird der lokale Stand neu gelesen. Bei der Rückkehr in den Tab
 * werden die Vokabeln neu gelesen und die Quellen neu abgefragt — die Quellen
 * höchstens einmal pro Minute. Eine verspätete ältere Antwort überschreibt
 * nie eine neuere.
 */

/** Nie seltener prüfen als so: schützt vor Uhrsprüngen und gedrosselten Timern. */
const MAX_REFRESH_DELAY_MS = 15 * 60_000;
/** Kleiner Abstand hinter der Grenze, damit sie sicher überschritten ist. */
const REFRESH_MARGIN_MS = 250;
/** Quellen bei Rückkehr in den Tab höchstens so oft erneut abfragen. */
const SOURCE_REFRESH_MIN_INTERVAL_MS = 60_000;

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

function lastActiveText(progress: SourceProgress): string {
  const lastActive = lastActiveOf(progress);
  if (lastActive.kind === 'timestamp') return dateTime.format(new Date(lastActive.at));
  return lastActive.kind === 'unrecorded' ? 'Kein Zeitpunkt erfasst' : 'noch nie';
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
          value={lastActiveText(progress)}
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

function openChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(VOCAB_CHANNEL);
  } catch {
    return null;
  }
}

function readableStore(outcome: LoadOutcome | null) {
  return outcome && (outcome.status === 'ok' || outcome.status === 'empty') ? outcome.store : null;
}

export function ProgressOverview({ sources }: { sources: readonly ProgressSourceConfig[] }): React.ReactElement {
  const enabled = sources.filter((config) => config.baseUrl).map((config) => config.source);
  const [states, setStates] = useState<Record<ProgressSource, SourceState>>(() => initialSourceStates(enabled));
  const [vocabOutcome, setVocabOutcome] = useState<LoadOutcome | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);
  // Die Quellen stehen beim Seitenaufruf fest.
  const sourcesRef = useRef(sources);
  const backendRef = useRef<VocabBackend | null>(null);
  const mountedRef = useRef(false);
  // Laufende Nummer je Abruf: nur die jüngste Antwort zählt.
  const sourceTicketsRef = useRef<Partial<Record<ProgressSource, number>>>({});
  const vocabTicketRef = useRef(0);
  const sourcesLoadedAtRef = useRef(0);

  const loadSources = useCallback(() => {
    sourcesLoadedAtRef.current = Date.now();
    // Jede Quelle für sich: Wer zuerst antwortet, erscheint zuerst; niemand wartet auf andere.
    for (const config of sourcesRef.current) {
      if (!config.baseUrl) continue;
      const source = config.source;
      const ticket = (sourceTicketsRef.current[source] ?? 0) + 1;
      sourceTicketsRef.current[source] = ticket;
      void fetchProgressSource({ source, baseUrl: config.baseUrl }, (url, init) => fetch(url, init)).then(
        (outcome) => {
          if (!mountedRef.current || sourceTicketsRef.current[source] !== ticket) return;
          setStates((current) => ({ ...current, [source]: resolveSourceOutcome(outcome) }));
        },
      );
    }
  }, []);

  // Lokale Vokabeln: nur lesen, mit der vorhandenen, geprüften Statistik.
  const loadVocabulary = useCallback(() => {
    const ticket = vocabTicketRef.current + 1;
    vocabTicketRef.current = ticket;
    void loadVocabStorage(backendRef.current).then((outcome) => {
      if (!mountedRef.current || vocabTicketRef.current !== ticket) return;
      setVocabOutcome(outcome);
      setNow(new Date());
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    backendRef.current = browserBackend();
    setTimeZone(browserTimeZone());
    loadSources();
    loadVocabulary();
    return () => {
      mountedRef.current = false;
    };
  }, [loadSources, loadVocabulary]);

  // Zeitbasis der Vokabeln: zur nächsten Grenze neu rechnen (nicht seltener als alle 15 Minuten).
  useEffect(() => {
    const store = readableStore(vocabOutcome);
    if (!store) return;
    const boundary = nextChangeAt(store, now, timeZone).getTime();
    const delay = Math.min(Math.max(boundary - Date.now() + REFRESH_MARGIN_MS, REFRESH_MARGIN_MS), MAX_REFRESH_DELAY_MS);
    const timer = window.setTimeout(() => setNow(new Date()), delay);
    return () => window.clearTimeout(timer);
  }, [vocabOutcome, now, timeZone]);

  // Rückkehr in den Tab (Timer laufen im Hintergrund gedrosselt oder gar nicht) und Speichern in einem anderen Tab.
  useEffect(() => {
    const refresh = (): void => {
      loadVocabulary();
      if (Date.now() - sourcesLoadedAtRef.current >= SOURCE_REFRESH_MIN_INTERVAL_MS) loadSources();
    };
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    const channel = openChannel();
    if (channel) channel.onmessage = () => loadVocabulary();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      channel?.close();
    };
  }, [loadSources, loadVocabulary]);

  const vocabulary: VocabularyState = vocabOutcome
    ? summarizeVocabulary(vocabOutcome, now, timeZone)
    : { status: 'loading' };
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
