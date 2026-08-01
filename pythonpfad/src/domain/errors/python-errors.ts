/**
 * Übersetzt und erklärt Python-Fehlermeldungen auf Deutsch.
 *
 * Grundsatz aus dem Lernmodell: Ein Fehler ist Lernmaterial. Deshalb liefert
 * jede Erklärung vier Teile – Bedeutung, wahrscheinliche Ursache, eine konkrete
 * Suchstrategie und eine Selbstprüfungsfrage –, aber niemals die fertige
 * Lösung.
 *
 * Die Funktion arbeitet rein textbasiert und ohne Netzwerkzugriff. Sie ist
 * damit auch der Unterbau des regelbasierten Tutors.
 */

export type ErrorCategoryName =
  | 'NONE'
  | 'SYNTAX'
  | 'INDENTATION'
  | 'NAME'
  | 'TYPE'
  | 'INDEX'
  | 'KEY'
  | 'VALUE'
  | 'ATTRIBUTE'
  | 'ZERO_DIVISION'
  | 'RUNTIME_OTHER'
  | 'LOGIC'
  | 'TIMEOUT'
  | 'EMPTY_SUBMISSION'
  | 'CONCEPT';

export interface PythonErrorInfo {
  /** Klasse für Statistik und Kompetenzgewichtung. */
  category: ErrorCategoryName;
  /** Originaler Python-Name, z. B. "NameError". */
  pythonType: string;
  /** Was die Meldung in verständlichem Deutsch bedeutet. */
  meaning: string;
  /** Häufigste Ursachen – als Möglichkeiten, nicht als Diagnose. */
  likelyCauses: string[];
  /** Konkrete Suchstrategie: Was soll die lernende Person als Nächstes tun? */
  searchStrategy: string[];
  /** Frage zur Selbstprüfung. */
  selfCheck: string;
  /** Zeilennummer, falls aus der Meldung ableitbar. */
  line: number | null;
}

interface ErrorTemplate {
  category: ErrorCategoryName;
  meaning: string;
  likelyCauses: string[];
  searchStrategy: string[];
  selfCheck: string;
}

