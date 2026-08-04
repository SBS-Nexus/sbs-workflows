/**
 * Lernrhythmus: Tagesziel, Lerntage, Serie.
 *
 * Diese Datei setzt eine ausdrückliche Produktentscheidung um, deshalb steht
 * die Begründung hier und nicht nur in der Dokumentation.
 *
 * Was hier bewusst NICHT passiert:
 *  - Keine Verlustmechanik. Es gibt nichts, das man verlieren kann, und keine
 *    Wiederherstellung gegen Gegenleistung. Eine unterbrochene Serie ist ein
 *    beschreibender Zustand, kein Schaden.
 *  - Keine künstliche Dringlichkeit. Kein „nur noch heute", kein Countdown,
 *    keine Erinnerung, die Druck erzeugt.
 *  - Kein Vergleich mit anderen. Ranglisten hätten für erwachsene
 *    Selbstlernende keinen sachlichen Nutzen.
 *  - Keine Beschämung. Ein Tag ohne Übung wird neutral dargestellt.
 *
 * Die Hauptzahl ist deshalb bewusst die Anzahl der Lerntage der letzten
 * dreißig Tage und nicht die Serie: Sie kann nur wachsen und schrumpft nicht
 * durch eine Pause, sie bildet unregelmäßiges Lernen fair ab, und sie
 * belohnt nicht das Abhaken um Mitternacht.
 */

export interface DayActivity {
  /** Kalendertag als ISO-Datum (YYYY-MM-DD) in der Zeitzone der lernenden Person. */
  date: string;
  minutes: number;
  activities: number;
}

/** Wie voll ein Tag war, gemessen am eigenen Ziel. */
export type DayLevel = 0 | 1 | 2 | 3;

export interface CalendarDay {
  date: string;
  /** Vorlesbare Beschreibung, etwa „Montag, 3. August: 12 Minuten". */
  label: string;
  minutes: number;
  level: DayLevel;
  isToday: boolean;
}

export interface RhythmSummary {
  today: {
    minutes: number;
    goalMinutes: number;
    reached: boolean;
    /** Was rechnerisch noch fehlt. Null, sobald das Ziel erreicht ist. */
    remainingMinutes: number;
    /** 0–100, gedeckelt. Für den Fortschrittsring. */
    percent: number;
  };
  /** Tage mit Aktivität in den letzten 30 Tagen. Die Hauptzahl. */
  learningDaysLast30: number;
  /** Nachrangig dargestellt und nie als Verlust formuliert. */
  currentStreakDays: number;
  longestStreakDays: number;
  calendar: CalendarDay[];
  /** Ein Satz zur heutigen Lage – ohne Druck, ohne Lob für Selbstverständliches. */
  message: string;
}

const WOCHENTAGE = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
];

const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** Anzahl der Tage in der Kalenderleiste. */
export const CALENDAR_DAYS = 30;

/** Ab so vielen Minuten gilt ein Tag als Lerntag, unabhängig vom Ziel. */
export const MINIMUM_LEARNING_MINUTES = 1;

export function toIsoDay(date: Date): string {
  const jahr = date.getFullYear();
  const monat = String(date.getMonth() + 1).padStart(2, '0');
  const tag = String(date.getDate()).padStart(2, '0');
  return `${jahr}-${monat}-${tag}`;
}

function describeDay(iso: string, minutes: number): string {
  const [jahr, monat, tag] = iso.split('-').map(Number);
  if (jahr === undefined || monat === undefined || tag === undefined) return iso;
  const date = new Date(jahr, monat - 1, tag);
  const wochentag = WOCHENTAGE[date.getDay()] ?? '';
  const monatsname = MONATE[monat - 1] ?? '';
  const dauer = minutes === 0 ? 'keine Übung' : `${minutes} Minuten`;
  return `${wochentag}, ${tag}. ${monatsname}: ${dauer}`;
}

function levelFor(minutes: number, goalMinutes: number): DayLevel {
  if (minutes < MINIMUM_LEARNING_MINUTES) return 0;
  if (goalMinutes <= 0) return 3;
  if (minutes >= goalMinutes) return 3;
  if (minutes >= goalMinutes / 2) return 2;
  return 1;
}

/**
 * Stellt den Rhythmus aus den Tagesdaten zusammen.
 *
 * `days` darf lückenhaft sein; fehlende Tage gelten als Tage ohne Übung.
 * Die Reihenfolge spielt keine Rolle.
 */
