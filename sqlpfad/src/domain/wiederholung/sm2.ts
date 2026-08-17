/**
 * Wann ein Konzept wieder drankommt.
 *
 * ## Welches Verfahren – und warum dieses
 *
 * Umgesetzt ist **SM-2** (Piotr Woźniak, 1987/1990), mit den Konstanten aus
 * der Veröffentlichung: Startleichtigkeit 2,5, Untergrenze 1,3, die Stufen
 * 1 Tag → 6 Tage → Intervall mal Leichtigkeit. Nichts davon ist hier
 * ausgedacht, und nichts davon ist an unseren Lernenden angepasst worden.
 *
 * Bewusst **nicht FSRS**, obwohl es das bessere Verfahren ist: FSRS rechnet mit
 * siebzehn Parametern, die an einem Wiederholungsprotokoll trainiert werden.
 * Ein solches Protokoll gibt es hier noch nicht. Die vortrainierten Standard-
 * werte zu übernehmen hieße, das Gedächtnis fremder Lernender auf unsere
 * anzuwenden und das Ergebnis als Messung auszugeben. SM-2 ist schlichter,
 * aber es behauptet auch weniger – und was es behauptet, steht nachlesbar in
 * einer Veröffentlichung und nicht in einer Gewichtsdatei.
 *
 * ## Was an dieser Umsetzung von SM-2 abweicht
 *
 * SM-2 fragt die Lernende nach jeder Wiederholung nach einer Güte von 0 bis 5.
 * Das tun wir **nicht** – eine Selbsteinschätzung nach jeder einzelnen Aufgabe
 * wäre fünf zusätzliche Klicks je Lektion. Die Güte wird stattdessen aus dem
 * abgeleitet, was ohnehin anfällt: Ergebnis und Zahl der genutzten Hinweise
 * (siehe `guete`). Das ist eine **Ersetzung, keine Umsetzung** des Originals,
 * und sie ist der einzige Punkt, an dem hier eine eigene Entscheidung steckt.
 *
 * Zweite, kleinere Abweichung, ebenfalls aus dem Original begründet: Woźniak
 * schreibt, ein misslungenes Element solle **innerhalb derselben Sitzung**
 * erneut abgefragt werden, bis es sitzt. Deshalb steht ein Konzept nach einem
 * Fehlschlag sofort wieder an (`faelligAm = jetzt`) und nicht erst morgen. Das
 * gespeicherte Intervall von einem Tag greift dann ab dem nächsten Gelingen.
 *
 * ## Was dieses Verfahren nicht kann
 *
 * SM-2 kennt nur die Abfolge der eigenen Ergebnisse. Es weiß nicht, ob zwei
 * Konzepte verwandt sind, es lernt nichts aus dem Verhalten anderer, und seine
 * Intervalle sind an Vokabeln erprobt, nicht an SQL. Es ist ein
 * nachvollziehbarer Vorschlag, wann sich Wiederholen lohnt – keine Vorhersage,
 * wann etwas vergessen wird. Die Oberfläche sagt das auch so und zeigt keine
 * Behaltenswahrscheinlichkeit in Prozent; die gäbe die Datenlage nicht her.
 */

/** Kennung des Verfahrens, wie sie in `ConceptMastery.algorithmVersion` steht. */
export const VERFAHREN = 'sm2/1';

/** Startleichtigkeit aus SM-2. */
export const LEICHTIGKEIT_START = 2.5;

/** Untergrenze der Leichtigkeit aus SM-2. Darunter wachsen Intervalle kaum noch. */
export const LEICHTIGKEIT_MINIMUM = 1.3;

/** Ab dieser Güte gilt eine Wiederholung in SM-2 als gelungen. */
export const GUETE_BESTANDEN = 3;

const TAG_MS = 24 * 60 * 60 * 1000;

/**
 * Güte einer Wiederholung, 0 bis 5 – die Skala aus SM-2.
 *
 * 5 = mühelos, 4 = mit Zögern, 3 = richtig, aber mit spürbarer Mühe,
 * 2 und darunter = nicht gekonnt.
 */
export type Guete = 0 | 1 | 2 | 3 | 4 | 5;

export type Versuchsergebnis = 'PASSED' | 'PARTIAL' | 'FAILED' | 'SOLUTION_REVEALED';

export interface Gedaechtnisstand {
  /** SM-2s Zähler `n`: gelungene Wiederholungen **in Folge**. Ein Fehlschlag setzt ihn auf 0. */
  wiederholungen: number;
  /** Das zuletzt vergebene Intervall in Tagen. 0 heißt: noch nie geplant. */
  intervallTage: number;
  /**
   * SM-2s Leichtigkeitsfaktor `EF`, 1,3 bis 2,5.
   *
   * **Höher heißt leichter**, nicht schwerer. Die Spalte im Datenmodell heißt
   * `difficulty`; dieser Name ist älter als das Verfahren und meint hier den
   * Faktor, nicht die Schwierigkeit. Wer ihn als Schwierigkeit liest, dreht
   * jede Auswertung um.
   */
  leichtigkeit: number;
}

/** Der Stand eines Konzepts, zu dem es noch keine Wiederholung gab. */
export const FRISCH: Gedaechtnisstand = {
  wiederholungen: 0,
  intervallTage: 0,
  leichtigkeit: LEICHTIGKEIT_START,
};

