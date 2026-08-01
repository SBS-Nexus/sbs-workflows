import type { ProjectDraft } from '@/domain/content/schema';

/**
 * Projektwerkstatt.
 *
 * Projekte unterscheiden sich von Aufgaben in drei Punkten:
 *  - Sie sind in Meilensteine geteilt, die einzeln geprüft werden.
 *  - Sie geben keinen Lösungsweg vor, sondern nur Anforderungen.
 *  - Sie enden mit einer Reflexion, die in die Bewertung eingeht.
 *
 * Für die erste Version arbeitet jedes Projekt in einer einzigen Datei. Der
 * Dateibegriff ist trotzdem im Datenmodell angelegt, damit spätere Projekte mit
 * mehreren Modulen ohne Schemaänderung möglich sind.
 */
export const projects: ProjectDraft[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'begruessung-und-altersrechner',
    title: 'Begrüßung und Altersrechner',
    description:
      'Ein kleines Programm, das nach Name und Geburtsjahr fragt und daraus eine persönliche Begrüßung samt Altersangabe erzeugt. Es verbindet alles aus Stufe 1: Eingabe, Umwandlung, Rechnung und formatierte Ausgabe.',
    difficulty: 1,
    requirements: [
      'Das Programm fragt zuerst nach dem Namen und danach nach dem Geburtsjahr.',
      'Das Geburtsjahr wird in eine ganze Zahl umgewandelt.',
      'Das Alter wird als Differenz zum Bezugsjahr 2026 berechnet.',
      'Die Ausgabe besteht aus genau zwei Zeilen und verwendet f-Strings.',
      'Die zweite Zeile enthält zusätzlich, wie viele Jahre bis zum 100. Geburtstag fehlen.',
    ],
    milestones: [
      {
        id: 'm1',
        title: 'Eingaben entgegennehmen',
        description:
          'Das Programm fragt Name und Geburtsjahr ab und wandelt das Geburtsjahr in eine Zahl um. Ohne die Umwandlung scheitert jede spätere Rechnung.',
        testIds: ['p1-t1'],
        hint: 'Zwei input()-Aufrufe nacheinander. Um den zweiten gehört ein int().',
      },
      {
        id: 'm2',
        title: 'Begrüßung ausgeben',
        description:
          'Die erste Ausgabezeile lautet "Hallo <Name>!" – mit dem eingegebenen Namen an der richtigen Stelle.',
        testIds: ['p1-t1'],
        hint: 'Ein f-String mit dem Namen in geschweiften Klammern.',
      },
      {
        id: 'm3',
        title: 'Alter berechnen und ausgeben',
        description:
          'Die zweite Zeile nennt das Alter und die verbleibenden Jahre bis 100 im Format "Du bist 34 Jahre alt. Bis 100 fehlen noch 66 Jahre."',
        testIds: ['p1-t1', 'p1-t2'],
        hint: 'Das Alter ist 2026 minus Geburtsjahr. Die zweite Zahl ist 100 minus Alter.',
      },
    ],
    starterFiles: [
      {
        path: 'main.py',
        content: `# Begruessung und Altersrechner
#
# Anforderungen:
#  1. Nach dem Namen fragen
#  2. Nach dem Geburtsjahr fragen und in eine Zahl umwandeln
#  3. Alter zum Bezugsjahr 2026 berechnen
#  4. Zwei Zeilen ausgeben (siehe Aufgabenstellung)

BEZUGSJAHR = 2026

name = input("Wie heisst du? ")
`,
        readOnly: false,
      },
    ],
    rubric: [
      {
        criterion: 'Korrektheit',
        description:
          'Beide Ausgabezeilen entsprechen exakt dem geforderten Format, und die Zahlen sind richtig berechnet.',
      },
      {
        criterion: 'Typumwandlung',
        description:
          'Die Eingabe wird vor der Rechnung umgewandelt. Es wird nicht mit einer Zeichenkette gerechnet.',
      },
      {
        criterion: 'Lesbarkeit',
        description:
          'Variablennamen beschreiben ihren Inhalt. Das Bezugsjahr steht als benannte Konstante, nicht als lose Zahl im Code.',
      },
      {
        criterion: 'Ausgabeformat',
        description:
          'Die Ausgabe wird mit f-Strings gebildet statt durch Verkettung mit + und str().',
      },
    ],
    tests: [
      {
        id: 'p1-t1',
        name: 'Beispiel: Nadia, geboren 1992',
        stdin: ['Nadia', '1992'],
        expectedStdout: 'Hallo Nadia!\nDu bist 34 Jahre alt. Bis 100 fehlen noch 66 Jahre.',
        failureHint:
          'Achte auf das Ausrufezeichen, die Punkte am Satzende und die Reihenfolge der beiden Eingaben.',
      },
      {
        id: 'p1-t2',
        name: 'Beispiel: Tom, geboren 2005',
        stdin: ['Tom', '2005'],
        expectedStdout: 'Hallo Tom!\nDu bist 21 Jahre alt. Bis 100 fehlen noch 79 Jahre.',
        failureHint:
          'Das Programm muss für beliebige Eingaben rechnen. Prüfe, ob irgendwo eine feste Zahl steht, die eigentlich berechnet werden müsste.',
      },
    ],
    estimatedMinutes: 30,
    conceptSlugs: ['input-eingabe', 'typumwandlung', 'f-string', 'arithmetik', 'variable'],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'tarifrechner',
    title: 'Tarifrechner für einen Sportverein',
    description:
      'Ein Beitragsrechner mit mehreren Tarifstufen und einer Ermäßigung. Das Projekt übt genau das, woran Bedingungen in der Praxis scheitern: die Reihenfolge der Fälle und die Behandlung der Grenzwerte.',
    difficulty: 2,
    requirements: [
      'Das Programm fragt nach dem Alter (ganze Zahl) und danach, ob eine Ermäßigung vorliegt ("ja" oder "nein").',
      'Der Grundbeitrag richtet sich nach dem Alter: bis 17 Jahre 12 Euro, 18 bis 64 Jahre 25 Euro, ab 65 Jahre 18 Euro.',
      'Liegt eine Ermäßigung vor, werden vom Grundbeitrag 20 Prozent abgezogen.',
      'Die Ausgabe besteht aus genau einer Zeile im Format "Monatsbeitrag: 20.00 Euro" mit zwei Nachkommastellen.',
      'Die Tarifstufen sind als elif-Kette formuliert, nicht als mehrere getrennte if-Anweisungen.',
    ],
    milestones: [
      {
        id: 'm1',
        title: 'Grundbeitrag nach Alter',
        description:
          'Die drei Altersstufen liefern den richtigen Grundbeitrag. Achte besonders auf die Grenzwerte 17, 18, 64 und 65.',
        testIds: ['p2-t1', 'p2-t2'],
        hint: 'Eine elif-Kette von der kleinsten zur größten Grenze. Der letzte Fall braucht keine eigene Bedingung.',
      },
      {
        id: 'm2',
        title: 'Ermäßigung anwenden',
        description:
          'Bei "ja" werden 20 Prozent abgezogen. Der Abzug gilt für alle Altersstufen gleichermaßen.',
        testIds: ['p2-t3'],
        hint: 'Der Abzug steht nach der Tarifkette und gilt für das Ergebnis – nicht in jeder Stufe einzeln.',
      },
      {
        id: 'm3',
        title: 'Ausgabe formatieren',
        description:
          'Genau eine Ausgabezeile mit zwei Nachkommastellen, auch bei glatten Beträgen.',
        testIds: ['p2-t1', 'p2-t4'],
        hint: 'Die Formatangabe :.2f in einem f-String sorgt für die zwei Nachkommastellen.',
      },
    ],
    starterFiles: [
      {
        path: 'main.py',
        content: `# Tarifrechner Sportverein
#
# Tarifstufen:
#   bis 17 Jahre      12 Euro
#   18 bis 64 Jahre   25 Euro
#   ab 65 Jahre       18 Euro
#
# Ermaessigung: 20 Prozent Abzug auf den Grundbeitrag

alter = int(input("Alter: "))
ermaessigt = input("Ermaessigung (ja/nein): ") == "ja"
`,
        readOnly: false,
      },
    ],
    rubric: [
      {
        criterion: 'Grenzwerte',
        description:
          'Die Übergänge bei 17/18 und 64/65 sind korrekt. Kein Alter fällt zwischen zwei Stufen.',
      },
      {
        criterion: 'Struktur der Fallunterscheidung',
        description:
          'Die Stufen sind als elif-Kette formuliert. Es gibt keine mehrfach geprüften Bedingungen.',
      },
      {
        criterion: 'Keine Wiederholung',
        description:
          'Die Ermäßigung und die Ausgabe stehen jeweils nur einmal im Programm, nicht in jedem Zweig erneut.',
      },
      {
        criterion: 'Ausgabeformat',
        description: 'Genau eine Zeile mit zwei Nachkommastellen, unabhängig vom Betrag.',
      },
    ],
    tests: [
      {
        id: 'p2-t1',
        name: 'Erwachsene ohne Ermäßigung',
        stdin: ['30', 'nein'],
        expectedStdout: 'Monatsbeitrag: 25.00 Euro',
        failureHint:
          'Für 30 Jahre gilt der mittlere Tarif. Prüfe außerdem die zwei Nachkommastellen.',
      },
      {
        id: 'p2-t2',
        name: 'Jugendliche an der Grenze',
        stdin: ['17', 'nein'],
        expectedStdout: 'Monatsbeitrag: 12.00 Euro',
        failureHint: '"Bis 17 Jahre" schließt 17 mit ein. Prüfe, ob du <= oder < verwendet hast.',
      },
      {
        id: 'p2-t3',
        name: 'Erwachsene mit Ermäßigung',
        stdin: ['40', 'ja'],
        expectedStdout: 'Monatsbeitrag: 20.00 Euro',
        failureHint:
          '20 Prozent von 25 Euro sind 5 Euro. Der Abzug muss nach der Tarifkette erfolgen.',
      },
      {
        id: 'p2-t4',
        name: 'Seniorentarif an der Grenze',
        stdin: ['65', 'nein'],
        expectedStdout: 'Monatsbeitrag: 18.00 Euro',
        failureHint: '"Ab 65 Jahre" schließt 65 mit ein.',
      },
    ],
    estimatedMinutes: 40,
    conceptSlugs: ['elif-kette', 'if-bedingung', 'typumwandlung', 'f-string', 'arithmetik'],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'zahlenratespiel',
    title: 'Interaktives Zahlenratespiel',
    description:
      'Ein Spiel, das eine Zahl zwischen 1 und 100 sucht und nach jedem Rateversuch "zu klein" oder "zu gross" meldet. Es verbindet while-Schleife, Bedingungen und einen Zähler – und zeigt, wozu Schleifen mit unbekannter Durchlaufzahl da sind.',
    difficulty: 3,
    requirements: [
      'Die gesuchte Zahl steht in der Variable ZIEL und wird nicht ausgegeben.',
      'Das Programm liest so lange Zahlen ein, bis die gesuchte Zahl geraten wurde.',
      'Nach jedem falschen Versuch erscheint genau eine Zeile: "Zu klein" oder "Zu gross".',
      'Bei Treffer erscheint eine Zeile im Format "Richtig! Du hast 3 Versuche gebraucht."',
      'Die Anzahl der Versuche wird mit einem Zähler mitgeführt und schließt den Treffer mit ein.',
    ],
    milestones: [
      {
        id: 'm1',
        title: 'Schleife und Eingabe',
        description:
          'Das Programm liest wiederholt eine Zahl ein. Die Schleife endet, sobald die gesuchte Zahl geraten wurde.',
        testIds: ['p3-t1'],
        hint: 'Die Anzahl der Durchläufe steht nicht vorher fest – das spricht für while. Die Bedingung vergleicht den geratenen Wert mit ZIEL.',
      },
      {
        id: 'm2',
        title: 'Rückmeldung je Versuch',
        description:
          'Nach jedem falschen Versuch erscheint "Zu klein" oder "Zu gross" – passend zum Verhältnis zwischen Rateversuch und Ziel.',
        testIds: ['p3-t1', 'p3-t2'],
        hint: 'Eine Fallunterscheidung im Schleifenrumpf. Bei Gleichheit darf keine dieser beiden Meldungen erscheinen.',
      },
      {
        id: 'm3',
        title: 'Versuche zählen',
        description:
          'Ein Zähler erfasst alle Versuche einschließlich des erfolgreichen und erscheint in der Schlusszeile.',
        testIds: ['p3-t1', 'p3-t3'],
        hint: 'Der Zähler startet vor der Schleife bei 0 und wird nach jeder Eingabe erhöht – auch beim Treffer.',
      },
    ],
    starterFiles: [
      {
        path: 'main.py',
        content: `# Zahlenratespiel
#
# Die gesuchte Zahl steht fest und darf nicht ausgegeben werden.
# Nach jedem falschen Versuch: "Zu klein" oder "Zu gross"
# Bei Treffer: Richtig! Du hast <n> Versuche gebraucht.

ZIEL = 42

versuche = 0
`,
        readOnly: false,
      },
    ],
    rubric: [
      {
        criterion: 'Abbruchbedingung',
        description:
          'Die Schleife endet zuverlässig beim Treffer. Es gibt keine Endlosschleife und keinen überflüssigen Durchlauf.',
      },
      {
        criterion: 'Rückmeldung',
        description:
          'Die Meldungen "Zu klein" und "Zu gross" erscheinen nur bei falschen Versuchen und stimmen mit der Richtung überein.',
      },
      {
        criterion: 'Zählweise',
        description:
          'Der Zähler steht vor der Schleife, wird je Versuch erhöht und zählt den Treffer mit.',
      },
      {
        criterion: 'Lesbarkeit',
        description:
          'Die gesuchte Zahl steht als Konstante in Großbuchstaben. Der Ablauf ist ohne Sprünge nachvollziehbar.',
      },
    ],
    tests: [
      {
        id: 'p3-t1',
        name: 'Drei Versuche bis zum Treffer',
        stdin: ['10', '90', '42'],
        expectedStdout: 'Zu klein\nZu gross\nRichtig! Du hast 3 Versuche gebraucht.',
        failureHint:
          'Erwartet werden genau drei Zeilen. Prüfe, ob der Treffer mitgezählt wird und ob nach dem Treffer keine weitere Meldung erscheint.',
      },
      {
        id: 'p3-t2',
        name: 'Treffer im ersten Versuch',
        stdin: ['42'],
        expectedStdout: 'Richtig! Du hast 1 Versuche gebraucht.',
        failureHint:
          'Bei einem sofortigen Treffer darf keine Meldung "Zu klein" oder "Zu gross" erscheinen.',
      },
      {
        id: 'p3-t3',
        name: 'Mehrere Versuche von unten',
        stdin: ['1', '2', '3', '42'],
        expectedStdout: 'Zu klein\nZu klein\nZu klein\nRichtig! Du hast 4 Versuche gebraucht.',
        failureHint: 'Jeder falsche Versuch erzeugt genau eine Zeile, der Treffer genau eine.',
      },
    ],
    estimatedMinutes: 45,
    conceptSlugs: [
      'while-schleife',
      'if-bedingung',
      'elif-kette',
      'zaehler-variable',
      'typumwandlung',
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: 'debugging-labor',
    title: 'Debugging-Labor: Kassenprogramm reparieren',
    description:
      'Ein kleines Kassenprogramm enthält vier Fehler unterschiedlicher Art – einen Syntaxfehler, einen Typfehler, einen Logikfehler und einen Einrückungsfehler. Deine Aufgabe ist nicht, es neu zu schreiben, sondern die Fehler systematisch zu finden und gezielt zu beheben.',
    difficulty: 3,
    requirements: [
      'Das Programm läuft ohne Abbruch durch.',
      'Es liest drei Preise als Kommazahlen ein.',
      'Die Summe aller drei Preise wird korrekt gebildet.',
      'Ab einer Summe von 50 Euro wird ein Rabatt von 10 Prozent abgezogen.',
      'Die Schlusszeile erscheint genau einmal und lautet "Zu zahlen: 45.00 Euro".',
    ],
    milestones: [
      {
        id: 'm1',
        title: 'Das Programm startet',
        description:
          'Der Syntaxfehler ist behoben. Python kann die Datei vollständig lesen. Achte auf die Zeile, die einen Block eröffnet.',
        testIds: ['p4-t1'],
        hint: 'Python nennt bei einem SyntaxError eine Zeile. Schau dort – und in der Zeile darüber.',
      },
      {
        id: 'm2',
        title: 'Die Eingaben werden umgewandelt',
        description:
          'Der Typfehler ist behoben. Die eingelesenen Preise werden als Zahlen und nicht als Text verarbeitet.',
        testIds: ['p4-t1'],
        hint: 'input() liefert immer eine Zeichenkette. Preise können Nachkommastellen haben.',
      },
      {
        id: 'm3',
        title: 'Die Summe stimmt',
        description:
          'Der Logikfehler in der Summenbildung ist behoben. Alle drei Preise fließen ein, keiner doppelt.',
        testIds: ['p4-t1', 'p4-t2'],
        hint: 'Rechne die Summe für das Testbeispiel im Kopf nach und vergleiche mit dem, was das Programm bildet.',
      },
      {
        id: 'm4',
        title: 'Die Ausgabe erscheint einmal',
        description:
          'Der Einrückungsfehler ist behoben. Die Schlusszeile gehört nicht in einen Zweig, sondern läuft immer genau einmal.',
        testIds: ['p4-t1', 'p4-t3'],
        hint: 'Zeilen am linken Rand laufen unabhängig von jeder Bedingung.',
      },
    ],
    starterFiles: [
      {
        path: 'main.py',
        content: `# Kassenprogramm - enthaelt vier Fehler
#
# Erwartetes Verhalten:
#   drei Preise einlesen, summieren,
#   ab 50 Euro 10 Prozent Rabatt,
#   genau eine Schlusszeile ausgeben.

preis1 = input("Preis 1: ")
preis2 = input("Preis 2: ")
preis3 = input("Preis 3: ")

summe = preis1 + preis2 + preis2

if summe >= 50
    summe = summe * 0.9
    print(f"Zu zahlen: {summe:.2f} Euro")
else:
    print(f"Zu zahlen: {summe:.2f} Euro")
`,
        readOnly: false,
      },
    ],
    rubric: [
      {
        criterion: 'Vollständigkeit',
        description: 'Alle vier Fehler sind behoben, und das Programm erfüllt die Anforderungen.',
      },
      {
        criterion: 'Gezieltes Vorgehen',
        description:
          'Das Programm wurde repariert, nicht neu geschrieben. Die vorhandene Struktur ist erkennbar geblieben.',
      },
      {
        criterion: 'Keine neuen Fehler',
        description: 'Die Reparatur hat keine neuen Probleme eingeführt.',
      },
      {
        criterion: 'Fehlerdiagnose',
        description:
          'In der Reflexion lässt sich benennen, welcher Fehler welcher Art war und woran er erkennbar wurde.',
      },
    ],
    tests: [
      {
        id: 'p4-t1',
        name: 'Summe über der Rabattgrenze',
        stdin: ['20', '15.5', '14.5'],
        expectedStdout: 'Zu zahlen: 45.00 Euro',
        failureHint:
          'Die Summe ist 50 Euro, davon 10 Prozent Rabatt ergibt 45 Euro. Genau eine Ausgabezeile.',
      },
      {
        id: 'p4-t2',
        name: 'Summe unter der Rabattgrenze',
        stdin: ['10', '10', '10'],
        expectedStdout: 'Zu zahlen: 30.00 Euro',
        failureHint: 'Unter 50 Euro darf kein Rabatt abgezogen werden.',
      },
      {
        id: 'p4-t3',
        name: 'Kommazahlen werden korrekt addiert',
        stdin: ['12.25', '7.75', '5.5'],
        expectedStdout: 'Zu zahlen: 25.50 Euro',
        failureHint:
          'Wenn hier ein TypeError auftritt oder Ziffern aneinandergehängt werden, fehlt die Umwandlung in Zahlen.',
      },
    ],
    estimatedMinutes: 40,
    conceptSlugs: ['fehlermeldung', 'typumwandlung', 'if-bedingung', 'arithmetik', 'code-tracing'],
  },
];
