/**
 * SQL-Server-Fehlermeldungen in etwas übersetzen, aus dem man lernt.
 *
 * Eine rohe Meldung wie
 *
 *     Msg 207, Level 16, State 1, Line 3
 *     Invalid column name 'Stadtt'.
 *
 * ist für eine Anfängerin dreifach unbrauchbar: Sie ist englisch, sie nennt
 * Zahlen ohne Bedeutung, und sie sagt nicht, was zu tun ist.
 *
 * Deshalb bekommt jede Meldung vier Teile. Die Reihenfolge ist Absicht:
 *
 *  1. **Was SQL Server meldet** – die Originalmeldung bleibt sichtbar. Wer
 *     später beruflich mit SQL arbeitet, wird genau diese Texte lesen müssen;
 *     sie wegzusperren wäre kurzfristig freundlich und langfristig schädlich.
 *  2. **Was das bedeutet** – ein deutscher Satz.
 *  3. **Woran es liegen kann** – ausdrücklich als Möglichkeiten. Der Server
 *     weiß nicht, was gemeint war, und die Anwendung weiß es auch nicht.
 *     Eine als sicher formulierte Falschdiagnose kostet mehr Zeit als keine.
 *  4. **Wo du suchen solltest** – eine Handlung, kein Urteil.
 *
 * Dazu eine Kontrollfrage, die das Denken zurück zur Sache lenkt.
 *
 * ---
 *
 * **Zu den Fehlernummern:** Die hier hinterlegten Nummern sind die gängigen und
 * seit vielen Versionen stabilen. Sie gehören trotzdem vor jeder
 * Veröffentlichung gegen die offizielle Microsoft-Dokumentation geprüft – eine
 * falsch zugeordnete Nummer erzeugt eine Erklärung, die überzeugend klingt und
 * in die Irre führt. Genau deshalb fällt eine unbekannte Nummer nicht auf eine
 * geratene Erklärung zurück, sondern auf einen ehrlichen Hinweis.
 */

export type Fehlerkategorie =
  | 'SYNTAX'
  | 'OBJEKT'
  | 'SPALTE'
  | 'ALIAS'
  | 'DATENTYP'
  | 'KONVERTIERUNG'
  | 'NULL'
  | 'CONSTRAINT'
  | 'SCHLUESSEL'
  | 'AGGREGATION'
  | 'UNTERABFRAGE'
  | 'TRANSAKTION'
  | 'BERECHTIGUNG'
  | 'ZEITLIMIT'
  | 'DEADLOCK'
  | 'POLICY'
  | 'UNBEKANNT';

export interface Fehlererklaerung {
  kategorie: Fehlerkategorie;
  /** Die Originalmeldung, unverändert. */
  original: string;
  /** Ein deutscher Satz, der sagt, was der Server meint. */
  bedeutung: string;
  /** Mögliche Ursachen – niemals als sichere Diagnose formuliert. */
  moeglicheUrsachen: string[];
  /** Eine konkrete Suchstrategie. */
  woSuchen: string;
  /** Eine Frage, die zum eigenen Denken zurückführt. */
  kontrollfrage: string;
}

interface Eintrag {
  kategorie: Fehlerkategorie;
  bedeutung: (bezeichner?: string) => string;
  moeglicheUrsachen: string[];
  woSuchen: string;
  kontrollfrage: string;
}

