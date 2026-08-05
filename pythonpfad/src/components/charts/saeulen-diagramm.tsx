'use client';

import { useState } from 'react';
import { cx } from '@/components/ui/primitives';
import { type SaeuleEingabe, baueSaeulen } from '@/domain/design/chart-layout';

/**
 * Säulendiagramm.
 *
 * Vorher stand hier eine Reihe verschieden hoher `div`-Elemente. Das ist kein
 * Diagramm, sondern eine Reihe verschieden hoher Kästen: Es fehlt die Skala,
 * und damit die Antwort auf die einzige Frage, die ein solches Bild
 * beantworten soll – ist das viel oder wenig?
 *
 * Hier gibt es deshalb Rasterlinien mit Beschriftung, eine gerundete
 * Obergrenze, und beim Zeigen den genauen Wert.
 *
 * Zur Zugänglichkeit: Die Zeichnung selbst ist für Hilfstechnik unsichtbar.
 * Darunter steht dieselbe Reihe als Liste mit vollständigen Sätzen. Ein
 * Balkendiagramm mit ARIA-Rollen nachzubauen ist möglich, aber das Ergebnis
 * ist regelmäßig schlechter als ein sauber geschriebener Satz je Wert.
 */
export function SaeulenDiagramm({
  daten,
  /** Einheit für die Beschriftung, etwa „Aufgaben". */
  einheit,
  /** Vorlesbare Beschreibung der ganzen Reihe. */
  beschriftung,
  hoehe = 128,
}: {
  daten: readonly SaeuleEingabe[];
  einheit: string;
  beschriftung: string;
  hoehe?: number;
}): React.ReactElement {
  const [aktiv, setAktiv] = useState<number | null>(null);
  const diagramm = baueSaeulen(daten);

  return (
    <div>
      <div aria-hidden="true" className="flex gap-3">
        {/* Achsenbeschriftung. Von oben nach unten, damit sie zu den Linien passt. */}
        <div
          className="flex shrink-0 flex-col justify-between text-right text-[0.6875rem] tabular-nums text-[var(--text-muted)]"
          style={{ height: hoehe }}
        >
          {[...diagramm.rasterlinien].reverse().map((wert) => (
            <span key={wert} className="leading-none">
              {Number.isInteger(wert) ? wert : wert.toFixed(1)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: hoehe }}>
            {/* Rasterlinien */}
            {diagramm.rasterlinien.map((wert, index) => (
              <span
                key={wert}
                className={cx(
                  'absolute inset-x-0 border-t',
                  index === 0 ? 'border-[var(--border-strong)]' : 'border-[var(--border)]',
                )}
                style={{ bottom: `${(index / (diagramm.rasterlinien.length - 1)) * 100}%` }}
              />
            ))}

            {/* Säulen */}
            <div className="absolute inset-0 flex items-end gap-1.5">
              {diagramm.saeulen.map((saeule) => (
                <div
                  key={saeule.label + saeule.index}
                  className="group/saeule relative flex h-full flex-1 items-end"
                  onMouseEnter={() => setAktiv(saeule.index)}
                  onMouseLeave={() => setAktiv(null)}
                >
                  {/*
                   * Ein Wert von null bekommt ein flaches Feld statt eines
                   * Stummels. Der Unterschied ist wichtig: Ein Stummel sähe
                   * aus wie „ein bisschen", das flache Feld zeigt, dass die
                   * Stelle existiert und leer ist.
                   */}
                  {saeule.wert === 0 ? (
                    <span className="h-1 w-full rounded-full bg-[var(--border)]" />
                  ) : (
                    <span
                      style={{ height: `${saeule.hoehe}%` }}
                      className={cx(
                        'w-full rounded-t-lg transition-[filter,transform] duration-150',
                        'bg-gradient-to-t from-[var(--akzent)] to-[color-mix(in_oklab,var(--akzent)_55%,white)]',
                        saeule.istHoechster ? 'opacity-100' : 'opacity-80',
                        aktiv === saeule.index && 'brightness-110',
                      )}
                    />
                  )}

                  {/* Wert beim Zeigen. Über der Säule, damit er nichts verdeckt. */}
                  {aktiv === saeule.index ? (
                    <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--text)] px-2 py-1 text-[0.6875rem] font-bold text-[var(--surface-raised)]">
                      {saeule.wert} {einheit}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Beschriftung der Achse */}
          <div className="mt-2 flex gap-1.5">
            {diagramm.saeulen.map((saeule) => (
              <span
                key={saeule.label + saeule.index}
                className={cx(
                  'flex-1 text-center text-[0.6875rem] transition-colors',
                  aktiv === saeule.index
                    ? 'font-bold text-[var(--akzent)]'
                    : 'text-[var(--text-muted)]',
                )}
              >
                {saeule.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/*
       * Die Textfassung. Sie ist nicht „auch noch da", sondern die eigentliche
       * Fassung für alle, die die Zeichnung nicht sehen – deshalb ganze Sätze
       * statt einer Zahlenreihe.
       */}
      <p className="sr-only">
        {beschriftung} Höchster Wert: {diagramm.hoechsterWert} {einheit}. Insgesamt {diagramm.summe}{' '}
        {einheit}.
      </p>
      <ul className="sr-only">
        {diagramm.saeulen.map((saeule) => (
          <li key={saeule.label + saeule.index}>
            {saeule.beschreibung ?? saeule.label}: {saeule.wert} {einheit}
          </li>
        ))}
      </ul>
    </div>
  );
}
