'use client';

import { useEffect } from 'react';
import {
  readReduceMotion,
  readTheme,
  setReduceMotion,
  setTheme,
  type Theme,
} from '@/lib/preferences/appearance';

/**
 * Die am Konto gespeicherte Darstellung auf dieses Gerät übertragen.
 *
 * Läuft einmal beim Betreten des angemeldeten Bereichs. Die Reihenfolge ist
 * bewusst so herum: **Das Konto gewinnt.** Wer die Bewegungsreduktion
 * eingeschaltet hat, hat das als Person getan und nicht als Browser – sie soll
 * ihm auf ein neues Gerät folgen, statt dort wieder aus zu sein.
 *
 * Auf einem Gerät, das die Einstellung schon kennt, passiert nichts: Der
 * Vergleich davor verhindert, dass bei jedem Seitenaufruf Attribute neu gesetzt
 * werden. Auf einem neuen Gerät kann es einen kurzen Wechsel geben, bevor
 * dieser Effekt greift – das Inline-Skript in app/layout.tsx kennt das Konto
 * nicht, weil es läuft, bevor irgendetwas geladen ist. Ein kurzer Wechsel ist
 * der ehrlichere Preis dafür, dass die Einstellung überhaupt mitkommt.
 */
export function DarstellungAbgleich({
  theme,
  reduceMotion,
}: {
  theme: Theme;
  reduceMotion: boolean;
}): null {
  useEffect(() => {
    if (readTheme() !== theme) setTheme(theme);
    if (readReduceMotion() !== reduceMotion) setReduceMotion(reduceMotion);
  }, [theme, reduceMotion]);

  return null;
}
