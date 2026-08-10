import type { ReactNode } from 'react';

/**
 * Emoji im Inhalt.
 *
 * In der Navigation haben Emojis nichts verloren – dort stehen gezeichnete
 * Vollsymbole (`icon-voll.tsx`), weil eine Leiste, die auf jeder Seite oben
 * klebt, auf jedem Gerät gleich aussehen muss. Im Inhalt ist die Lage anders:
 * Dort tut ein bisschen Unterschied zwischen Mac, Windows und Android nichts
 * zur Sache, und ein Emoji bringt eine Lockerheit, die keine gezeichnete Form
 * erreicht.
 *
 * Drei Dinge müssen trotzdem geregelt sein, sonst wird es unruhig:
 *
 *  1. **Grundlinie und Breite.** Emojis sind je nach Schriftart unterschiedlich
 *     hoch und breit. Ohne feste Maße springt die Textzeile daneben. Deshalb
 *     `inline-flex` mit fester Breite und eigener Zeilenhöhe.
 *  2. **Schriftwahl.** Ohne ausdrückliche Emoji-Schrift greifen manche Systeme
 *     zu einer schwarzweißen Ersatzform – das Emoji erscheint dann als
 *     Umrisszeichnung und wirkt wie ein Darstellungsfehler.
 *  3. **Hilfstechnik.** Ein Emoji ohne Beschriftung wird sonst als „Buch" oder
 *     „gerolltes Auge" vorgelesen, mitten im Satz. Schmückende Emojis sind
 *     deshalb unsichtbar; nur wer ausdrücklich eine Bedeutung mitgibt,
 *     bekommt eine vorgelesene Beschriftung.
 */

/**
 * Kuratierter Satz.
 *
 * Bewusst klein gehalten und benannt statt frei wählbar. Ein `<Emoji zeichen="🎉" />`
 * an dreißig Stellen führt binnen weniger Wochen zu dreißig verschiedenen
 * Jubel-Emojis – und zu der Frage, welches davon jetzt „das richtige" ist.
 *
 * Was hier fehlt, fehlt mit Absicht: kein Daumen runter, kein trauriges
 * Gesicht, keine Flamme für Serien. Diese Anwendung kennt keine Verlustmechanik
 * und keinen Serienzwang; die Bildsprache soll das nicht heimlich einführen.
 */
const ZEICHEN = {
  lektion: '📘',
  aufgabe: '🎯',
  projekt: '🧱',
  wiederholung: '🔁',
  fortschritt: '📊',
  idee: '💡',
  geschafft: '🎉',
  richtig: '✅',
  code: '💻',
  werkzeug: '🛠️',
  landkarte: '🗺️',
  pflanze: '🌱',
  ruhe: '🌙',
  start: '🚀',
} as const;

export type EmojiName = keyof typeof ZEICHEN;

export function Emoji({
  name,
  /** Größe relativ zum umgebenden Text. */
  size = '1.1em',
  /**
   * Vorlesbare Bedeutung.
   *
   * Nur setzen, wenn das Emoji etwas trägt, das im Text nicht ohnehin steht.
   * Neben der Überschrift „Projekte" ist ein vorgelesenes „Baustein" keine
   * Information, sondern Lärm.
   */
  bedeutung,
  className,
}: {
  name: EmojiName;
  size?: string;
  bedeutung?: string;
  className?: string;
}): ReactNode {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        fontSize: size,
        lineHeight: 1,
        // Ohne diese Kette liefern manche Systeme eine schwarzweiße
        // Ersatzform, die wie ein Darstellungsfehler aussieht.
        fontFamily:
          '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif',
        // Emojis sitzen von Haus aus etwas zu hoch in der Zeile.
        verticalAlign: '-0.12em',
      }}
      {...(bedeutung ? { role: 'img', 'aria-label': bedeutung } : { 'aria-hidden': true })}
    >
      {ZEICHEN[name]}
    </span>
  );
}

/** Alle Namen – für den Test, der jedes Zeichen einmal darstellt. */
export const EMOJI_NAMEN = Object.keys(ZEICHEN) as EmojiName[];
export { ZEICHEN as EMOJI_ZEICHEN };
