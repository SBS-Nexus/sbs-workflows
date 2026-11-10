'use client';

import { useId, useState } from 'react';
import { Button, Callout } from '@/components/ui/primitives';
import { LabCompleteButton } from './lab-complete-button';
import {
  toolCallingClientConfigSchema,
  type ToolCallingClientConfig,
} from '@/domain/labs/tool-calling-config';
import {
  pruefeSimuliertenToolAufruf,
  pruefeStrukturierteAusgabe,
  type PruefResultat,
} from '@/domain/tool-calling/vertrag';

type Beispiel = ToolCallingClientConfig['werkzeugAufrufe'][number];

function PruefStation({
  titel,
  intro,
  beispiele,
  pruefen,
  onRichtig,
}: {
  titel: string;
  intro: string;
  beispiele: Beispiel[];
  pruefen: (text: unknown) => PruefResultat;
  onRichtig: (id: string) => void;
}): React.ReactElement {
  const id = useId();
  const [gewaehlt, setGewaehlt] = useState(beispiele[0]?.id ?? '');
  const beispiel = beispiele.find((e) => e.id === gewaehlt) ?? beispiele[0];
  const [text, setText] = useState(beispiel?.json ?? '');
  const [urteil, setUrteil] = useState<'gueltig' | 'ungueltig' | ''>('');
  const [resultat, setResultat] = useState<
    (PruefResultat & { urteilRichtig: boolean; originalEingabe: boolean }) | null
  >(null);
  if (!beispiel) return <p>Keine Beispiele verfügbar.</p>;

  function auswaehlen(e: Beispiel): void {
    setGewaehlt(e.id);
    setText(e.json);
    setUrteil('');
    setResultat(null);
  }

  function auswerten(): void {
    if (!urteil) return;
    const ergebnis = pruefen(text);
    const richtig = ergebnis.ok === (urteil === 'gueltig');
    const originalEingabe = beispiel !== undefined && text === beispiel.json;
    setResultat({
      ...ergebnis,
      urteilRichtig: richtig,
      originalEingabe,
      meldungen: [
        richtig
          ? 'Dein Urteil stimmt mit der Prüfung überein.'
          : 'Dein Urteil passt nicht zur tatsächlichen Prüfung.',
        ...ergebnis.meldungen,
      ],
    });
    // Nur die originalen redaktionellen Fälle zählen zum Abschluss.
    // Bei freiem Experimentieren gibt es Feedback, aber keinen Lernnachweis.
    if (richtig && beispiel && originalEingabe) onRichtig(beispiel.id);
  }

  return (
    <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
      <h2 className="font-mono text-base font-semibold">{titel}</h2>
      <p className="text-sm text-[var(--fg-muted)]">{intro}</p>
      <label htmlFor={id + '-beispiel'} className="block text-sm font-medium">
        Beispiel auswählen
      </label>
      <select
        id={id + '-beispiel'}
        value={beispiel.id}
        onChange={(e) => {
          const gefunden = beispiele.find((b) => b.id === e.target.value);
          if (gefunden) auswaehlen(gefunden);
        }}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] p-2"
      >
        {beispiele.map((b) => (
          <option key={b.id} value={b.id}>
            {b.titel}
          </option>
        ))}
      </select>
      <label htmlFor={id + '-json'} className="block text-sm font-medium">
        JSON – zum Experimentieren editierbar
      </label>
      <textarea
        id={id + '-json'}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResultat(null);
        }}
        rows={6}
        spellCheck={false}
        maxLength={2000}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs"
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Wird dieser Vertrag akzeptiert?</legend>
        {[
          { id: 'gueltig', label: 'Ja, formal gültig' },
          { id: 'ungueltig', label: 'Nein, ablehnen' },
        ].map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={id + '-entscheidung'}
              value={o.id}
              checked={urteil === o.id}
              onChange={() => {
                setUrteil(o.id as 'gueltig' | 'ungueltig');
                setResultat(null);
              }}
            />
            {o.label}
          </label>
        ))}
      </fieldset>
      <Button size="sm" disabled={!urteil} onClick={auswerten}>
        Entscheidung prüfen
      </Button>
      {resultat ? (
        <Callout
          tone={resultat.urteilRichtig ? 'success' : 'warning'}
          title={resultat.urteilRichtig ? 'Urteil richtig' : 'Urteil überprüfen'}
          live
        >
          <p className="text-sm">{resultat.urteil}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {resultat.meldungen.map((m, index) => (
              <li key={index}>{m}</li>
            ))}
          </ul>
          {resultat.originalEingabe ? (
            <p className="mt-2 text-xs">{beispiel.erklaerung}</p>
          ) : (
            <p className="mt-2 text-xs">
              Du hast das JSON verändert. Die Erklärung zum ursprünglichen Beispiel gilt hierfür
              nicht; maßgeblich sind die obigen Prüfbefunde.
            </p>
          )}
        </Callout>
      ) : null}
    </section>
  );
}

