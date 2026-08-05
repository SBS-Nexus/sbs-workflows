import type { ReactNode } from 'react';

/**
 * Icon-Satz.
 *
 * Vorher standen an diesen Stellen Unicode-Zeichen wie ◆ ◇ ▣ ↺ ☺. Die haben
 * drei Nachteile: Sie sehen je nach Betriebssystem völlig anders aus, sie
 * lassen sich in Strichstärke und Größe nicht abstimmen, und manche werden von
 * Screenreadern vorgelesen, obwohl sie rein schmückend sind.
 *
 * Deshalb ein eigener Satz als SVG. Alle Formen sind auf demselben Raster
 * gezeichnet (24 × 24, Strichstärke 1.75, runde Enden), damit sie
 * nebeneinander ruhig wirken. Gefärbt wird über `currentColor` – ein Icon
 * nimmt also immer die Farbe des Textes an, in dem es steht.
 *
 * Zugänglichkeit: Standardmäßig ist ein Icon für Hilfstechnik unsichtbar. Es
 * begleitet Text, ersetzt ihn nicht. Wo ein Icon ausnahmsweise allein steht,
 * wird `title` gesetzt – dann bekommt es eine Rolle und eine Beschriftung.
 */

const PFADE: Readonly<Record<string, ReactNode>> = {
  // --- Navigation ---------------------------------------------------------
  lernen: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5Z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5Z" />
    </>
  ),
  ueben: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  projekte: (
    <>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5Z" />
      <path d="M4 8.5 12 13l8-4.5" />
      <path d="M12 13v7" />
    </>
  ),
  wiederholen: (
    <>
      <path d="M20 11a8 8 0 1 0-.6 4" />
      <path d="M20 4v7h-7" />
    </>
  ),
  fortschritt: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6" />
      <path d="M12 20V8" />
      <path d="M17 20v-9" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </>
  ),
  labor: (
    <>
      <path d="M9.5 4v5.2L4.8 17a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3l-4.7-7.8V4" />
      <path d="M8.5 4h7" />
      <path d="M7.4 14h9.2" />
    </>
  ),
  organisation: (
    <>
      <path d="M4 20V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14" />
      <path d="M14 10h4a2 2 0 0 1 2 2v8" />
      <path d="M3 20h18" />
      <path d="M7.5 8h3M7.5 12h3M7.5 16h3M17 14h.01M17 17h.01" />
    </>
  ),

  // --- Bedienung ----------------------------------------------------------
  suchen: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  schliessen: <path d="M6 6l12 12M18 6 6 18" />,
  zurueck: <path d="M15 5l-7 7 7 7" />,
  vor: <path d="M9 5l7 7-7 7" />,
  hoch: <path d="M5 15l7-7 7 7" />,
  runter: <path d="M5 9l7 7 7-7" />,
  abspielen: <path d="M7 4.5 19 12 7 19.5Z" />,
  anhalten: (
    <>
      <path d="M8.5 5v14" />
      <path d="M15.5 5v14" />
    </>
  ),
  stopp: <rect x="6" y="6" width="12" height="12" rx="1.5" />,
  anfang: (
    <>
      <path d="M18 5 8 12l10 7Z" />
      <path d="M6 5v14" />
    </>
  ),
  ende: (
    <>
      <path d="M6 5l10 7L6 19Z" />
      <path d="M18 5v14" />
    </>
  ),

  // --- Zustände -----------------------------------------------------------
  haken: <path d="m5 12.5 4.5 4.5L19 7" />,
  kreis: <circle cx="12" cy="12" r="7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 7.8h.01" />
    </>
  ),
  achtung: (
    <>
      <path d="M12 4.5 21 19.5H3Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  fehler: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  schloss: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),

  // --- Lernen -------------------------------------------------------------
  gluehbirne: (
    <>
      <path d="M9 17.5a5.5 5.5 0 1 1 6 0V19a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19Z" />
      <path d="M10 20.5h4" />
    </>
  ),
  funke: (
    <>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9Z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" />
    </>
  ),
  schritte: (
    <>
      <path d="M4 18h4v-4" />
      <path d="M10 14h4v-4" />
      <path d="M16 10h4V6" />
    </>
  ),
  zeit: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  karte: (
    <>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <circle cx="12" cy="17" r="2.5" />
      <path d="M7.8 8.6 10.6 15M16.2 8.6 13.4 15M8.5 7h7" />
    </>
  ),
  tastatur: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M17 10h.01M7 13h.01M9 16h6" />
    </>
  ),
  code: (
    <>
      <path d="m8.5 8.5-4 3.5 4 3.5" />
      <path d="m15.5 8.5 4 3.5-4 3.5" />
      <path d="m13.5 5-3 14" />
    </>
  ),

  // --- Darstellung --------------------------------------------------------
  sonne: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  mond: <path d="M20 13.5A8.5 8.5 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5Z" />,
  halbmond: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
    </>
  ),
  bewegung: <path d="M3 9h18M3 15h18" />,
};

export type IconName = keyof typeof PFADE;

export function Icon({
  name,
  size = 20,
  className,
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  /** Nur setzen, wenn das Icon ohne begleitenden Text steht. */
  title?: string;
}): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(title ? { role: 'img' as const } : { 'aria-hidden': true as const })}
    >
      {title ? <title>{title}</title> : null}
      {PFADE[name]}
    </svg>
  );
}

/** Alle Namen – wird von einem Test benutzt, der jede Form einmal rendert. */
export const ICON_NAMES = Object.keys(PFADE) as IconName[];
