import type { ReactNode } from 'react';

/**
 * Kleines, selbst gezeichnetes Symbolset. Bewusst keine Icon-Bibliothek
 * eingebunden – ein Dutzend Striche deckt den Bedarf, und jede Abhängigkeit
 * weniger bedeutet weniger Ballast im Client-Bundle (vgl.
 * pythonpfad/docs/ARCHITEKTUR.md §2.9 "Keine Komponentenbibliothek").
 */

const PATHS = {
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  check: 'm5 13 4 4L19 7',
  warning:
    'M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z',
  error: 'M12 8v5m0 3h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  lightbulb:
    'M9 18h6M10 22h4M12 2a6 6 0 0 0-6 6c0 2 1 3.5 2.5 5S10 15 10 16h4c0-1 .5-1.5 1.5-3S18 10 18 8a6 6 0 0 0-6-6Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  terminal: 'm4 6 6 6-6 6M12 18h8',
  graphNode:
    'M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66 4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66 4.24-4.24',
  layers: 'm12 2 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  clock: 'M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  book: 'M4 19.5V6a2 2 0 0 1 2-2h13v15.5M4 19.5A2 2 0 0 0 6 21.5h13V19M4 19.5A2 2 0 0 1 6 17.5h13',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
