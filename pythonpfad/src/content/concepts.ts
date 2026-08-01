import type { ConceptDraft } from '@/domain/content/schema';

/**
 * Konzeptgraph.
 *
 * Ein Konzept ist die kleinste Einheit, für die Kompetenz gemessen wird. Der
 * Graph bestimmt, worauf sich Aufgaben auswirken und in welcher Reihenfolge
 * Inhalte sinnvoll aufeinander aufbauen.
 *
 * `difficulty` beschreibt die fachliche Einstiegshürde (1 = ohne Vorwissen
 * zugänglich, 5 = braucht mehrere gefestigte Vorläufer).
 */
export const concepts: ConceptDraft[] = [
  // --- Stufe 0: digitale Grundlagen ----------------------------------------
  {
    slug: 'programm',
    name: 'Programm',
    description:
      'Eine Folge von Anweisungen, die ein Computer der Reihe nach ausführt. Ein Programm entscheidet nichts von selbst – es tut genau das, was aufgeschrieben wurde.',
    difficulty: 1,
    prerequisiteSlugs: [],
  },
  {
    slug: 'quellcode',
    name: 'Quellcode',
    description:
      'Der lesbare Text, in dem ein Programm formuliert ist. Quellcode ist für Menschen geschrieben und wird erst durch ein weiteres Programm ausführbar.',
    difficulty: 1,
    prerequisiteSlugs: ['programm'],
  },
  {
    slug: 'interpreter',
    name: 'Interpreter',
    description:
      'Das Programm, das Python-Quellcode Zeile für Zeile liest und ausführt. Es meldet auch die Fehler, wenn eine Anweisung nicht verständlich oder nicht ausführbar ist.',
    difficulty: 2,
    prerequisiteSlugs: ['quellcode'],
  },
  {
    slug: 'eva-prinzip',
    name: 'Eingabe, Verarbeitung, Ausgabe',
    description:
      'Fast jedes Programm nimmt Daten entgegen, verarbeitet sie und gibt ein Ergebnis aus. Dieses Muster hilft dabei, eine Aufgabe zu zerlegen, bevor man Code schreibt.',
    difficulty: 1,
    prerequisiteSlugs: ['programm'],
  },
  {
    slug: 'code-tracing',
    name: 'Code nachvollziehen',
    description:
      'Ein Programm im Kopf oder auf Papier Zeile für Zeile durchgehen und dabei notieren, welchen Wert jede Variable gerade hat. Die wichtigste Einzeltechnik beim Programmieren lernen.',
    difficulty: 2,
    prerequisiteSlugs: ['programm'],
  },

  // --- Stufe 1: erste Python-Schritte ---------------------------------------
  {
    slug: 'print-ausgabe',
    name: 'Ausgabe mit print()',
    description:
      'Die Anweisung print() schreibt einen Wert in die Ausgabe. Sie ist zugleich das wichtigste Werkzeug bei der Fehlersuche, weil sie Zwischenstände sichtbar macht.',
    difficulty: 1,
    prerequisiteSlugs: ['quellcode'],
  },
  {
    slug: 'kommentar',
    name: 'Kommentar',
    description:
      'Text hinter einem #, den Python ignoriert. Kommentare erklären, warum etwas so gemacht wird – nicht, was ohnehin im Code steht.',
    difficulty: 1,
    prerequisiteSlugs: ['quellcode'],
  },
  {
    slug: 'variable',
    name: 'Variable',
    description:
      'Ein Name, unter dem ein Wert im Arbeitsspeicher abgelegt ist. Über den Namen lässt sich der Wert später wieder verwenden oder ersetzen.',
    difficulty: 1,
    prerequisiteSlugs: ['print-ausgabe'],
  },
  {
    slug: 'zuweisung',
    name: 'Zuweisung',
    description:
      'Mit = wird einem Namen ein Wert zugewiesen. Das Zeichen bedeutet in Python nicht "ist gleich", sondern "bekommt den Wert von".',
    difficulty: 1,
    prerequisiteSlugs: ['variable'],
  },
  {
    slug: 'datentyp',
    name: 'Datentyp',
    description:
      'Die Art eines Wertes: ganze Zahl, Kommazahl, Text oder Wahrheitswert. Der Typ entscheidet, welche Operationen erlaubt sind und was sie bewirken.',
    difficulty: 2,
    prerequisiteSlugs: ['variable'],
  },
  {
    slug: 'zahlen',
    name: 'Zahlen (int und float)',
    description:
      'int steht für ganze Zahlen, float für Kommazahlen. Python rechnet mit beiden, unterscheidet sie aber – zum Beispiel bei der Division.',
    difficulty: 2,
    prerequisiteSlugs: ['datentyp'],
  },
  {
    slug: 'arithmetik',
    name: 'Rechnen',
    description:
      'Die Operatoren +, -, *, /, // (ganzzahlige Division), % (Rest) und ** (Potenz) samt der üblichen Punkt-vor-Strich-Regel.',
    difficulty: 2,
    prerequisiteSlugs: ['zahlen'],
  },
  {
    slug: 'string',
    name: 'Zeichenkette (String)',
    description:
      'Text in Anführungszeichen. Zeichenketten lassen sich verbinden, ausschneiden und durchsuchen – aber nicht ohne Weiteres mit Zahlen verrechnen.',
    difficulty: 2,
    prerequisiteSlugs: ['datentyp'],
  },
  {
    slug: 'f-string',
    name: 'f-String',
    description:
      'Eine Zeichenkette mit einem f davor, in der Werte direkt in geschweiften Klammern eingesetzt werden. Die klarste Art, Text und Werte zu verbinden.',
    difficulty: 2,
    prerequisiteSlugs: ['string', 'variable'],
  },
  {
    slug: 'input-eingabe',
    name: 'Eingabe mit input()',
    description:
      'input() hält das Programm an und wartet auf eine Eingabe. Das Ergebnis ist immer eine Zeichenkette – auch wenn eine Zahl eingegeben wurde.',
    difficulty: 2,
    prerequisiteSlugs: ['string', 'eva-prinzip'],
  },
  {
    slug: 'typumwandlung',
    name: 'Typumwandlung',
    description:
      'Mit int(), float() und str() wird ein Wert in einen anderen Typ überführt. Notwendig, sobald mit Eingaben gerechnet werden soll.',
    difficulty: 2,
    prerequisiteSlugs: ['input-eingabe', 'zahlen'],
  },
  {
    slug: 'fehlermeldung',
    name: 'Fehlermeldungen lesen',
    description:
      'Python nennt bei einem Abbruch die Fehlerart und die Zeile. Die Meldung von unten nach oben zu lesen ist der schnellste Weg zur Ursache.',
    difficulty: 2,
    prerequisiteSlugs: ['interpreter'],
  },

  // --- Stufe 2: Entscheidungen ---------------------------------------------
  {
    slug: 'boolean',
    name: 'Wahrheitswert (bool)',
    description:
      'Ein Wert, der nur True oder False sein kann. Wahrheitswerte entstehen fast immer als Ergebnis eines Vergleichs.',
    difficulty: 2,
    prerequisiteSlugs: ['datentyp'],
  },
  {
    slug: 'vergleichsoperator',
    name: 'Vergleichsoperatoren',
    description:
      'Mit ==, !=, <, >, <= und >= werden zwei Werte verglichen. Das Ergebnis ist immer True oder False.',
    difficulty: 2,
    prerequisiteSlugs: ['boolean'],
  },
  {
    slug: 'if-bedingung',
    name: 'if-Anweisung',
    description:
      'Führt einen eingerückten Block nur dann aus, wenn eine Bedingung True ergibt. Die Einrückung bestimmt, was zum Block gehört.',
    difficulty: 2,
    prerequisiteSlugs: ['vergleichsoperator'],
  },
  {
    slug: 'else-zweig',
    name: 'else-Zweig',
    description:
      'Der Block, der ausgeführt wird, wenn die Bedingung nicht zutrifft. Damit ist genau einer der beiden Fälle immer abgedeckt.',
    difficulty: 2,
    prerequisiteSlugs: ['if-bedingung'],
  },
  {
    slug: 'elif-kette',
    name: 'elif-Kette',
    description:
      'Mehrere Fälle nacheinander prüfen. Python nimmt den ersten zutreffenden Zweig und überspringt alle weiteren – die Reihenfolge ist deshalb entscheidend.',
    difficulty: 3,
    prerequisiteSlugs: ['else-zweig'],
  },
  {
    slug: 'logische-operatoren',
    name: 'and, or, not',
    description:
      'Verknüpft mehrere Bedingungen. and verlangt, dass beide Seiten zutreffen, or genügt eine Seite, not dreht das Ergebnis um.',
    difficulty: 3,
    prerequisiteSlugs: ['vergleichsoperator'],
  },
  {
    slug: 'truthiness',
    name: 'Wahrheitswert beliebiger Objekte',
    description:
      'Python behandelt 0, leere Zeichenketten und leere Listen wie False, alles andere wie True. Das erklärt manches überraschende Verhalten von if.',
    difficulty: 3,
    prerequisiteSlugs: ['boolean', 'if-bedingung'],
  },
  {
    slug: 'verschachtelte-bedingung',
    name: 'Verschachtelte Bedingungen',
    description:
      'Eine Bedingung innerhalb eines Blocks einer anderen Bedingung. Oft lässt sich die Verschachtelung durch and oder eine elif-Kette vermeiden.',
    difficulty: 3,
    prerequisiteSlugs: ['elif-kette', 'logische-operatoren'],
  },

  // --- Stufe 3: Wiederholungen ---------------------------------------------
  {
    slug: 'liste',
    name: 'Liste',
    description:
      'Eine geordnete Sammlung von Werten in eckigen Klammern. Listen lassen sich durchlaufen, erweitern und verändern.',
    difficulty: 2,
    prerequisiteSlugs: ['variable'],
  },
  {
    slug: 'for-schleife',
    name: 'for-Schleife',
    description:
      'Führt einen Block für jedes Element einer Sammlung genau einmal aus. Die passende Wahl, wenn die Anzahl der Durchläufe vorher feststeht.',
    difficulty: 3,
    prerequisiteSlugs: ['liste'],
  },
  {
    slug: 'range-funktion',
    name: 'range()',
    description:
      'Erzeugt eine Folge von Zahlen. range(1, 5) liefert 1, 2, 3, 4 – der Endwert gehört nicht mehr dazu.',
    difficulty: 3,
    prerequisiteSlugs: ['for-schleife'],
  },
  {
    slug: 'zaehler-variable',
    name: 'Zähler',
    description:
      'Eine Variable, die vor der Schleife auf 0 gesetzt und im Rumpf erhöht wird. Zählt, wie oft etwas zutrifft.',
    difficulty: 3,
    prerequisiteSlugs: ['for-schleife', 'zuweisung'],
  },
  {
    slug: 'akkumulator',
    name: 'Akkumulator',
    description:
      'Eine Variable, die Zwischenergebnisse aufsammelt – etwa eine laufende Summe. Muss vor der Schleife einen sinnvollen Startwert bekommen.',
    difficulty: 3,
    prerequisiteSlugs: ['zaehler-variable'],
  },
  {
    slug: 'while-schleife',
    name: 'while-Schleife',
    description:
      'Wiederholt einen Block, solange eine Bedingung True ergibt. Die richtige Wahl, wenn die Anzahl der Durchläufe erst zur Laufzeit feststeht.',
    difficulty: 3,
    prerequisiteSlugs: ['if-bedingung', 'for-schleife'],
  },
  {
    slug: 'endlosschleife',
    name: 'Endlosschleife',
    description:
      'Eine Schleife, deren Bedingung nie falsch wird. Meist fehlt im Rumpf die Veränderung der Variable, die in der Bedingung steht.',
    difficulty: 3,
    prerequisiteSlugs: ['while-schleife'],
  },
  {
    slug: 'break-continue',
    name: 'break und continue',
    description:
      'break verlässt die Schleife sofort, continue springt zum nächsten Durchlauf. Beide sparen Verschachtelung, machen den Ablauf aber auch schwerer nachvollziehbar.',
    difficulty: 4,
    prerequisiteSlugs: ['while-schleife'],
  },
];
