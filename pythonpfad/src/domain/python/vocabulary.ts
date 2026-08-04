/**
 * Anfängertaugliches Python-Vokabular auf Deutsch.
 *
 * Die Vervollständigung im Editor greift hierauf zurück. Ausdrücklich nicht
 * enthalten ist alles, was im Kurs nicht vorkommt: Wer beim Tippen von `f`
 * eine Liste mit `filter`, `frozenset`, `format` und `float` bekommt, lernt
 * daraus nichts, sondern wird abgelenkt. Angeboten wird deshalb nur, was in
 * den vier Modulen tatsächlich gebraucht wird.
 *
 * Jeder Eintrag erklärt auf Deutsch, was der Baustein tut – in der Sprache
 * der Lektionen und ohne Fachbegriffe, die dort noch nicht eingeführt sind.
 * Der englische Name bleibt selbstverständlich stehen: Er ist es, der später
 * in jeder Dokumentation und jeder Fehlermeldung auftaucht.
 */

export type VocabularyKind = 'keyword' | 'function' | 'method' | 'constant';

export interface VocabularyEntry {
  /** So heißt es im Code. */
  name: string;
  kind: VocabularyKind;
  /** Ein Satz, was es tut. */
  description: string;
  /** Kurzes Beispiel, wie es benutzt wird. */
  example: string;
  /**
   * Ab welchem Modul es im Kurs vorkommt (0-basiert, wie die Modulordnung).
   * Wird für die Reihenfolge der Vorschläge benutzt: Was früher eingeführt
   * wurde, steht weiter oben.
   */
  introducedIn: number;
}

export const PYTHON_VOCABULARY: readonly VocabularyEntry[] = [
  // --- Modul 1: erste Schritte ---------------------------------------------
  {
    name: 'print',
    kind: 'function',
    description: 'Schreibt etwas in die Ausgabe, damit du es sehen kannst.',
    example: 'print("Hallo")',
    introducedIn: 1,
  },
  {
    name: 'input',
    kind: 'function',
    description: 'Fragt nach einer Eingabe. Das Ergebnis ist immer ein Text.',
    example: 'name = input("Wie heißt du? ")',
    introducedIn: 1,
  },
  {
    name: 'int',
    kind: 'function',
    description: 'Macht aus einem Text eine ganze Zahl, mit der du rechnen kannst.',
    example: 'alter = int("30")',
    introducedIn: 1,
  },
  {
    name: 'float',
    kind: 'function',
    description: 'Macht aus einem Text eine Kommazahl.',
    example: 'preis = float("2.50")',
    introducedIn: 1,
  },
  {
    name: 'str',
    kind: 'function',
    description: 'Macht aus einer Zahl einen Text.',
    example: 'text = str(42)',
    introducedIn: 1,
  },
  {
    name: 'len',
    kind: 'function',
    description: 'Sagt, wie viele Zeichen ein Text oder wie viele Einträge eine Liste hat.',
    example: 'anzahl = len("Hallo")',
    introducedIn: 1,
  },
  {
    name: 'round',
    kind: 'function',
    description: 'Rundet eine Kommazahl auf so viele Nachkommastellen, wie du angibst.',
    example: 'round(2.567, 2)',
    introducedIn: 1,
  },
  {
    name: 'type',
    kind: 'function',
    description: 'Verrät, um welche Art von Wert es sich handelt.',
    example: 'print(type(42))',
    introducedIn: 1,
  },

  // --- Modul 2: Entscheidungen ---------------------------------------------
  {
    name: 'if',
    kind: 'keyword',
    description: 'Führt die eingerückten Zeilen nur aus, wenn die Bedingung zutrifft.',
    example: 'if alter >= 18:',
    introducedIn: 2,
  },
  {
    name: 'elif',
    kind: 'keyword',
    description: 'Prüft eine weitere Bedingung, falls die vorherige nicht zutraf.',
    example: 'elif alter >= 12:',
    introducedIn: 2,
  },
  {
    name: 'else',
    kind: 'keyword',
    description: 'Gilt, wenn keine der Bedingungen davor zugetroffen hat.',
    example: 'else:',
    introducedIn: 2,
  },
  {
    name: 'and',
    kind: 'keyword',
    description: 'Wahr, wenn beide Bedingungen zutreffen.',
    example: 'if alter >= 18 and hat_ausweis:',
    introducedIn: 2,
  },
  {
    name: 'or',
    kind: 'keyword',
    description: 'Wahr, wenn mindestens eine der Bedingungen zutrifft.',
    example: 'if regen or schnee:',
    introducedIn: 2,
  },
  {
    name: 'not',
    kind: 'keyword',
    description: 'Kehrt eine Bedingung um.',
    example: 'if not fertig:',
    introducedIn: 2,
  },
  {
    name: 'True',
    kind: 'constant',
    description: 'Der Wahrheitswert „wahr".',
    example: 'fertig = True',
    introducedIn: 2,
  },
  {
    name: 'False',
    kind: 'constant',
    description: 'Der Wahrheitswert „falsch".',
    example: 'fertig = False',
    introducedIn: 2,
  },
  {
    name: 'None',
    kind: 'constant',
    description: 'Steht für „noch kein Wert".',
    example: 'ergebnis = None',
    introducedIn: 2,
  },
  {
    name: 'in',
    kind: 'keyword',
    description: 'Prüft, ob etwas in einem Text oder einer Liste vorkommt.',
    example: 'if "a" in wort:',
    introducedIn: 2,
  },

  // --- Modul 3: Schleifen ---------------------------------------------------
  {
    name: 'for',
    kind: 'keyword',
    description: 'Wiederholt die eingerückten Zeilen für jeden Eintrag.',
    example: 'for zahl in zahlen:',
    introducedIn: 3,
  },
  {
    name: 'while',
    kind: 'keyword',
    description: 'Wiederholt die eingerückten Zeilen, solange die Bedingung zutrifft.',
    example: 'while versuche < 3:',
    introducedIn: 3,
  },
  {
    name: 'range',
    kind: 'function',
    description: 'Erzeugt eine Folge von Zahlen, etwa für eine feste Anzahl Durchläufe.',
    example: 'for i in range(5):',
    introducedIn: 3,
  },
  {
    name: 'break',
    kind: 'keyword',
    description: 'Beendet die Schleife sofort.',
    example: 'break',
    introducedIn: 3,
  },
  {
    name: 'continue',
    kind: 'keyword',
    description: 'Springt zum nächsten Durchlauf der Schleife.',
    example: 'continue',
    introducedIn: 3,
  },
  {
    name: 'sum',
    kind: 'function',
    description: 'Addiert alle Zahlen einer Liste.',
    example: 'gesamt = sum(zahlen)',
    introducedIn: 3,
  },
  {
    name: 'min',
    kind: 'function',
    description: 'Gibt den kleinsten Wert zurück.',
    example: 'kleinste = min(zahlen)',
    introducedIn: 3,
  },
  {
    name: 'max',
    kind: 'function',
    description: 'Gibt den größten Wert zurück.',
    example: 'groesste = max(zahlen)',
    introducedIn: 3,
  },
  {
    name: 'sorted',
    kind: 'function',
    description: 'Gibt eine sortierte Kopie zurück; das Original bleibt unverändert.',
    example: 'geordnet = sorted(zahlen)',
    introducedIn: 3,
  },
  {
    name: 'def',
    kind: 'keyword',
    description: 'Gibt einem Stück Code einen Namen, damit du es mehrfach benutzen kannst.',
    example: 'def begruesse(name):',
    introducedIn: 3,
  },
  {
    name: 'return',
    kind: 'keyword',
    description: 'Gibt ein Ergebnis aus einer Funktion zurück.',
    example: 'return summe',
    introducedIn: 3,
  },

  // --- Methoden, die im Kurs vorkommen --------------------------------------
  {
    name: 'append',
    kind: 'method',
    description: 'Hängt einen Eintrag hinten an eine Liste an.',
    example: 'zahlen.append(7)',
    introducedIn: 3,
  },
  {
    name: 'strip',
    kind: 'method',
    description: 'Entfernt Leerzeichen am Anfang und am Ende eines Textes.',
    example: 'eingabe.strip()',
    introducedIn: 1,
  },
  {
    name: 'lower',
    kind: 'method',
    description: 'Macht einen Text komplett klein – nützlich beim Vergleichen.',
    example: 'antwort.lower()',
    introducedIn: 1,
  },
  {
    name: 'upper',
    kind: 'method',
    description: 'Macht einen Text komplett groß.',
    example: 'name.upper()',
    introducedIn: 1,
  },
  {
    name: 'split',
    kind: 'method',
    description: 'Zerlegt einen Text an einer Stelle in eine Liste.',
    example: 'satz.split(" ")',
    introducedIn: 3,
  },
  {
    name: 'replace',
    kind: 'method',
    description: 'Ersetzt jedes Vorkommen eines Textstücks durch ein anderes.',
    example: 'text.replace("alt", "neu")',
    introducedIn: 1,
  },
];

