'use client';

import { useEffect, useRef } from 'react';

/**
 * Eine Zahl, die beim Sichtwerden hochzählt.
 *
 * Der Sinn ist nicht Schmuck, sondern Aufmerksamkeit: Eine Zahl, die sich
 * bewegt, wird gelesen. Eine, die schon dasteht, wird überflogen. Bei
 * Kennzahlen, die den eigenen Fortschritt beschreiben, ist das der Unterschied
 * zwischen „irgendwo stand eine Zahl" und „ich habe elf Lektionen geschafft".
 *
 * Drei Entscheidungen, die diese Komponente unauffällig richtig machen:
 *
 *  1. **Der Endwert steht schon im Ausgangs-HTML.** Wer kein JavaScript hat,
 *     wer einen Screenreader benutzt oder wer die Seite ausdruckt, sieht die
 *     richtige Zahl. Animiert wird nur nachträglich im Browser.
 *  2. **Gezählt wird ohne React-Zustand.** Sechzig Zustandsänderungen je
 *     Sekunde durch den Abgleichbaum zu schicken, wäre Verschwendung; die
 *     Ziffer wird direkt im Textknoten geändert. Nebenbei umgeht das die Regel
 *     gegen `setState` in Effekten.
 *  3. **Erst beim Sichtwerden.** Eine Zahl, die weit unten auf der Seite
 *     hochzählt, während man oben liest, hat niemand gesehen – die Bewegung
 *     wäre verschwendet und der Wert beim Hinscrollen schon stehen geblieben.
 */

const DAUER_MS = 900;

/** Weich auslaufend: schnell los, sanft ankommen. */
function abbremsen(t: number): number {
  return 1 - (1 - t) ** 3;
}

function bewegungReduziert(): boolean {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true ||
    document.documentElement.dataset['reduceMotion'] === 'true'
  );
}

export function AnimatedNumber({
  value,
  /** Nachgestellte Einheit, die nicht mitgezählt wird – etwa „ %" oder „ Min.". */
  suffix = '',
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}): React.ReactElement {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (bewegungReduziert()) return;
    // Bei null gibt es nichts hochzuzählen, und ein Wert, der von 0 auf 0
    // „läuft", sähe nach einem Fehler aus.
    if (value <= 0) return;

    let bild = 0;
    const beobachter = new IntersectionObserver((eintraege) => {
      if (!eintraege[0]?.isIntersecting) return;
      beobachter.disconnect();

      let start: number | null = null;
      const schritt = (jetzt: number): void => {
        start ??= jetzt;
        const anteil = Math.min(1, (jetzt - start) / DAUER_MS);
        element.textContent = `${Math.round(abbremsen(anteil) * value)}${suffix}`;
        if (anteil < 1) bild = requestAnimationFrame(schritt);
      };

      element.textContent = `0${suffix}`;
      bild = requestAnimationFrame(schritt);
    });

    beobachter.observe(element);
    return () => {
      beobachter.disconnect();
      cancelAnimationFrame(bild);
    };
  }, [value, suffix]);

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  );
}
