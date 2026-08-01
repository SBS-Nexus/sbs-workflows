'use client';

import { useEffect, useRef } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
  HighlightStyle,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';

/**
 * Code-Editor auf Basis von CodeMirror 6.
 *
 * Warum CodeMirror und nicht Monaco?
 *  - Deutlich kleineres Bundle (rund ein Zehntel), was auf langsamen
 *    Verbindungen spürbar ist.
 *  - Bessere Bedienbarkeit auf Mobilgeräten.
 *  - Zugänglicher: Der Inhalt liegt in einem `contenteditable` mit
 *    ARIA-Beschriftung, und Tab lässt sich so belegen, dass es die Tastaturfalle
 *    vermeidet.
 *
 * Zur Tastaturbedienung: `indentWithTab` belegt Tab mit Einrücken. Damit der
 * Editor keine Tastaturfalle wird (WCAG 2.1.2), verlässt Escape gefolgt von Tab
 * das Feld – das ist das von CodeMirror vorgesehene Verhalten und im Hinweistext
 * unter dem Editor beschrieben.
 */

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, class: 'tok-keyword' },
  { tag: [tags.string, tags.special(tags.string)], class: 'tok-string' },
  { tag: [tags.number, tags.bool, tags.null], class: 'tok-number' },
  { tag: [tags.lineComment, tags.blockComment], class: 'tok-comment' },
  {
    tag: [tags.function(tags.variableName), tags.definition(tags.variableName)],
    class: 'tok-function',
  },
]);

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Beschriftung für Screenreader – zwingend erforderlich. */
  ariaLabel: string;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
  /** Wird bei Strg+Enter ausgelöst. */
  onRun?: () => void;
}

export default function CodeEditor({
  value,
  onChange,
  ariaLabel,
  readOnly = false,
  placeholder,
  minHeight = '14rem',
  onRun,
}: CodeEditorProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  // Die Rückrufe liegen in Refs, damit der Editor nicht bei jeder neuen
  // Funktionsreferenz komplett neu aufgebaut wird. Geschrieben wird nach dem
  // Rendern – während des Renderns dürfen Refs nicht verändert werden.
  useEffect(() => {
    onChangeRef.current = onChange;
    onRunRef.current = onRun;
  }, [onChange, onRun]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      // Python verlangt konsistente Einrückung; vier Leerzeichen sind der
      // Standard aus PEP 8.
      indentUnit.of('    '),
      python(),
      syntaxHighlighting(highlightStyle),
      EditorView.lineWrapping,
      keymap.of([
        {
          key: 'Mod-Enter',
          preventDefault: true,
          run: () => {
            onRunRef.current?.();
            return true;
          },
        },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current(update.state.doc.toString());
      }),
      EditorView.contentAttributes.of({
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
      }),
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
    ];

    if (placeholder) extensions.push(cmPlaceholder(placeholder));

    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: host,
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Der Editor wird bewusst nur einmal aufgebaut. Wertänderungen von außen
    // laufen über den zweiten Effekt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ariaLabel, readOnly, placeholder]);

  // Änderungen von außen (Reset, Musterlösung übernehmen) einspielen.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;

    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return (
    <div
      ref={hostRef}
      style={{ minHeight }}
      className="overflow-hidden rounded-lg border border-[var(--border-strong)]"
    />
  );
}