/** Deutsche Bezeichnung der Art, für die Anzeige neben dem Vorschlag. */
export const KIND_LABELS: Readonly<Record<VocabularyKind, string>> = {
  keyword: 'Schlüsselwort',
  function: 'Funktion',
  method: 'Methode',
  constant: 'fester Wert',
};

/**
 * Passende Einträge zu einem angefangenen Wort.
 *
 * Es wird ausschließlich am Wortanfang gesucht, nicht unscharf: Beim Tippen
 * von Code ist eine Vorschlagsliste, die auch entfernt Ähnliches enthält,
 * mehr Störung als Hilfe. Wer `pr` tippt, will `print` sehen und sonst nichts.
 */
export function matchVocabulary(prefix: string): VocabularyEntry[] {
  const needle = prefix.toLowerCase();
  if (needle.length === 0) return [];

  return PYTHON_VOCABULARY.filter((entry) => entry.name.toLowerCase().startsWith(needle)).sort(
    (a, b) => {
      // Früher Eingeführtes zuerst, dann alphabetisch. So steht bei „i" das
      // vertraute `if` vor `input` und `int` … die Reihenfolge folgt dem Kurs,
      // nicht dem Zufall.
      if (a.introducedIn !== b.introducedIn) return a.introducedIn - b.introducedIn;
      if (a.name.length !== b.name.length) return a.name.length - b.name.length;
      return a.name.localeCompare(b.name, 'de');
    },
  );
}

/** Nachschlagen eines einzelnen Namens, etwa für eine Erklärung im Fließtext. */
export function lookupVocabulary(name: string): VocabularyEntry | null {
  return PYTHON_VOCABULARY.find((entry) => entry.name === name) ?? null;
}
