'use client';

import { useEffect, useId, useRef } from 'react';
import { LIMITS, type VocabError } from '@/domain/vocabulary/model';

/** Fokussiert ein Element beim Mount — nur nach einem Ansichtswechsel, nie beim ersten Laden der Seite. */
export function useFocusOnMount<T extends HTMLElement>(enabled = true): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (enabled) ref.current?.focus();
  }, [enabled]);
  return ref;
}

export function FieldError({ id, text }: { id: string; text: string | null }): React.ReactElement | null {
  if (!text) return null;
  return (
    <p className="field-error" id={id}>
      {text}
    </p>
  );
}

export type CardDraft = { term: string; translation: string; context: string; tags: string };

export const EMPTY_DRAFT: CardDraft = { term: '', translation: '', context: '', tags: '' };

export type CardFieldName = 'term' | 'translation' | 'context' | 'tags';

export type FieldErrorState = { field: CardFieldName | null; text: string } | null;

export function errorState(error: VocabError): FieldErrorState {
  const field = error.field;
  return {
    field: field === 'term' || field === 'translation' || field === 'context' || field === 'tags' ? field : null,
    text: error.message,
  };
}

const FIELDS: { name: CardFieldName; label: string; lang?: string; hint?: string; max: number }[] = [
  { name: 'term', label: 'Begriff (Englisch)', lang: 'en', max: LIMITS.term },
  { name: 'translation', label: 'Übersetzung (Deutsch)', lang: 'de', max: LIMITS.translation },
  {
    name: 'context',
    label: 'Satzkontext (optional, Englisch)',
    lang: 'en',
    hint: 'Ein Beispielsatz. Er wird beim Lernen erst nach dem Aufdecken gezeigt.',
    max: LIMITS.context,
  },
  {
    name: 'tags',
    label: 'Tags (optional)',
    hint: `Mit Komma trennen, z. B. „reisen, verb". Höchstens ${LIMITS.tagsPerCard} Tags.`,
    max: LIMITS.tagsPerCard * (LIMITS.tag + 2),
  },
];

/** Die vier Kartenfelder mit Beschriftung, Hinweis und Fehler am richtigen Feld. */
export function CardFields({
  draft,
  onChange,
  error,
  idPrefix,
}: {
  draft: CardDraft;
  onChange: (draft: CardDraft) => void;
  error: FieldErrorState;
  idPrefix: string;
}): React.ReactElement {
  const base = useId();
  return (
    <>
      {FIELDS.map((field) => {
        const id = `${idPrefix}-${base}-${field.name}`;
        const errorId = `${id}-error`;
        const hintId = `${id}-hint`;
        const invalid = error?.field === field.name;
        const describedBy = [field.hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ');
        return (
          <div className="vocab-field" key={field.name}>
            <label htmlFor={id}>{field.label}</label>
            {field.hint ? (
              <p className="vocab-hint" id={hintId}>
                {field.hint}
              </p>
            ) : null}
            <input
              id={id}
              name={field.name}
              lang={field.lang}
              value={draft[field.name]}
              // Großzügig über der fachlichen Grenze, damit eine verständliche Meldung erscheint statt stillem Abschneiden.
              maxLength={field.max * 2}
              autoComplete="off"
              spellCheck={field.name === 'tags' ? false : undefined}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy || undefined}
              onChange={(event) => onChange({ ...draft, [field.name]: event.target.value })}
            />
            <FieldError id={errorId} text={invalid ? error.text : null} />
          </div>
        );
      })}
      {error && error.field === null ? (
        <p className="field-error" role="alert">
          {error.text}
        </p>
      ) : null}
    </>
  );
}

/** Fokussiert nach einem Fehler das betroffene Feld eines Formulars. */
export function focusField(form: HTMLFormElement | null, field: CardFieldName | null): void {
  if (!form || !field) return;
  const input = form.querySelector<HTMLInputElement>(`input[name="${field}"]`);
  input?.focus();
}
