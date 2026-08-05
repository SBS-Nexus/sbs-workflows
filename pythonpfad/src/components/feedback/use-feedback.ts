'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  type FeedbackEvent,
  type FeedbackPreferences,
  planFeedback,
} from '@/domain/feedback/feedback-policy';
import { fuehreAus } from '@/lib/feedback/feedback-player';
import { readHaptics, readSound, subscribeFeedback } from '@/lib/preferences/feedback';
import { readReduceMotion } from '@/lib/preferences/appearance';

/**
 * Soll Bewegung reduziert werden?
 *
 * Es gibt zwei Quellen, und beide zählen: die Einstellung im Konto und die des
 * Betriebssystems. Wer im System „Bewegung reduzieren" gewählt hat, hat das
 * einmal für alle Anwendungen gesagt und sollte es hier nicht wiederholen
 * müssen. Die Kontoeinstellung kann nur verschärfen, nie aufheben.
 *
 * Gelesen wird erst im Moment des Auslösens. Ein Abonnement wäre unnötig: Der
 * Wert wird nur gebraucht, wenn wirklich etwas passiert.
 */
function bewegungReduziert(): boolean {
  if (typeof window === 'undefined') return true;
  const system = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  return system || readReduceMotion();
}

/**
 * Der Zugang zur spürbaren Rückmeldung für Komponenten.
 *
 * Aufrufende Stellen sagen, *was passiert ist* – nicht, was klingen soll:
 *
 *     const melde = useFeedback();
 *     melde('aufgabe-geloest');
 *
 * Diese Trennung ist der Grund, warum sich die Regeln später an einer Stelle
 * ändern lassen. Stünde in der Aufgabenkomponente „spiele zwei Töne und
 * vibriere kurz", müsste man beim nächsten Feinschliff durch die ganze
 * Anwendung.
 *
 * Ohne Einwilligung passiert nichts: Die Regeln in `feedback-policy.ts`
 * entscheiden anhand der Einstellungen, und die Voreinstellung für Ton ist aus.
 */
export function useFeedback(): (event: FeedbackEvent) => void {
  const sound = useSyncExternalStore(subscribeFeedback, readSound, () => false);
  const haptics = useSyncExternalStore(subscribeFeedback, readHaptics, () => true);

  return useCallback(
    (event: FeedbackEvent) => {
      const preferences: FeedbackPreferences = {
        sound,
        haptics,
        reduceMotion: bewegungReduziert(),
      };
      fuehreAus(planFeedback(event, preferences));
    },
    [sound, haptics],
  );
}
