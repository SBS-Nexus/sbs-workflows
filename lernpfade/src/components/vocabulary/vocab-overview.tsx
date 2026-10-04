'use client';

import { useId, useMemo, useState } from 'react';
import { exportDecks, exportFileName } from '@/domain/vocabulary/exchange';
import { DIRECTION_LABELS, LIMITS, type Direction, type VocabStore } from '@/domain/vocabulary/model';
import { createDeck, deckDeletionImpact, deleteDeck } from '@/domain/vocabulary/operations';
import { newId } from '@/domain/vocabulary/fields';
import { buildQueue, deckStats, dueTasks, nextDueAt, vocabStats } from '@/domain/vocabulary/session';
import { STARTER_DECKS, adoptStarterDeck, starterAdopted } from '@/domain/vocabulary/starter-decks';
import { ConfirmDialog } from './confirm-dialog';
import { downloadText } from './download';
import { formatDateTime, originLabel, plural } from './format';
import type { VocabActions } from './vocab-app';
import { VocabImport } from './vocab-import';
import { FieldError, useFocusOnMount } from './vocab-fields';

type DirectionChoice = 'en-de' | 'de-en' | 'both';

const DIRECTION_CHOICES: { value: DirectionChoice; label: string }[] = [
  { value: 'en-de', label: DIRECTION_LABELS['en-de'] },
  { value: 'de-en', label: DIRECTION_LABELS['de-en'] },
  { value: 'both', label: 'Beide Richtungen' },
];

function directionsOf(choice: DirectionChoice): Direction[] {
  return choice === 'both' ? ['en-de', 'de-en'] : [choice];
}