const EINTRAEGE: Readonly<Record<number, Eintrag>> = {
  102: {
    kategorie: 'SYNTAX',
    bedeutung: (b) =>
      b
        ? `SQL Server kommt bei „${b}" nicht weiter und versteht den Satzbau ab dieser Stelle nicht.`
        : 'SQL Server versteht den Satzbau der Abfrage an einer Stelle nicht.',
    moeglicheUrsachen: [
      'ein fehlendes oder überzähliges Komma in der Spaltenliste',
      'eine nicht geschlossene Klammer oder ein nicht geschlossener Apostroph',
      'ein Schlüsselwort in falscher Reihenfolge – etwa WHERE vor FROM',
      'ein Tippfehler in einem Schlüsselwort',
    ],
    woSuchen:
      'Sieh dir die genannte Stelle und die Zeile davor an. Satzbaufehler werden oft erst ' +
      'dort gemeldet, wo der Server aufgibt – verursacht wurden sie meist etwas früher.',
    kontrollfrage: 'Stehen die Teile deiner Abfrage in der Reihenfolge SELECT, FROM, WHERE?',
  },

  207: {
    kategorie: 'SPALTE',
    bedeutung: (b) =>
      b
        ? `Eine Spalte namens „${b}" gibt es in den verwendeten Tabellen nicht.`
        : 'Eine der angegebenen Spalten gibt es in den verwendeten Tabellen nicht.',
    moeglicheUrsachen: [
      'ein Tippfehler im Spaltennamen',
      'die Spalte gehört zu einer Tabelle, die gar nicht im FROM steht',
      'ein Alias wurde vergeben, aber der alte Name weiterverwendet',
      'die Spalte heißt im Schema anders als erwartet',
    ],
    woSuchen:
      'Öffne den Schema-Explorer und vergleiche den Namen Zeichen für Zeichen mit der ' +
      'Spaltenliste der Tabelle.',
    kontrollfrage: 'Welche Tabelle enthält die Information, die du suchst – und steht sie im FROM?',
  },

  208: {
    kategorie: 'OBJEKT',
    bedeutung: (b) =>
      b
        ? `Eine Tabelle oder Sicht namens „${b}" findet SQL Server nicht.`
        : 'Die angegebene Tabelle oder Sicht findet SQL Server nicht.',
    moeglicheUrsachen: [
      'ein Tippfehler im Tabellennamen',
      'die Mehrzahl fehlt oder ist zu viel – etwa Kunde statt Kunden',
      'die Tabelle gehört zu einem anderen Schema',
    ],
    woSuchen: 'Der Schema-Explorer listet alle vorhandenen Tabellen dieser Übung auf.',
    kontrollfrage: 'Steht der Name genau so in der Tabellenliste?',
  },

  4104: {
    kategorie: 'ALIAS',
    bedeutung: (b) =>
      b
        ? `Der mehrteilige Bezeichner „${b}" lässt sich keiner Tabelle zuordnen.`
        : 'Ein mehrteiliger Bezeichner lässt sich keiner Tabelle zuordnen.',
    moeglicheUrsachen: [
      'ein Tabellenalias wird benutzt, der im FROM nicht vergeben wurde',
      'nach der Vergabe eines Alias wird weiterhin der volle Tabellenname verwendet',
      'die Tabelle fehlt im FROM oder JOIN',
    ],
    woSuchen:
      'Prüfe, welche Aliase du im FROM und in den JOINs vergeben hast, und ob der Teil vor ' +
      'dem Punkt genau einem davon entspricht.',
    kontrollfrage: 'Wenn du eine Tabelle „AS k" genannt hast – heißt sie danach überall k?',
  },

  245: {
    kategorie: 'KONVERTIERUNG',
    bedeutung: () =>
      'SQL Server sollte einen Wert in einen anderen Datentyp umwandeln und konnte es nicht.',
    moeglicheUrsachen: [
      'eine Zeichenfolge wird mit einer Zahl verglichen',
      'in einer Spalte steht Text, der wie eine Zahl aussieht, es aber nicht überall ist',
      'ein Datum liegt als Text in einem unerwarteten Format vor',
    ],
    woSuchen:
      'Sieh im Schema-Explorer nach, welchen Datentyp die beteiligte Spalte hat, und ' +
      'vergleiche ihn mit dem Wert, den du danebenstellst.',
    kontrollfrage: 'Vergleichst du gerade Text mit einer Zahl?',
  },

  8134: {
    kategorie: 'DATENTYP',
    bedeutung: () => 'In einer Berechnung wurde durch null geteilt.',
    moeglicheUrsachen: [
      'ein Nenner ist für mindestens eine Zeile 0',
      'ein Nenner ist NULL und wurde vorher mit 0 ersetzt',
      'eine Summe im Nenner ergibt für eine Gruppe 0',
    ],
    woSuchen:
      'Lass dir zuerst den Nenner allein ausgeben und suche die Zeilen, in denen er 0 wird.',
    kontrollfrage: 'Kann der Nenner in deinen Daten null werden – und was soll dann herauskommen?',
  },

  515: {
    kategorie: 'NULL',
    bedeutung: (b) =>
      b
        ? `In die Spalte „${b}" darf kein NULL geschrieben werden, es wurde aber keiner angegeben.`
        : 'In eine Spalte, die keinen NULL zulässt, wurde kein Wert geschrieben.',
    moeglicheUrsachen: [
      'die Spalte fehlt in der Spaltenliste des INSERT',
      'ein Wert ist leer geblieben',
      'die Spalte hat keinen Standardwert',
    ],
    woSuchen:
      'Der Schema-Explorer zeigt, welche Spalten als NOT NULL gekennzeichnet sind. Sie ' +
      'brauchen bei jedem INSERT einen Wert.',
    kontrollfrage: 'Welche Angaben verlangt die Tabelle zwingend?',
  },

  547: {
    kategorie: 'CONSTRAINT',
    bedeutung: () =>
      'Eine Einschränkung der Tabelle wurde verletzt – meist eine Beziehung zu einer anderen ' +
      'Tabelle.',
    moeglicheUrsachen: [
      'ein Fremdschlüssel verweist auf eine Zeile, die es nicht gibt',
      'eine Zeile soll gelöscht werden, auf die andere Zeilen noch verweisen',
      'eine CHECK-Bedingung ist nicht erfüllt',
    ],
    woSuchen:
      'Sieh dir die Beziehungen der Tabelle an. Ein Fremdschlüssel verlangt, dass der Wert ' +
      'in der verbundenen Tabelle bereits vorhanden ist.',
    kontrollfrage: 'Gibt es die Zeile, auf die du verweist, in der anderen Tabelle wirklich schon?',
  },

  2627: {
    kategorie: 'SCHLUESSEL',
    bedeutung: () => 'Ein Wert soll doppelt eingetragen werden, wo er eindeutig sein muss.',
    moeglicheUrsachen: [
      'der Primärschlüsselwert ist bereits vergeben',
      'eine Spalte mit UNIQUE-Einschränkung enthält den Wert schon',
      'ein INSERT wurde versehentlich zweimal ausgeführt',
    ],
    woSuchen: 'Prüfe mit einem SELECT, ob der Wert bereits in der Tabelle steht.',
    kontrollfrage: 'Welche Spalte muss in dieser Tabelle eindeutig sein?',
  },

  8120: {
    kategorie: 'AGGREGATION',
    bedeutung: (b) =>
      b
        ? `Die Spalte „${b}" steht im SELECT, gehört aber weder zu einer Aggregatfunktion noch ` +
          'zum GROUP BY.'
        : 'Eine Spalte im SELECT gehört weder zu einer Aggregatfunktion noch zum GROUP BY.',
    moeglicheUrsachen: [
      'die Spalte fehlt im GROUP BY',
      'die Spalte sollte eigentlich zusammengefasst werden – etwa mit SUM oder MAX',
      'die Gruppierung ist feiner oder gröber gemeint als geschrieben',
    ],
    woSuchen:
      'Geh die Spalten im SELECT einzeln durch. Jede muss entweder im GROUP BY stehen oder ' +
      'in einer Aggregatfunktion.',
    kontrollfrage:
      'Wenn eine Gruppe mehrere Zeilen umfasst – welchen einen Wert soll diese Spalte dann zeigen?',
  },

  512: {
    kategorie: 'UNTERABFRAGE',
    bedeutung: () =>
      'Eine Unterabfrage liefert mehrere Zeilen, an dieser Stelle wird aber genau ein Wert ' +
      'erwartet.',
    moeglicheUrsachen: [
      'die Unterabfrage hat keine ausreichend eingrenzende WHERE-Bedingung',
      'statt = wäre IN oder EXISTS die passende Formulierung',
      'die Verknüpfung wäre als JOIN besser aufgehoben',
    ],
    woSuchen:
      'Führe die Unterabfrage einmal für sich aus und sieh nach, wie viele Zeilen sie liefert.',
    kontrollfrage: 'Soll hier ein einzelner Wert stehen oder eine Liste von Werten?',
  },

  229: {
    kategorie: 'BERECHTIGUNG',
    bedeutung: () => 'Der Übungszugang darf diese Aktion nicht ausführen.',
    moeglicheUrsachen: [
      'die Anweisung reicht über die Übungsdatenbank hinaus',
      'das angesprochene Objekt gehört nicht zu dieser Übung',
    ],
    woSuchen:
      'Die Übungsumgebung erlaubt bewusst nur Zugriff auf die Tabellen dieser Aufgabe. Das ' +
      'ist keine Fehlfunktion, sondern die Trennung, die andere Lernende schützt.',
    kontrollfrage: 'Arbeitest du mit den Tabellen, die im Schema-Explorer stehen?',
  },

  1205: {
    kategorie: 'DEADLOCK',
    bedeutung: () =>
      'Zwei Vorgänge haben sich gegenseitig blockiert; SQL Server hat einen davon abgebrochen.',
    moeglicheUrsachen: [
      'zwei Transaktionen greifen in unterschiedlicher Reihenfolge auf dieselben Zeilen zu',
      'eine Transaktion blieb zu lange offen',
    ],
    woSuchen:
      'Das ist kein Fehler in deiner Abfrage im üblichen Sinn. Führe sie erneut aus – und sieh ' +
      'dir an, in welcher Reihenfolge deine Transaktion auf Tabellen zugreift.',
    kontrollfrage: 'Greifen beide Vorgänge in derselben Reihenfolge auf die Tabellen zu?',
  },
};