export interface Planung {
  stand: Gedaechtnisstand;
  faelligAm: Date;
  /**
   * Wurde die Wiederholung als gelungen gewertet? Die Oberfläche braucht das,
   * um „sitzt jetzt" von „steht gleich wieder an" zu unterscheiden.
   */
  gelungen: boolean;
}

/**
 * Aus Ergebnis und Hinweisnutzung eine Güte machen.
 *
 * Die Zuordnung im Klartext:
 *
 * | Ergebnis                     | Güte | Warum                                            |
 * | ---------------------------- | ---- | ------------------------------------------------ |
 * | gelöst, ohne Hinweis         | 5    | mühelos                                          |
 * | gelöst, ein Hinweis          | 4    | mit Zögern                                       |
 * | gelöst, ab zwei Hinweisen    | 3    | richtig, aber mit Mühe – SM-2s Grenzfall         |
 * | teilweise                    | 2    | nicht gekonnt, aber nah dran                     |
 * | daneben                      | 1    | nicht gekonnt                                    |
 * | Lösung angesehen             | 0    | sagt nichts über eigenes Können aus              |
 *
 * Die angesehene Lösung als 0 zu werten ist **keine Strafe**. Sie ist die
 * ehrliche Auskunft: Wer die Lösung gelesen hat, weiß danach nicht, ob er sie
 * allein gefunden hätte – und genau das soll die nächste Wiederholung klären.
 */
export function guete(ergebnis: Versuchsergebnis, hinweiseGenutzt: number): Guete {
  switch (ergebnis) {
    case 'PASSED':
      if (hinweiseGenutzt <= 0) return 5;
      if (hinweiseGenutzt === 1) return 4;
      return 3;
    case 'PARTIAL':
      return 2;
    case 'FAILED':
      return 1;
    case 'SOLUTION_REVEALED':
      return 0;
  }
}

/**
 * Den nächsten Termin berechnen.
 *
 * Der Ablauf ist der aus der Veröffentlichung, in dieser Reihenfolge:
 *
 * 1. Bei Güte ≥ 3: erstes Mal 1 Tag, zweites Mal 6 Tage, danach das letzte
 *    Intervall mal Leichtigkeit, kaufmännisch gerundet.
 * 2. Bei Güte < 3: Zähler zurück auf 0, Intervall zurück auf 1 Tag.
 * 3. Die Leichtigkeit wird **in beiden Fällen** angepasst – auch nach einem
 *    Fehlschlag. So steht es im Original, und es ist der Grund, warum ein
 *    wiederholt misslungenes Element irgendwann bei 1,3 landet und seine
 *    Intervalle danach kaum noch wachsen.
 */
export function plane(vorher: Gedaechtnisstand, bewertung: Guete, jetzt: Date): Planung {
  const gelungen = bewertung >= GUETE_BESTANDEN;

  const wiederholungen = gelungen ? vorher.wiederholungen + 1 : 0;
  const intervallTage = gelungen ? naechstesIntervall(vorher) : 1;

  /*
   * Die Anpassung der Leichtigkeit, wörtlich aus SM-2:
   *   EF' = EF + (0,1 - (5-q) * (0,08 + (5-q) * 0,02))
   *
   * Bei q=5 steigt sie um 0,1; bei q=4 bleibt sie gleich; ab q=3 sinkt sie.
   */
  const abstand = 5 - bewertung;
  const leichtigkeit = Math.max(
    LEICHTIGKEIT_MINIMUM,
    vorher.leichtigkeit + (0.1 - abstand * (0.08 + abstand * 0.02)),
  );

  /*
   * Nach einem Fehlschlag steht das Konzept sofort wieder an, nicht erst
   * morgen - siehe Kopf dieser Datei. Das gespeicherte Intervall bleibt bei
   * einem Tag und greift ab dem nächsten Gelingen.
   */
  const faelligAm = gelungen ? new Date(jetzt.getTime() + intervallTage * TAG_MS) : new Date(jetzt);

  return {
    stand: { wiederholungen, intervallTage, leichtigkeit: runde(leichtigkeit, 4) },
    faelligAm,
    gelungen,
  };
}

function naechstesIntervall(vorher: Gedaechtnisstand): number {
  if (vorher.wiederholungen === 0) return 1;
  if (vorher.wiederholungen === 1) return 6;
  return Math.max(1, Math.round(vorher.intervallTage * vorher.leichtigkeit));
}

function runde(wert: number, stellen: number): number {
  const faktor = 10 ** stellen;
  return Math.round(wert * faktor) / faktor;
}

/**
 * Ein Satz für die Oberfläche: wann es wieder ansteht.
 *
 * Absichtlich in Tagen und ohne Uhrzeit. Eine Fälligkeit auf die Minute genau
 * anzuzeigen wäre eine Genauigkeit, die das Verfahren nicht hat – SM-2 rechnet
 * in ganzen Tagen.
 */
export function beschreibeFaelligkeit(faelligAm: Date, jetzt: Date): string {
  const tage = Math.round((faelligAm.getTime() - jetzt.getTime()) / TAG_MS);

  if (tage <= 0) return 'steht jetzt an';
  if (tage === 1) return 'morgen wieder';
  if (tage < 7) return `in ${tage} Tagen wieder`;
  if (tage < 14) return 'in einer Woche wieder';
  if (tage < 31) return `in ${Math.round(tage / 7)} Wochen wieder`;
  if (tage < 62) return 'in einem Monat wieder';
  return `in ${Math.round(tage / 30)} Monaten wieder`;
}
