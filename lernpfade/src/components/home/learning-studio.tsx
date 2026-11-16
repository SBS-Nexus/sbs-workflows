'use client';

import { useState } from 'react';

/**
 * Eigenständige Produktvorschau. Alle Beispiele sind redaktionell und lokal.
 * Aufdecken ist absichtlich keine Review-Bewertung und speichert nichts.
 * Produktlogik, Statistik und IndexedDB bleiben den echten Lernseiten vorbehalten.
 */
const EXAMPLES = [
  {
    id: 'sprache',
    ordinal: '01',
    label: 'Sprache',
    descriptor: 'EN → DE',
    title: 'retrieval',
    answer: 'Abruf · Wiederauffinden',
    annotation: 'Den Begriff aus dem Gedächtnis abrufen, statt ihn nur wiederzuerkennen.',
    cue: 'Ein Begriff, zwei Lernrichtungen.',
  },
  {
    id: 'git',
    ordinal: '02',
    label: 'Git & GitHub',
    descriptor: 'TECH → DE',
    title: 'git commit',
    answer: 'Einen versionierten Schnappschuss speichern.',
    annotation: 'Ein Commit dokumentiert einen definierten Stand im Repository-Verlauf.',
    cue: 'Konzepte verstehen, nicht nur Befehle merken.',
  },
  {
    id: 'ai',
    ordinal: '03',
    label: 'AI',
    descriptor: 'TERM → DE',
    title: 'embedding',
    answer: 'Numerische Repräsentation.',
    annotation: 'Ein Embedding stellt Inhalte als Vektoren dar, etwa für semantische Suche.',
    cue: 'Vom Fachbegriff zum mentalen Modell.',
  },
] as const;

export function LearningStudio(): React.ReactElement {
  const [active, setActive] = useState<(typeof EXAMPLES)[number]['id']>('sprache');
  const [revealed, setRevealed] = useState(false);
  const current = EXAMPLES.find((item) => item.id === active) ?? EXAMPLES[0];

  return (
    <section className="lp-studio" aria-labelledby="lp-studio-heading">
      <div className="shell lp-studio-shell">
        <div className="lp-studio-kicker">
          <span><span className="lp-studio-pulse" aria-hidden="true" /> LEARNING LAB / 001</span>
          <span>INTERAKTIVE VORSCHAU</span>
        </div>
        <div className="lp-studio-intro">
          <div>
            <p className="eyebrow">Lernen ist kein Scrollen.</p>
            <h2 id="lp-studio-heading">Verstehen beginnt mit <em>einer guten Frage.</em></h2>
          </div>
          <p>
            Probier aus, wie sich aktives Abrufen anfühlt. Keine Animation als Selbstzweck:
            eine Frage, ein Gedanke, eine bewusst aufgedeckte Antwort.
          </p>
        </div>

        <div className="lp-studio-workspace">
          <div className="lp-studio-selector" aria-label="Beispielthema auswählen">
            <div className="lp-studio-selector-top">
              <span>WÄHLE EINEN FOKUS</span>
              <span>01—03</span>
            </div>
            {EXAMPLES.map((example) => (
              <button
                type="button"
                key={example.id}
                className="lp-studio-topic"
                aria-pressed={active === example.id}
                onClick={() => {
                  setActive(example.id);
                  setRevealed(false);
                }}
              >
                <span className="lp-studio-topic-index">{example.ordinal}</span>
                <span className="lp-studio-topic-name">{example.label}</span>
                <span className="lp-studio-topic-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
            <p className="lp-studio-selector-foot">Wählen · Nachdenken · Aufdecken</p>
          </div>

          <div className="lp-studio-example" aria-label="Lernkarten-Vorschau">
            <div className="lp-studio-example-top">
              <span className="lp-studio-chip"><span aria-hidden="true">✳</span> LERNPFAD / LAB</span>
              <span className="lp-studio-demo">DEMO · NICHT GESPEICHERT</span>
            </div>
            <div className="lp-studio-example-body" key={current.id}>
              <div className="lp-studio-exercise-meta">
                <span>{current.descriptor}</span>
                <span>AKTIVER ABRUF</span>
              </div>
              <p className="lp-studio-question">Was bedeutet …</p>
              <h3 className="lp-studio-prompt">{current.title}<span className="lp-studio-cursor" aria-hidden="true">_</span></h3>
              <div className="lp-studio-answer-space" aria-live="polite" aria-atomic="true">
                {revealed ? (
                  <div className="lp-studio-answer" data-answer-revealed="true">
                    <span className="lp-studio-answer-label">DIE ANTWORT</span>
                    <strong>{current.answer}</strong>
                    <p>{current.annotation}</p>
                  </div>
                ) : (
                  <p className="lp-studio-concealed">Denk kurz nach. Die Lösung erscheint erst, wenn du sie aktiv aufdeckst.</p>
                )}
              </div>
              <div className="lp-studio-example-actions">
                <button
                  type="button"
                  className="lp-studio-reveal"
                  aria-expanded={revealed}
                  onClick={() => setRevealed((open) => !open)}
                >
                  {revealed ? 'Antwort verbergen' : 'Antwort aufdecken'}
                  <span aria-hidden="true">{revealed ? '↶' : '↗'}</span>
                </button>
                <span>KEINE BEWERTUNG</span>
              </div>
            </div>
          </div>
        </div>
        <div className="lp-studio-outro">
          <span>{current.cue}</span>
          <a href="/vokabeln">Eigene Karten anlegen <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}
