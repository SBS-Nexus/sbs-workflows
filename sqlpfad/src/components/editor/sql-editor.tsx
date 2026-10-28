'use client';

import { useEffect, useId, useRef } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  placeholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { MSSQL, sql } from '@codemirror/lang-sql';
import { tags } from '@lezer/highlight';
import type { UebungsDatensatz } from '@/domain/sql/schema';

/**
 * Der Editor.
 *
 * CodeMirror statt eines `<textarea>`, und zwar wegen dreier Dinge, die beim
 * Lernen von SQL wirklich zählen: Die Vervollständigung kennt die Tabellen
 * dieser Übung, die Hervorhebung trennt Schlüsselwörter von Namen, und
 * Klammern werden zugeordnet. Ohne das schreibt eine Anfängerin `SLECT` und
 * sieht keinen Unterschied, bis der Server sich meldet.
 *
 * Bewusst **keine** Fehlerprüfung im Editor. Eine Wellenlinie, die eine
 * Abfrage anmeckert, bevor sie gelaufen ist, nimmt genau den Schritt vorweg,
 * um den es geht: erst vorhersagen, dann ausführen, dann vergleichen.
 *
 * Der Dialekt ist ausdrücklich MSSQL. `TOP`, eckige Klammern um Namen und
 * `GETDATE()` gehören dazu, `LIMIT` nicht – ein Editor, der Standard-SQL
 * vervollständigt, würde beim Lernen von T-SQL in die Irre führen.
 */

/**
 * Die Hervorhebung als Klassen, nicht als Farben.
 *
 * Vorher stand hier CodeMirrors `defaultHighlightStyle`. Dessen Farben sind
 * fest und für helle Flächen gewählt: Im dunklen Schema stand `SELECT` in
 * Dunkelviolett (#770088) auf ink-900 – 1,6:1, praktisch unlesbar. Die Klassen
 * bekommen ihre Farbe aus den Farbmarken in globals.css und wechseln damit
 * das Schema mit; die Kontraste rechnet tests/unit/farbkontrast.test.ts nach.
 *
 * Namen in eckigen Klammern (`[Kunden]`) tragen die Textfarbe: Der
 * SQL-Parser führt sie als besondere Zeichenkette, gemeint ist aber ein Name
 * wie jeder andere. Ohne eigene Regel fiele die Hervorhebung auf die Farbe
 * für Zeichenketten zurück, und `[Stadt]` sähe aus wie `N'Stadt'` – genau
 * die Verwechslung, die die Hervorhebung verhindern soll.
 */
const hervorhebung = HighlightStyle.define([
  { tag: tags.keyword, class: 'tok-keyword' },
  { tag: tags.typeName, class: 'tok-type' },
  { tag: tags.standard(tags.name), class: 'tok-function' },
  { tag: tags.special(tags.string), class: 'tok-name' },
  { tag: tags.string, class: 'tok-string' },
  { tag: [tags.number, tags.bool, tags.null], class: 'tok-number' },
  { tag: [tags.lineComment, tags.blockComment], class: 'tok-comment' },
]);

