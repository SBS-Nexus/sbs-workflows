import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Stufe 2 – Entscheidungen.
 *
 * Ab hier verzweigt sich der Programmablauf. Der didaktische Schwerpunkt liegt
 * auf zwei Dingen, an denen erfahrungsgemäß die meisten Fehler entstehen: der
 * Einrückung als Bedeutungsträger und der Reihenfolge in einer elif-Kette.
 */
export const modulEntscheidungen: ModuleDraft = {
  slug: 'entscheidungen',
  title: 'Entscheidungen',
  summary:
    'Vergleiche, if, elif, else und die Verknüpfung mehrerer Bedingungen – damit ein Programm auf unterschiedliche Situationen unterschiedlich reagieren kann.',
  rationale:
    'Bis hierher lief jedes Programm immer gleich ab. Entscheidungen sind der erste Schritt zu Programmen, die auf ihre Daten reagieren. Sie sind außerdem die Voraussetzung für while-Schleifen, weil dort dieselbe Art von Bedingung verwendet wird.',
  prerequisiteModuleSlugs: ['erste-python-schritte'],
  lessons: [
    // ---------------------------------------------------------------------
    {
      slug: 'vergleiche-und-wahrheitswerte',
      title: 'Vergleiche und Wahrheitswerte',
      learningObjectives: [
        'Du kannst die Operatoren ==, !=, <, >, <= und >= einsetzen und benennen, welchen Typ ihr Ergebnis hat.',
        'Du kannst den Unterschied zwischen = und == erklären und typische Verwechslungen erkennen.',
      ],
      everydayProblem:
        'Ein Versandprogramm soll ab 50 Euro Bestellwert versandkostenfrei liefern. Bevor das Programm entscheiden kann, muss es prüfen können: Ist der Betrag groß genug? Genau diese Prüfung liefert einen Wahrheitswert.',
      mentalModel:
        'Ein Vergleich ist eine Frage mit nur zwei möglichen Antworten: True oder False. Diese Antwort ist ein ganz normaler Wert – man kann sie in einer Variable ablegen, ausgeben und weiterverwenden. Wichtig ist die Unterscheidung der beiden Gleichheitszeichen: Ein einzelnes = weist zu ("bekommt den Wert von"), ein doppeltes == fragt ("hat denselben Wert wie?"). Die Verwechslung ist so häufig, dass Python inzwischen bei einem = in einer Bedingung ausdrücklich darauf hinweist.',
      workedExample: {
        code: `bestellwert = 42.90
versandfrei_ab = 50

ist_versandfrei = bestellwert >= versandfrei_ab
print(ist_versandfrei)
print(type(ist_versandfrei))

print(bestellwert != versandfrei_ab)
print(versandfrei_ab - bestellwert)`,
        annotations: [
          {
            line: 4,
            text: 'Der Vergleich wird ausgewertet und sein Ergebnis unter ist_versandfrei abgelegt. 42.90 ist nicht größer oder gleich 50, also False.',
          },
          {
            line: 6,
            text: 'type() bestätigt: Das Ergebnis eines Vergleichs ist immer ein Wahrheitswert, also bool.',
          },
          {
            line: 8,
            text: '!= bedeutet "ist ungleich". Da 42.90 und 50 verschieden sind, ergibt das True.',
          },
          {
            line: 9,
            text: 'Zum Vergleich: Eine Subtraktion liefert eine Zahl, keinen Wahrheitswert. Vergleichsoperatoren und Rechenoperatoren beantworten unterschiedliche Fragen.',
          },
        ],
        output: "False\n<class 'bool'>\nTrue\n7.099999999999994",
        trace: [
          { step: 1, description: '42.9 >= 50 wird geprüft.', state: 'ist_versandfrei = False' },
          { step: 2, description: '42.9 != 50 wird geprüft.', state: 'True' },
          {
            step: 3,
            description: 'Die Subtraktion zeigt die typische Ungenauigkeit von Kommazahlen.',
            state: '7.099999999999994',
          },
        ],
      },
      reflectionPrompts: [
        'Woran erkennst du beim Lesen, ob ein Gleichheitszeichen zuweist oder vergleicht?',
        'In welcher Situation würdest du das Ergebnis eines Vergleichs in einer eigenen Variable ablegen?',
      ],
      commonMistakes: [
        {
          mistake: 'In einer Bedingung = statt == schreiben.',
          why: 'Ein einzelnes = ist eine Zuweisung. In einer Bedingung ist das keine gültige Anweisung, Python meldet einen SyntaxError.',
          fix: 'Beim Lesen laut mitsprechen: "bekommt" für =, "ist gleich" für ==.',
        },
        {
          mistake: 'Kommazahlen mit == auf Gleichheit prüfen.',
          why: '0.1 + 0.2 == 0.3 ergibt False, weil Kommazahlen binär nur näherungsweise gespeichert werden.',
          fix: 'Auf einen kleinen Abstand prüfen, etwa abs(a - b) < 0.001, statt auf exakte Gleichheit.',
        },
      ],
      estimatedMinutes: 11,
      primaryConceptSlugs: ['boolean', 'vergleichsoperator'],
      supportingConceptSlugs: ['variable', 'datentyp'],
      prerequisiteConceptSlugs: ['variable', 'zahlen'],
      exercises: [
        {
          slug: 'e2-vergleich-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Vergleiche auswerten',
          prompt: 'Welche Ausgabe entsteht?',
          payload: {
            kind: 'predictOutput',
            code: `a = 7\nb = 7.0\nprint(a == b)\nprint(a != b)\nprint(a > b)\nprint(a >= b)`,
            expectedOutput: 'True\nFalse\nFalse\nTrue',
            explanation:
              'Python vergleicht bei Zahlen den Wert, nicht den Typ. 7 und 7.0 sind wertgleich, deshalb ergibt == True und != False. Größer ist 7 nicht, also False. Größer oder gleich trifft dagegen zu, weil die Gleichheit ausreicht.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Sind 7 und 7.0 derselbe Wert – auch wenn sie unterschiedliche Typen haben?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Bei >= genügt es, wenn eine der beiden Bedingungen erfüllt ist: größer ODER gleich.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['vergleichsoperator', 'boolean'],
        },
        {
          slug: 'e2-vergleich-operator-wahl',
          type: 'SINGLE_CHOICE',
          title: 'Den passenden Operator wählen',
          prompt:
            'Ein Rabatt gilt ab einem Bestellwert von genau 100 Euro – 100 Euro selbst zählen also bereits dazu. Welche Bedingung ist richtig?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'bestellwert > 100',
                feedback:
                  'Damit bekäme jemand mit genau 100 Euro keinen Rabatt. Die Aufgabe verlangt aber, dass 100 bereits reicht.',
              },
              {
                id: 'b',
                text: 'bestellwert >= 100',
                feedback:
                  'Genau. Das schließt den Grenzwert 100 mit ein. Solche Grenzfälle sind die häufigste Fehlerquelle bei Bedingungen.',
              },
              {
                id: 'c',
                text: 'bestellwert = 100',
                feedback:
                  'Ein einzelnes = weist zu. In einer Bedingung führt das zu einem SyntaxError. Zum Vergleichen braucht es ==.',
              },
              {
                id: 'd',
                text: 'bestellwert == 100',
                feedback:
                  'Das träfe nur bei exakt 100 Euro zu. Bei 150 Euro gäbe es keinen Rabatt – das ist nicht gemeint.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Prüfe die Bedingung mit dem Grenzwert selbst: Was passiert bei genau 100 Euro?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Bei "ab" gehört der Grenzwert dazu. Dafür gibt es >= statt >.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['vergleichsoperator'],
        },
        {
          slug: 'e2-vergleich-luecken',
          type: 'CODE_COMPLETION',
          title: 'Bedingungen formulieren',
          prompt:
            'Ergänze die Operatoren so, dass volljaehrig für ein Alter ab 18 True ist und ist_minderjaehrig genau das Gegenteil aussagt.',
          payload: {
            kind: 'codeCompletion',
            template: `alter = 17\nvolljaehrig = alter {{blank:op1}} 18\nist_minderjaehrig = alter {{blank:op2}} 18\nprint(volljaehrig)\nprint(ist_minderjaehrig)`,
            blanks: [
              {
                id: 'op1',
                accepted: ['>='],
                caseSensitive: true,
                description: 'Operator für "ab 18"',
                wrongHint: 'Mit 18 Jahren ist man volljährig. Der Grenzwert gehört also dazu.',
              },
              {
                id: 'op2',
                accepted: ['<'],
                caseSensitive: true,
                description: 'Operator für "unter 18"',
                wrongHint:
                  'Das Gegenteil von "18 oder mehr" ist "weniger als 18" – der Grenzwert gehört hier nicht dazu.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was gilt für jemanden, der genau 18 Jahre alt ist?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die beiden Bedingungen müssen sich lückenlos ergänzen: Jedes Alter fällt in genau eine der beiden.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['vergleichsoperator', 'boolean'],
        },
        {
          slug: 'e2-vergleich-schreiben',
          type: 'WRITE_CODE',
          title: 'Prüfwerte berechnen',
          prompt:
            'Ein Paket darf verschickt werden, wenn es höchstens 31.5 Kilogramm wiegt.\n\nLege für gewicht = 28.4 eine Variable versandfaehig an, die den Wahrheitswert der Prüfung enthält, und gib sie aus. Schreibe die Zahl 31.5 nicht direkt in den Vergleich, sondern lege sie vorher in einer Variable hoechstgewicht ab.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'grenzwert-variable',
                description: 'Der Grenzwert steht in einer eigenen Variable.',
                mustMatch: 'hoechstgewicht',
                message:
                  'Lege den Grenzwert in einer Variable hoechstgewicht ab. Feste Zahlen mitten im Code sind später schwer zu finden.',
              },
            ],
          },
          starterCode: 'gewicht = 28.4\n',
          solution: `gewicht = 28.4\nhoechstgewicht = 31.5\nversandfaehig = gewicht <= hoechstgewicht\nprint(versandfaehig)`,
          solutionNotes:
            'Der Vergleich wird einmal ausgewertet und sein Ergebnis unter versandfaehig abgelegt. Der Grenzwert steht in einer eigenen Variable: Ändert sich die Vorgabe, ist nur eine Stelle anzupassen.',
          publicTests: [
            {
              id: 't1',
              name: 'Ein Paket mit 28.4 kg ist versandfähig',
              expectedStdout: 'True',
              failureHint:
                'Erwartet wird genau eine Ausgabezeile mit True oder False. Prüfe die Richtung des Vergleichs.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Der Grenzwert selbst gilt noch als versandfähig',
              setup: '',
              assertion:
                'assert (31.5 <= hoechstgewicht) is True, "Bei genau 31.5 kg muss das Paket noch versandfaehig sein"',
              failureHint:
                '"Höchstens" schließt den Grenzwert mit ein. Prüfe, ob du <= oder < verwendet hast.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Darf ein Paket mit genau 31.5 Kilogramm noch verschickt werden?',
            },
            {
              level: 2,
              kind: 'concept',
              text: '"Höchstens" schließt den Grenzwert ein. Das Ergebnis eines Vergleichs lässt sich wie jeder andere Wert in einer Variable ablegen.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Grenzwert in eine Variable, Vergleich in eine zweite Variable, dann ausgeben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Der Vergleich selbst sieht so aus:',
              code: 'versandfaehig = gewicht <= hoechstgewicht',
            },
            {
              level: 5,
              kind: 'explanation',
              text: '28.4 <= 31.5 ergibt True, und dieser Wahrheitswert wird unter versandfaehig abgelegt. Der Operator <= ist hier richtig, weil "höchstens" den Grenzwert einschließt. Mit < wären genau 31.5 Kilogramm bereits zu schwer.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['vergleichsoperator', 'boolean', 'variable'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'if-und-else',
      title: 'if und else',
      learningObjectives: [
        'Du kannst mit if einen Codeblock nur unter einer Bedingung ausführen lassen.',
        'Du kannst mit else den Gegenfall abdecken und erklären, warum genau einer der beiden Blöcke läuft.',
        'Du kannst an der Einrückung ablesen, welche Zeilen zu einem Block gehören.',
      ],
      everydayProblem:
        'Der Versandkostenrechner soll bei einem Bestellwert ab 50 Euro "versandkostenfrei" melden und sonst 4.95 Euro aufschlagen. Mit einem reinen Vergleich geht das nicht – das Programm muss abhängig vom Ergebnis unterschiedliche Dinge tun.',
      mentalModel:
        'Ein if ist eine Weiche im Ablauf. Die Bedingung wird einmal geprüft; ist sie True, fährt der Ablauf durch den eingerückten Block, sonst am Block vorbei. Mit else gibt es einen zweiten Gleisstrang, der genau dann befahren wird, wenn die Bedingung nicht zutraf. Entscheidend ist die Einrückung: Sie ist in Python keine Formatierung, sondern Bedeutung. Alles, was gleich weit eingerückt ist, gehört zusammen. Die erste Zeile, die wieder am linken Rand steht, gehört nicht mehr zur Weiche und wird in jedem Fall ausgeführt.',
      workedExample: {
        code: `bestellwert = 42.90

if bestellwert >= 50:
    versandkosten = 0
    print("Versandkostenfrei")
else:
    versandkosten = 4.95
    print("Versandkosten fallen an")

print(f"Zu zahlen: {bestellwert + versandkosten:.2f} Euro")`,
        annotations: [
          {
            line: 3,
            text: 'Die Bedingung endet mit einem Doppelpunkt. Er kündigt an, dass jetzt ein eingerückter Block folgt.',
          },
          {
            line: 4,
            text: 'Vier Leerzeichen Einrückung bedeuten: Diese Zeile gehört zum if-Block und läuft nur, wenn die Bedingung zutrifft.',
          },
          {
            line: 6,
            text: 'else steht wieder auf derselben Ebene wie if. Es braucht keine eigene Bedingung – es fängt alle übrigen Fälle ab.',
          },
          {
            line: 10,
            text: 'Diese Zeile steht am linken Rand und gehört zu keinem der beiden Blöcke. Sie läuft deshalb immer.',
          },
        ],
        output: 'Versandkosten fallen an\nZu zahlen: 47.85 Euro',
        trace: [
          { step: 1, description: '42.9 >= 50 wird geprüft.', state: 'Bedingung ist False' },
          { step: 2, description: 'Der else-Block läuft.', state: 'versandkosten = 4.95' },
          {
            step: 3,
            description: 'Die letzte Zeile läuft unabhängig vom Zweig.',
            state: 'Ausgabe: Zu zahlen: 47.85 Euro',
          },
        ],
      },
      reflectionPrompts: [
        'Woran erkennst du, welche Zeilen zu einem if-Block gehören?',
        'Was wäre anders, wenn die letzte Zeile eingerückt wäre?',
      ],
      commonMistakes: [
        {
          mistake: 'Den Doppelpunkt am Ende der if-Zeile vergessen.',
          why: 'Ohne Doppelpunkt kann Python den Blockanfang nicht erkennen und meldet einen SyntaxError.',
          fix: 'Jede Zeile, die einen Block eröffnet – if, else, for, while, def –, endet mit einem Doppelpunkt.',
        },
        {
          mistake: 'Eine Zeile versehentlich mit einrücken, die immer laufen soll.',
          why: 'Die Einrückung entscheidet über die Zugehörigkeit. Eine eingerückte Zeile läuft nur im jeweiligen Zweig.',
          fix: 'Vor dem Ausführen die Frage stellen: Soll diese Zeile in beiden Fällen laufen? Dann gehört sie an den linken Rand.',
        },
        {
          mistake: 'Nach else noch eine Bedingung schreiben.',
          why: 'else deckt definitionsgemäß alle übrigen Fälle ab und braucht deshalb keine eigene Bedingung.',
          fix: 'Wenn eine weitere Bedingung nötig ist, gehört dorthin elif statt else.',
        },
      ],
      estimatedMinutes: 14,
      primaryConceptSlugs: ['if-bedingung', 'else-zweig'],
      supportingConceptSlugs: ['vergleichsoperator', 'f-string'],
      prerequisiteConceptSlugs: ['vergleichsoperator'],
      exercises: [
        {
          slug: 'e2-if-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Welcher Zweig läuft?',
          prompt: 'Welche Ausgabe entsteht?',
          payload: {
            kind: 'predictOutput',
            code: `temperatur = 18\n\nif temperatur > 20:\n    print("warm")\nelse:\n    print("kuehl")\n\nprint("fertig")`,
            expectedOutput: 'kuehl\nfertig',
            explanation:
              '18 ist nicht größer als 20, deshalb läuft der else-Block. Die letzte Zeile steht am linken Rand und gehört zu keinem der beiden Zweige – sie wird in jedem Fall ausgeführt. Es entstehen also genau zwei Ausgabezeilen.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Zeilen sind eingerückt, welche stehen am linken Rand?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Von if und else läuft immer genau einer der beiden Blöcke. Nicht eingerückte Zeilen danach laufen unabhängig davon.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['if-bedingung', 'else-zweig', 'code-tracing'],
        },
        {
          slug: 'e2-if-parsons',
          type: 'PARSONS',
          title: 'Zutrittsprüfung zusammensetzen',
          prompt:
            'Baue ein Programm, das bei einem Alter ab 16 "Zutritt erlaubt" ausgibt und sonst "Zutritt nicht erlaubt". Achte auf die Einrückung. Eine Zeile gehört nicht dazu.',
          payload: {
            kind: 'parsons',
            lines: [
              { id: 'q1', code: 'alter = 15', indent: 0, distractor: false },
              { id: 'q2', code: 'if alter >= 16:', indent: 0, distractor: false },
              { id: 'q3', code: 'print("Zutritt erlaubt")', indent: 1, distractor: false },
              { id: 'q4', code: 'else:', indent: 0, distractor: false },
              { id: 'q5', code: 'print("Zutritt nicht erlaubt")', indent: 1, distractor: false },
              { id: 'q6', code: 'else alter < 16:', indent: 0, distractor: true },
            ],
            correctOrder: ['q1', 'q2', 'q3', 'q4', 'q5'],
            checkIndentation: true,
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Zeilen sollen nur in einem der beiden Fälle laufen? Genau die werden eingerückt.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'else braucht keine eigene Bedingung – es fängt alles ab, was das if nicht erfasst hat.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Wert festlegen, if mit Bedingung und Doppelpunkt, eingerückte Ausgabe, else mit Doppelpunkt, eingerückte Ausgabe.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['if-bedingung', 'else-zweig'],
        },
        {
          slug: 'e2-if-fehler-finden',
          type: 'FIND_ERROR',
          title: 'Einrückungsfehler finden',
          prompt:
            'Dieses Programm gibt für jeden Betrag "Rabatt gewährt" aus – auch für kleine. Markiere die Zeile, die dafür verantwortlich ist.',
          payload: {
            kind: 'findError',
            codeLines: [
              'betrag = 20',
              'if betrag >= 100:',
              '    print("Grosskunde")',
              'print("Rabatt gewaehrt")',
            ],
            faultyLineNumbers: [4],
            explanation:
              'Zeile 4 steht am linken Rand und gehört damit nicht mehr zum if-Block. Sie läuft deshalb unabhängig von der Bedingung. Soll die Meldung nur bei einem Betrag ab 100 erscheinen, muss die Zeile um vier Leerzeichen eingerückt werden.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Vergleiche die Einrückung von Zeile 3 und Zeile 4. Was bedeutet der Unterschied?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Nur eingerückte Zeilen gehören zum Block der Bedingung. Alles am linken Rand läuft immer.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['if-bedingung'],
        },
        {
          slug: 'e2-if-schreiben',
          type: 'WRITE_CODE',
          title: 'Versandkosten berechnen',
          prompt:
            'Schreibe ein Programm, das den Bestellwert per Eingabe erfragt (Kommazahl möglich).\n\nAb einem Bestellwert von 50 Euro entfallen die Versandkosten, darunter betragen sie 4.95 Euro. Gib genau eine Zeile im Format aus:\n\nGesamt: 47.85 Euro',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'if-vorhanden',
                description: 'Das Programm trifft eine Entscheidung.',
                mustMatch: '\\bif\\b',
                message:
                  'Es fehlt noch die Entscheidung. Ohne if läuft für jeden Bestellwert derselbe Ablauf.',
              },
            ],
          },
          starterCode: 'bestellwert = float(input("Bestellwert: "))\n',
          solution: `bestellwert = float(input("Bestellwert: "))\n\nif bestellwert >= 50:\n    versandkosten = 0\nelse:\n    versandkosten = 4.95\n\ngesamt = bestellwert + versandkosten\nprint(f"Gesamt: {gesamt:.2f} Euro")`,
          solutionNotes:
            'In beiden Zweigen wird nur die Variable versandkosten gesetzt. Die Berechnung und die Ausgabe stehen danach am linken Rand und gelten für beide Fälle. Das spart eine doppelte print()-Zeile und hält die Ausgabe an einer einzigen Stelle.',
          publicTests: [
            {
              id: 't1',
              name: 'Unter 50 Euro: Versandkosten kommen dazu',
              stdin: ['42.90'],
              expectedStdout: 'Gesamt: 47.85 Euro',
              failureHint:
                'Bei 42.90 Euro fallen 4.95 Euro Versand an. Prüfe das Ausgabeformat und die zwei Nachkommastellen.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Genau 50 Euro: versandkostenfrei',
              stdin: ['50'],
              expectedStdout: 'Gesamt: 50.00 Euro',
              failureHint:
                'Bei genau 50 Euro darf kein Versand mehr anfallen. Prüfe, ob du >= oder > verwendet hast.',
            },
            {
              id: 't3',
              name: 'Deutlich über der Grenze',
              stdin: ['120.5'],
              expectedStdout: 'Gesamt: 120.50 Euro',
              failureHint: 'Oberhalb der Grenze bleibt der Bestellwert unverändert.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was ist in beiden Fällen gleich, und was unterscheidet sich? Nur der unterschiedliche Teil gehört in die Zweige.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Wenn in beiden Zweigen dieselbe Variable gesetzt wird, kann die Berechnung danach für beide Fälle gemeinsam stehen.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Eingabe umwandeln, if/else nur für die Versandkosten, danach Summe bilden und ausgeben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die Weiche sieht so aus:',
              code: 'if bestellwert >= 50:\n    versandkosten = 0\nelse:\n    versandkosten = 4.95',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Der Grenzwert 50 gehört zur versandkostenfreien Seite, deshalb >= und nicht >. In beiden Zweigen wird nur versandkosten festgelegt. Die anschließende Summenbildung und die Ausgabe stehen am linken Rand und laufen dadurch in beiden Fällen – so steht die Formatierung nur einmal im Programm.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['if-bedingung', 'else-zweig', 'typumwandlung'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'mehrere-faelle-mit-elif',
      title: 'Mehrere Fälle mit elif',
      learningObjectives: [
        'Du kannst mit elif mehr als zwei Fälle unterscheiden.',
        'Du kannst erklären, warum Python nach dem ersten zutreffenden Zweig aufhört zu prüfen.',
        'Du kannst eine elif-Kette in eine Reihenfolge bringen, die alle Fälle korrekt trennt.',
      ],
      everydayProblem:
        'Ein Stromtarif hat drei Stufen: bis 1000 Kilowattstunden ein Grundpreis, bis 3000 ein mittlerer Preis, darüber ein hoher. Mit if und else allein wird das schnell unübersichtlich.',
      mentalModel:
        'Eine elif-Kette ist eine Treppe, die von oben nach unten abgegangen wird. Python prüft die Bedingungen der Reihe nach und nimmt die erste, die zutrifft. Danach verlässt es die gesamte Kette – alle weiteren Bedingungen werden nicht einmal mehr angeschaut. Genau daraus folgt die wichtigste Regel: Die Reihenfolge ist Teil der Logik. Steht der weiteste Fall oben, fängt er alles ab, und die engeren Fälle darunter werden nie erreicht.',
      workedExample: {
        code: `verbrauch = 2400

if verbrauch <= 1000:
    stufe = "Grundtarif"
elif verbrauch <= 3000:
    stufe = "Mitteltarif"
else:
    stufe = "Hochtarif"

print(stufe)`,
        annotations: [
          {
            line: 3,
            text: 'Erste Prüfung: 2400 <= 1000 ist False. Der Block wird übersprungen.',
          },
          {
            line: 5,
            text: 'Zweite Prüfung: 2400 <= 3000 ist True. Dieser Block läuft – und die Kette endet hier.',
          },
          {
            line: 7,
            text: 'Der else-Zweig wird gar nicht mehr betrachtet, obwohl er formal noch da steht.',
          },
        ],
        output: 'Mitteltarif',
        trace: [
          { step: 1, description: 'Prüfung 2400 <= 1000.', state: 'False – weiter' },
          { step: 2, description: 'Prüfung 2400 <= 3000.', state: 'True – Block läuft' },
          { step: 3, description: 'Die Kette wird verlassen.', state: 'stufe = "Mitteltarif"' },
        ],
      },
      reflectionPrompts: [
        'Warum genügt in Zeile 5 die Bedingung verbrauch <= 3000, ohne zusätzlich verbrauch > 1000 zu prüfen?',
        'Was passiert, wenn du die erste und die zweite Bedingung vertauschst?',
      ],
      commonMistakes: [
        {
          mistake: 'Die Bedingungen in falscher Reihenfolge anordnen.',
          why: 'Steht die weiteste Bedingung oben, trifft sie fast immer zu und die spezielleren Fälle darunter werden nie erreicht.',
          fix: 'Die Kette von der engsten zur weitesten Bedingung aufbauen und mit einem Beispielwert je Stufe durchtesten.',
        },
        {
          mistake: 'Mehrere getrennte if-Anweisungen statt einer elif-Kette schreiben.',
          why: 'Getrennte if-Anweisungen werden alle geprüft. Dadurch können mehrere Blöcke gleichzeitig laufen.',
          fix: 'Wenn sich die Fälle gegenseitig ausschließen, gehört elif dazwischen.',
        },
      ],
      estimatedMinutes: 13,
      primaryConceptSlugs: ['elif-kette'],
      supportingConceptSlugs: ['if-bedingung', 'else-zweig'],
      prerequisiteConceptSlugs: ['if-bedingung', 'else-zweig'],
      exercises: [
        {
          slug: 'e2-elif-reihenfolge',
          type: 'SINGLE_CHOICE',
          title: 'Reihenfolge in der Kette',
          prompt:
            'Ein Programm soll Noten vergeben: ab 90 Punkten "sehr gut", ab 75 "gut", sonst "bestanden". Warum funktioniert die gezeigte Fassung nicht wie beabsichtigt?',
          payload: {
            kind: 'singleChoice',
            code: `punkte = 95\n\nif punkte >= 75:\n    note = "gut"\nelif punkte >= 90:\n    note = "sehr gut"\nelse:\n    note = "bestanden"\n\nprint(note)`,
            options: [
              {
                id: 'a',
                text: 'Die erste Bedingung trifft schon bei 95 Punkten zu, deshalb wird der zweite Zweig nie erreicht.',
                feedback:
                  'Genau. Python nimmt den ersten zutreffenden Zweig und verlässt danach die Kette. Die Bedingung ab 75 ist weiter gefasst und fängt auch alle Werte ab 90 mit ab.',
              },
              {
                id: 'b',
                text: 'elif darf nicht nach einem if mit >= stehen.',
                feedback:
                  'Die Kombination ist völlig zulässig. Das Problem liegt nicht in der Syntax, sondern in der Reihenfolge der Bedingungen.',
              },
              {
                id: 'c',
                text: 'Es fehlt eine Bedingung für den Bereich zwischen 75 und 90.',
                feedback:
                  'Dieser Bereich ist durch die erste Bedingung abgedeckt. Der Fehler betrifft die Werte ab 90, die dort ebenfalls hängen bleiben.',
              },
              {
                id: 'd',
                text: 'Die Variable note wird nicht vor der Kette angelegt.',
                feedback:
                  'Das ist nicht nötig: In jedem Zweig wird note gesetzt, und genau ein Zweig läuft immer.',
              },
            ],
            correctOptionId: 'a',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Gehe mit dem Wert 95 die Bedingungen von oben nach unten durch. Bei welcher bleibt Python stehen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'In einer elif-Kette gewinnt die erste zutreffende Bedingung. Alles darunter wird übersprungen.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['elif-kette'],
        },
        {
          slug: 'e2-elif-parsons',
          type: 'PARSONS',
          title: 'Tarifstufen ordnen',
          prompt:
            'Ordne die Zeilen zu einer korrekten Tarifkette: bis 1000 "Grundtarif", bis 3000 "Mitteltarif", darüber "Hochtarif". Achte auf Reihenfolge und Einrückung.',
          payload: {
            kind: 'parsons',
            lines: [
              { id: 'r1', code: 'verbrauch = 2400', indent: 0, distractor: false },
              { id: 'r2', code: 'if verbrauch <= 1000:', indent: 0, distractor: false },
              { id: 'r3', code: 'stufe = "Grundtarif"', indent: 1, distractor: false },
              { id: 'r4', code: 'elif verbrauch <= 3000:', indent: 0, distractor: false },
              { id: 'r5', code: 'stufe = "Mitteltarif"', indent: 1, distractor: false },
              { id: 'r6', code: 'else:', indent: 0, distractor: false },
              { id: 'r7', code: 'stufe = "Hochtarif"', indent: 1, distractor: false },
              { id: 'r8', code: 'print(stufe)', indent: 0, distractor: false },
            ],
            correctOrder: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'],
            checkIndentation: true,
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Mit welcher Grenze musst du anfangen, damit die engste Bedingung zuerst geprüft wird?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die Kette wird von unten nach oben immer weiter. Die kleinste Grenze gehört nach oben.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Wert, if mit der kleinsten Grenze, elif mit der nächsten, else für den Rest, dann die Ausgabe am linken Rand.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['elif-kette', 'if-bedingung'],
        },
        {
          slug: 'e2-elif-schreiben',
          type: 'WRITE_CODE',
          title: 'Portokosten nach Gewicht',
          prompt:
            'Ein Versanddienst berechnet das Porto nach Gewicht in Gramm:\n\n- bis einschließlich 500 g: 2.75 Euro\n- über 500 g bis einschließlich 1000 g: 4.50 Euro\n- über 1000 g bis einschließlich 2000 g: 6.90 Euro\n- über 2000 g: 10.90 Euro\n\nLies das Gewicht als ganze Zahl per Eingabe ein und gib genau eine Zeile im Format aus:\n\nPorto: 4.50 Euro',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'elif',
                description: 'Die Fälle sind als Kette formuliert.',
                mustMatch: '\\belif\\b',
                message:
                  'Nutze eine elif-Kette. Mit getrennten if-Anweisungen können mehrere Fälle gleichzeitig zutreffen.',
              },
            ],
          },
          starterCode: 'gewicht = int(input("Gewicht in Gramm: "))\n',
          solution: `gewicht = int(input("Gewicht in Gramm: "))\n\nif gewicht <= 500:\n    porto = 2.75\nelif gewicht <= 1000:\n    porto = 4.50\nelif gewicht <= 2000:\n    porto = 6.90\nelse:\n    porto = 10.90\n\nprint(f"Porto: {porto:.2f} Euro")`,
          solutionNotes:
            'Weil Python die Kette beim ersten Treffer verlässt, genügt in jeder Stufe die obere Grenze. Ein zusätzliches gewicht > 500 wäre in der zweiten Bedingung überflüssig: Wer dort ankommt, hat die erste Prüfung bereits nicht bestanden.',
          publicTests: [
            {
              id: 't1',
              name: 'Ein Brief mit 300 g',
              stdin: ['300'],
              expectedStdout: 'Porto: 2.75 Euro',
              failureHint: 'Bis einschließlich 500 g gilt die erste Stufe.',
            },
            {
              id: 't2',
              name: 'Ein Paket mit 1500 g',
              stdin: ['1500'],
              expectedStdout: 'Porto: 6.90 Euro',
              failureHint:
                'Prüfe die Reihenfolge der Bedingungen. Steht eine weiter gefasste Bedingung zu weit oben?',
            },
          ],
          hiddenTests: [
            {
              id: 't3',
              name: 'Genau an der Grenze: 500 g',
              stdin: ['500'],
              expectedStdout: 'Porto: 2.75 Euro',
              failureHint:
                '"Bis einschließlich 500 g" bedeutet, dass 500 selbst noch zur ersten Stufe gehört.',
            },
            {
              id: 't4',
              name: 'Genau an der Grenze: 1000 g',
              stdin: ['1000'],
              expectedStdout: 'Porto: 4.50 Euro',
              failureHint: 'Auch hier gehört der Grenzwert noch zur jeweils günstigeren Stufe.',
            },
            {
              id: 't5',
              name: 'Schweres Paket mit 2500 g',
              stdin: ['2500'],
              expectedStdout: 'Porto: 10.90 Euro',
              failureHint: 'Über 2000 g greift der letzte Fall – dafür genügt ein else.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Mit welcher der vier Grenzen musst du beginnen, damit keine Stufe übersprungen wird?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Weil die Kette beim ersten Treffer endet, genügt in jeder Stufe die obere Grenze. Die untere ergibt sich aus den vorherigen Prüfungen.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: if bis 500, elif bis 1000, elif bis 2000, else für alles darüber. In jedem Zweig nur die Variable porto setzen, danach einmal ausgeben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die ersten beiden Stufen sehen so aus:',
              code: 'if gewicht <= 500:\n    porto = 2.75\nelif gewicht <= 1000:\n    porto = 4.50',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Die Kette wird von der kleinsten zur größten Grenze aufgebaut. Trifft eine Bedingung zu, überspringt Python alle weiteren. Deshalb bedeutet die zweite Bedingung in der Sache "über 500 und bis 1000", ohne dass man das ausschreiben muss. Alle vier Zweige setzen nur porto; die Ausgabe steht danach einmal am linken Rand.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['elif-kette', 'typumwandlung', 'f-string'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'bedingungen-verknuepfen',
      title: 'Bedingungen verknüpfen',
      learningObjectives: [
        'Du kannst mehrere Bedingungen mit and, or und not verknüpfen.',
        'Du kannst erklären, warum Python 0, "" und leere Listen wie False behandelt.',
        'Du kannst eine verschachtelte Bedingung in eine flache Bedingung mit and umformen.',
      ],
      everydayProblem:
        'Ein Ermäßigungstarif gilt für Personen unter 18 ODER ab 65. Ein Bonusprogramm gilt für Mitglieder, die zusätzlich mindestens fünf Bestellungen hatten. Beides braucht mehr als eine einzelne Prüfung.',
      mentalModel:
        'and und or verknüpfen zwei Wahrheitswerte zu einem neuen. Bei and müssen beide Seiten zutreffen, bei or genügt eine. not dreht das Ergebnis um. Praktisch hilfreich: Python prüft von links nach rechts und hört auf, sobald das Ergebnis feststeht. Steht links von einem and bereits False, wird die rechte Seite gar nicht mehr angeschaut. Zusätzlich behandelt Python bestimmte Werte wie Wahrheitswerte: 0, die leere Zeichenkette und leere Sammlungen gelten als False, alles andere als True. Das erklärt, warum "if name:" funktioniert, ohne dass dort ein Vergleich steht.',
      workedExample: {
        code: `alter = 70
ist_mitglied = True
bestellungen = 0

ermaessigt = alter < 18 or alter >= 65
bonus = ist_mitglied and bestellungen >= 5

print(ermaessigt)
print(bonus)
print(not ermaessigt)

if bestellungen:
    print("Es gibt Bestellungen")
else:
    print("Noch keine Bestellung")`,
        annotations: [
          {
            line: 5,
            text: 'or genügt eine zutreffende Seite. 70 ist nicht unter 18, aber mindestens 65 – also True.',
          },
          {
            line: 6,
            text: 'and verlangt beide Seiten. Die Mitgliedschaft stimmt, die Bestellzahl nicht – also False.',
          },
          {
            line: 10,
            text: 'not dreht das Ergebnis um: aus True wird False.',
          },
          {
            line: 12,
            text: 'Hier steht kein Vergleich. Python wertet die Zahl 0 als False – der else-Zweig läuft.',
          },
        ],
        output: 'True\nFalse\nFalse\nNoch keine Bestellung',
        trace: [
          {
            step: 1,
            description: '70 < 18 ist False, 70 >= 65 ist True.',
            state: 'ermaessigt = True',
          },
          {
            step: 2,
            description: 'True and False ergibt False.',
            state: 'bonus = False',
          },
          {
            step: 3,
            description: 'bestellungen ist 0 und gilt damit als False.',
            state: 'else-Zweig läuft',
          },
        ],
      },
      reflectionPrompts: [
        'Wann brauchst du and und wann or? Formuliere die Faustregel in eigenen Worten.',
        'Warum kann "if liste:" praktischer sein als "if len(liste) > 0:"?',
      ],
      commonMistakes: [
        {
          mistake: 'and und or verwechseln.',
          why: 'Im Alltagsdeutsch ist "und" oft aufzählend gemeint ("Kunden aus Berlin und Hamburg"), fachlich ist dort aber ein "oder" gefragt.',
          fix: 'Ein konkretes Beispiel je Seite durchdenken: Soll ein Fall reichen, ist es or. Müssen beide zutreffen, ist es and.',
        },
        {
          mistake: 'alter > 18 and < 65 schreiben.',
          why: 'Jede Seite eines and muss eine vollständige Bedingung sein. Die Variable muss auf beiden Seiten stehen.',
          fix: 'Ausschreiben: alter > 18 and alter < 65. In Python geht auch die Kurzform 18 < alter < 65.',
        },
      ],
      estimatedMinutes: 13,
      primaryConceptSlugs: ['logische-operatoren', 'truthiness', 'verschachtelte-bedingung'],
      supportingConceptSlugs: ['boolean', 'elif-kette'],
      prerequisiteConceptSlugs: ['vergleichsoperator', 'if-bedingung'],
      exercises: [
        {
          slug: 'e2-logik-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'and, or und not',
          prompt: 'Welche Ausgabe entsteht?',
          payload: {
            kind: 'predictOutput',
            code: `a = True\nb = False\nprint(a and b)\nprint(a or b)\nprint(not b)\nprint(a and not b)`,
            expectedOutput: 'False\nTrue\nTrue\nTrue',
            explanation:
              'and verlangt beide Seiten: True and False ergibt False. or genügt eine Seite, also True. not dreht False zu True um. In der letzten Zeile wird zuerst not b zu True ausgewertet, danach True and True – also True.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Werte in der letzten Zeile zuerst not b aus, bevor du das and betrachtest.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'not bindet stärker als and und or – es wird zuerst angewendet.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['logische-operatoren'],
        },
        {
          slug: 'e2-logik-truthiness',
          type: 'MULTIPLE_CHOICE',
          title: 'Was gilt als False?',
          prompt:
            'Welche Werte behandelt Python in einer Bedingung wie False? Es sind mehrere zutreffend.',
          payload: {
            kind: 'multipleChoice',
            options: [
              {
                id: 'a',
                text: 'Die Zahl 0',
                feedback:
                  'Richtig. Die Null gilt als False, jede andere Zahl als True – auch negative Zahlen.',
              },
              {
                id: 'b',
                text: 'Die leere Zeichenkette ""',
                feedback:
                  'Richtig. Deshalb funktioniert if eingabe: als Prüfung darauf, ob überhaupt etwas eingegeben wurde.',
              },
              {
                id: 'c',
                text: 'Die Zeichenkette "False"',
                feedback:
                  'Das ist ein Text mit fünf Zeichen und damit nicht leer. Er gilt als True. Eine typische Stolperfalle bei Eingaben.',
              },
              {
                id: 'd',
                text: 'Die leere Liste []',
                feedback:
                  'Richtig. Alle leeren Sammlungen gelten als False – Listen, Mengen und Dictionaries gleichermaßen.',
              },
            ],
            correctOptionIds: ['a', 'b', 'd'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was haben die Werte gemeinsam, die als False gelten?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Faustregel: leer oder null gilt als False. Alles, was einen Inhalt hat, gilt als True.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Achte besonders auf die Option mit dem Text in Anführungszeichen – dort ist etwas drin.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['truthiness', 'boolean'],
        },
        {
          slug: 'e2-logik-refactor',
          type: 'REFACTOR',
          title: 'Verschachtelung auflösen',
          prompt:
            'Das gezeigte Programm prüft, ob eine Person zwischen 18 und 64 Jahren alt ist. Es funktioniert, ist aber unnötig tief verschachtelt.\n\nSchreibe es so um, dass nur noch eine Ebene mit if und else übrig bleibt. Das Verhalten muss unverändert bleiben.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'keine-verschachtelung',
                description: 'Es gibt kein if innerhalb eines if-Blocks mehr.',
                mustNotMatch: '\\n\\s{4,}if\\b',
                message:
                  'Es steht noch ein eingerücktes if im Code. Fasse die beiden Bedingungen mit and zu einer zusammen.',
              },
              {
                id: 'and-verwendet',
                description: 'Die Bedingungen sind verknüpft.',
                mustMatch: '\\band\\b|<\\s*\\w+\\s*<',
                message:
                  'Verknüpfe die beiden Prüfungen mit and – oder nutze die Kurzform 18 <= alter <= 64.',
              },
            ],
          },
          starterCode: `alter = int(input("Alter: "))\n\nif alter >= 18:\n    if alter <= 64:\n        print("Regeltarif")\n    else:\n        print("Sondertarif")\nelse:\n    print("Sondertarif")\n`,
          solution: `alter = int(input("Alter: "))\n\nif alter >= 18 and alter <= 64:\n    print("Regeltarif")\nelse:\n    print("Sondertarif")`,
          solutionNotes:
            'Beide Bedingungen müssen zutreffen, damit "Regeltarif" erscheint – genau das drückt and aus. In der Ausgangsfassung stand die Zeile mit "Sondertarif" zweimal; nach dem Umbau nur noch einmal. Weniger Wiederholung bedeutet auch weniger Stellen, an denen eine spätere Änderung vergessen werden kann. Python erlaubt hier zusätzlich die Kurzform 18 <= alter <= 64.',
          publicTests: [
            {
              id: 't1',
              name: 'Mitte des Bereichs: 30 Jahre',
              stdin: ['30'],
              expectedStdout: 'Regeltarif',
              failureHint: 'Innerhalb des Bereichs muss weiterhin "Regeltarif" erscheinen.',
            },
            {
              id: 't2',
              name: 'Unterhalb des Bereichs: 15 Jahre',
              stdin: ['15'],
              expectedStdout: 'Sondertarif',
              failureHint: 'Unter 18 Jahren gilt der Sondertarif.',
            },
          ],
          hiddenTests: [
            {
              id: 't3',
              name: 'Untere Grenze: 18 Jahre',
              stdin: ['18'],
              expectedStdout: 'Regeltarif',
              failureHint: 'Die Grenze 18 gehört noch zum Regeltarif.',
            },
            {
              id: 't4',
              name: 'Obere Grenze: 64 Jahre',
              stdin: ['64'],
              expectedStdout: 'Regeltarif',
              failureHint: 'Die Grenze 64 gehört noch zum Regeltarif.',
            },
            {
              id: 't5',
              name: 'Oberhalb des Bereichs: 65 Jahre',
              stdin: ['65'],
              expectedStdout: 'Sondertarif',
              failureHint: 'Ab 65 Jahren gilt wieder der Sondertarif.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'In wie vielen Fällen erscheint "Sondertarif"? Und was haben diese Fälle gemeinsam?',
            },
            {
              level: 2,
              kind: 'concept',
              text: '"Regeltarif" erscheint nur, wenn beide Bedingungen gleichzeitig zutreffen. Genau das drückt and aus.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: ein einziges if mit beiden Bedingungen, verknüpft durch and, und ein else für alles andere.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die zusammengefasste Bedingung sieht so aus:',
              code: 'if alter >= 18 and alter <= 64:',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'In der Ausgangsfassung führen zwei verschiedene Wege zu "Sondertarif": ein Alter unter 18 und ein Alter über 64. Mit and lassen sich beide Wege zu einem else zusammenfassen, weil das Gegenteil von "beides trifft zu" genau "mindestens eines trifft nicht zu" ist. Die Kurzform 18 <= alter <= 64 ist eine Python-Besonderheit und bedeutet dasselbe.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 5,
          conceptSlugs: ['logische-operatoren', 'verschachtelte-bedingung'],
        },
        {
          slug: 'e2-logik-transfer',
          type: 'TRANSFER',
          title: 'Übertragen: Zugangsprüfung',
          prompt:
            'Ein Onlinekurs ist zugänglich, wenn eine Person angemeldet ist UND entweder eine Mitgliedschaft hat ODER einen gültigen Gutscheincode.\n\nDas Programm liest nacheinander drei Antworten ein (jeweils "ja" oder "nein"): angemeldet, Mitglied, Gutschein. Gib danach genau eine Zeile aus – "Zugang" oder "Kein Zugang".\n\nAchtung: Die Klammersetzung entscheidet hier über das Ergebnis.',
          transferContext:
            'Dieselben Operatoren wie beim Ermäßigungstarif, aber mit einer Mischung aus and und or, bei der die Klammerung nicht mehr egal ist.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'beide-operatoren',
                description: 'Beide Verknüpfungen kommen vor.',
                mustMatch: '\\band\\b',
                message: 'Die Anmeldung ist in jedem Fall nötig – das verlangt ein and.',
              },
            ],
          },
          starterCode:
            'angemeldet = input("Angemeldet? ") == "ja"\nmitglied = input("Mitglied? ") == "ja"\ngutschein = input("Gutschein? ") == "ja"\n\n# Lege hier die Variable zugang an und gib das Ergebnis aus\n',
          solution: `angemeldet = input("Angemeldet? ") == "ja"\nmitglied = input("Mitglied? ") == "ja"\ngutschein = input("Gutschein? ") == "ja"\n\nzugang = angemeldet and (mitglied or gutschein)\n\nif zugang:\n    print("Zugang")\nelse:\n    print("Kein Zugang")`,
          solutionNotes:
            'Die Klammer ist hier entscheidend. Ohne sie würde Python zuerst angemeldet and mitglied auswerten und das Ergebnis mit or gutschein verknüpfen – dann bekäme jemand mit Gutschein auch ohne Anmeldung Zugang. Die Klammer macht die Absicht außerdem beim Lesen sofort erkennbar.',
          publicTests: [
            {
              id: 't1',
              name: 'Angemeldet mit Gutschein',
              stdin: ['ja', 'nein', 'ja'],
              expectedStdout: 'Zugang',
              failureHint:
                'Eine angemeldete Person mit Gutschein soll Zugang bekommen, auch ohne Mitgliedschaft.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Nicht angemeldet, aber mit Gutschein',
              stdin: ['nein', 'nein', 'ja'],
              expectedStdout: 'Kein Zugang',
              failureHint:
                'Prüfe die Klammerung: Ohne Klammer bindet and stärker als or, und die Anmeldung wird umgangen.',
            },
            {
              id: 't3',
              name: 'Angemeldet mit Mitgliedschaft',
              stdin: ['ja', 'ja', 'nein'],
              expectedStdout: 'Zugang',
              failureHint: 'Eine Mitgliedschaft ersetzt den Gutschein.',
            },
            {
              id: 't4',
              name: 'Angemeldet, aber weder Mitglied noch Gutschein',
              stdin: ['ja', 'nein', 'nein'],
              expectedStdout: 'Kein Zugang',
              failureHint: 'Die Anmeldung allein reicht nicht aus.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Bedingung ist unverzichtbar, und welche beiden sind austauschbar?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'and bindet stärker als or. Ohne Klammer wertet Python deshalb zuerst die and-Verknüpfung aus.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: die unverzichtbare Bedingung mit and, die austauschbaren beiden in einer Klammer mit or.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Der austauschbare Teil sieht so aus:',
              code: '(mitglied or gutschein)',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Der Ausdruck lautet angemeldet and (mitglied or gutschein). Ohne Klammer würde Python (angemeldet and mitglied) or gutschein rechnen. Bei angemeldet = False und gutschein = True käme dann True heraus – jemand ohne Anmeldung bekäme Zugang. Genau das prüft einer der versteckten Tests.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 6,
          conceptSlugs: ['logische-operatoren', 'boolean'],
        },
      ],
    },
  ],
};
