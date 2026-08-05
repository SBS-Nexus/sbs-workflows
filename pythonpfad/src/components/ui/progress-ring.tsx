import type { ReactNode } from 'react';

/**
 * Fortschritt als Ring.
 *
 * Ein Ring beansprucht weniger Breite als ein Balken und lässt sich neben einem
 * Namen unterbringen, ohne die Zeile zu sprengen. Er eignet sich deshalb überall
 * dort, wo viele kleine Werte nebeneinander stehen – etwa je Konzept.
 *
 * Der Wert steht zusätzlich als Zahl in der Mitte. Der Ring allein wäre eine
 * rein visuelle Angabe; ohne die Zahl müsste man den Anteil schätzen.
 */
export function ProgressRing({
  value,
  max = 100,
  label,
  size = 56,
}: {
  value: number;
  max?: number;
  /** Wofür der Wert gilt. Wird für die Beschriftung gebraucht, nicht angezeigt. */
  label: string;
  size?: number;
}): ReactNode {
  const anteil = max === 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const prozent = Math.round(anteil * 100);

  const radius = 20;
  const umfang = 2 * Math.PI * radius;

  return (
    <div
      role="img"
      aria-label={`${label}: ${prozent} Prozent`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 48 48" className="size-full -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth="6"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="var(--akzent, var(--accent))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={umfang}
          strokeDashoffset={umfang * (1 - anteil)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-[0.8125rem] font-black tabular-nums text-[var(--akzent,var(--accent))]"
      >
        {prozent}
      </span>
    </div>
  );
}
