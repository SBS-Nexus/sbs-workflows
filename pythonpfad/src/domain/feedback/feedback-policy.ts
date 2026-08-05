/**
 * Regeln für spürbare Rückmeldung.
 *
 * Diese Anwendung darf sich gut anfühlen. Ein Knopf, der antwortet, und ein
 * kurzer Ton beim Gelingen machen aus einer Übung ein Erlebnis – das ist der
 * Unterschied zwischen einem Formular und etwas, das man gern noch einmal
 * öffnet.
 *
 * Genau deshalb braucht es hier Regeln und keine Einzelfallentscheidungen.
 * Ton und Vibration sind die schnellsten Wege, eine Anwendung übergriffig zu
 * machen: Ein Klang beim Fehler wird zur Ohrfeige, ein Summen bei jedem Klick
 * zur Belästigung, und beides zusammen macht das Gerät im Zug unbenutzbar.
 *
 * Die Regeln:
 *
 *  1. **Nur beim Gelingen.** Es gibt kein Signal für einen Fehlschlag. Wer
 *     eine Aufgabe nicht löst, bekommt eine Erklärung, kein Geräusch. Ein Ton,
 *     der Misserfolg begleitet, macht das Misslingen zum Ereignis – und genau
 *     das soll es hier nicht sein.
 *  2. **Standardmäßig aus.** Ton ist aus, bis jemand ihn einschaltet. Eine
 *     Lernanwendung, die beim ersten Öffnen im Großraumbüro Geräusche macht,
 *     wird geschlossen und nicht wieder geöffnet.
 *  3. **Ein Signal je Ereignis.** Kein Stapeln, kein Nachklappern. Wer fünf
 *     Aufgaben schnell hintereinander löst, hört fünf kurze Töne, nicht einen
 *     Teppich.
 *  4. **An die Bewegungspräferenz gekoppelt.** Wer Bewegung reduziert haben
 *     will, will in aller Regel auch keine Vibration. Das eine schaltet das
 *     andere mit ab.
 *
 * Diese Datei enthält nur Entscheidungen, keine Geräte-Zugriffe. Dadurch ist
 * sie ohne Browser prüfbar – und die Regeln stehen an einer Stelle, statt in
 * einem Dutzend Komponenten verstreut.
 */

/** Was passiert ist. Bewusst benannt nach dem Ereignis, nicht nach dem Effekt. */
export type FeedbackEvent =
  /** Eine Aufgabe wurde eigenständig gelöst. */
  | 'aufgabe-geloest'
  /** Eine Lektion ist vollständig abgeschlossen. */
  | 'lektion-fertig'
  /** Ein Meilenstein wurde erreicht. */
  | 'meilenstein'
  /** Ein Programm ist ohne Fehler durchgelaufen. */
  | 'lauf-fertig'
  /** Eine Bedienhandlung wurde angenommen – Auswahl, Umschalten, Bestätigen. */
  | 'bedienung';

export interface FeedbackPreferences {
  /** Töne ausgeben? Standardmäßig aus. */
  sound: boolean;
  /** Vibrieren? Standardmäßig an, aber nur, wo das Gerät es kann. */
  haptics: boolean;
  /** Bewegung reduzieren – aus Systemeinstellung oder Konto. */
  reduceMotion: boolean;
}

export const FEEDBACK_DEFAULTS: FeedbackPreferences = {
  sound: false,
  haptics: true,
  reduceMotion: false,
};

/** Ein Ton: Tonhöhe in Hertz, Dauer in Millisekunden, Lautstärke von 0 bis 1. */
export interface Ton {
  hz: number;
  ms: number;
  lautstaerke: number;
}

export interface FeedbackPlan {
  /** Abzuspielende Töne, nacheinander. Leer heißt: kein Ton. */
  toene: Ton[];
  /** Vibrationsmuster in Millisekunden (an, aus, an …). Leer heißt: keine Vibration. */
  vibration: number[];
}

const STILL: FeedbackPlan = { toene: [], vibration: [] };

/**
 * Die Klänge.
 *
 * Alle liegen in einer Tonleiter (C-Dur) und steigen an – aufsteigende
 * Intervalle werden als Bestätigung gehört, absteigende als Verneinung. Das
 * ist keine Geschmacksfrage, sondern eine Hörgewohnheit, die praktisch jede
 * Oberfläche seit Jahrzehnten bedient.
 *
 * Kurz gehalten: Der längste Klang dauert zusammen 260 Millisekunden. Alles
 * darüber hält auf, statt zu belohnen.
 */
const KLAENGE: Record<FeedbackEvent, FeedbackPlan> = {
  // Zwei Töne aufwärts, eine Quinte – freundlich, unaufdringlich.
  'aufgabe-geloest': {
    toene: [
      { hz: 523.25, ms: 70, lautstaerke: 0.16 },
      { hz: 783.99, ms: 110, lautstaerke: 0.16 },
    ],
    vibration: [12],
  },
  // Drei Töne, ein Dreiklang: der größte Moment im Ablauf einer Lektion.
  'lektion-fertig': {
    toene: [
      { hz: 523.25, ms: 70, lautstaerke: 0.18 },
      { hz: 659.25, ms: 70, lautstaerke: 0.18 },
      { hz: 1046.5, ms: 120, lautstaerke: 0.18 },
    ],
    vibration: [14, 60, 14],
  },
  // Wie oben, aber ruhiger: Ein Meilenstein wird nebenbei erreicht.
  meilenstein: {
    toene: [
      { hz: 659.25, ms: 70, lautstaerke: 0.14 },
      { hz: 987.77, ms: 110, lautstaerke: 0.14 },
    ],
    vibration: [12, 50, 12],
  },
  // Ein einzelner, sehr kurzer Ton – „fertig", nicht „bravo".
  'lauf-fertig': {
    toene: [{ hz: 880, ms: 55, lautstaerke: 0.1 }],
    vibration: [8],
  },
  // Nur Tastgefühl, nie hörbar: Ein Klick je Auswahl wäre nach zwei Minuten
  // unerträglich.
  bedienung: {
    toene: [],
    vibration: [6],
  },
};

/**
 * Was soll bei diesem Ereignis passieren?
 *
 * Gibt einen Plan zurück, führt ihn aber nicht aus. Die Trennung ist der Grund,
 * warum sich die Regeln prüfen lassen, ohne einen Browser zu starten.
 */
export function planFeedback(event: FeedbackEvent, preferences: FeedbackPreferences): FeedbackPlan {
  const plan = KLAENGE[event];
  if (!plan) return STILL;

  return {
    toene: preferences.sound ? plan.toene : [],
    // Wer Bewegung reduziert haben will, will fast immer auch kein Rütteln.
    // Die beiden Einstellungen getrennt zu führen, hieße, dieselbe Absicht
    // zweimal äußern zu müssen.
    vibration: preferences.haptics && !preferences.reduceMotion ? plan.vibration : [],
  };
}

/** Gibt es überhaupt etwas zu tun? Spart den Zugriff auf Audio und Gerät. */
export function isSilent(plan: FeedbackPlan): boolean {
  return plan.toene.length === 0 && plan.vibration.length === 0;
}

/** Gesamtdauer eines Plans in Millisekunden – für Tests und für die Ablaufsteuerung. */
export function planDauerMs(plan: FeedbackPlan): number {
  return plan.toene.reduce((summe, ton) => summe + ton.ms, 0);
}

/** Alle Ereignisse – wird von einem Test benutzt, der jedes einmal durchspielt. */
export const FEEDBACK_EVENTS = Object.keys(KLAENGE) as FeedbackEvent[];
