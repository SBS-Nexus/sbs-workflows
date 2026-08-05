import type { ReactNode } from 'react';
import { baueRing } from '@/domain/design/chart-layout';

/**
 * Verteilung der Konzepte über die Kompetenzstufen, als Ring.
 *
 * Die Liste der Konzepte darunter beantwortet die Frage „wie steht es um
 * Schleifen?". Sie beantwortet nicht die Frage „wie steht es insgesamt?" –
 * dafür müsste man dreißig Einträge durchzählen. Genau dafür ist der Ring da.
 *
 * Warum ein Ring und kein Balken: Es geht um Anteile an einem Ganzen, und der
 * Ring zeigt das Ganze als geschlossene Form. Ein gestapelter Balken kann
 * dasselbe, sieht aber aus wie ein Fortschrittsbalken – und das wäre hier
 * falsch: Es gibt kein Ziel, bei dem alles „durabel" sein müsste.
 *
 * Farbe steht nie allein: Neben dem Ring stehen alle Stufen mit Namen und
 * Anzahl. Der Ring ist die Zusammenfassung, nicht die Information.
 */

export interface KompetenzStufe {
  /** Name der Stufe, etwa „gut abrufbar". */
  label: string;
  anzahl: number;
  /** CSS-Farbe. */
  farbe: string;
}

const RADIUS = 42;
const UMFANG = 2 * Math.PI * RADIUS;

export function KompetenzRing({
  stufen,
  groesse = 132,
}: {
  stufen: readonly KompetenzStufe[];
  groesse?: number;
}): ReactNode {
  const gesamt = stufen.reduce((summe, stufe) => summe + stufe.anzahl, 0);
  const abschnitte = baueRing(
    stufen.map((stufe) => stufe.anzahl),
    UMFANG,
  );

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: groesse, height: groesse }}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          {/* Grundring – bleibt sichtbar, wenn noch nichts erfasst ist. */}
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth="13"
          />
          {abschnitte.map((abschnitt, index) => {
            const stufe = stufen[index];
            if (!stufe || abschnitt.laenge <= 0) return null;
            return (
              <circle
                key={stufe.label}
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke={stufe.farbe}
                strokeWidth="13"
                strokeDasharray={`${abschnitt.laenge} ${UMFANG - abschnitt.laenge}`}
                strokeDashoffset={abschnitt.versatz}
                className="transition-[stroke-dasharray] duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums leading-none">{gesamt}</span>
          <span className="mt-0.5 text-[0.6875rem] text-[var(--text-muted)]">
            {gesamt === 1 ? 'Konzept' : 'Konzepte'}
          </span>
        </div>
      </div>

      {/*
       * Die Legende bekommt eine Höchstbreite. Ohne sie stünde in einer breiten
       * Karte der Name ganz links und die Zahl ganz rechts – dazwischen eine
       * Handbreit Leere, über die das Auge die Zuordnung verliert.
       */}
      <dl className="min-w-0 max-w-xs flex-1 space-y-1.5">
        {stufen.map((stufe) => (
          <div key={stufe.label} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: stufe.farbe }}
            />
            <dt className="min-w-0 flex-1 truncate text-[var(--text-muted)]">{stufe.label}</dt>
            <dd className="shrink-0 font-bold tabular-nums">{stufe.anzahl}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
