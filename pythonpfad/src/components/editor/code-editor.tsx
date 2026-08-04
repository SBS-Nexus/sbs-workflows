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
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { KIND_LABELS, matchVocabulary } from '@/domain/python/vocabulary';

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

/**
 * Vorschläge aus dem deutschen Kursvokabular.
 *
 * Bewusst keine Vervollständigung eigener Variablennamen und keine Analyse
 * des Programms: Beim Lernen ist es wichtig, den selbst vergebenen Namen noch
 * einmal zu tippen. Vorgeschlagen wird nur, was die Sprache mitbringt und im
 * Kurs vorkommt – mit einer Erklärung, die beim Verstehen hilft.
 */
function germanCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);
  if (!word) return null;
  // Ohne ausdrückliche Anforderung erst ab zwei Zeichen: Nach einem einzelnen
  // Buchstaben wäre die Liste lang und der Vorschlag meistens falsch.
  if (word.from === word.to || (word.text.length < 2 && !context.explicit)) return null;

  const matches = matchVocabulary(word.text);
  if (matches.length === 0) return null;

  const options: Completion[] = matches.map((entry) => ({
    label: entry.name,
    type:
      entry.kind === 'keyword'
        ? 'keyword'
        : entry.kind === 'constant'
          ? 'constant'
          : entry.kind === 'method'
            ? 'method'
            : 'function',
    detail: KIND_LABELS[entry.kind],
    info: `${entry.description}\n\nBeispiel: ${entry.example}`,
  }));

  return { from: word.from, options, filter: false };
}

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
  /**
   * Zeile und Meldung des letzten Fehlers.
   *
   * Wird als Markierung im Editor angezeigt: farbige Unterstreichung,
   * Symbol in der Randspalte und Erklärung beim Zeigen darauf. Ohne diese
   * Verbindung müssen Lernende die Zeilennummer aus dem Traceback von Hand
   * im Editor suchen – ein Zwischenschritt, an dem viele hängen bleiben.
   */
  errorMarker?: { line: number; message: string } | null;
}

export default function CodeEditor({
  value,
  onChange,
  ariaLabel,
  readOnly = false,
  placeholder,
  minHeight = '14rem',
  onRun,
  errorMarker = null,
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
      // Die Vorschlagsliste öffnet sich nicht von selbst beim Tippen: Wer noch
      // überlegt, wie eine Zeile heißen soll, wird von einer aufspringenden
      // Liste gestört. Strg + Leertaste holt sie bei Bedarf.
      autocompletion({
        override: [germanCompletions],
        activateOnTyping: false,
        icons: false,
      }),
      lintGutter(),
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
        ...completionKeymap,
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

  /*
   * Fehlermarkierung setzen oder entfernen.
   *
   * Der Bereich umfasst die ganze Zeile. Eine genauere Spalte gibt Python
   * nicht immer her, und eine falsch gesetzte Markierung wäre irreführender
   * als eine großzügige.
   */
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const diagnostics: Diagnostic[] = [];
    if (errorMarker) {
      const lineCount = view.state.doc.lines;
      // Der Traceback kann auf eine Zeile zeigen, die es nach einer Änderung
      // nicht mehr gibt. Dann lieber keine Markierung als eine an falscher Stelle.
      if (errorMarker.line >= 1 && errorMarker.line <= lineCount) {
        const line = view.state.doc.line(errorMarker.line);
        diagnostics.push({
          from: line.from,
          to: line.to,
          severity: 'error',
          message: errorMarker.message,
        });
      }
    }

    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [errorMarker]);

  return (
    <div
      ref={hostRef}
      style={{ minHeight }}
      className="overflow-hidden rounded-lg border border-[var(--border-strong)]"
    />
  );
}
