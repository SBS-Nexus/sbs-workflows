/**
 * Wie ein Ergebnis auf dem Bildschirm aussieht.
 *
 * Bewusst getrennt von den Komponenten: Was hier entschieden wird, entscheidet
 * darüber, ob jemand die Daten richtig liest – und das gehört in Tests, nicht
 * in eine Sichtprüfung. Die Komponenten setzen nur noch um, was hier
 * festgelegt ist.
 */

import type { Resultset, SqlWert } from './resultset';

export type Wertart = 'null' | 'zahl' | 'text' | 'wahrheit' | 'datum' | 'binaer';

export interface AngezeigterWert {
  text: string;
  art: Wertart;
  /**
   * Vorlesbare Fassung, wo die sichtbare nicht genügt.
   *
   * Ein NULL wird als graues, kursives „NULL" dargestellt. Wer es vorgelesen
   * bekommt, hört „null" – und weiß nicht, ob dort die Zahl 0, das Wort NULL
   * oder ein fehlender Wert steht. Deshalb hier ein ganzer Satz.
   */
  vorlesen?: string;
}

/**
 * Bringt einen Wert in die Form, in der er in der Tabelle steht.
 *
 * Die wichtigste Entscheidung dieser Datei: **NULL wird benannt, nicht
 * weggelassen.** Eine leere Zelle ist mehrdeutig – sie könnte eine leere
 * Zeichenfolge sein, eine Null oder ein fehlender Wert. Genau diese
 * Verwechslung ist der häufigste Anfängerirrtum in SQL, und eine Anzeige, die
 * sie nahelegt, arbeitet gegen die erste Lektion.
 */
export function zeigeWert(wert: SqlWert): AngezeigterWert {
  if (wert === null) {
    return { text: 'NULL', art: 'null', vorlesen: 'NULL, kein Wert vorhanden' };
  }

  if (typeof wert === 'boolean') {
    // bit kommt als Wahrheitswert an. In SQL Server steht dort 0 oder 1; die
    // Anzeige folgt der Datenbank und nicht JavaScript.
    return { text: wert ? '1' : '0', art: 'wahrheit' };
  }

  if (typeof wert === 'number') {
    // Feste Schreibweise ohne Tausenderpunkte: In einer Ergebnistabelle ist
    // der Wert der Datenbank gefragt, nicht seine hübsche Fassung. Wer die
    // Zahl weiterverwendet, kopiert sie sonst falsch.
    return { text: String(Object.is(wert, -0) ? 0 : wert), art: 'zahl' };
  }

  if (wert instanceof Date) {
    /*
     * ISO-Form, gekürzt auf das, was tatsächlich drinsteht: Mitternacht ohne
     * Zeitanteil ist ein Datum, alles andere ein Zeitpunkt. Bewusst nicht
     * deutsche Schreibweise - in einer Ergebnistabelle steht der Wert, wie ihn
     * die Datenbank kennt, und `2026-03-01` ist eindeutig sortierbar.
     */
    const voll = wert.toISOString();
    const text = voll.endsWith('T00:00:00.000Z') ? (voll.split('T')[0] ?? voll) : voll;
    return { text, art: 'datum' };
  }

  if (wert instanceof Uint8Array) {
    return {
      text: `0x${Array.from(wert.slice(0, 8))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')}${wert.length > 8 ? '…' : ''}`,
      art: 'binaer',
      vorlesen: `Binärwert mit ${wert.length} Byte`,
    };
  }

  if (wert === '') {
    // Der Gegenspieler von NULL. Ohne Kennzeichnung sähen beide gleich aus –
    // und der Unterschied ist genau das, was die Lektion beibringen will.
    return { text: '(leer)', art: 'text', vorlesen: 'leere Zeichenfolge' };
  }

  return { text: wert, art: 'text' };
}

/**
 * Ein Satz über das Ergebnis.
 *
 * Er steht über der Tabelle und sagt, was man sieht. „3 Zeilen" klingt nach
 * einer Nebensächlichkeit und ist die Angabe, an der man zuerst merkt, dass
 * eine Verknüpfung mehr Zeilen erzeugt hat als gedacht.
 */
export function beschreibeErgebnis(
  resultset: Resultset,
  optionen: { abgeschnitten?: boolean; gelieferteZeilen?: number } = {},
): string {
  const gezeigt = resultset.zeilen.length;

  if (optionen.abgeschnitten) {
    const gesamt = optionen.gelieferteZeilen ?? gezeigt;
    return `${gesamt} Zeilen, angezeigt werden die ersten ${gezeigt}`;
  }

  if (gezeigt === 0) {
    /*
     * „Keine Zeile" ist ein Ergebnis und keine Fehlfunktion. Wer hier
     * „Kein Ergebnis" liest, sucht den Fehler in der Anwendung statt in der
     * WHERE-Bedingung.
     */
    return 'Keine Zeile erfüllt die Bedingung';
  }

  return gezeigt === 1 ? '1 Zeile' : `${gezeigt} Zeilen`;
}

/**
 * Sind die Werte einer Spalte überwiegend Zahlen?
 *
 * Zahlenspalten werden rechtsbündig gesetzt. Das ist kein Geschmack: Bei
 * rechtsbündigen Zahlen stehen Einer über Einern, und ein Größenunterschied
 * wird sichtbar, ohne dass man liest.
 */
export function istZahlenspalte(resultset: Resultset, spaltenIndex: number): boolean {
  let zahlen = 0;
  let belegt = 0;

  for (const zeile of resultset.zeilen) {
    const wert = zeile[spaltenIndex];
    if (wert === null || wert === undefined) continue;
    belegt += 1;
    if (typeof wert === 'number') zahlen += 1;
  }

  // Ohne belegte Werte gibt es nichts auszurichten. Eine Spalte voller NULL
  // rechtsbündig zu setzen, hieße eine Aussage zu treffen, die die Daten nicht
  // hergeben.
  return belegt > 0 && zahlen === belegt;
}
