'use client';

import { useId, useRef, useState } from 'react';
import { splitTagInput, newId } from '@/domain/vocabulary/fields';
import { LIMITS, type VocabCard, type VocabStore } from '@/domain/vocabulary/model';
import {
  addCard,
  cardDeletionImpact,
  cardsWithTag,
  changesLearningContent,
  deckDeletionImpact,
  deckTags,
  deleteCard,
  deleteDeck,
  updateCard,
  updateDeck,
  type CardInput,
} from '@/domain/vocabulary/operations';
import { deckStats } from '@/domain/vocabulary/session';
import { ConfirmDialog } from './confirm-dialog';
import { originLabel, plural } from './format';
import type { VocabActions } from './vocab-app';
import {
  CardFields,
  EMPTY_DRAFT,
  FieldError,
  errorState,
  focusField,
  useFocusOnMount,
  type CardDraft,
  type FieldErrorState,
} from './vocab-fields';

function toInput(draft: CardDraft): CardInput {
  return { term: draft.term, translation: draft.translation, context: draft.context, tags: splitTagInput(draft.tags) };
}

function toDraft(card: VocabCard): CardDraft {
  return { term: card.term, translation: card.translation, context: card.context, tags: card.tags.join(', ') };
}

export function VocabDeckView({
  store,
  deckId,
  actions,
}: {
  store: VocabStore;
  deckId: string;
  actions: VocabActions;
}): React.ReactElement | null {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const deck = store.decks.find((entry) => entry.id === deckId);
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingCardDelete, setPendingCardDelete] = useState<string | null>(null);
  const [pendingDeckDelete, setPendingDeckDelete] = useState(false);
  const filterId = useId();
  if (!deck) return null;

  const cards = store.cards.filter((card) => card.deckId === deck.id);
  const tags = deckTags(store, deck.id);
  const activeTag = tag && tags.some((entry) => entry.toLocaleLowerCase('de-DE') === tag.toLocaleLowerCase('de-DE')) ? tag : null;
  const visible = cardsWithTag(cards, activeTag);
  const counts = deckStats(store, deck.id, actions.now);
  const cardToDelete = cards.find((card) => card.id === pendingCardDelete) ?? null;
  const cardImpact = cardToDelete ? cardDeletionImpact(store, cardToDelete.id) : null;
  const deckImpact = deckDeletionImpact(store, deck.id);

  return (
    <div className="vocab-deck-view">
      <button className="vocab-back" type="button" onClick={() => actions.openOverview()}>
        ← Alle Decks
      </button>
      <section className="vocab-panel" aria-labelledby="deck-title">
        <p className="eyebrow">Deck · Englisch → Deutsch</p>
        <h1 id="deck-title" ref={headingRef} tabIndex={-1}>
          {deck.name}
        </h1>
        <p className="vocab-muted">
          {originLabel(deck.origin)} · {plural(counts.cards, 'Karte', 'Karten')} ·{' '}
          {plural(counts.due, 'Abfrage', 'Abfragen')} fällig
        </p>
        <DeckSettings key={`${deck.name}|${deck.description}`} store={store} deckId={deck.id} actions={actions} />
      </section>

      <section className="vocab-panel" aria-labelledby="new-card-title">
        <h2 id="new-card-title">Neue Karte</h2>
        <NewCardForm store={store} deckId={deck.id} actions={actions} />
      </section>

      <section className="vocab-panel" aria-labelledby="cards-title">
        <div className="vocab-panel-head">
          <h2 id="cards-title">Karten</h2>
          {tags.length > 0 ? (
            <div className="vocab-filter">
              <label htmlFor={filterId}>Nach Tag filtern</label>
              <select id={filterId} value={activeTag ?? ''} onChange={(event) => setTag(event.target.value || null)}>
                <option value="">Alle Tags</option>
                {tags.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        {cards.length === 0 ? (
          <p className="vocab-empty">Dieses Deck hat noch keine Karten.</p>
        ) : (
          <>
            <p className="vocab-muted" aria-live="polite">
              {activeTag
                ? `${plural(visible.length, 'Karte', 'Karten')} mit Tag „${activeTag}"`
                : plural(cards.length, 'Karte', 'Karten')}
            </p>
            <ul className="vocab-card-list">
              {visible.map((card) =>
                editing === card.id ? (
                  <li key={card.id} className="vocab-card-item vocab-card-editing">
                    <EditCardForm
                      store={store}
                      card={card}
                      actions={actions}
                      onDone={() => setEditing(null)}
                    />
                  </li>
                ) : (
                  <li key={card.id} className="vocab-card-item">
                    <div className="vocab-card-text">
                      <p className="vocab-card-term">
                        <span lang="en">{card.term}</span>
                        <span aria-hidden="true"> → </span>
                        <span className="visually-hidden"> bedeutet </span>
                        <span lang="de">{card.translation}</span>
                      </p>
                      {card.context ? (
                        <p className="vocab-card-context" lang="en">
                          {card.context}
                        </p>
                      ) : null}
                      {card.tags.length > 0 ? (
                        <ul className="vocab-tags" aria-label="Tags">
                          {card.tags.map((entry) => (
                            <li key={entry}>{entry}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="vocab-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        aria-label={`Bearbeiten: ${card.term}`}
                        onClick={() => setEditing(card.id)}
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="button button-ghost-danger"
                        type="button"
                        aria-label={`Löschen: ${card.term}`}
                        onClick={() => setPendingCardDelete(card.id)}
                      >
                        Löschen
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </>
        )}
      </section>

      <section className="vocab-panel vocab-danger-zone" aria-labelledby="deck-delete-title">
        <h2 id="deck-delete-title">Deck löschen</h2>
        <p className="vocab-muted">Entfernt dieses Deck mit allen Karten und dem lokalen Lernfortschritt.</p>
        <button className="button button-danger" type="button" onClick={() => setPendingDeckDelete(true)}>
          Deck „{deck.name}" löschen …
        </button>
      </section>

      <ConfirmDialog
        open={cardToDelete !== null}
        title="Karte löschen?"
        confirmLabel="Karte löschen"
        danger
        onCancel={() => setPendingCardDelete(null)}
        onConfirm={() => {
          if (!cardToDelete) return;
          const result = deleteCard(store, cardToDelete.id);
          setPendingCardDelete(null);
          if (!result.ok) {
            actions.notify({ tone: 'error', text: result.error.message });
            return;
          }
          void actions.commit(result.value, `Karte „${cardToDelete.term}" gelöscht.`);
        }}
      >
        {cardToDelete && cardImpact ? (
          <p>
            Gelöscht wird die Karte „<span lang="en">{cardToDelete.term}</span>" → „
            <span lang="de">{cardToDelete.translation}</span>" aus „{deck.name}" mit dem lokalen Lernfortschritt
            von {plural(cardImpact.reviewedQueries, 'Abfrage', 'Abfragen')} (beide Richtungen). Andere Karten und
            Decks bleiben unverändert.
          </p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingDeckDelete}
        title={`Deck „${deck.name}" löschen?`}
        confirmLabel="Deck endgültig löschen"
        danger
        onCancel={() => setPendingDeckDelete(false)}
        onConfirm={async () => {
          const result = deleteDeck(store, deck.id);
          setPendingDeckDelete(false);
          if (!result.ok) {
            actions.notify({ tone: 'error', text: result.error.message });
            return;
          }
          if (await actions.commit(result.value, '')) {
            actions.openOverview({ tone: 'success', text: `Deck „${deck.name}" wurde gelöscht.` });
          }
        }}
      >
        <p>
          Gelöscht werden das Deck „{deck.name}", {plural(deckImpact.cards, 'Karte', 'Karten')} und der lokale
          Lernfortschritt von {plural(deckImpact.reviewedQueries, 'Abfrage', 'Abfragen')}. Andere Decks bleiben
          unverändert. Das lässt sich nicht rückgängig machen.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function DeckSettings({
  store,
  deckId,
  actions,
}: {
  store: VocabStore;
  deckId: string;
  actions: VocabActions;
}): React.ReactElement | null {
  const deck = store.decks.find((entry) => entry.id === deckId);
  const [name, setName] = useState(deck?.name ?? '');
  const [description, setDescription] = useState(deck?.description ?? '');
  const [error, setError] = useState<{ field: 'name' | 'description' | null; text: string } | null>(null);
  const nameId = useId();
  const descriptionId = useId();
  if (!deck) return null;

  return (
    <form
      className="vocab-form vocab-form-inline"
      aria-label="Deck umbenennen"
      onSubmit={(event) => {
        event.preventDefault();
        const result = updateDeck(store, deck.id, { name, description });
        if (!result.ok) {
          const field = result.error.field === 'name' || result.error.field === 'description' ? result.error.field : null;
          setError({ field, text: result.error.message });
          if (field) document.getElementById(field === 'name' ? nameId : descriptionId)?.focus();
          return;
        }
        setError(null);
        void actions.commit(result.value, 'Deck gespeichert. Lernfortschritt bleibt unverändert.');
      }}
    >
      <div className="vocab-field">
        <label htmlFor={nameId}>Name des Decks</label>
        <input
          id={nameId}
          value={name}
          maxLength={LIMITS.deckName * 2}
          autoComplete="off"
          aria-invalid={error?.field === 'name' || undefined}
          aria-describedby={error?.field === 'name' ? `${nameId}-error` : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        <FieldError id={`${nameId}-error`} text={error?.field === 'name' ? error.text : null} />
      </div>
      <div className="vocab-field">
        <label htmlFor={descriptionId}>Beschreibung (optional)</label>
        <input
          id={descriptionId}
          value={description}
          maxLength={LIMITS.deckDescription * 2}
          autoComplete="off"
          aria-invalid={error?.field === 'description' || undefined}
          aria-describedby={error?.field === 'description' ? `${descriptionId}-error` : undefined}
          onChange={(event) => setDescription(event.target.value)}
        />
        <FieldError id={`${descriptionId}-error`} text={error?.field === 'description' ? error.text : null} />
      </div>
      <button className="button button-secondary" type="submit" disabled={actions.locked || actions.saving}>
        Deck speichern
      </button>
    </form>
  );
}

function NewCardForm({
  store,
  deckId,
  actions,
}: {
  store: VocabStore;
  deckId: string;
  actions: VocabActions;
}): React.ReactElement {
  const [draft, setDraft] = useState<CardDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<FieldErrorState>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="vocab-form"
      aria-label="Neue Karte"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = addCard(store, deckId, toInput(draft), newId('card'), new Date());
        if (!result.ok) {
          const state = errorState(result.error);
          setError(state);
          focusField(formRef.current, state?.field ?? null);
          return;
        }
        if (await actions.commit(result.value, `Karte „${draft.term.trim()}" angelegt.`)) {
          setDraft(EMPTY_DRAFT);
          setError(null);
          focusField(formRef.current, 'term');
        }
      }}
    >
      <CardFields draft={draft} onChange={setDraft} error={error} idPrefix="new" />
      <p className="vocab-muted">
        {plural(store.cards.length, 'Karte', 'Karten')} von höchstens {LIMITS.cards} insgesamt.
      </p>
      <button className="button button-primary" type="submit" disabled={actions.locked || actions.saving}>
        Karte hinzufügen
      </button>
    </form>
  );
}

function EditCardForm({
  store,
  card,
  actions,
  onDone,
}: {
  store: VocabStore;
  card: VocabCard;
  actions: VocabActions;
  onDone: () => void;
}): React.ReactElement {
  const [draft, setDraft] = useState<CardDraft>(() => toDraft(card));
  const [error, setError] = useState<FieldErrorState>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const formRef = useFocusOnMount<HTMLFormElement>();
  const hasProgress = store.reviews.some((review) => review.cardId === card.id);

  async function save(confirmProgressReset: boolean): Promise<void> {
    const result = updateCard(store, card.id, toInput(draft), confirmProgressReset);
    if (!result.ok) {
      const state = errorState(result.error);
      setError(state);
      focusField(formRef.current, state?.field ?? null);
      return;
    }
    const message = result.value.progressReset
      ? 'Karte gespeichert. Der Lernfortschritt beider Richtungen beginnt neu.'
      : 'Karte gespeichert.';
    if (await actions.commit(result.value.store, message)) onDone();
  }

  return (
    <form
      ref={formRef}
      className="vocab-form"
      aria-label={`Karte „${card.term}" bearbeiten`}
      tabIndex={-1}
      onSubmit={(event) => {
        event.preventDefault();
        if (hasProgress && changesLearningContent(card, toInput(draft))) {
          setConfirmReset(true);
          return;
        }
        void save(false);
      }}
    >
      <CardFields draft={draft} onChange={setDraft} error={error} idPrefix={`edit-${card.id}`} />
      <div className="vocab-actions">
        <button className="button button-primary" type="submit" disabled={actions.locked || actions.saving}>
          Änderungen speichern
        </button>
        <button className="button button-secondary" type="button" onClick={onDone}>
          Abbrechen
        </button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        title="Lernfortschritt dieser Karte neu starten?"
        confirmLabel="Speichern und neu starten"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void save(true);
        }}
      >
        <p>
          Du änderst Begriff oder Übersetzung. Der bisherige Fortschritt passt dann nicht mehr zum Inhalt: Beide
          Richtungen dieser Karte werden wieder als neu und fällig geführt. Satzkontext und Tags allein ändern
          nichts am Fortschritt.
        </p>
      </ConfirmDialog>
    </form>
  );
}
