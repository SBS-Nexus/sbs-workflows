/**
 * Welche Aufgaben als Nächstes drankommen.
 *
 * Zwei Fragen, zwei Antworten – und beide bewusst **ohne Zufall**. Eine
 * Auswahl, die sich bei jedem Neuladen ändert, macht aus „ich mache da weiter,
 * wo ich war" ein Glücksspiel; und sie lässt sich nicht prüfen. Dieselbe
 * Ausgangslage ergibt hier immer dieselbe Reihenfolge.
 *
 * Hier geht es nur ums **Üben**. Das Wiederholen nach Terminen rechnet
 * `src/domain/wiederholung/sm2.ts` und arbeitet je Konzept, nicht je Aufgabe.
 * Diese Datei kannte früher auch eine `waehleWiederholung`, die nahm, „was
 * zuletzt nicht saß"; sie ist mit der Terminrechnung überflüssig geworden und
 * wurde entfernt, statt sie ungenutzt weiterzupflegen.
 */

export type Versuchsergebnis = 'PASSED' | 'PARTIAL' | 'FAILED' | 'SOLUTION_REVEALED';

export interface Kandidat {
  aufgabeSlug: string;
  /** Zu welcher Lektion die Aufgabe gehört – für das Mischen. */
  lektionSlug: string;
}

export interface Versuchsstand {
  letztesErgebnis: Versuchsergebnis;
  zuletztAm: Date;
}

/** Gilt eine Aufgabe nach diesem Stand als sitzend? */
function sitzt(stand: Versuchsstand | undefined): boolean {
  // Eine angesehene Lösung ist kein Können. Sie sagt nichts darüber aus, ob es
  // beim nächsten Mal allein gelingt - und genau das soll die Übung klären.
  return stand?.letztesErgebnis === 'PASSED';
}

/**
 * Aufgaben zum Üben.
 *
 * Reihenfolge: erst was noch nie bearbeitet wurde, dann was noch nicht saß,
 * zuletzt Wiederholung von Sitzendem. Innerhalb jeder Gruppe wird über die
 * Lektionen **gemischt** – nicht vier Aufgaben aus derselben Lektion
 * hintereinander.
 *
 * Das Mischen ist der eigentliche Punkt der Seite: Wer vier JOIN-Aufgaben am
 * Stück löst, übt das Ausführen. Wer eine JOIN-Aufgabe zwischen zwei anderen
 * findet, muss erst erkennen, dass es eine ist – und das ist die Fähigkeit,
 * die später gebraucht wird.
 */
export function waehleUebung(
  alle: readonly Kandidat[],
  staende: ReadonlyMap<string, Versuchsstand>,
  anzahl: number,
): Kandidat[] {
  const neu = alle.filter((kandidat) => !staende.has(kandidat.aufgabeSlug));
  const offen = alle.filter(
    (kandidat) => staende.has(kandidat.aufgabeSlug) && !sitzt(staende.get(kandidat.aufgabeSlug)),
  );
  const gekonnt = alle
    .filter((kandidat) => sitzt(staende.get(kandidat.aufgabeSlug)))
    .sort(nachAelterem(staende));

  return [...mischeUeberLektionen(neu), ...mischeUeberLektionen(offen), ...gekonnt].slice(
    0,
    Math.max(0, anzahl),
  );
}

function nachAelterem(
  staende: ReadonlyMap<string, Versuchsstand>,
): (eins: Kandidat, zwei: Kandidat) => number {
  return (eins, zwei) => {
    const a = staende.get(eins.aufgabeSlug)?.zuletztAm?.getTime() ?? 0;
    const b = staende.get(zwei.aufgabeSlug)?.zuletztAm?.getTime() ?? 0;
    return a - b;
  };
}

/**
 * Reihum eine Aufgabe je Lektion, dann von vorn.
 *
 * Die Reihenfolge innerhalb einer Lektion bleibt erhalten – Aufgabe 1 kommt
 * vor Aufgabe 2, auch wenn zwischen ihnen etwas anderes steht.
 */
function mischeUeberLektionen(kandidaten: readonly Kandidat[]): Kandidat[] {
  const nachLektion = new Map<string, Kandidat[]>();
  for (const kandidat of kandidaten) {
    const liste = nachLektion.get(kandidat.lektionSlug);
    if (liste) liste.push(kandidat);
    else nachLektion.set(kandidat.lektionSlug, [kandidat]);
  }

  const gemischt: Kandidat[] = [];
  const listen = [...nachLektion.values()];
  const laengste = Math.max(0, ...listen.map((liste) => liste.length));

  for (let runde = 0; runde < laengste; runde += 1) {
    for (const liste of listen) {
      const kandidat = liste[runde];
      if (kandidat) gemischt.push(kandidat);
    }
  }

  return gemischt;
}
