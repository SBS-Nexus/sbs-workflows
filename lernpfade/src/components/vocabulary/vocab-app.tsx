'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VOCAB_CHANNEL, browserBackend } from '@/domain/vocabulary/idb-backend';
import type { VocabStore } from '@/domain/vocabulary/model';
import { nextChangeAt, type ReviewTask, type SessionSelection } from '@/domain/vocabulary/session';
import {
  loadVocabStorage,
  resetVocabStorage,
  saveVocabStorage,
  type SaveFailure,
  type VocabBackend,
} from '@/domain/vocabulary/storage';
import { ConfirmDialog } from './confirm-dialog';
import { downloadText } from './download';
import { VocabDeckView } from './vocab-deck';
import { VocabOverview } from './vocab-overview';
import { VocabSession } from './vocab-session';

/**
 * LP-06 — VokabelPfad. Ein Client-Baustein, weil alle Daten ausschließlich im
 * Browser liegen. Server und erster Client-Render zeigen denselben
 * Ladezustand; gelesen wird erst nach dem Mount — dadurch gibt es keinen
 * Hydration-Unterschied und keinen Moment, in dem ein leerer Zustand
 * vorhandene Daten überschreiben könnte.
 *
 * Gespeichert wird in IndexedDB (atomare Konfliktsperre, siehe
 * `domain/vocabulary/storage.ts`). Über einen `BroadcastChannel` melden Tabs
 * einander neue Stände, damit ein veralteter Tab sich sofort sperrt; die
 * eigentliche Sicherung ist die Revisionsprüfung beim Schreiben.
 *
 * Zeitbasis: Alle Ansichten rechnen mit demselben `actions.now`. Es wird
 * aktualisiert, sobald sich Angezeigtes von selbst ändern kann (nächste
 * Fälligkeit oder lokaler Tageswechsel, siehe `nextChangeAt`), bei der
 * Rückkehr in den Tab und nach jedem Speichern. Die Aktualisierung liest
 * und schreibt nichts im Speicher und berührt keine laufende Session.
 */

/** Nie seltener prüfen als so: schützt vor Uhrsprüngen und gedrosselten Timern. */
const MAX_REFRESH_DELAY_MS = 15 * 60_000;
/** Kleiner Abstand hinter der Grenze, damit sie sicher überschritten ist. */
const REFRESH_MARGIN_MS = 250;

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable' }
  | { kind: 'corrupt'; raw: string; detail: string }
  | { kind: 'future'; raw: string; version: number };

type View = { name: 'overview' } | { name: 'deck'; deckId: string } | { name: 'session'; tasks: ReviewTask[]; selection: SessionSelection; id: number };

export type Notice = { tone: 'success' | 'error'; text: string };

export type VocabActions = {
  /** Speichert `next`; liefert `true` nur bei tatsächlich gespeichertem Zustand. */
  commit: (next: VocabStore, successMessage: string) => Promise<boolean>;
  notify: (notice: Notice) => void;
  openDeck: (deckId: string) => void;
  openOverview: (message?: Notice) => void;
  /** `selection` ist die ursprüngliche Auswahl — für den ehrlichen Abschluss einer gedeckelten Session. */
  startSession: (tasks: ReviewTask[], selection: SessionSelection) => void;
  /** Gesperrt, solange ein anderer Tab neuere Daten geschrieben hat. */
  locked: boolean;
  /** Ein Speichervorgang läuft gerade. */
  saving: boolean;
  timeZone: string;
  /** Gemeinsame, reaktive Zeitbasis für Statistik, Fälligkeiten und Startknopf. */
  now: Date;
};

type ChannelMessage = { type: 'saved'; revision: number } | { type: 'reset' };

const SAVE_MESSAGES: Record<SaveFailure, string> = {
  conflict:
    'Nicht gespeichert: VokabelPfad wurde inzwischen in einem anderen Tab geändert. Lade den aktuellen Stand neu, damit nichts überschrieben wird.',
  quota:
    'Nicht gespeichert: Der Browserspeicher ist voll. Deine bisherigen Daten sind unverändert. Exportiere oder lösche nicht mehr benötigte Decks.',
  unavailable:
    'Nicht gespeichert: Der Browser erlaubt gerade keinen Zugriff auf den lokalen Speicher. Deine bisherigen Daten sind unverändert.',
  invalid: 'Nicht gespeichert: Die Änderung hätte ungültige Daten erzeugt. Bitte lade die Seite neu.',
};

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function openChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(VOCAB_CHANNEL);
  } catch {
    return null;
  }
}

