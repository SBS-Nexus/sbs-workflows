import type { ReactNode } from 'react';

/**
 * Vollsymbole für die Navigation.
 *
 * Der Strichsatz in `icon.tsx` ist für Fließtext gedacht: Er ordnet sich unter,
 * nimmt die Schriftfarbe an und stört nicht. In der Navigationsleiste ist das
 * genau falsch – dort sollen die Symbole zuerst wahrgenommen werden und den
 * Bereichen ein Gesicht geben. Eine 1,75 Pixel dünne Linie kann das nicht.
 *
 * Deshalb hier ein zweiter Satz nach anderen Regeln:
 *
 *  - **Gefüllt statt gestrichelt.** Flächen tragen Farbe, Linien nicht.
 *  - **Zweitönig.** Jedes Symbol besteht aus einer blassen Grundform und einer
 *    kräftigen Hauptform, beide in `currentColor`. Das ergibt Tiefe, ohne dass
 *    eine zweite Farbe verwaltet werden müsste – und beide Töne folgen
 *    automatisch der Bereichsfarbe.
 *  - **Kein Emoji.** Ein Emoji sähe auf jedem Betriebssystem anders aus,
 *    ließe sich nicht einfärben und schwankte in Größe und Grundlinie. Für
 *    eine Leiste, die auf jeder Seite oben steht, ist das der falsche Tausch.
 *    Emojis haben ihren Platz in den Inhalten, siehe `emoji.tsx`.
 *
 * Gezeichnet auf demselben Raster wie der Strichsatz (24 × 24), damit sich
 * beide Sätze nebeneinander vertragen.
 */

/** Blasse Grundform. Der Wert ist bewusst niedrig – sie soll tragen, nicht auffallen. */
const GRUND = 0.28;

const FORMEN: Readonly<Record<string, ReactNode>> = {
  /* Aufgeschlagenes Buch. */
  lernen: (
    <>
      <path
        d="M3 6.2c0-.8.7-1.4 1.5-1.3 2 .2 4.6.8 6.1 1.9.3.2.4.5.4.8v12c0 .6-.6.9-1.1.6-1.6-.9-3.9-1.4-5.6-1.6-.8-.1-1.3-.7-1.3-1.4Z"
        opacity={GRUND}
      />
      <path d="M21 6.2c0-.8-.7-1.4-1.5-1.3-2 .2-4.6.8-6.1 1.9-.3.2-.4.5-.4.8v12c0 .6.6.9 1.1.6 1.6-.9 3.9-1.4 5.6-1.6.8-.1 1.3-.7 1.3-1.4Z" />
    </>
  ),

  /* Zielscheibe. */
  ueben: (
    <>
      <circle cx="12" cy="12" r="9" opacity={GRUND} />
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="2" fill="#fff" />
    </>
  ),

  /* Baustein-Würfel. */
  projekte: (
    <>
      <path d="M12 2.6 21 7.6v8.8L12 21.4 3 16.4V7.6Z" opacity={GRUND} />
      <path d="M12 12.2 21 7.6v8.8L12 21.4Z" />
      <path d="M12 2.6 21 7.6l-9 4.6-9-4.6Z" />
    </>
  ),

  /* Kreislauf mit Pfeilspitze. */
  wiederholen: (
    <>
      <circle cx="12" cy="12" r="9" opacity={GRUND} />
      <path d="M12 6.2a5.8 5.8 0 1 1-5.1 3 1.2 1.2 0 1 1 2.1 1.1A3.4 3.4 0 1 0 12 8.6Z" />
      <path d="M11.2 3.6h2.6l-2 3.4a.7.7 0 0 1-1.2 0l-.6-1a.7.7 0 0 1 .6-1.1Z" />
    </>
  ),

  /* Säulen, aufsteigend. */
  fortschritt: (
    <>
      <rect x="2.6" y="18" width="18.8" height="2.6" rx="1.3" opacity={GRUND} />
      <rect x="4.4" y="12" width="3.8" height="6" rx="1.3" opacity={GRUND} />
      <rect x="10.1" y="8" width="3.8" height="10" rx="1.3" />
      <rect x="15.8" y="4" width="3.8" height="14" rx="1.3" />
    </>
  ),

  /* Person. */
  profil: (
    <>
      <path
        d="M4 20.2c0-3.6 3.6-5.8 8-5.8s8 2.2 8 5.8c0 .8-.6 1.2-1.3 1.2H5.3c-.7 0-1.3-.4-1.3-1.2Z"
        opacity={GRUND}
      />
      <circle cx="12" cy="7.8" r="4.4" />
    </>
  ),

  /* Karte mit Knotenpunkten – Redaktion. */
  karte: (
    <>
      <path d="M3 6.4 9 4l6 2.4L21 4v13.6L15 20l-6-2.4L3 20Z" opacity={GRUND} />
      <circle cx="9" cy="9.4" r="2.4" />
      <circle cx="15" cy="14.6" r="2.4" />
    </>
  ),
};

export type VollSymbolName = keyof typeof FORMEN;

/**
 * Vollsymbol.
 *
 * Standardmäßig für Hilfstechnik unsichtbar: Es begleitet in der Navigation
 * immer eine Beschriftung und ersetzt sie nicht. Ein zusätzlich vorgelesenes
 * „Grafik" wäre keine Information, sondern Lärm.
 */
export function VollSymbol({
  name,
  size = 20,
  className,
}: {
  name: VollSymbolName;
  size?: number;
  className?: string;
}): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {FORMEN[name]}
    </svg>
  );
}

/** Alle Namen – für den Test, der jede Form einmal zeichnet. */
export const VOLL_SYMBOL_NAMEN = Object.keys(FORMEN) as VollSymbolName[];