export function buildRhythm(
  days: readonly DayActivity[],
  goalMinutes: number,
  now: Date = new Date(),
): RhythmSummary {
  const byDay = new Map(days.map((entry) => [entry.date, entry]));
  const heute = toIsoDay(now);

  const calendar: CalendarDay[] = [];
  for (let offset = CALENDAR_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const iso = toIsoDay(date);
    const minutes = byDay.get(iso)?.minutes ?? 0;
    calendar.push({
      date: iso,
      label: describeDay(iso, minutes),
      minutes,
      level: levelFor(minutes, goalMinutes),
      isToday: iso === heute,
    });
  }

  const learningDaysLast30 = calendar.filter((day) => day.level > 0).length;

  const heuteMinuten = byDay.get(heute)?.minutes ?? 0;
  const reached = goalMinutes > 0 && heuteMinuten >= goalMinutes;
  const remainingMinutes = reached ? 0 : Math.max(0, goalMinutes - heuteMinuten);
  const percent =
    goalMinutes <= 0 ? 100 : Math.min(100, Math.round((heuteMinuten / goalMinutes) * 100));

  const { current, longest } = computeStreaks(byDay, now);

  return {
    today: { minutes: heuteMinuten, goalMinutes, reached, remainingMinutes, percent },
    learningDaysLast30,
    currentStreakDays: current,
    longestStreakDays: longest,
    calendar,
    message: buildMessage(heuteMinuten, goalMinutes, reached, remainingMinutes),
  };
}

/**
 * Serie der zusammenhängenden Lerntage.
 *
 * Der heutige Tag zählt nur mit, wenn schon etwas passiert ist. Sonst würde
 * die Serie jeden Morgen als unterbrochen erscheinen – eine Anzeige, die
 * nichts beschreibt außer der Uhrzeit.
 */
function computeStreaks(
  byDay: ReadonlyMap<string, DayActivity>,
  now: Date,
): { current: number; longest: number } {
  const aktiveTage = new Set(
    [...byDay.values()]
      .filter((entry) => entry.minutes >= MINIMUM_LEARNING_MINUTES)
      .map((entry) => entry.date),
  );

  let current = 0;
  const cursor = new Date(now);
  if (!aktiveTage.has(toIsoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (aktiveTage.has(toIsoDay(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortiert = [...aktiveTage].sort();
  let longest = 0;
  let lauf = 0;
  let vorheriger: string | null = null;
  for (const tag of sortiert) {
    lauf = vorheriger !== null && istFolgetag(vorheriger, tag) ? lauf + 1 : 1;
    longest = Math.max(longest, lauf);
    vorheriger = tag;
  }

  return { current, longest };
}

function istFolgetag(vorher: string, nachher: string): boolean {
  const [j1, m1, t1] = vorher.split('-').map(Number);
  const [j2, m2, t2] = nachher.split('-').map(Number);
  if (j1 === undefined || m1 === undefined || t1 === undefined) return false;
  if (j2 === undefined || m2 === undefined || t2 === undefined) return false;
  const a = new Date(j1, m1 - 1, t1);
  const b = new Date(j2, m2 - 1, t2);
  const differenz = (b.getTime() - a.getTime()) / 86_400_000;
  // Auf ganze Tage runden: Zwischen zwei Kalendertagen können durch die
  // Sommerzeit 23 oder 25 Stunden liegen.
  return Math.round(differenz) === 1;
}

/**
 * Der Satz unter dem Tagesziel.
 *
 * Jede Formulierung ist daraufhin geprüft, ob sie auch dann noch in Ordnung
 * ist, wenn jemand drei Wochen nicht da war und heute zum ersten Mal wieder
 * hereinschaut. Deshalb kommen weder „endlich" noch „schon wieder" noch
 * „nicht aufgeben" vor.
 */
function buildMessage(
  minutes: number,
  goalMinutes: number,
  reached: boolean,
  remaining: number,
): string {
  if (goalMinutes <= 0) {
    return 'Du hast kein Tagesziel gesetzt. Lerne so viel oder so wenig, wie es heute passt.';
  }
  if (reached) {
    return `Dein Tagesziel von ${goalMinutes} Minuten ist erreicht. Alles Weitere ist freiwillig.`;
  }
  if (minutes === 0) {
    return `Heute noch nichts. Dein Ziel sind ${goalMinutes} Minuten – auch weniger ist ein Lerntag.`;
  }
  return `${minutes} von ${goalMinutes} Minuten. Die restlichen ${remaining} sind kein Muss.`;
}

/**
 * Beschreibt die Serie – ausdrücklich nie als Verlust.
 *
 * Wird getrennt von `buildMessage` gehalten, weil die Serie in der Oberfläche
 * nachrangig steht und je nach Stelle anders eingebettet wird.
 */
export function describeStreak(currentDays: number, longestDays: number): string {
  if (currentDays === 0) {
    return longestDays > 1
      ? `Zurzeit keine Serie. Deine längste waren ${longestDays} Tage.`
      : 'Zurzeit keine Serie.';
  }
  if (currentDays === 1) return 'Heute schon geübt.';
  return `${currentDays} Tage in Folge.`;
}