export function VocabOverview({
  store,
  actions,
  focusHeading,
}: {
  store: VocabStore;
  actions: VocabActions;
  /** Nur nach einem Ansichtswechsel, nicht beim ersten Laden der Seite. */
  focusHeading: boolean;
}): React.ReactElement {
  const headingRef = useFocusOnMount<HTMLHeadingElement>(focusHeading);
  const now = new Date();
  const stats = vocabStats(store, now, actions.timeZone);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const deckToDelete = store.decks.find((deck) => deck.id === pendingDelete) ?? null;
  const impact = deckToDelete ? deckDeletionImpact(store, deckToDelete.id) : null;

  function exportAll(): void {
    const file = exportDecks(store, null, new Date());
    downloadText(exportFileName(file), `${JSON.stringify(file, null, 2)}\n`);
    actions.notify({ tone: 'success', text: `${plural(file.decks.length, 'Deck', 'Decks')} exportiert – ohne Lernfortschritt.` });
  }

  function confirmDeleteDeck(): void {
    if (!deckToDelete) return;
    const result = deleteDeck(store, deckToDelete.id);
    setPendingDelete(null);
    if (!result.ok) {
      actions.notify({ tone: 'error', text: result.error.message });
      return;
    }
    actions.commit(result.value, `Deck „${deckToDelete.name}" wurde gelöscht.`);
  }

  return (
    <div className="vocab-overview">
      <section className="vocab-intro" aria-labelledby="vocab-title">
        <p className="eyebrow">VokabelPfad · lokaler MVP</p>
        <h1 id="vocab-title" ref={headingRef} tabIndex={-1}>
          Vokabeln lernen – Englisch ↔ Deutsch
        </h1>
        <p>
          Eigene Decks, beide Lernrichtungen und tägliche Wiederholung mit aktivem Abruf. Geplant wird mit
          demselben Wiederholungsmotor wie im übrigen Lernpfade-Hub.
        </p>
        <aside className="vocab-storage-note" aria-label="Speicherort deiner Daten">
          <strong>Nur in diesem Browser gespeichert.</strong> Kein Konto, keine Synchronisation zwischen Geräten oder
          Browsern. Wenn du die Browserdaten dieser Seite löschst, sind deine Decks und dein Fortschritt weg –
          sichere Inhalte bei Bedarf per Export (der Export enthält keinen Lernfortschritt).
        </aside>
      </section>

      <section className="vocab-panel" aria-labelledby="stats-title">
        <h2 id="stats-title">Dein Stand</h2>
        <dl className="vocab-stats">
          <div>
            <dt>Decks</dt>
            <dd>{stats.decks}</dd>
          </div>
          <div>
            <dt>Karten</dt>
            <dd>{stats.cards}</dd>
          </div>
          <div>
            <dt>Abfragen</dt>
            <dd>{stats.queries}</dd>
          </div>
          <div>
            <dt>Fällig {DIRECTION_LABELS['en-de']}</dt>
            <dd>{stats.dueByDirection['en-de']}</dd>
          </div>
          <div>
            <dt>Fällig {DIRECTION_LABELS['de-en']}</dt>
            <dd>{stats.dueByDirection['de-en']}</dd>
          </div>
          <div>
            <dt>Heute bewertet</dt>
            <dd>{stats.ratedToday}</dd>
          </div>
        </dl>
        <p className="vocab-muted">
          Eine <strong>Karte</strong> ist ein Vokabeleintrag. Jede Karte hat zwei <strong>Abfragen</strong> – eine
          je Lernrichtung – mit eigenem Wiederholungsstand. „Fällig" zählt neue und fällige Abfragen; „heute
          bewertet" zählt deine Bewertungen seit Mitternacht in deiner Zeitzone ({actions.timeZone}).
        </p>
      </section>

      <SessionSetup store={store} actions={actions} />

      <section className="vocab-panel" aria-labelledby="decks-title">
        <div className="vocab-panel-head">
          <h2 id="decks-title">Deine Decks</h2>
          {store.decks.length > 0 ? (
            <button className="button button-secondary" type="button" onClick={exportAll}>
              Alle Decks exportieren
            </button>
          ) : null}
        </div>
        {store.decks.length === 0 ? (
          <p className="vocab-empty">
            Noch keine Decks. Lege unten ein eigenes Deck an, übernimm ein Starterdeck oder importiere eine Datei.
          </p>
        ) : (
          <ul className="vocab-deck-list">
            {store.decks.map((deck) => {
              const counts = deckStats(store, deck.id, now);
              return (
                <li key={deck.id} className="vocab-deck">
                  <div>
                    <h3>{deck.name}</h3>
                    {deck.description ? <p>{deck.description}</p> : null}
                    <p className="vocab-muted">
                      {originLabel(deck.origin)} · {plural(counts.cards, 'Karte', 'Karten')} ·{' '}
                      {plural(counts.due, 'Abfrage', 'Abfragen')} fällig
                    </p>
                  </div>
                  <div className="vocab-actions">
                    <button
                      className="button button-primary"
                      type="button"
                      aria-label={`Öffnen: ${deck.name}`}
                      onClick={() => actions.openDeck(deck.id)}
                    >
                      Öffnen
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      aria-label={`Exportieren: ${deck.name}`}
                      onClick={() => {
                        const file = exportDecks(store, [deck.id], new Date());
                        downloadText(exportFileName(file), `${JSON.stringify(file, null, 2)}\n`);
                        actions.notify({ tone: 'success', text: `„${deck.name}" exportiert – ohne Lernfortschritt.` });
                      }}
                    >
                      Exportieren
                    </button>
                    <button
                      className="button button-ghost-danger"
                      type="button"
                      aria-label={`Löschen: ${deck.name}`}
                      onClick={() => setPendingDelete(deck.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <CreateDeckForm store={store} actions={actions} />
      </section>

      <section className="vocab-panel" aria-labelledby="starter-title">
        <h2 id="starter-title">Starterdecks</h2>
        <p className="vocab-muted">
          Redaktionell erstellte Beispiele. Sie werden erst gespeichert, wenn du sie übernimmst – danach sind sie
          deine eigenen, frei bearbeitbaren Decks.
        </p>
        <ul className="vocab-starter-list">
          {STARTER_DECKS.map((starter) => {
            const adopted = starterAdopted(store, starter.id);
            return (
              <li key={starter.id} className="vocab-starter">
                <h3>{starter.name}</h3>
                <p>{starter.description}</p>
                <p className="vocab-muted">{plural(starter.cards.length, 'Karte', 'Karten')} · Englisch → Deutsch</p>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={adopted}
                  aria-label={`${adopted ? 'Bereits übernommen' : 'Als eigenes Deck übernehmen'}: ${starter.name}`}
                  onClick={() => {
                    const result = adoptStarterDeck(store, starter.id, new Date());
                    if (!result.ok) {
                      actions.notify({ tone: 'error', text: result.error.message });
                      return;
                    }
                    actions.commit(result.value, `Starterdeck „${starter.name}" übernommen.`);
                  }}
                >
                  {adopted ? 'Bereits übernommen' : 'Als eigenes Deck übernehmen'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <VocabImport store={store} actions={actions} />

      <ConfirmDialog
        open={deckToDelete !== null}
        title={deckToDelete ? `Deck „${deckToDelete.name}" löschen?` : 'Deck löschen?'}
        confirmLabel="Deck endgültig löschen"
        danger
        onConfirm={confirmDeleteDeck}
        onCancel={() => setPendingDelete(null)}
      >
        {deckToDelete && impact ? (
          <p>
            Gelöscht werden das Deck „{deckToDelete.name}", {plural(impact.cards, 'Karte', 'Karten')} und der lokale
            Lernfortschritt von {plural(impact.reviewedQueries, 'Abfrage', 'Abfragen')}. Andere Decks bleiben
            unverändert. Das lässt sich nicht rückgängig machen.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function SessionSetup({ store, actions }: { store: VocabStore; actions: VocabActions }): React.ReactElement {
  const [choice, setChoice] = useState<DirectionChoice>('both');
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const formId = useId();
  const selectedDecks = useMemo(
    () => new Set(store.decks.map((deck) => deck.id).filter((id) => !excluded.has(id))),
    [store.decks, excluded],
  );
  const now = new Date();
  const options = { deckIds: selectedDecks, directions: directionsOf(choice), now };
  const dueCount = dueTasks(store, options).length;
  const sessionSize = Math.min(dueCount, LIMITS.sessionSize);
  const next = dueCount === 0 ? nextDueAt(store, options) : null;

  if (store.cards.length === 0) {
    return (
      <section className="vocab-panel" aria-labelledby="session-title">
        <h2 id="session-title">Daily Review</h2>
        <p className="vocab-empty">Sobald ein Deck Karten enthält, kannst du hier eine Session starten.</p>
      </section>
    );
  }

  return (
    <section className="vocab-panel vocab-session-setup" aria-labelledby="session-title">
      <h2 id="session-title">Daily Review</h2>
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          const tasks = buildQueue(store, { ...options, now: new Date() });
          if (tasks.length > 0) actions.startSession(tasks);
        }}
      >
        <fieldset>
          <legend>Lernrichtung</legend>
          <div className="vocab-choices">
            {DIRECTION_CHOICES.map((entry) => (
              <label key={entry.value} className="vocab-choice">
                <input
                  type="radio"
                  name="direction"
                  value={entry.value}
                  checked={choice === entry.value}
                  onChange={() => setChoice(entry.value)}
                />
                {entry.label}
              </label>
            ))}
          </div>
        </fieldset>
        {store.decks.length > 1 ? (
          <fieldset>
            <legend>Decks</legend>
            <div className="vocab-choices">
              {store.decks.map((deck) => (
                <label key={deck.id} className="vocab-choice">
                  <input
                    type="checkbox"
                    checked={selectedDecks.has(deck.id)}
                    onChange={(event) => {
                      const nextExcluded = new Set(excluded);
                      if (event.target.checked) nextExcluded.delete(deck.id);
                      else nextExcluded.add(deck.id);
                      setExcluded(nextExcluded);
                    }}
                  />
                  {deck.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <p className="vocab-session-summary" aria-live="polite">
          {dueCount === 0
            ? next
              ? `Nichts fällig. Nächste Fälligkeit: ${formatDateTime(next)}.`
              : 'Nichts fällig.'
            : `${plural(dueCount, 'Abfrage', 'Abfragen')} fällig. Die Session umfasst ${sessionSize} davon (höchstens ${LIMITS.sessionSize}).`}
        </p>
        <button className="button button-primary" type="submit" disabled={dueCount === 0}>
          Session starten
        </button>
      </form>
    </section>
  );
}

function CreateDeckForm({ store, actions }: { store: VocabStore; actions: VocabActions }): React.ReactElement {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<{ field: 'name' | 'description' | null; text: string } | null>(null);
  const nameId = useId();
  const descriptionId = useId();

  return (
    <form
      className="vocab-form"
      aria-labelledby={`${nameId}-legend`}
      onSubmit={(event) => {
        event.preventDefault();
        const id = newId('deck');
        const result = createDeck(store, { name, description }, id, new Date());
        if (!result.ok) {
          const field = result.error.field === 'name' || result.error.field === 'description' ? result.error.field : null;
          setError({ field, text: result.error.message });
          if (field) document.getElementById(field === 'name' ? nameId : descriptionId)?.focus();
          return;
        }
        if (actions.commit(result.value, `Deck „${name.trim()}" angelegt.`)) {
          setName('');
          setDescription('');
          setError(null);
          actions.openDeck(id);
        }
      }}
    >
      <h3 id={`${nameId}-legend`}>Neues Deck anlegen</h3>
      <p className="vocab-muted">Sprachpaar: Englisch → Deutsch (Begriff auf Englisch, Übersetzung auf Deutsch).</p>
      <div className="vocab-field">
        <label htmlFor={nameId}>Name des Decks</label>
        <input
          id={nameId}
          value={name}
          maxLength={LIMITS.deckName * 2}
          aria-invalid={error?.field === 'name' || undefined}
          aria-describedby={error?.field === 'name' ? `${nameId}-error` : undefined}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
        <FieldError id={`${nameId}-error`} text={error?.field === 'name' ? error.text : null} />
      </div>
      <div className="vocab-field">
        <label htmlFor={descriptionId}>Beschreibung (optional)</label>
        <input
          id={descriptionId}
          value={description}
          maxLength={LIMITS.deckDescription * 2}
          aria-invalid={error?.field === 'description' || undefined}
          aria-describedby={error?.field === 'description' ? `${descriptionId}-error` : undefined}
          onChange={(event) => setDescription(event.target.value)}
          autoComplete="off"
        />
        <FieldError id={`${descriptionId}-error`} text={error?.field === 'description' ? error.text : null} />
      </div>
      {error && error.field === null ? (
        <p className="field-error" role="alert">
          {error.text}
        </p>
      ) : null}
      <button className="button button-primary" type="submit" disabled={actions.locked}>
        Deck anlegen
      </button>
    </form>
  );
}