const TEMPLATES: Record<string, ErrorTemplate> = {
  SyntaxError: {
    category: 'SYNTAX',
    meaning:
      'Python konnte den Text gar nicht erst als Programm lesen. Die Regeln der Schreibweise sind an einer Stelle verletzt – ausgeführt wurde noch nichts.',
    likelyCauses: [
      'Ein Doppelpunkt fehlt am Ende einer Zeile mit if, for, while oder def.',
      'Eine Klammer oder ein Anführungszeichen wurde geöffnet, aber nicht geschlossen.',
      'Es steht ein einfaches = (Zuweisung) dort, wo == (Vergleich) gemeint war.',
    ],
    searchStrategy: [
      'Schaue auf die genannte Zeile – und dann auf die Zeile DARÜBER. Fehlende Klammern fallen Python oft erst eine Zeile später auf.',
      'Zähle öffnende und schließende Klammern in der betroffenen Zeile ab.',
      'Prüfe, ob jede Zeile, die einen Block eröffnet, mit einem Doppelpunkt endet.',
    ],
    selfCheck: 'Welches Zeichen erwartet Python an dieser Stelle, und steht es dort wirklich?',
  },
  IndentationError: {
    category: 'INDENTATION',
    meaning:
      'Die Einrückung passt nicht. In Python bestimmt der Abstand vom linken Rand, was zu einem Block gehört – er ist Teil der Bedeutung, nicht nur Optik.',
    likelyCauses: [
      'Nach einem Doppelpunkt fehlt die eingerückte Zeile.',
      'Innerhalb eines Blocks sind Zeilen unterschiedlich weit eingerückt.',
      'Leerzeichen und Tabulatoren sind gemischt.',
    ],
    searchStrategy: [
      'Markiere den Block: Alle Zeilen, die zusammengehören, müssen exakt gleich weit eingerückt sein.',
      'Verwende durchgehend vier Leerzeichen pro Ebene.',
      'Prüfe die Zeile direkt nach jedem Doppelpunkt.',
    ],
    selfCheck:
      'Welche Zeilen sollen zu diesem Block gehören – und sieht man das an der Einrückung?',
  },
  TabError: {
    category: 'INDENTATION',
    meaning:
      'In der Einrückung sind Tabulatoren und Leerzeichen gemischt. Python kann dann nicht eindeutig entscheiden, wie tief eine Zeile eingerückt ist.',
    likelyCauses: ['Kopierter Code aus einer anderen Quelle bringt Tabulatoren mit.'],
    searchStrategy: [
      'Ersetze alle Tabulatoren durch vier Leerzeichen.',
      'Rücke die betroffenen Zeilen neu ein, statt nur Zeichen zu löschen.',
    ],
    selfCheck: 'Sind alle Einrückungen im Programm mit demselben Zeichen erzeugt?',
  },
  NameError: {
    category: 'NAME',
    meaning:
      'Python kennt einen verwendeten Namen nicht. Es gibt an dieser Stelle keine Variable und keine Funktion mit diesem Namen.',
    likelyCauses: [
      'Der Name ist an einer Stelle anders geschrieben als an der anderen (Tippfehler oder Groß-/Kleinschreibung).',
      'Die Variable wird benutzt, bevor sie zugewiesen wurde.',
      'Die Variable existiert nur innerhalb einer Funktion und wird außerhalb verwendet.',
      'Text wurde ohne Anführungszeichen geschrieben und deshalb als Name gelesen.',
    ],
    searchStrategy: [
      'Suche im Programm nach dem genannten Namen. Kommt er genau so noch ein zweites Mal vor?',
      'Prüfe, ob die Zuweisung wirklich VOR der Verwendung steht.',
      'Achte auf Groß- und Kleinschreibung: alter und Alter sind zwei verschiedene Namen.',
    ],
    selfCheck: 'An welcher Stelle im Programm bekommt dieser Name zum ersten Mal einen Wert?',
  },
  TypeError: {
    category: 'TYPE',
    meaning:
      'Eine Operation passt nicht zum Datentyp. Python weigert sich zum Beispiel, Text und Zahl direkt zu addieren, weil "3" und 3 unterschiedliche Dinge sind.',
    likelyCauses: [
      'input() liefert immer Text. Ohne int() oder float() bleibt eine Eingabe eine Zeichenkette.',
      'Eine Funktion wird mit zu vielen oder zu wenigen Argumenten aufgerufen.',
      'Ein Wert ist None, weil eine Funktion nichts zurückgibt (kein return).',
    ],
    searchStrategy: [
      'Gib den fraglichen Wert testweise mit print(type(wert)) aus. Welcher Typ kommt tatsächlich an?',
      'Verfolge rückwärts, woher der Wert stammt.',
      'Prüfe bei Funktionsaufrufen, ob Anzahl und Reihenfolge der Argumente zur Definition passen.',
    ],
    selfCheck: 'Welchen Typ hat jeder beteiligte Wert unmittelbar vor der Operation?',
  },
  IndexError: {
    category: 'INDEX',
    meaning:
      'Es wurde auf eine Position zugegriffen, die es in der Liste oder Zeichenkette nicht gibt.',
    likelyCauses: [
      'Positionen beginnen bei 0. Eine Liste mit 3 Elementen hat die gültigen Positionen 0, 1 und 2.',
      'Eine Schleife läuft eine Position zu weit.',
      'Die Liste ist leer, obwohl sie befüllt sein sollte.',
    ],
    searchStrategy: [
      'Gib vor dem Zugriff len(liste) aus. Wie viele Elemente sind wirklich enthalten?',
      'Prüfe die Grenzen deiner Schleife: range(len(liste)) endet korrekt bei len-1.',
      'Frage dich, ob die Liste an dieser Stelle überhaupt schon gefüllt ist.',
    ],
    selfCheck: 'Welche Positionen sind bei dieser Länge gültig, und welche wird angefragt?',
  },
  KeyError: {
    category: 'KEY',
    meaning: 'Der angefragte Schlüssel kommt in diesem Dictionary nicht vor.',
    likelyCauses: [
      'Der Schlüssel ist anders geschrieben als beim Anlegen.',
      'Der Schlüssel wurde nie hinzugefügt.',
      'Der Schlüssel ist eine Zahl, im Dictionary steht aber Text (oder umgekehrt).',
    ],
    searchStrategy: [
      'Gib das gesamte Dictionary mit print(daten) aus und vergleiche die Schreibweise.',
      'Prüfe mit "schluessel in daten", bevor du zugreifst.',
      'Nutze daten.get(schluessel) mit Standardwert, wenn ein Fehlen erlaubt sein soll.',
    ],
    selfCheck: 'Welche Schlüssel enthält das Dictionary an dieser Stelle tatsächlich?',
  },
  ValueError: {
    category: 'VALUE',
    meaning:
      'Der Typ passt, aber der konkrete Wert ist unzulässig. Häufig scheitert eine Umwandlung.',
    likelyCauses: [
      'int("zwölf") oder int("") funktioniert nicht – die Zeichenkette muss eine Zahl darstellen.',
      'int("3.5") schlägt fehl, weil das eine Kommazahl ist. Hier hilft float().',
      'Eine Eingabe war leer, weil die Nutzerin oder der Nutzer nur die Eingabetaste gedrückt hat.',
    ],
    searchStrategy: [
      'Gib den Wert unmittelbar vor der Umwandlung aus – auch die Anführungszeichen mit repr(wert).',
      'Prüfe, ob unerwarteter Leerraum enthalten ist; .strip() entfernt ihn.',
      'Überlege, was passieren soll, wenn keine gültige Zahl eingegeben wird.',
    ],
    selfCheck:
      'Welcher genaue Text kommt hier an, und lässt er sich sinnvoll in eine Zahl umwandeln?',
  },
  AttributeError: {
    category: 'ATTRIBUTE',
    meaning:
      'Das Objekt hat die angesprochene Eigenschaft oder Methode nicht. Häufig ist der Wert nicht der erwartete Typ.',
    likelyCauses: [
      'Der Wert ist None, weil eine Funktion ohne return aufgerufen wurde.',
      'Eine Listenmethode wird auf einer Zeichenkette aufgerufen (oder umgekehrt).',
      'Der Methodenname ist falsch geschrieben.',
    ],
    searchStrategy: [
      'Gib print(type(objekt)) direkt vor der Zeile aus.',
      'Prüfe, ob die Funktion, aus der der Wert stammt, wirklich etwas zurückgibt.',
      'Schlage in der offiziellen Dokumentation nach, welche Methoden dieser Typ anbietet.',
    ],
    selfCheck: 'Welchen Typ hat das Objekt hier wirklich – und passt die Methode zu diesem Typ?',
  },
  ZeroDivisionError: {
    category: 'ZERO_DIVISION',
    meaning: 'Es wurde durch null geteilt. Das ist mathematisch nicht definiert.',
    likelyCauses: [
      'Ein Durchschnitt wird über eine leere Liste gebildet: len(liste) ist dann 0.',
      'Ein Zähler wurde nicht erhöht.',
    ],
    searchStrategy: [
      'Gib den Nenner unmittelbar vor der Division aus.',
      'Behandle den Fall "keine Daten vorhanden" ausdrücklich mit einer Bedingung.',
    ],
    selfCheck: 'Kann der Nenner in irgendeinem Durchlauf 0 werden?',
  },
  ModuleNotFoundError: {
    category: 'RUNTIME_OTHER',
    meaning: 'Das importierte Modul ist in dieser Umgebung nicht verfügbar.',
    likelyCauses: [
      'Der Modulname ist falsch geschrieben.',
      'Das Paket gehört nicht zur Standardbibliothek und ist im Browser nicht installiert.',
    ],
    searchStrategy: [
      'Prüfe die Schreibweise des Modulnamens.',
      'Im Lernbereich stehen die Standardbibliothek und einige vorbereitete Pakete zur Verfügung. Andere Pakete lassen sich hier nicht nachinstallieren.',
    ],
    selfCheck: 'Brauchst du dieses Modul wirklich, oder geht es auch mit Bordmitteln?',
  },
  RecursionError: {
    category: 'RUNTIME_OTHER',
    meaning: 'Eine Funktion hat sich so oft selbst aufgerufen, dass Python abgebrochen hat.',
    likelyCauses: ['Es fehlt eine Abbruchbedingung, oder sie wird nie erreicht.'],
    searchStrategy: [
      'Suche die Bedingung, bei der die Funktion OHNE erneuten Selbstaufruf zurückkehrt.',
      'Prüfe, ob sich das Argument bei jedem Aufruf tatsächlich in Richtung dieser Bedingung verändert.',
    ],
    selfCheck: 'Bei welchem Eingabewert hört die Funktion garantiert auf?',
  },
  _EingabeErschoepft: {
    category: 'RUNTIME_OTHER',
    meaning:
      'Das Programm hat mehr Eingaben angefordert, als vorbereitet waren. Im Browser gibt es kein echtes Terminal – die Antworten für input() werden vorher im Feld "Eingaben" eingetragen.',
    likelyCauses: [
      'Es sind weniger Zeilen im Eingabefeld hinterlegt, als das Programm mit input() abfragt.',
      'Eine Schleife fragt öfter nach einer Eingabe als gedacht.',
    ],
    searchStrategy: [
      'Zähle die input()-Aufrufe in deinem Programm und trage ebenso viele Zeilen im Feld "Eingaben" ein.',
      'Läuft der Aufruf in einer Schleife, prüfe, wie oft diese durchlaufen wird.',
    ],
    selfCheck:
      'Wie oft fragt dein Programm nach einer Eingabe – und wie viele hast du vorbereitet?',
  },
  UnboundLocalError: {
    category: 'NAME',
    meaning:
      'Innerhalb einer Funktion wird ein Name gelesen, bevor er dort zugewiesen wurde. Python behandelt ihn als lokale Variable, weil er in der Funktion irgendwo zugewiesen wird.',
    likelyCauses: [
      'Eine Variable von außen soll verändert werden – dafür muss sie als Parameter übergeben und zurückgegeben werden.',
      'Ein Zähler wird erhöht, aber nie mit einem Startwert versehen.',
    ],
    searchStrategy: [
      'Suche in der Funktion nach der ersten Zuweisung dieses Namens.',
      'Gib der Variablen vor der Schleife einen Startwert.',
    ],
    selfCheck: 'Welchen Wert soll dieser Name beim allerersten Zugriff haben?',
  },
};

