'use client';

import { useId, useRef, useState } from 'react';
import { applyImport, previewImport, type ImportPreview } from '@/domain/vocabulary/exchange';
import { LIMITS, type VocabStore } from '@/domain/vocabulary/model';
import { formatDateTime, plural } from './format';
import type { VocabActions } from './vocab-app';

/**
 * Import einer strukturierten JSON-Datei. Die Datei wird nur lokal gelesen
 * und nie übertragen. Ablauf: Größe prüfen (vor dem Lesen) → vollständig
 * prüfen → Vorschau → erst nach Bestätigung übernehmen.
 */
export function VocabImport({ store, actions }: { store: VocabStore; actions: VocabActions }): React.ReactElement {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ fileName: string; value: ImportPreview } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  function reset(): void {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onFile(file: File | undefined): Promise<void> {
    setPreview(null);
    setError(null);
    if (!file) return;
    if (file.size > LIMITS.importBytes) {
      setError(`„${file.name}" ist größer als 2 MiB und wird nicht gelesen.`);
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      const result = previewImport(text, store, new Date());
      if (!result.ok) setError(result.error.message);
      else setPreview({ fileName: file.name, value: result.value });
    } catch {
      setError('Die Datei konnte nicht gelesen werden.');
    } finally {
      setReading(false);
    }
  }

  return (
    <section className="vocab-panel" aria-labelledby="import-title">
      <h2 id="import-title">Deck importieren</h2>
      <p className="vocab-muted">
        JSON-Datei im VokabelPfad-Format (Schema-Version 1), höchstens 2 MiB. Die Datei wird nur in diesem Browser
        gelesen und nicht hochgeladen. Importiert werden Decks und Karten – kein Lernfortschritt. Decks, die es hier
        schon gibt, werden nicht ein zweites Mal angelegt.{' '}
        <a href="/vokabeln/beispiel-import.json" download>
          Beispieldatei herunterladen
        </a>
      </p>
      <div className="vocab-field">
        <label htmlFor={inputId}>Datei auswählen</label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".json,application/json"
          disabled={actions.locked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
      </div>
      {reading ? <p role="status">Datei wird geprüft …</p> : null}
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          Import abgelehnt: {error} Deine vorhandenen Daten sind unverändert.
        </p>
      ) : null}

      {preview ? (
        <div className="vocab-import-preview" role="region" aria-label="Importvorschau">
          <h3>Vorschau: {preview.fileName}</h3>
          <dl className="vocab-preview-list">
            <div>
              <dt>Decks</dt>
              <dd>{preview.value.deckCount}</dd>
            </div>
            <div>
              <dt>Karten</dt>
              <dd>{preview.value.cardCount}</dd>
            </div>
            <div>
              <dt>Sprache</dt>
              <dd>{preview.value.languages}</dd>
            </div>
            <div>
              <dt>Herkunft laut Datei</dt>
              <dd>{[...new Set(preview.value.origins)].join(' · ')}</dd>
            </div>
            {preview.value.exportedAt ? (
              <div>
                <dt>Exportiert am</dt>
                <dd>{formatDateTime(preview.value.exportedAt)}</dd>
              </div>
            ) : null}
          </dl>
          <ul className="vocab-preview-decks">
            {preview.value.decks.map((deck) => (
              <li key={deck.id}>
                {deck.name} ({plural(preview.value.cards.filter((card) => card.deckId === deck.id).length, 'Karte', 'Karten')})
              </li>
            ))}
          </ul>
          <div className="vocab-actions">
            <button
              className="button button-primary"
              type="button"
              disabled={actions.locked || actions.saving}
              onClick={async () => {
                const result = applyImport(store, preview.value);
                if (!result.ok) {
                  setError(result.error.message);
                  reset();
                  return;
                }
                if (
                  await actions.commit(
                    result.value,
                    `${plural(preview.value.deckCount, 'Deck', 'Decks')} mit ${plural(preview.value.cardCount, 'Karte', 'Karten')} importiert.`,
                  )
                ) {
                  reset();
                }
              }}
            >
              Import übernehmen
            </button>
            <button className="button button-secondary" type="button" onClick={reset}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
