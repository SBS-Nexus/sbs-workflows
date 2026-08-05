import { FEEDBACK_DEFAULTS, type FeedbackPreferences } from '@/domain/feedback/feedback-policy';

/**
 * Einstellungen für Ton und Vibration.
 *
 * Nach demselben Muster wie `appearance.ts`: ein winziger Speicher außerhalb
 * von React, den Komponenten über `useSyncExternalStore` lesen. So sehen die
 * Einstellungsseite, die Befehlspalette und jede auslösende Stelle denselben
 * Zustand, auch über Tabs hinweg.
 *
 * Bewusst nur im Browser gespeichert und nicht im Konto – anders als das
 * Farbschema. Der Grund ist kein Prinzip, sondern ein Unterschied in der Sache:
 * Das Farbschema muss schon beim Ausliefern der Seite feststehen, sonst blitzt
 * das falsche auf. Ton und Vibration werden erst gebraucht, wenn etwas
 * passiert – und sie sind gerätebezogen. Wer am Telefon Vibration will und am
 * Arbeitsrechner Ton, wäre von einer kontoweiten Einstellung schlecht bedient.
 */

export const SOUND_STORAGE_KEY = 'pythonpfad-sound';
export const HAPTICS_STORAGE_KEY = 'pythonpfad-haptics';

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeFeedback(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

/**
 * Ist der Ton eingeschaltet?
 *
 * Standard ist aus, und das ist die wichtigste Voreinstellung in dieser Datei:
 * Eine Lernanwendung, die beim ersten Öffnen im Zug oder im Büro Geräusche
 * macht, wird geschlossen. Wer Ton will, schaltet ihn ein – wer ihn nicht
 * erwartet, wird nie überrascht.
 */
export function readSound(): boolean {
  return window.localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
}

/**
 * Ist die Vibration eingeschaltet?
 *
 * Standard ist an – anders als beim Ton. Vibration ist nur für die Person
 * spürbar, die das Gerät in der Hand hält, stört also niemanden im Raum, und
 * auf Geräten ohne Vibrationsmotor passiert ohnehin nichts.
 */
export function readHaptics(): boolean {
  return window.localStorage.getItem(HAPTICS_STORAGE_KEY) !== 'false';
}

export function readFeedbackOnServer(): FeedbackPreferences {
  return FEEDBACK_DEFAULTS;
}

export function setSound(an: boolean): void {
  if (an) window.localStorage.setItem(SOUND_STORAGE_KEY, 'true');
  else window.localStorage.removeItem(SOUND_STORAGE_KEY);
  notify();
}

export function setHaptics(an: boolean): void {
  if (an) window.localStorage.removeItem(HAPTICS_STORAGE_KEY);
  else window.localStorage.setItem(HAPTICS_STORAGE_KEY, 'false');
  notify();
}