const FALLBACK: ErrorTemplate = {
  category: 'RUNTIME_OTHER',
  meaning:
    'Das Programm wurde gestartet, ist aber unterwegs abgebrochen. Der Fehlertyp steht am Anfang der letzten Zeile der Meldung.',
  likelyCauses: [
    'Ein Wert hat nicht die Form, die der Code an dieser Stelle erwartet.',
    'Eine Voraussetzung ist nicht erfüllt (leere Liste, fehlender Eintrag, ungültige Eingabe).',
  ],
  searchStrategy: [
    'Lies die Meldung von unten nach oben: Die letzte Zeile nennt den Fehlertyp, die Zeile darüber die Stelle im Code.',
    'Gib die beteiligten Werte unmittelbar davor mit print() aus.',
    'Verkleinere das Problem: Führe nur den fraglichen Teil mit einem einfachen Beispielwert aus.',
  ],
  selfCheck: 'Welche Annahme über die Daten trifft der Code hier – und stimmt sie?',
};

/** Der Timeout wird vom Runner erzeugt, nicht von Python. */
export const TIMEOUT_ERROR: PythonErrorInfo = {
  category: 'TIMEOUT',
  pythonType: 'Zeitüberschreitung',
  meaning:
    'Das Programm lief länger als erlaubt und wurde angehalten. Sehr häufig ist das eine Schleife, die nicht endet.',
  likelyCauses: [
    'Die Bedingung einer while-Schleife wird nie falsch.',
    'Die Variable, die die Schleife beenden soll, wird im Rumpf nicht verändert.',
    'Ein input() wartet auf eine Eingabe, die es in diesem Testlauf nicht gibt.',
  ],
  searchStrategy: [
    'Suche die Variable, die in der while-Bedingung steht. Wird sie im Schleifenrumpf verändert?',
    'Gib diese Variable am Anfang jedes Durchlaufs aus und beobachte, ob sie sich der Abbruchbedingung nähert.',
    'Baue notfalls einen Zähler ein, der die Schleife nach 100 Durchläufen mit break beendet – nur zur Fehlersuche.',
  ],
  selfCheck: 'Welcher Wert muss sich verändern, damit diese Schleife jemals endet?',
  line: null,
};

