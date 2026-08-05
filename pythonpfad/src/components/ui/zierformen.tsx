import type { ReactNode } from 'react';
import { cx } from '@/components/ui/primitives';

/**
 * Zierformen.
 *
 * Abschnitte lagen bisher als Rechtecke übereinander. Das ist ordentlich und
 * öde: Man sieht eine Liste von Kästen, nicht eine gestaltete Seite. Die
 * folgenden Formen setzen Bereiche voneinander ab, ohne dass dafür ein Bild
 * geladen werden müsste.
 *
 * Alle sind für Hilfstechnik unsichtbar. Sie tragen keine Information – wer
 * sie nicht sieht, verpasst nichts.
 */

/**
 * Wellenkante am unteren Rand eines farbigen Bereichs.
 *
 * Sie sitzt im Bereich selbst und ragt nach unten heraus, ist also in dessen
 * Farbe eingefärbt und läuft in die Fläche darunter aus. Der Weg über einen
 * eigenen Trenner *zwischen* zwei Bereichen wäre naheliegender, funktioniert
 * aber nicht: Der Trenner müsste beide Farben kennen, und bei jeder Änderung
 * an einer der beiden würde er unbemerkt falsch.
 */
export function WellenKante({
  className,
  /** Farbe der Welle. Standard: die Fläche des Bereichs darüber. */
  farbe = 'var(--surface)',
  /** Nach oben statt nach unten gerichtet. */
  nachOben = false,
}: {
  className?: string;
  farbe?: string;
  nachOben?: boolean;
}): ReactNode {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      className={cx('block h-10 w-full sm:h-14', nachOben && 'rotate-180', className)}
    >
      {/*
       * Eine einzige weiche Welle über die ganze Breite. Mehrere Wellen
       * hintereinander sähen nach Dekomuster aus; eine trennt.
       */}
      <path
        d="M0 40 C 240 0, 480 80, 720 44 C 960 8, 1200 64, 1440 32 L1440 80 L0 80 Z"
        fill={farbe}
      />
    </svg>
  );
}

/**
 * Weicher Bogen als Abschluss eines farbigen Kopfbereichs.
 *
 * Ruhiger als die Welle – für Stellen, an denen darunter sofort Text folgt.
 */
export function BogenKante({
  className,
  farbe = 'var(--surface)',
}: {
  className?: string;
  farbe?: string;
}): ReactNode {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      className={cx('block h-6 w-full sm:h-9', className)}
    >
      <path d="M0 60 Q720 -12 1440 60 Z" fill={farbe} />
    </svg>
  );
}

/**
 * Ornament für die Ecke eines Kopfbereichs.
 *
 * Konzentrische Bögen, die aus der Ecke wachsen – dieselbe Bildidee wie das
 * Muster `muster-boegen`, hier aber als klar begrenzte Form statt als
 * Wiederholung über die ganze Fläche.
 */
export function EckBoegen({
  className,
  farbe = 'currentColor',
  /** Anzahl der Bögen. Mehr als sechs wird unruhig. */
  anzahl = 5,
}: {
  className?: string;
  farbe?: string;
  anzahl?: number;
}): ReactNode {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={cx('block', className)}>
      {Array.from({ length: anzahl }, (_, index) => (
        <circle
          key={index}
          cx="200"
          cy="0"
          r={40 + index * 34}
          fill="none"
          stroke={farbe}
          strokeWidth="2"
          // Nach außen hin blasser: Das lässt die Bögen auslaufen, statt sie
          // an der Kante der Zeichenfläche abzuschneiden.
          opacity={0.5 - index * 0.07}
        />
      ))}
    </svg>
  );
}

/**
 * Aufsteigende Stufen als Eckzeichen.
 *
 * Greift das Bildzeichen der Anwendung auf – ein Pfad, der nach oben führt.
 */
export function EckStufen({
  className,
  farbe = 'currentColor',
}: {
  className?: string;
  farbe?: string;
}): ReactNode {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 160" className={cx('block', className)}>
      {[0, 1, 2, 3].map((stufe) => (
        <rect
          key={stufe}
          x={12 + stufe * 34}
          y={116 - stufe * 30}
          width="26"
          height={30 + stufe * 30}
          rx="6"
          fill={farbe}
          opacity={0.16 + stufe * 0.06}
        />
      ))}
    </svg>
  );
}

/**
 * Streuung aus Punkten unterschiedlicher Größe.
 *
 * Für Ecken, an denen ein Raster zu streng wirkt. Die Positionen stehen fest
 * und sind nicht zufällig: Eine Zierde, die bei jedem Aufbau anders aussieht,
 * lässt sich nicht beurteilen und macht jeden Bildvergleich im Test wertlos.
 */
const PUNKTE: ReadonlyArray<[number, number, number]> = [
  [18, 24, 5],
  [52, 12, 3],
  [86, 34, 6],
  [30, 62, 4],
  [70, 78, 3],
  [104, 60, 4],
  [126, 22, 5],
  [12, 96, 3],
  [58, 110, 5],
  [98, 128, 3],
  [134, 96, 4],
];

export function PunktStreuung({
  className,
  farbe = 'currentColor',
}: {
  className?: string;
  farbe?: string;
}): ReactNode {
  return (
    <svg aria-hidden="true" viewBox="0 0 150 150" className={cx('block', className)}>
      {PUNKTE.map(([x, y, r], index) => (
        <circle key={index} cx={x} cy={y} r={r} fill={farbe} opacity={0.1 + (index % 4) * 0.06} />
      ))}
    </svg>
  );
}