export function VocabApp(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [store, setStore] = useState<VocabStore | null>(null);
  const [view, setView] = useState<View>({ name: 'overview' });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [timeZone, setTimeZone] = useState('UTC');
  const [navigated, setNavigated] = useState(false);
  const [now, setNow] = useState(() => new Date());
  // Aktueller Stand auch für Ereignisse, die zwischen zwei Renderdurchläufen eintreffen.
  const storeRef = useRef<VocabStore | null>(null);
  const lockedRef = useRef(false);
  const savingRef = useRef(false);
  const backendRef = useRef<VocabBackend | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const refreshNow = useCallback(() => setNow(new Date()), []);

  const lock = useCallback(() => {
    lockedRef.current = true;
    setLocked(true);
  }, []);

  const load = useCallback(async (message?: Notice) => {
    const outcome = await loadVocabStorage(backendRef.current);
    lockedRef.current = false;
    setLocked(false);
    if (outcome.status === 'ok' || outcome.status === 'empty') {
      storeRef.current = outcome.store;
      setStore(outcome.store);
      setPhase({ kind: 'ready' });
    } else {
      storeRef.current = null;
      setStore(null);
      setPhase(
        outcome.status === 'unavailable'
          ? { kind: 'unavailable' }
          : outcome.status === 'future'
            ? { kind: 'future', raw: outcome.raw, version: outcome.version }
            : { kind: 'corrupt', raw: outcome.raw, detail: outcome.detail },
      );
    }
    setView({ name: 'overview' });
    setNotice(message ?? null);
    setNow(new Date());
  }, []);

  useEffect(() => {
    backendRef.current = browserBackend();
    setTimeZone(browserTimeZone());
    void load();
  }, [load]);

  // Zeitbasis: zur nächsten Grenze neu rechnen (nicht seltener als alle 15 Minuten).
  useEffect(() => {
    if (!store) return;
    const boundary = nextChangeAt(store, now, timeZone).getTime();
    const delay = Math.min(Math.max(boundary - Date.now() + REFRESH_MARGIN_MS, REFRESH_MARGIN_MS), MAX_REFRESH_DELAY_MS);
    const timer = window.setTimeout(refreshNow, delay);
    return () => window.clearTimeout(timer);
  }, [store, now, timeZone, refreshNow]);

  // Rückkehr in einen inaktiven Tab oder aus dem Ruhezustand: Timer laufen dort gedrosselt oder gar nicht.
  useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') refreshNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshNow);
    window.addEventListener('pageshow', refreshNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshNow);
      window.removeEventListener('pageshow', refreshNow);
    };
  }, [refreshNow]);

  // Konfliktsperre: Meldet ein anderer Tab einen neuen Stand, sperrt sich dieser Tab.
  useEffect(() => {
    const channel = openChannel();
    channelRef.current = channel;
    if (!channel) return;
    channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
      const current = storeRef.current;
      if (event.data?.type === 'saved' && current && event.data.revision === current.revision) return;
      lock();
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [lock]);

  const commit = useCallback(
    async (next: VocabStore, successMessage: string): Promise<boolean> => {
      const current = storeRef.current;
      if (!current) return false;
      // Ein Speichervorgang nach dem anderen; ein Doppel-Submit wird nicht ein zweites Mal geschrieben.
      if (savingRef.current) return false;
      if (lockedRef.current) {
        setNotice({ tone: 'error', text: SAVE_MESSAGES.conflict });
        return false;
      }
      // `next` trägt die Revision des Stands, aus dem es berechnet wurde. Ist das nicht
      // mehr der aktuelle Stand, wird nicht gespeichert — sonst würde eine zuvor
      // gespeicherte Änderung still überschrieben.
      if (next.revision !== current.revision) {
        setNotice({
          tone: 'error',
          text: 'Nicht gespeichert: Der Stand hat sich gerade geändert. Bitte prüfe die Ansicht und versuche es erneut.',
        });
        return false;
      }
      savingRef.current = true;
      setSaving(true);
      try {
        const outcome = await saveVocabStorage(backendRef.current, next, next.revision);
        if (!outcome.ok) {
          if (outcome.reason === 'conflict') lock();
          setNotice({ tone: 'error', text: SAVE_MESSAGES[outcome.reason] });
          return false;
        }
        storeRef.current = outcome.store;
        setStore(outcome.store);
        setNow(new Date());
        setNotice(successMessage ? { tone: 'success', text: successMessage } : null);
        channelRef.current?.postMessage({ type: 'saved', revision: outcome.store.revision } satisfies ChannelMessage);
        return true;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [lock],
  );

  const actions: VocabActions = {
    commit,
    notify: setNotice,
    openDeck: (deckId) => {
      setNavigated(true);
      setNotice(null);
      setView({ name: 'deck', deckId });
    },
    openOverview: (message) => {
      setNavigated(true);
      setNotice(message ?? null);
      setView({ name: 'overview' });
    },
    startSession: (tasks, selection) => {
      setNavigated(true);
      setNotice(null);
      // Neue `id` = neue Session-Instanz, auch direkt im Anschluss an eine abgeschlossene.
      setView((previous) => ({
        name: 'session',
        tasks,
        selection,
        id: previous.name === 'session' ? previous.id + 1 : 1,
      }));
    },
    locked,
    saving,
    timeZone,
    now,
  };

  async function resetAll(): Promise<void> {
    setConfirmReset(false);
    if (await resetVocabStorage(backendRef.current)) {
      channelRef.current?.postMessage({ type: 'reset' } satisfies ChannelMessage);
      await load({ tone: 'success', text: 'Die VokabelPfad-Daten dieses Browsers wurden gelöscht.' });
    } else {
      setNotice({ tone: 'error', text: 'Löschen nicht möglich: Der Browser verweigert den Zugriff auf den Speicher.' });
    }
  }

  return (
    <div className="vocab-app">
      <NoticeArea notice={notice} />

      {locked ? (
        <div className="vocab-banner vocab-banner-warning" role="alert">
          <p>
            <strong>In einem anderen Tab wurde VokabelPfad geändert.</strong> Damit nichts überschrieben
            wird, speichert dieser Tab erst wieder, wenn du den aktuellen Stand lädst.
          </p>
          <button className="button button-secondary" type="button" onClick={() => void load()}>
            Aktuellen Stand laden
          </button>
        </div>
      ) : null}

      {phase.kind === 'loading' ? (
        <p className="vocab-state" role="status">
          VokabelPfad wird geladen …
        </p>
      ) : null}

      {phase.kind === 'unavailable' ? (
        <div className="vocab-banner vocab-banner-danger" role="alert">
          <h2>Lokaler Speicher nicht verfügbar</h2>
          <p>
            Dieser Browser erlaubt VokabelPfad gerade keinen Zugriff auf seinen lokalen Speicher (zum Beispiel
            im privaten Modus oder bei blockierten Website-Daten). Ohne ihn kann nichts gespeichert werden.
          </p>
          <button className="button button-secondary" type="button" onClick={() => void load()}>
            Erneut versuchen
          </button>
        </div>
      ) : null}

      {phase.kind === 'corrupt' || phase.kind === 'future' ? (
        <div className="vocab-banner vocab-banner-danger" role="alert">
          <h2>{phase.kind === 'future' ? 'Daten einer neueren Version' : 'Gespeicherte Daten sind beschädigt'}</h2>
          <p>
            {phase.kind === 'future'
              ? `Hier liegen VokabelPfad-Daten im Format ${phase.version}. Diese Version kennt nur Format 1 und lässt sie deshalb unverändert.`
              : 'Die VokabelPfad-Daten in diesem Browser lassen sich nicht sicher lesen. Sie wurden nicht verändert und werden nicht automatisch überschrieben.'}
          </p>
          {phase.kind === 'corrupt' ? <p className="vocab-muted">Technischer Grund: {phase.detail}</p> : null}
          <div className="vocab-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => downloadText('vokabelpfad-rohdaten-sicherung.json', phase.raw)}
            >
              Rohdaten sichern
            </button>
            <button className="button button-danger" type="button" onClick={() => setConfirmReset(true)}>
              VokabelPfad zurücksetzen …
            </button>
          </div>
        </div>
      ) : null}

      {phase.kind === 'ready' && store ? (
        view.name === 'deck' && store.decks.some((deck) => deck.id === view.deckId) ? (
          <VocabDeckView key={view.deckId} store={store} deckId={view.deckId} actions={actions} />
        ) : view.name === 'session' ? (
          <VocabSession key={view.id} store={store} tasks={view.tasks} selection={view.selection} actions={actions} />
        ) : (
          <VocabOverview store={store} actions={actions} focusHeading={navigated} />
        )
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        title="VokabelPfad zurücksetzen?"
        confirmLabel="Endgültig zurücksetzen"
        danger
        onConfirm={() => void resetAll()}
        onCancel={() => setConfirmReset(false)}
      >
        <p>
          Das löscht <strong>alle VokabelPfad-Daten in diesem Browser</strong>: Decks, Karten und Lernfortschritt.
          Andere Lernpfade und das Demo-Deck unter „Wiederholen" bleiben unberührt. Sichere vorher die Rohdaten,
          wenn du sie noch brauchst.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function NoticeArea({ notice }: { notice: Notice | null }): React.ReactElement {
  return (
    <>
      <div className="vocab-notice-region" role="status" aria-live="polite">
        {notice?.tone === 'success' ? <p className="vocab-notice vocab-notice-success">{notice.text}</p> : null}
      </div>
      <div className="vocab-notice-region" role="alert">
        {notice?.tone === 'error' ? <p className="vocab-notice vocab-notice-error">{notice.text}</p> : null}
      </div>
    </>
  );
}