/** Zieht den Bezeichner aus einer Meldung – die Namen stehen dort in Anführungszeichen. */
function bezeichnerAus(meldung: string): string | undefined {
  return /'([^']+)'/.exec(meldung)?.[1];
}

/** Liest die Nummer aus einer Meldung im Format `Msg 207, Level 16, …`. */
export function nummerAus(meldung: string): number | undefined {
  const treffer = /\bMsg\s+(\d+)/i.exec(meldung) ?? /^\s*(\d{3,5})\b/.exec(meldung);
  const zahl = treffer?.[1] ? Number.parseInt(treffer[1], 10) : Number.NaN;
  return Number.isFinite(zahl) ? zahl : undefined;
}

export interface ErklaerungsEingabe {
  /** Fehlernummer, falls der Treiber sie getrennt liefert. */
  nummer?: number;
  /** Originalmeldung. */
  meldung: string;
}

/**
 * Übersetzt eine Fehlermeldung.
 *
 * Für eine unbekannte Nummer wird ausdrücklich **nicht** geraten. Eine
 * erfundene Erklärung klingt überzeugend und schickt die Lernende in die
 * falsche Richtung – das ist schlechter als der ehrliche Hinweis, dass hier
 * nichts Näheres bekannt ist.
 */
export function erklaereSqlFehler(eingabe: ErklaerungsEingabe): Fehlererklaerung {
  const nummer = eingabe.nummer ?? nummerAus(eingabe.meldung);
  const eintrag = nummer === undefined ? undefined : EINTRAEGE[nummer];

  if (!eintrag) {
    return {
      kategorie: 'UNBEKANNT',
      original: eingabe.meldung,
      bedeutung:
        'Zu dieser Meldung liegt hier keine ausführliche Erklärung vor. Der Text darüber ist ' +
        'die Originalmeldung von SQL Server.',
      moeglicheUrsachen: [],
      woSuchen:
        'Lies die Originalmeldung von hinten nach vorn: Am Ende steht meist der Name des ' +
        'Objekts oder der Spalte, um die es geht.',
      kontrollfrage: 'Welcher Teil deiner Abfrage betrifft den in der Meldung genannten Namen?',
    };
  }

  return {
    kategorie: eintrag.kategorie,
    original: eingabe.meldung,
    bedeutung: eintrag.bedeutung(bezeichnerAus(eingabe.meldung)),
    moeglicheUrsachen: eintrag.moeglicheUrsachen,
    woSuchen: eintrag.woSuchen,
    kontrollfrage: eintrag.kontrollfrage,
  };
}

/** Alle hinterlegten Nummern – für den Test, der jede einmal übersetzt. */
export const BEKANNTE_NUMMERN = Object.keys(EINTRAEGE).map(Number);
