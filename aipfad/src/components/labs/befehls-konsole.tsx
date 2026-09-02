'use client';

import { useState } from 'react';

/**
 * Die Konsole der Git-Labs: Protokoll der eingegebenen Befehle samt Ausgabe,
 * darunter die Eingabezeile.
 *
 * Das Git-State-Lab und das Branch-Lab hatten dieselbe Darstellung samt
 * Enter-Behandlung jeweils eigenständig. Zwei Fassungen desselben
 * Bedienelements laufen erfahrungsgemäß auseinander — die eine bekommt eine
 * Verbesserung, die andere nicht. Das Konflikt-Lab nutzt dieselbe Darstellung
 * ohne Eingabezeile, weil es seine Befehle über Knöpfe anbietet.
 */

export interface KonsolenEintrag {
  befehl: string;
  ausgabe: string;
}

export function BefehlsKonsole({
  eintraege,
  eingabeaufforderung = '$',
  platzhalter,
  beschriftung = 'Git-Befehl eingeben',
  onBefehlAction,
  kopfzeile,
}: {
  eintraege: KonsolenEintrag[];
  /** Was links vor der Eingabezeile steht, z. B. der aktuelle Branch. */
  eingabeaufforderung?: string;
  platzhalter?: string;
  /** Beschriftung des Eingabefelds für Vorlesehilfen. */
  beschriftung?: string;
  /**
   * Fehlt der Rückruf, wird die Konsole nur angezeigt — für Labs, die ihre
   * Befehle über Knöpfe anbieten.
   */
  onBefehlAction?: (befehl: string) => void;
  /** Optionale erste Zeile, z. B. das Startverzeichnis. */
  kopfzeile?: string;
}): React.ReactElement {
  const [eingabe, setEingabe] = useState('');

  function absenden(): void {
    const befehl = eingabe.trim();
    if (!befehl || !onBefehlAction) return;
    onBefehlAction(befehl);
    setEingabe('');
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-ink-900 p-4 font-mono text-sm text-ink-50">
      {kopfzeile ? <p className="mb-2 text-ink-300">{kopfzeile}</p> : null}

      {eintraege.map((eintrag, index) => (
        <div key={index} className="mb-1.5">
          <p>
            <span className="text-signal-300">$</span> {eintrag.befehl}
          </p>
          {eintrag.ausgabe ? (
            <p className="whitespace-pre-wrap text-ink-200">{eintrag.ausgabe}</p>
          ) : null}
        </div>
      ))}

      {onBefehlAction ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-signal-300">{eingabeaufforderung}</span>
          <input
            type="text"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') absenden();
            }}
            className="flex-1 bg-transparent outline-none"
            aria-label={beschriftung}
            placeholder={platzhalter}
          />
        </div>
      ) : null}
    </div>
  );
}