/**
 * Zerlegt einen Python-Traceback und liefert eine deutsche Erklärung.
 *
 * @param traceback Vollständige Fehlerausgabe von Python (stderr).
 */
export function explainPythonError(traceback: string): PythonErrorInfo {
  const trimmed = traceback.trim();
  if (trimmed.length === 0) {
    return { ...FALLBACK, pythonType: 'Unbekannt', line: null };
  }

  const lines = trimmed.split('\n');
  // Die letzte nicht leere Zeile enthält "FehlerTyp: Meldung".
  const lastLine = [...lines].reverse().find((l) => l.trim().length > 0) ?? '';
  const typeMatch =
    /^\s*([A-Za-z_][A-Za-z0-9_.]*Error|[A-Za-z_][A-Za-z0-9_.]*Exception|SystemExit|KeyboardInterrupt)\b/.exec(
      lastLine,
    );
  const pythonType = typeMatch?.[1] ?? 'Fehler';

  const template = TEMPLATES[pythonType] ?? FALLBACK;

  return {
    ...template,
    pythonType,
    line: extractLineNumber(trimmed),
  };
}

/** Findet die letzte Zeilennummer, die sich auf den Code der lernenden Person bezieht. */
export function extractLineNumber(traceback: string): number | null {
  // Pyodide meldet den Nutzercode als "<exec>" oder "<string>".
  const matches = [
    ...traceback.matchAll(/File "(?:<exec>|<string>|<stdin>|main\.py)", line (\d+)/g),
  ];
  const last = matches.at(-1);
  if (last?.[1]) return Number.parseInt(last[1], 10);

  const syntaxMatch = /line (\d+)/.exec(traceback);
  return syntaxMatch?.[1] ? Number.parseInt(syntaxMatch[1], 10) : null;
}

/** Kurze, stabile Signatur für Fehlerstatistiken – ohne Nutzerdaten. */
export function errorSignature(traceback: string): string {
  const info = explainPythonError(traceback);
  return info.pythonType;
}
