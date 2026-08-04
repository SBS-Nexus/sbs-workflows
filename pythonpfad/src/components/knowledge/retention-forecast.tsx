import type { ReactNode } from 'react';
import { Card } from '@/components/ui/primitives';
import type { ForecastPoint } from '@/domain/knowledge/retention';

/**
 * Behaltensprognose über 30 Tage.
 *
 * Die Kurve zeigt, wie sich die geschätzte Abrufwahrscheinlichkeit über alle
 * begonnenen Konzepte entwickelt, wenn nichts weiter geübt wird. Der
 * eigentliche Zweck ist nicht die Kurve selbst, sondern die Einsicht dahinter:
 * Vergessen passiert von allein und ist mit wenigen kurzen Wiederholungen
 * umkehrbar. Genau deshalb plant die Anwendung Wiederholungen ein.
 *
 * Die Kurve ist ausdrücklich ein Modell und keine Messung – das steht auch so
 * in der Bildunterschrift. Alle Werte sind zusätzlich als Tabelle vorhanden;
 * eine Grafik allein wäre keine zugängliche Information.
 */
export function RetentionForecast({
  points,
  message,
  targetPercent,
}: {
  points: readonly ForecastPoint[];
  message: string;
  targetPercent: number;
}): ReactNode {
  const gestartet = points.some((point) => point.retention > 0);

  return (
    <Card as="section" aria-labelledby="prognose-titel">
      <h2 id="prognose-titel" className="text-lg font-semibold">
        Wie lange bleibt es abrufbar?
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{message}</p>

      {!gestartet ? (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] px-4 py-6 text-center text-[var(--text-muted)]">
          Sobald du die ersten Aufgaben bearbeitet hast, entsteht hier eine Einschätzung.
        </p>
      ) : (
        <>
          <figure className="mt-4">
            <ForecastChart points={points} targetPercent={targetPercent} />
            <figcaption className="mt-2 text-xs text-[var(--text-muted)]">
              Modellrechnung nach der Vergessenskurve, keine Messung. Sie nimmt an, dass bis dahin
              nichts weiter geübt wird – jede Wiederholung verschiebt die Kurve nach oben. Die
              waagerechte Linie markiert {targetPercent} Prozent: den Wert, ab dem sich eine
              Auffrischung lohnt.
            </figcaption>
          </figure>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">
              Dieselben Werte als Tabelle
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Geschätzte Abrufwahrscheinlichkeit und Anzahl auffrischungsbedürftiger Konzepte je
                  Tag
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    <th scope="col" className="py-1.5 pr-4 font-medium">
                      In Tagen
                    </th>
                    <th scope="col" className="py-1.5 pr-4 font-medium">
                      Abruf
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Unter der Schwelle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {points
                    .filter((point) => point.day % 5 === 0)
                    .map((point) => (
                      <tr key={point.day} className="border-b border-[var(--border)]">
                        <td className="py-1.5 pr-4 tabular-nums">{point.day}</td>
                        <td className="py-1.5 pr-4 tabular-nums">
                          {Math.round(point.retention * 100)} Prozent
                        </td>
                        <td className="py-1.5 tabular-nums">
                          {point.belowTarget} {point.belowTarget === 1 ? 'Konzept' : 'Konzepte'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </Card>
  );
}

const BREITE = 560;
const HOEHE = 180;
const RAND = { links: 40, rechts: 12, oben: 12, unten: 26 };

function ForecastChart({
  points,
  targetPercent,
}: {
  points: readonly ForecastPoint[];
  targetPercent: number;
}): ReactNode {
  const maxTag = points[points.length - 1]?.day ?? 30;
  const innenBreite = BREITE - RAND.links - RAND.rechts;
  const innenHoehe = HOEHE - RAND.oben - RAND.unten;

  const x = (day: number): number => RAND.links + (day / maxTag) * innenBreite;
  const y = (wert: number): number => RAND.oben + (1 - wert) * innenHoehe;

  const linie = points.map((point) => `${x(point.day)},${y(point.retention)}`).join(' ');
  const flaeche = `${RAND.links},${y(0)} ${linie} ${x(maxTag)},${y(0)}`;

  return (
    <svg
      viewBox={`0 0 ${BREITE} ${HOEHE}`}
      className="w-full"
      role="img"
      aria-label={`Verlauf der geschätzten Abrufwahrscheinlichkeit über ${maxTag} Tage. Heute ${Math.round((points[0]?.retention ?? 0) * 100)} Prozent, nach ${maxTag} Tagen ${Math.round((points[points.length - 1]?.retention ?? 0) * 100)} Prozent. Die genauen Werte stehen in der Tabelle darunter.`}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((wert) => (
        <g key={wert}>
          <line
            x1={RAND.links}
            y1={y(wert)}
            x2={BREITE - RAND.rechts}
            y2={y(wert)}
            stroke="var(--border)"
            strokeWidth="1"
          />
          <text
            x={RAND.links - 6}
            y={y(wert)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-[var(--text-muted)] text-[0.625rem]"
          >
            {Math.round(wert * 100)}
          </text>
        </g>
      ))}

      {/* Zielschwelle */}
      <line
        x1={RAND.links}
        y1={y(targetPercent / 100)}
        x2={BREITE - RAND.rechts}
        y2={y(targetPercent / 100)}
        stroke="var(--caution)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      <polygon points={flaeche} fill="var(--accent)" opacity="0.14" />
      <polyline
        points={linie}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {[0, Math.round(maxTag / 2), maxTag].map((tag) => (
        <text
          key={tag}
          x={x(tag)}
          y={HOEHE - 8}
          textAnchor="middle"
          className="fill-[var(--text-muted)] text-[0.625rem]"
        >
          {tag === 0 ? 'heute' : `${tag} Tage`}
        </text>
      ))}
    </svg>
  );
}