export function SqlEditor({
  wert,
  beiAenderung,
  beiAusfuehren,
  datensatz,
  schreibgeschuetzt = false,
  hinweis = 'Hier deine Abfrage schreiben …',
  beschriftung = 'SQL-Abfrage',
}: {
  wert: string;
  beiAenderung: (neu: string) => void;
  /** Wird von Strg + Enter ausgelöst. */
  beiAusfuehren?: () => void;
  /** Liefert die Vervollständigung für Tabellen und Spalten. */
  datensatz?: UebungsDatensatz;
  schreibgeschuetzt?: boolean;
  hinweis?: string;
  /** Zugänglicher Name des Eingabefelds – der Platzhalter ist keiner. */
  beschriftung?: string;
}): React.ReactElement {
  const behaelter = useRef<HTMLDivElement>(null);
  const ansicht = useRef<EditorView | null>(null);
  const beiAusfuehrenRef = useRef(beiAusfuehren);
  const id = useId();

  /*
   * Der Rückruf steckt in einer Referenz, damit ein neuer Rückruf nicht den
   * ganzen Editor neu aufbaut – das würde bei jedem Tastendruck die
   * Einfügemarke verlieren.
   *
   * Das Zuweisen gehört in einen Effekt und nicht in den Renderdurchlauf:
   * Während des Renderns ist eine Referenz noch nicht der Stand, den React
   * gleich anzeigt. Die Tastenbelegung liest sie ohnehin erst beim
   * Tastendruck, also lange nach dem Effekt.
   */
  useEffect(() => {
    beiAusfuehrenRef.current = beiAusfuehren;
  }, [beiAusfuehren]);

  useEffect(() => {
    if (!behaelter.current) return;

    /** Tabellen und Spalten dieser Übung für die Vervollständigung. */
    const schema: Record<string, string[]> = {};
    for (const tabelle of datensatz?.tabellen ?? []) {
      schema[tabelle.name] = tabelle.spalten.map((spalte) => spalte.name);
    }

    const erweiterungen: Extension[] = [
      lineNumbers(),
      history(),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      autocompletion({ activateOnTyping: true }),
      syntaxHighlighting(hervorhebung),
      sql({ dialect: MSSQL, schema, upperCaseKeywords: true }),
      placeholder(hinweis),
      EditorView.lineWrapping,
      /*
       * Ein Name für Hilfstechnik. CodeMirror schreibt in ein
       * `contenteditable`, das ohne diese Angabe namenlos ist: Ein
       * Bildschirmleser sagt dann nur „Bearbeitbar", und axe meldet es als
       * schweren Befund (WCAG 4.1.2). Der Platzhalter zählt nicht – er
       * verschwindet beim ersten Zeichen.
       */
      EditorView.contentAttributes.of({ 'aria-label': beschriftung, 'aria-multiline': 'true' }),
      EditorState.readOnly.of(schreibgeschuetzt),
      keymap.of([
        {
          /*
           * Strg + Enter führt aus.
           *
           * Die verbreitete Belegung in Datenbankwerkzeugen. Wer SQLPfad
           * verlässt und mit SSMS oder Azure Data Studio weiterarbeitet, muss
           * sich nichts umgewöhnen - eine eigene Belegung wäre hier nur
           * Eigensinn.
           */
          key: 'Mod-Enter',
          preventDefault: true,
          run: () => {
            beiAusfuehrenRef.current?.();
            return true;
          },
        },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) beiAenderung(update.state.doc.toString());
      }),
      EditorView.theme({
        '&': { fontSize: '0.875rem', backgroundColor: 'transparent' },
        '.cm-content': { fontFamily: 'var(--font-mono)', padding: '0.75rem 0' },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
        },
        '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--accent) 6%, transparent)' },
        '.cm-activeLineGutter': { backgroundColor: 'transparent' },
        /*
         * Die Vervollständigungsliste.
         *
         * CodeMirror bringt eine eigene Gestaltung mit, die von der
         * Farbeinstellung des Betriebssystems ausgeht und nicht von der der
         * Anwendung. Im dunklen Schema stand deshalb eine weiße Liste mit
         * knallblauer Auswahl mitten auf einer dunklen Seite. Sie hier an die
         * Farbmarken zu binden ist der einzige Weg – es ist ein Element
         * außerhalb des React-Baums.
         */
        '.cm-tooltip': {
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface-raised)',
          borderRadius: '0.5rem',
          overflow: 'hidden',
        },
        '.cm-tooltip.cm-tooltip-autocomplete > ul': {
          fontFamily: 'var(--font-mono)',
          maxHeight: '12rem',
        },
        '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { padding: '0.25rem 0.6rem' },
        '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
          /*
           * Ein Tonwert der Leitfarbe, nicht die volle Fläche.
           *
           * Zuerst stand hier weiße Schrift auf `--accent`. Im hellen Schema
           * geht das - im dunklen ist `--accent` ein helles Petrol, und weiß
           * darauf ergibt 1,78:1. Nachgemessen, nicht geschätzt: Auf dem
           * Bildschirm sah es nur „etwas blass" aus.
           */
          backgroundColor: 'color-mix(in oklab, var(--accent) 20%, transparent)',
          color: 'var(--text)',
        },
        '.cm-completionIcon': { opacity: 0.6 },
        // Sichtbarer Fokus auf dem Kasten, nicht auf dem Textbereich: Der
        // Rahmen ist das, was man als Element wahrnimmt (WCAG 2.4.7).
        '&.cm-focused': { outline: 'none' },
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: wert, extensions: erweiterungen }),
      parent: behaelter.current,
    });
    ansicht.current = view;

    return () => {
      view.destroy();
      ansicht.current = null;
    };
    // Absichtlich ohne `wert`: Der Editor verwaltet seinen Text selbst. Stünde
    // `wert` hier, würde jeder Tastendruck den Editor neu aufbauen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datensatz, schreibgeschuetzt, hinweis, beschriftung]);

  /*
   * Text von außen setzen - etwa beim Zurücksetzen auf das Startgerüst.
   * Nur, wenn er sich wirklich unterscheidet: Sonst springt die Einfügemarke
   * bei jedem Tastendruck an den Anfang.
   */
  useEffect(() => {
    const view = ansicht.current;
    if (!view) return;
    const aktuell = view.state.doc.toString();
    if (aktuell === wert) return;
    view.dispatch({ changes: { from: 0, to: aktuell.length, insert: wert } });
  }, [wert]);

  return (
    <div
      ref={behaelter}
      id={id}
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2 focus-within:border-[var(--focus-ring)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[var(--focus-ring)]"
    />
  );
}
