/**
 * Behaltensprognose.
 *
 * Was hier berechnet wird: eine Schätzung, wie gut ein Konzept in den nächsten
 * Wochen noch abrufbar sein wird, wenn nichts weiter dafür getan wird.
 * Grundlage ist die Vergessenskurve nach Ebbinghaus in der heute üblichen
 * Exponentialform R = e^(−t/S): Die Abrufwahrscheinlichkeit fällt zunächst
 * schnell und dann immer langsamer, und die Stabilität S bestimmt, wie schnell.
 *
 * Diese Stabilität wird nicht neu erfunden. Sie steht bereits im
 * Kompetenzmodell und wächst dort mit jedem erfolgreichen Abruf – genau das
 * ist der Grund, warum verteilte Wiederholung wirkt.
 *
 * Was diese Datei ausdrücklich NICHT ist: eine Messung. Die Kurve ist ein
 * Modell mit einer bekannten Streuung, und sie wird in der Oberfläche auch so
 * benannt. Sie taugt zur Auswahl der nächsten Übung, nicht als Aussage über
 * eine einzelne Person an einem einzelnen Tag.
 */

export interface RetentionInput {
  /** Gedächtnisstabilität in Tagen, aus dem Kompetenzmodell. */
  stability: number;
  /** Wann zuletzt geübt. Ohne Angabe gilt das Konzept als nicht begonnen. */
  lastPracticedAt: Date | null;
  /** Aktueller Kompetenzwert 0–100. Deckelt die Prognose nach oben. */
  masteryScore: number;
}

/**
 * Ab dieser Abrufwahrscheinlichkeit gilt ein Konzept als auffrischungsbedürftig.
 *
 * 0.85 ist der in der Literatur zur verteilten Wiederholung übliche Zielwert:
 * hoch genug, dass der Abruf gelingt, niedrig genug, dass er Anstrengung
 * kostet – und Anstrengung beim Abruf ist es, die das Behalten stärkt.
 */
export const REVIEW_TARGET_RETENTION = 0.85;

/**
 * Abrufwahrscheinlichkeit nach `days` Tagen ohne Übung.
 *
 * Rückgabe zwischen 0 und 1. Ein nie geübtes Konzept ergibt 0 – nicht, weil
 * es vergessen wäre, sondern weil es nichts zu behalten gibt.
 */
export function retentionAfter(input: RetentionInput, days: number): number {
  if (input.lastPracticedAt === null) return 0;
  if (input.masteryScore <= 0) return 0;

  const stability = Math.max(0.5, input.stability);
  const elapsed = Math.max(0, days);
  const kurve = Math.exp(-elapsed / stability);

  // Der Kompetenzwert deckelt: Wer ein Konzept nur halb beherrscht, kann es
  // auch unmittelbar nach dem Üben nicht sicher abrufen. Ohne diese Deckelung
  // sähe jedes gerade geübte Konzept nach 100 Prozent aus.
  const decke = Math.min(1, input.masteryScore / 100);
  return Math.min(1, kurve * decke);
}

/**
 * Abrufwahrscheinlichkeit heute, gemessen an der letzten Übung.
 */
export function retentionNow(input: RetentionInput, now: Date = new Date()): number {
  if (input.lastPracticedAt === null) return 0;
  const tage = (now.getTime() - input.lastPracticedAt.getTime()) / 86_400_000;
  return retentionAfter(input, tage);
}

/**
 * In wie vielen Tagen die Zielschwelle unterschritten wird.
 *
 * Aufgelöst nach t: R = e^(−t/S) · Decke = Ziel  ⟹  t = −S · ln(Ziel / Decke).
 * Liegt die Decke bereits unter dem Ziel, ist die Schwelle nie erreichbar –
 * dann steht die Auffrischung sofort an, und zwar nicht wegen Vergessens,
 * sondern weil das Konzept noch nicht gefestigt ist.
 */
export function daysUntilBelow(
  input: RetentionInput,
  target: number = REVIEW_TARGET_RETENTION,
  now: Date = new Date(),
): number {
  if (input.lastPracticedAt === null) return 0;

  const decke = Math.min(1, input.masteryScore / 100);
  if (decke <= target) return 0;

  const stability = Math.max(0.5, input.stability);
  const abLetzterUebung = -stability * Math.log(target / decke);
  const vergangen = (now.getTime() - input.lastPracticedAt.getTime()) / 86_400_000;
  return Math.max(0, abLetzterUebung - vergangen);
}

export interface ForecastPoint {
  /** Tage ab heute. */
  day: number;
  /** Mittlere Abrufwahrscheinlichkeit über alle begonnenen Konzepte, 0–1. */
  retention: number;
  /** Wie viele Konzepte an diesem Tag unter der Zielschwelle liegen. */
  belowTarget: number;
}

/**
 * Verlauf über die nächsten Tage für alle Konzepte einer Person.
 *
 * Gemittelt wird nur über begonnene Konzepte. Nie geübte mitzuzählen würde die
 * Kurve mit jedem neuen Kursthema nach unten ziehen und den Eindruck erwecken,
 * es ginge bergab – während in Wirklichkeit gerade etwas dazugekommen ist.
 */
export function buildForecast(
  concepts: readonly RetentionInput[],
  horizonDays = 30,
  now: Date = new Date(),
): ForecastPoint[] {
  const begonnen = concepts.filter((concept) => concept.lastPracticedAt !== null);

  const punkte: ForecastPoint[] = [];
  for (let day = 0; day <= horizonDays; day += 1) {
    if (begonnen.length === 0) {
      punkte.push({ day, retention: 0, belowTarget: 0 });
      continue;
    }

    let summe = 0;
    let unterhalb = 0;
    for (const concept of begonnen) {
      const vergangen =
        (now.getTime() - (concept.lastPracticedAt?.getTime() ?? 0)) / 86_400_000 + day;
      const wert = retentionAfter(concept, vergangen);
      summe += wert;
      if (wert < REVIEW_TARGET_RETENTION) unterhalb += 1;
    }

    punkte.push({
      day,
      retention: summe / begonnen.length,
      belowTarget: unterhalb,
    });
  }

  return punkte;
}

/**
 * Ein Satz zur Prognose.
 *
 * Sagt, was in nächster Zeit ansteht, ohne zu drängen. Insbesondere wird nie
 * behauptet, etwas gehe „verloren" – Vergessen ist ein normaler Vorgang und
 * durch Wiederholung umkehrbar.
 */
export function describeForecast(points: readonly ForecastPoint[]): string {
  const heute = points[0];
  const inEinerWoche = points.find((point) => point.day === 7);
  if (!heute || !inEinerWoche) return 'Für eine Prognose fehlen noch Daten.';

  if (heute.belowTarget === 0 && inEinerWoche.belowTarget === 0) {
    return 'In der kommenden Woche steht nach jetzigem Stand keine Auffrischung an.';
  }
  if (heute.belowTarget > 0) {
    return `${heute.belowTarget} ${heute.belowTarget === 1 ? 'Konzept ist' : 'Konzepte sind'} gerade unter der Schwelle, ab der eine Auffrischung sich lohnt.`;
  }
  const dazu = inEinerWoche.belowTarget;
  return `In den nächsten sieben Tagen ${dazu === 1 ? 'kommt ein Konzept' : `kommen ${dazu} Konzepte`} in den Bereich, in dem eine Auffrischung sinnvoll wird.`;
}