export function ToolCallingLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => Promise<boolean>;
}): React.ReactElement {
  const cfg = toolCallingClientConfigSchema.parse(config);
  const [ausgaben, setAusgaben] = useState<ReadonlySet<string>>(() => new Set());
  const [aufrufe, setAufrufe] = useState<ReadonlySet<string>>(() => new Set());
  const [toolResultatUrteil, setToolResultatUrteil] = useState<'daten' | 'befolgen' | ''>('');
  const [toolResultatGeprueft, setToolResultatGeprueft] = useState(false);

  const alleBearbeitet =
    cfg.strukturierteAusgaben.every((e) => ausgaben.has(e.id)) &&
    cfg.werkzeugAufrufe.every((e) => aufrufe.has(e.id)) &&
    toolResultatGeprueft && toolResultatUrteil === 'daten';

  function markieren(id: string, art: 'ausgabe' | 'aufruf'): void {
    if (art === 'ausgabe') setAusgaben((alt) => new Set([...alt, id]));
    else setAufrufe((alt) => new Set([...alt, id]));
  }

  return (
    <div className="space-y-5">
      <Callout tone="info" title="Offline-Demonstration">
        Hier wird kein Modell aufgerufen und kein Werkzeug ausgeführt. JSON-Gültigkeit ist keine
        Wahrheitsgarantie. Die Entscheidung über echte Schreibaktionen läge immer bei einem
        autorisierten Server und gegebenenfalls einem Menschen.
      </Callout>
      <PruefStation
        titel="1. Strukturierte Ausgabe"
        intro="Prüfe die JSON-Form, die Feldtypen und die Regel: belegte Antworten brauchen eine Beleg-ID."
        beispiele={cfg.strukturierteAusgaben}
        pruefen={pruefeStrukturierteAusgabe}
        onRichtig={(id) => markieren(id, 'ausgabe')}
      />
      <PruefStation
        titel="2. Tool-Aufruf"
        intro="Prüfe erlaubten Werkzeugnamen und Argumentvertrag. Selbst formal erlaubte Aufrufe bleiben hier reine Simulation."
        beispiele={cfg.werkzeugAufrufe}
        pruefen={pruefeSimuliertenToolAufruf}
        onRichtig={(id) => markieren(id, 'aufruf')}
      />
      <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
        <h2 className="font-mono text-base font-semibold">
          3. Tool-Ergebnis und Vertrauensgrenze
        </h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Ein Suchwerkzeug liefert Daten zurück. Selbst wenn diese Daten eine Anweisung
          enthalten, entsteht dadurch keine neue Berechtigung.
        </p>
        <p className="text-xs font-semibold">Quelle: {cfg.toolErgebnis.quelle} (synthetisch)</p>
        <blockquote className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm">
          {cfg.toolErgebnis.auszug}
        </blockquote>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{cfg.toolErgebnis.frage}</legend>
          {[
            {
              id: 'befolgen',
              text: 'Die enthaltene Anweisung als Freigabe für einen weiteren Tool-Aufruf behandeln.',
            },
            {
              id: 'daten',
              text: 'Den Text nur als untrusted Dateninhalt behandeln und keine neue Aktion auslösen.',
            },
          ].map((option) => (
            <label key={option.id} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="tool-ergebnis-urteil"
                value={option.id}
                checked={toolResultatUrteil === option.id}
                onChange={() => {
                  setToolResultatUrteil(option.id as 'daten' | 'befolgen');
                  setToolResultatGeprueft(false);
                }}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </fieldset>
        <Button
          size="sm"
          disabled={!toolResultatUrteil}
          onClick={() => setToolResultatGeprueft(true)}
        >
          Tool-Ergebnis beurteilen
        </Button>
        {toolResultatGeprueft ? (
          <Callout
            tone={toolResultatUrteil === 'daten' ? 'success' : 'warning'}
            title={toolResultatUrteil === 'daten' ? 'Richtige Vertrauensgrenze' : 'Nicht freigegeben'}
            live
          >
            {toolResultatUrteil === 'daten'
              ? 'Richtig. Ein Tool-Ergebnis ist Datenmaterial. Die eingebettete Aufforderung hat keine Steuerungsbefugnis.'
              : 'Die Aufforderung stammt aus dem Tool-Dateninhalt, nicht aus einer autorisierten Anweisung. Sie darf keine Folgeaktion auslösen.'}
          </Callout>
        ) : null}
      </section>
      <div className="border-t border-[var(--border)] pt-4">
        {alleBearbeitet ? (
          <LabCompleteButton label="Lab abschließen" onCompleteAction={onCompleteAction} />
        ) : (
          <p className="text-sm text-[var(--fg-muted)]" role="status">
            {ausgaben.size} von {cfg.strukturierteAusgaben.length} Ausgabe-Beispielen und{' '}
            {aufrufe.size} von {cfg.werkzeugAufrufe.length} Tool-Beispielen korrekt beurteilt.
            {toolResultatGeprueft && toolResultatUrteil === 'daten'
              ? ' Die Vertrauensgrenze des Tool-Ergebnisses ist korrekt geprüft.'
              : ' Die Vertrauensgrenze des Tool-Ergebnisses ist noch offen.'}
          </p>
        )}
      </div>
    </div>
  );
}
