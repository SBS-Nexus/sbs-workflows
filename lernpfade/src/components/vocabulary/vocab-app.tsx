'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VOCAB_STORAGE_KEY, type VocabStore } from '@/domain/vocabulary/model';
import type { ReviewTask } from '@/domain/vocabulary/session';
import {
  browserStorage,
  loadVocabStorage,
  resetVocabStorage,
  revisionOf,
  saveVocabStorage,
  type SaveFailure,
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
 */

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable' }
  | { kind: 'corrupt'; raw: string; detail: string }
  | { kind: 'future'; raw: string; version: number };

type View = { name: 'overview' } | { name: 'deck'; deckId: string } | { name: 'session'; tasks: ReviewTask[] };

export type Notice = { tone: 'success' | 'error'; text: string };

export type VocabActions = {
  /** Speichert `next`; gibt `true` nur bei tatsächlich gespeichertem Zustand zurück. */
  commit: (next: VocabStore, successMessage: string) => boolean;
  notify: (notice: Notice) => void;
  openDeck: (deckId: string) => void;
  openOverview: (message?: Notice) => void;
  startSession: (tasks: ReviewTask[]) => void;
  /** Gesperrt, solange ein anderer Tab neuere Daten geschrieben hat. */
  locked: boolean;
  timeZone: string;
};

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

export function VocabApp(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [store, setStore] = useState<VocabStore | null>(null);
  const [view, setView] = useState<View>({ name: 'overview' });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [locked, setLocked] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [timeZone, setTimeZone] = useState('UTC');
  const [navigated, setNavigated] = useState(false);
  // Aktueller Stand auch für Ereignisse, die zwischen zwei Renderdurchläufen eintreffen.
  const storeRef = useRef<VocabStore | null>(null);
  const lockedRef = useRef(false);

  const load = useCallback((message?: Notice) => {
    const outcome = loadVocabStorage(browserStorage());
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
  }, []);

  useEffect(() => {
    setTimeZone(browserTimeZone());
    load();
  }, [load]);

  // Konfliktsperre: Schreibt ein anderer Tab, wird dieser Tab gesperrt statt still zu überschreiben.
  useEffect(() => {
    function onStorage(event: StorageEvent): void {
      if (event.key !== VOCAB_STORAGE_KEY && event.key !== null) return;
      const current = storeRef.current;
      if (current && revisionOf(event.newValue) === current.revision) return;
      lockedRef.current = true;
      setLocked(true);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback((next: VocabStore, successMessage: string): boolean => {
    const current = storeRef.current;
    if (!current) return false;
    if (lockedRef.current) {
      setNotice({ tone: 'error', text: SAVE_MESSAGES.conflict });
      return false;
    }
    // `next` trägt die Revision des Stands, aus dem es berechnet wurde. Ist das nicht
    // mehr der aktuelle Stand (z. B. Doppel-Submit im selben Tab), wird nicht gespeichert —
    // sonst würde die zuerst gespeicherte Änderung still überschrieben.
    if (next.revision !== current.revision) {
      setNotice({
        tone: 'error',
        text: 'Nicht gespeichert: Der Stand hat sich gerade geändert. Bitte prüfe die Ansicht und versuche es erneut.',
      });
      return false;
    }
    const outcome = saveVocabStorage(browserStorage(), next, next.revision);
    if (!outcome.ok) {
      if (outcome.reason === 'conflict') {
        lockedRef.current = true;
        setLocked(true);
      }
      setNotice({ tone: 'error', text: SAVE_MESSAGES[outcome.reason] });
      return false;
    }
    storeRef.current = outcome.store;
    setStore(outcome.store);
    setNotice(successMessage ? { tone: 'success', text: successMessage } : null);
    return true;
  }, []);

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
    startSession: (tasks) => {
      setNavigated(true);
      setNotice(null);
      setView({ name: 'session', tasks });
    },
    locked,
    timeZone,
  };

  function resetAll(): void {
    setConfirmReset(false);
    if (resetVocabStorage(browserStorage())) {
      load({ tone: 'success', text: 'Die VokabelPfad-Daten dieses Browsers wurden gelöscht.' });
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
          <button className="button button-secondary" type="button" onClick={() => load()}>
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
          <button className="button button-secondary" type="button" onClick={() => load()}>
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
          <VocabSession store={store} tasks={view.tasks} actions={actions} />
        ) : (
          <VocabOverview store={store} actions={actions} focusHeading={navigated} />
        )
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        title="VokabelPfad zurücksetzen?"
        confirmLabel="Endgültig zurücksetzen"
        danger
        onConfirm={resetAll}
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
