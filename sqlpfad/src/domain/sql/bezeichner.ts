/**
 * Bezeichner für T-SQL – sicher gebildet, nicht zusammengeklebt.
 *
 * Sandbox-Datenbanken und ihre Anmeldenamen müssen zur Laufzeit angelegt
 * werden. Dafür gibt es keine Parameter: `CREATE DATABASE @name` ist in T-SQL
 * kein gültiger Satz. Der Name muss in den Anweisungstext, und genau dort
 * entsteht sonst die Lücke, gegen die dieses Modul da ist.
 *
 * Die Regel hier ist bewusst nicht „gefährliche Zeichen entfernen", sondern
 * „nur eine kleine, bekannte Menge zulassen". Der Unterschied ist der
 * entscheidende: Eine Liste verbotener Zeichen ist immer unvollständig – man
 * denkt an `'` und `]` und übersieht `--`, den Unicode-Bindestrich oder eine
 * Zeichenfolge, die der Server anders normalisiert als JavaScript. Eine Liste
 * erlaubter Zeichen ist vollständig, weil sie nichts durchlässt, woran man
 * nicht gedacht hat.
 *
 * Deshalb wird hier auch nichts stillschweigend bereinigt. Ein Name, der nicht
 * passt, führt zu einem Fehler – ein Name, der beim Bereinigen mit einem
 * anderen zusammenfällt, wäre schlimmer als gar keiner.
 */

/** Buchstaben ohne Umlaute, Ziffern und Unterstrich; muss mit einem Buchstaben beginnen. */
const ERLAUBT = /^[A-Za-z][A-Za-z0-9_]{0,62}$/;

export class UngueltigerBezeichnerFehler extends Error {
  constructor(wert: string) {
    // Der Wert steht bewusst nicht in der Meldung: Er stammt möglicherweise
    // aus einer Eingabe, und eine Fehlermeldung ist kein Ort, an dem fremder
    // Text unbesehen wiedergegeben wird.
    super(`Unzulässiger Bezeichner (${wert.length} Zeichen).`);
    this.name = 'UngueltigerBezeichnerFehler';
  }
}

/**
 * Prüft einen Bezeichner und gibt ihn in eckigen Klammern zurück.
 *
 * Die Klammern sind die zweite Sicherung, nicht die erste. Sie allein würden
 * nicht genügen: Ein `]` im Namen beendet die Klammer vorzeitig. Da bereits
 * die Prüfung keine Klammern zulässt, kann das hier nicht mehr vorkommen –
 * die Verdopplung steht trotzdem da, weil eine gelockerte Prüfung sonst
 * unbemerkt eine Lücke aufreißen würde.
 */
export function alsBezeichner(wert: string): string {
  if (!ERLAUBT.test(wert)) throw new UngueltigerBezeichnerFehler(wert);
  return `[${wert.replaceAll(']', ']]')}]`;
}

/**
 * Bildet den Datenbanknamen einer Sandbox.
 *
 * Er enthält keine E-Mail-Adresse und keinen Namen. Datenbanknamen tauchen in
 * Serverprotokollen, Sicherungsdateien und Fehlermeldungen auf; ein
 * personenbezogenes Merkmal darin wäre eine Weitergabe an all diese Stellen.
 * Die Kontonummer genügt, um zuzuordnen, und sagt für sich genommen nichts.
 */
export function sandboxDatenbankName(kontoId: string, schemaSlug: string): string {
  const kern = `${kontoId}_${schemaSlug}`.replaceAll('-', '_');
  const name = `sbx_${kern}`;

  // Nicht kürzen, sondern melden. Ein abgeschnittener Name könnte mit dem
  // Namen einer anderen Sandbox zusammenfallen - und damit auf deren Daten
  // zeigen.
  if (!ERLAUBT.test(name)) throw new UngueltigerBezeichnerFehler(name);
  return name;
}

/**
 * Bildet den Anmeldenamen, unter dem das SQL dieser Lernenden läuft.
 *
 * Ein **anderer** als der Verwaltungsname. Das ist der Kern des
 * Berechtigungsmodells aus docs/SQL-RUNNER.md, Abschnitt 4: Wer Datenbanken
 * anlegen darf, darf nicht derjenige sein, der fremdes SQL ausführt. Liefe
 * beides unter einem Namen, wäre jede Lücke in der Anweisungsprüfung sofort
 * ein Zugriff auf alle anderen Sandboxes – und die Anweisungsprüfung ist
 * ausdrücklich nicht als Sicherheitsgrenze gedacht.
 *
 * Der Name leitet sich aus dem Datenbanknamen ab und enthält damit ebenfalls
 * kein personenbezogenes Merkmal.
 */
export function sandboxAnmeldename(sandboxDatenbank: string): string {
  const name = `lrn_${sandboxDatenbank}`;

  // Wie beim Datenbanknamen: melden statt kürzen. Ein abgeschnittener
  // Anmeldename könnte mit dem einer anderen Sandbox zusammenfallen.
  if (!ERLAUBT.test(name)) throw new UngueltigerBezeichnerFehler(name);
  return name;
}
