import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Stufe 3 – Wiederholungen.
 *
 * Schleifen sind der Punkt, an dem viele Lernende abspringen. Deshalb steht
 * hier das schrittweise Nachvollziehen im Vordergrund: In fast jeder Aufgabe
 * wird zuerst der Zustand der Variablen betrachtet und erst danach Code
 * geschrieben.
 */
export const modulSchleifen: ModuleDraft = {
  slug: 'schleifen',
  title: 'Schleifen',
  summary:
    'for, while, range(), Zähler und Akkumulatoren – damit sich wiederholende Arbeit einmal beschrieben und beliebig oft ausgeführt werden kann.',
  rationale:
    'Schleifen sind der erste Punkt, an dem Programme kürzer werden als die Aufgabe, die sie lösen. Sie setzen Bedingungen voraus – deshalb kommen sie nach Modul 2 – und sind Grundlage für praktisch alle späteren Themen von der Datenauswertung bis zur Automatisierung.',
  prerequisiteModuleSlugs: ['entscheidungen'],
  lessons: [
    // ---------------------------------------------------------------------
    {
      slug: 'for-schleife-ueber-listen',
      title: 'Die for-Schleife',
      learningObjectives: [
        'Du kannst eine for-Schleife verwenden, um jedes Element einer Liste genau einmal zu verarbeiten.',
        'Du kannst benennen, welchen Wert die Laufvariable in jedem Durchlauf hat.',
        'Du kannst an der Einrückung ablesen, welche Zeilen in jedem Durchlauf ausgeführt werden und welche nur einmal danach.',
      ],
      everydayProblem:
        'Du hast eine Liste mit 100 Rechnungsbeträgen und möchtest jeden davon um die Mehrwertsteuer ergänzen. Hundert einzelne Zeilen zu schreiben ist nicht nur mühsam – bei einer Änderung müsstest du sie alle anfassen.',
      mentalModel:
        'Eine for-Schleife ist wie ein Stapel Belege, den du der Reihe nach abarbeitest. Du nimmst einen Beleg vom Stapel, legst ihn vor dich hin, machst damit dasselbe wie mit jedem anderen, und greifst dann zum nächsten. Die Laufvariable ist der Platz vor dir: In jedem Durchlauf liegt dort ein anderer Wert. Wenn der Stapel leer ist, endet die Schleife von selbst – du musst nicht mitzählen. Genau das ist der Unterschied zur while-Schleife, die später kommt.',
      workedExample: {
        code: `betraege = [120, 45, 300]

for betrag in betraege:
    brutto = betrag * 1.19
    print(f"{betrag} Euro netto sind {brutto:.2f} Euro brutto")

print("Alle Beträge verarbeitet")`,
        annotations: [
          {
            line: 1,
            text: 'Eine Liste steht in eckigen Klammern, die Werte werden durch Kommas getrennt.',
          },
          {
            line: 3,
            text: 'betrag ist die Laufvariable. Sie bekommt in jedem Durchlauf den nächsten Wert aus der Liste. Der Name ist frei wählbar.',
          },
          {
            line: 4,
            text: 'Diese Zeile ist eingerückt und läuft deshalb dreimal – einmal je Listenelement.',
          },
          {
            line: 7,
            text: 'Diese Zeile steht am linken Rand. Sie läuft erst, nachdem die Schleife vollständig durch ist, und nur ein einziges Mal.',
          },
        ],
        output:
          '120 Euro netto sind 142.80 Euro brutto\n45 Euro netto sind 53.55 Euro brutto\n300 Euro netto sind 357.00 Euro brutto\nAlle Beträge verarbeitet',
        trace: [
          { step: 1, description: 'Erster Durchlauf.', state: 'betrag = 120, brutto = 142.8' },
          { step: 2, description: 'Zweiter Durchlauf.', state: 'betrag = 45, brutto = 53.55' },
          { step: 3, description: 'Dritter Durchlauf.', state: 'betrag = 300, brutto = 357.0' },
          {
            step: 4,
            description: 'Liste ist zu Ende, Schleife endet.',
            state: 'Zeile 7 läuft einmal',
          },
        ],
      },
      reflectionPrompts: [
        'Woran erkennst du, ob eine Zeile in jedem Durchlauf oder nur einmal am Ende läuft?',
        'Woran würdest du künftig erkennen, dass eine Aufgabe eine Schleife braucht?',
      ],
      commonMistakes: [
        {
          mistake: 'Die abschließende Ausgabe versehentlich mit einrücken.',
          why: 'Eingerückte Zeilen gehören zum Schleifenrumpf und laufen dann in jedem Durchlauf.',
          fix: 'Vor dem Ausführen fragen: Soll das einmal passieren oder je Element? Danach die Einrückung setzen.',
        },
        {
          mistake: 'Die Laufvariable außerhalb der Schleife weiterverwenden.',
          why: 'Nach der Schleife enthält sie nur noch den letzten Wert – nicht alle.',
          fix: 'Werte, die nach der Schleife gebraucht werden, in einer eigenen Variable sammeln.',
        },
        {
          mistake: 'Den Doppelpunkt am Ende der for-Zeile vergessen.',
          why: 'Ohne Doppelpunkt erkennt Python den Blockanfang nicht und meldet einen SyntaxError.',
          fix: 'Wie bei if gilt: Jede Zeile, die einen Block eröffnet, endet mit einem Doppelpunkt.',
        },
      ],
      estimatedMinutes: 14,
      primaryConceptSlugs: ['liste', 'for-schleife'],
      supportingConceptSlugs: ['f-string', 'code-tracing'],
      prerequisiteConceptSlugs: ['variable', 'if-bedingung'],
      exercises: [
        {
          slug: 'e3-for-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Wie oft läuft was?',
          prompt: 'Welche Ausgabe entsteht?',
          payload: {
            kind: 'predictOutput',
            code: `farben = ["rot", "gruen", "blau"]\n\nfor farbe in farben:\n    print(farbe)\n\nprint("Ende")`,
            expectedOutput: 'rot\ngruen\nblau\nEnde',
            explanation:
              'Die eingerückte Zeile läuft dreimal, einmal je Element. Die Laufvariable farbe enthält nacheinander "rot", "gruen" und "blau". Die letzte Zeile steht am linken Rand und läuft erst nach der Schleife – genau einmal.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wie viele Elemente hat die Liste, und wie viele Zeilen sind eingerückt?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Eingerückte Zeilen laufen je Durchlauf, nicht eingerückte danach einmal.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['for-schleife', 'code-tracing'],
        },
        {
          slug: 'e3-for-einrueckung-fehler',
          type: 'FIND_ERROR',
          title: 'Falsch eingerückt',
          prompt:
            'Dieses Programm soll die Summe erst am Ende einmal ausgeben, druckt sie aber nach jedem Element. Markiere die Zeile, die dafür verantwortlich ist.',
          payload: {
            kind: 'findError',
            codeLines: [
              'zahlen = [4, 8, 15]',
              'summe = 0',
              'for zahl in zahlen:',
              '    summe = summe + zahl',
              '    print(summe)',
            ],
            faultyLineNumbers: [5],
            explanation:
              'Zeile 5 ist eingerückt und gehört damit zum Schleifenrumpf. Sie läuft deshalb bei jedem Durchlauf. Soll die Summe nur einmal am Ende erscheinen, muss die Zeile an den linken Rand – dann läuft sie erst, wenn die Schleife vollständig durch ist.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche der Zeilen soll nur ein einziges Mal laufen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die Einrückung entscheidet über die Zugehörigkeit zum Schleifenrumpf – auch bei der Ausgabe.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['for-schleife', 'akkumulator'],
        },
        {
          slug: 'e3-for-parsons',
          type: 'PARSONS',
          title: 'Namen begrüßen',
          prompt:
            'Ordne die Zeilen so an, dass jeder Name aus der Liste einmal begrüßt wird und danach eine einzelne Abschlusszeile erscheint. Achte auf die Einrückung.',
          payload: {
            kind: 'parsons',
            lines: [
              { id: 's1', code: 'namen = ["Mira", "Jonas"]', indent: 0, distractor: false },
              { id: 's2', code: 'for name in namen:', indent: 0, distractor: false },
              { id: 's3', code: 'print(f"Hallo {name}")', indent: 1, distractor: false },
              { id: 's4', code: 'print("Fertig")', indent: 0, distractor: false },
              { id: 's5', code: 'for name in "namen":', indent: 0, distractor: true },
            ],
            correctOrder: ['s1', 's2', 's3', 's4'],
            checkIndentation: true,
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Zeile soll je Name laufen, welche nur einmal?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Anführungszeichen um einen Variablennamen machen daraus Text. Eine Schleife über Text läuft über die einzelnen Zeichen.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Liste anlegen, for-Zeile mit Doppelpunkt, eingerückte Begrüßung, nicht eingerückte Abschlusszeile.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['for-schleife', 'liste'],
        },
        {
          slug: 'e3-for-schreiben',
          type: 'WRITE_CODE',
          title: 'Alle Beträge ausgeben',
          prompt:
            'Gegeben ist die Liste preise = [12.5, 8.0, 23.9].\n\nGib für jeden Preis eine Zeile im Format aus:\n\nPreis: 12.50 Euro\n\nGib danach genau eine Abschlusszeile aus:\n\n3 Preise verarbeitet\n\nDie Anzahl soll aus der Liste ermittelt werden, nicht fest eingetragen sein.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'schleife',
                description: 'Es wird eine Schleife verwendet.',
                mustMatch: '\\bfor\\b',
                message:
                  'Es fehlt noch die Schleife. Ohne sie müsstest du für jeden Preis eine eigene Zeile schreiben.',
              },
              {
                id: 'len',
                description: 'Die Anzahl wird aus der Liste ermittelt.',
                mustMatch: 'len\\(',
                message:
                  'Ermittle die Anzahl mit len(preise). Eine fest eingetragene 3 stimmt nicht mehr, sobald sich die Liste ändert.',
              },
            ],
          },
          starterCode: 'preise = [12.5, 8.0, 23.9]\n',
          solution: `preise = [12.5, 8.0, 23.9]\n\nfor preis in preise:\n    print(f"Preis: {preis:.2f} Euro")\n\nprint(f"{len(preise)} Preise verarbeitet")`,
          solutionNotes:
            'Die Ausgabe im Rumpf ist eingerückt und läuft je Element. Die Abschlusszeile steht am linken Rand und läuft einmal. len(preise) liefert die Anzahl der Elemente – dadurch bleibt das Programm auch bei einer längeren Liste richtig.',
          publicTests: [
            {
              id: 't1',
              name: 'Alle Preise und die Abschlusszeile erscheinen',
              expectedStdout:
                'Preis: 12.50 Euro\nPreis: 8.00 Euro\nPreis: 23.90 Euro\n3 Preise verarbeitet',
              failureHint:
                'Achte auf zwei Nachkommastellen und darauf, dass die Abschlusszeile nur einmal erscheint.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Funktioniert auch mit einer längeren Liste',
              setup: '',
              assertion: 'assert len(preise) == 3, "Die Liste preise soll unverändert bleiben"',
              failureHint: 'Die vorgegebene Liste soll nicht verändert werden.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Ausgabe soll je Preis erscheinen, welche nur einmal am Ende?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die Einrückung entscheidet. len() liefert die Anzahl der Elemente einer Liste.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: for-Zeile über die Liste, eingerückte Ausgabe je Preis, danach eine nicht eingerückte Abschlusszeile mit len().',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die Ausgabe im Rumpf sieht so aus:',
              code: 'print(f"Preis: {preis:.2f} Euro")',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Die Laufvariable preis enthält nacheinander 12.5, 8.0 und 23.9. Die Formatangabe :.2f erzeugt jeweils zwei Nachkommastellen, deshalb erscheint 8.00 statt 8.0. Die Abschlusszeile steht am linken Rand und läuft erst nach dem letzten Durchlauf. len(preise) ergibt 3 – und bliebe auch bei einer geänderten Liste richtig.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['for-schleife', 'liste', 'f-string'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'zaehlen-und-summieren',
      title: 'Zählen und summieren',
      learningObjectives: [
        'Du kannst mit range() eine Schleife über eine feste Anzahl von Durchläufen schreiben.',
        'Du kannst einen Zähler und einen Akkumulator korrekt vor der Schleife anlegen und im Rumpf fortschreiben.',
        'Du kannst erklären, warum der Startwert vor und nicht in der Schleife stehen muss.',
      ],
      everydayProblem:
        'Aus einer Liste von Bestellungen soll die Gesamtsumme ermittelt werden – und zusätzlich, wie viele davon über 100 Euro lagen. Beides sind Werte, die sich erst im Laufe der Schleife ergeben.',
      mentalModel:
        'Ein Akkumulator ist ein Sammelbehälter, der vor Beginn leer bereitgestellt wird. In jedem Durchlauf kommt etwas hinein. Am Ende steht das Gesamtergebnis darin. Ein Zähler funktioniert genauso, nur dass immer 1 hineinkommt. Der häufigste Fehler dabei: Der Behälter wird versehentlich im Schleifenrumpf aufgestellt – dann wird er in jedem Durchlauf neu geleert, und am Ende steht nur der letzte Wert darin. range() ist der Gegenpart: Es erzeugt die Zahlen, über die gelaufen wird, wenn es keine fertige Liste gibt.',
      workedExample: {
        code: `bestellungen = [45, 120, 89, 250]

summe = 0
grosse_bestellungen = 0

for betrag in bestellungen:
    summe = summe + betrag
    if betrag > 100:
        grosse_bestellungen = grosse_bestellungen + 1

print(f"Summe: {summe} Euro")
print(f"Davon ueber 100 Euro: {grosse_bestellungen}")`,
        annotations: [
          {
            line: 3,
            text: 'Der Akkumulator startet bei 0. Dieser Startwert muss VOR der Schleife stehen, sonst würde er in jedem Durchlauf zurückgesetzt.',
          },
          {
            line: 7,
            text: 'Der aktuelle Betrag kommt zur bisherigen Summe hinzu. Kurzform: summe += betrag.',
          },
          {
            line: 8,
            text: 'Ein if innerhalb der Schleife. Es wird in jedem Durchlauf geprüft und entscheidet nur über das Hochzählen.',
          },
          {
            line: 9,
            text: 'Diese Zeile ist doppelt eingerückt: einmal für die Schleife, einmal für die Bedingung.',
          },
        ],
        output: 'Summe: 504 Euro\nDavon ueber 100 Euro: 2',
        trace: [
          { step: 1, description: 'Start.', state: 'summe = 0, gross = 0' },
          { step: 2, description: 'betrag = 45.', state: 'summe = 45, gross = 0' },
          { step: 3, description: 'betrag = 120, über 100.', state: 'summe = 165, gross = 1' },
          { step: 4, description: 'betrag = 89.', state: 'summe = 254, gross = 1' },
          { step: 5, description: 'betrag = 250, über 100.', state: 'summe = 504, gross = 2' },
        ],
      },
      reflectionPrompts: [
        'Was würde passieren, wenn summe = 0 innerhalb der Schleife stünde?',
        'Woran erkennst du, ob eine Aufgabe einen Zähler oder einen Akkumulator braucht?',
      ],
      commonMistakes: [
        {
          mistake: 'Den Startwert in den Schleifenrumpf setzen.',
          why: 'Der Behälter wird dann in jedem Durchlauf neu geleert. Am Ende steht nur das Ergebnis des letzten Durchlaufs darin.',
          fix: 'Startwerte gehören immer vor die Schleife, auf dieselbe Einrückungsebene wie das for.',
        },
        {
          mistake: 'range(1, 5) für fünf Durchläufe verwenden.',
          why: 'Der Endwert gehört nicht mehr dazu. range(1, 5) liefert 1, 2, 3, 4 – also vier Werte.',
          fix: 'Für n Durchläufe genügt range(n). Bei range(a, b) ist die Anzahl b minus a.',
        },
      ],
      estimatedMinutes: 15,
      primaryConceptSlugs: ['range-funktion', 'zaehler-variable', 'akkumulator'],
      supportingConceptSlugs: ['for-schleife', 'if-bedingung'],
      prerequisiteConceptSlugs: ['for-schleife', 'if-bedingung'],
      exercises: [
        {
          slug: 'e3-range-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Was liefert range()?',
          prompt: 'Welche Ausgabe entsteht?',
          payload: {
            kind: 'predictOutput',
            code: `for i in range(3):\n    print(i)\n\nprint("---")\n\nfor i in range(2, 5):\n    print(i)`,
            expectedOutput: '0\n1\n2\n---\n2\n3\n4',
            explanation:
              'range(3) beginnt bei 0 und liefert drei Werte: 0, 1, 2. Die Zahl in der Klammer ist die Anzahl, nicht der letzte Wert. range(2, 5) beginnt bei 2 und endet vor 5, liefert also 2, 3 und 4.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Bei welcher Zahl beginnt range(3) – und bei welcher hört es auf?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'range() zählt ab 0 und lässt den Endwert immer weg. Deshalb liefert range(3) genau drei Werte.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['range-funktion'],
        },
        {
          slug: 'e3-akkumulator-fehler',
          type: 'FIND_ERROR',
          title: 'Der Sammelbehälter wird geleert',
          prompt:
            'Dieses Programm soll die Summe aller Zahlen ausgeben, liefert aber immer nur die letzte. Markiere die Zeile mit der Ursache.',
          payload: {
            kind: 'findError',
            codeLines: [
              'zahlen = [10, 20, 30]',
              'for zahl in zahlen:',
              '    summe = 0',
              '    summe = summe + zahl',
              'print(summe)',
            ],
            faultyLineNumbers: [3],
            explanation:
              'Zeile 3 steht im Schleifenrumpf. Der Startwert wird dadurch in jedem Durchlauf neu gesetzt, und die bisherige Summe geht verloren. Am Ende enthält summe nur den letzten Wert, also 30. Der Startwert gehört vor die Schleife auf dieselbe Einrückungsebene wie das for.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Gehe die Schleife im Kopf durch und notiere nach jedem Durchlauf den Wert von summe.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Sammelbehälter darf nur einmal aufgestellt werden – nicht in jedem Durchlauf neu.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Prüfe die Einrückung jeder Zeile: Welche gehört in den Rumpf, welche davor?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['akkumulator', 'for-schleife'],
        },
        {
          slug: 'e3-zaehler-luecken',
          type: 'CODE_COMPLETION',
          title: 'Zähler vervollständigen',
          prompt:
            'Ergänze die Lücken so, dass gezählt wird, wie viele Zahlen der Liste größer als 10 sind.',
          payload: {
            kind: 'codeCompletion',
            template: `zahlen = [4, 15, 8, 23]\nanzahl = {{blank:start}}\n\nfor zahl in zahlen:\n    if zahl > 10:\n        anzahl = {{blank:erhoehung}}\n\nprint(anzahl)`,
            blanks: [
              {
                id: 'start',
                accepted: ['0'],
                caseSensitive: true,
                description: 'Startwert des Zählers',
                wrongHint:
                  'Bevor irgendetwas gezählt wurde, ist die Anzahl null. Womit muss der Zähler also beginnen?',
              },
              {
                id: 'erhoehung',
                accepted: ['anzahl + 1', 'anzahl+1'],
                caseSensitive: true,
                description: 'Erhöhung um eins',
                wrongHint:
                  'Der neue Wert entsteht aus dem alten plus eins. Der alte Wert muss dafür auf der rechten Seite auftauchen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wie viele Treffer gibt es, bevor die Schleife startet?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Zähler ist ein Akkumulator, bei dem in jedem Treffer genau 1 hinzukommt.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 3,
          conceptSlugs: ['zaehler-variable', 'for-schleife'],
        },
        {
          slug: 'e3-summe-schreiben',
          type: 'WRITE_CODE',
          title: 'Summe und Durchschnitt',
          prompt:
            'Gegeben ist die Liste temperaturen = [18, 21, 25, 19, 22].\n\nBerechne mit einer Schleife die Summe und daraus den Durchschnitt. Gib genau zwei Zeilen aus:\n\nSumme: 105\nDurchschnitt: 21.0\n\nVerwende die eingebaute Funktion sum() nicht – hier geht es darum, den Akkumulator selbst zu schreiben.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'kein-sum',
                description: 'Die Summe wird selbst gebildet.',
                mustNotMatch: '\\bsum\\s*\\(',
                message:
                  'In dieser Aufgabe soll der Akkumulator selbst geschrieben werden. sum() ist deshalb hier nicht erlaubt.',
              },
              {
                id: 'schleife',
                description: 'Es wird eine Schleife verwendet.',
                mustMatch: '\\bfor\\b',
                message: 'Ohne Schleife müsstest du jeden Wert einzeln addieren.',
              },
            ],
          },
          starterCode: 'temperaturen = [18, 21, 25, 19, 22]\n',
          solution: `temperaturen = [18, 21, 25, 19, 22]\n\nsumme = 0\nfor temperatur in temperaturen:\n    summe = summe + temperatur\n\ndurchschnitt = summe / len(temperaturen)\n\nprint(f"Summe: {summe}")\nprint(f"Durchschnitt: {durchschnitt}")`,
          solutionNotes:
            'Der Startwert 0 steht vor der Schleife. Die Division steht danach – sie darf erst laufen, wenn alle Werte aufsummiert sind. Der Operator / liefert eine Kommazahl, deshalb erscheint 21.0 und nicht 21.',
          publicTests: [
            {
              id: 't1',
              name: 'Summe und Durchschnitt stimmen',
              expectedStdout: 'Summe: 105\nDurchschnitt: 21.0',
              failureHint:
                'Erwartet werden genau zwei Zeilen. Prüfe, ob die Division nach der Schleife steht und nicht darin.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Der Durchschnitt ist aus der Summe abgeleitet',
              assertion:
                'assert abs(durchschnitt - summe / len(temperaturen)) < 0.0001, "durchschnitt passt nicht zu summe und Listenlaenge"',
              failureHint:
                'Der Durchschnitt soll aus der berechneten Summe und der Listenlänge entstehen, nicht als feste Zahl.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wann kannst du frühestens teilen – währenddessen oder erst danach?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Erst sammeln, dann auswerten. Der Startwert steht vor der Schleife, die Division dahinter.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: summe = 0, Schleife mit Addition im Rumpf, danach durchschnitt berechnen, dann zwei Ausgaben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Der Rumpf der Schleife sieht so aus:',
              code: 'summe = summe + temperatur',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Die Variable summe wird vor der Schleife auf 0 gesetzt und in jedem Durchlauf um den aktuellen Wert erhöht. Nach dem letzten Durchlauf enthält sie 105. Erst danach folgt die Division durch len(temperaturen), also durch 5. Weil / immer eine Kommazahl liefert, erscheint 21.0. Stünde die Division im Rumpf, würde sie viermal zu früh ausgeführt.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['akkumulator', 'for-schleife', 'arithmetik'],
        },
        {
          slug: 'e3-range-transfer',
          type: 'TRANSFER',
          title: 'Übertragen: Sparplan',
          prompt:
            'Jemand legt jeden Monat 150 Euro zurück. Gib für die ersten 6 Monate je eine Zeile aus, die den Monat und den bis dahin angesparten Betrag zeigt:\n\nMonat 1: 150 Euro\nMonat 2: 300 Euro\n...\n\nEs gibt keine fertige Liste – nutze range().',
          transferContext:
            'Derselbe Akkumulator wie bei der Temperatursumme, aber ohne vorhandene Liste. Die Durchläufe müssen mit range() erzeugt werden.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'range',
                description: 'Die Durchläufe werden mit range() erzeugt.',
                mustMatch: 'range\\(',
                message:
                  'Ohne Liste braucht es range(), um eine feste Anzahl von Durchläufen zu erzeugen.',
              },
            ],
          },
          starterCode: 'rate = 150\nmonate = 6\n',
          solution: `rate = 150\nmonate = 6\n\nangespart = 0\nfor monat in range(1, monate + 1):\n    angespart = angespart + rate\n    print(f"Monat {monat}: {angespart} Euro")`,
          solutionNotes:
            'range(1, monate + 1) liefert 1 bis 6, weil der Endwert nicht mehr dazugehört. Wer bei range(monate) bleibt, bekommt 0 bis 5 und müsste in der Ausgabe monat + 1 schreiben – beides ist richtig, die erste Variante liest sich näher an der Aufgabenstellung.',
          publicTests: [
            {
              id: 't1',
              name: 'Sechs Zeilen mit wachsendem Betrag',
              expectedStdout:
                'Monat 1: 150 Euro\nMonat 2: 300 Euro\nMonat 3: 450 Euro\nMonat 4: 600 Euro\nMonat 5: 750 Euro\nMonat 6: 900 Euro',
              failureHint:
                'Achte auf die Nummerierung ab 1 und darauf, dass der Betrag von Zeile zu Zeile wächst.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Der Endstand ist korrekt',
              assertion: 'assert angespart == 900, "Nach sechs Monaten sind 900 Euro angespart"',
              failureHint:
                'Der Akkumulator soll nach dem letzten Durchlauf den Gesamtbetrag enthalten.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wächst der Betrag in jeder Zeile um dieselbe Rate – und was muss dafür zwischen den Durchläufen erhalten bleiben?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Wie bei der Temperatursumme: Startwert vor der Schleife, Erhöhung im Rumpf. Neu ist nur, dass range() die Durchläufe liefert.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: angespart = 0, for monat in range(1, monate + 1), im Rumpf erst erhöhen, dann ausgeben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die Schleifenzeile für die Monate 1 bis 6 sieht so aus:',
              code: 'for monat in range(1, monate + 1):',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Weil der Endwert bei range() nicht mehr dazugehört, muss er um eins über dem gewünschten letzten Wert liegen: range(1, 7) liefert 1 bis 6. Im Rumpf wird zuerst erhöht und dann ausgegeben – sonst stünde in der ersten Zeile 0 Euro statt 150. Der Akkumulator angespart behält seinen Wert über die Durchläufe hinweg, weil er außerhalb der Schleife angelegt wurde.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 6,
          conceptSlugs: ['range-funktion', 'akkumulator', 'f-string'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'while-schleife',
      title: 'Die while-Schleife',
      learningObjectives: [
        'Du kannst eine while-Schleife schreiben, deren Anzahl an Durchläufen erst zur Laufzeit feststeht.',
        'Du kannst benennen, welche Variable sich im Rumpf ändern muss, damit die Schleife endet.',
        'Du kannst eine Endlosschleife erkennen und ihre Ursache benennen.',
      ],
      everydayProblem:
        'Ein Programm soll so lange nach einer Zahl fragen, bis eine gültige eingegeben wurde. Wie oft das nötig sein wird, weiß niemand vorher – eine for-Schleife hilft hier nicht weiter.',
      mentalModel:
        'Die while-Schleife ist eine Drehtür mit Kontrolle: Vor jedem Durchgang wird geprüft, ob die Bedingung noch zutrifft. Trifft sie nicht mehr zu, geht es geradeaus weiter. Die entscheidende Frage bei jeder while-Schleife lautet: Welche Variable steht in der Bedingung, und wo im Rumpf verändert sie sich? Findet sich keine solche Stelle, dreht sich die Tür für immer. Merkregel für die Wahl: Steht die Anzahl der Durchläufe vorher fest, nimm for. Hängt sie von einem Ergebnis ab, nimm while.',
      workedExample: {
        code: `guthaben = 100
monat = 0

while guthaben >= 30:
    guthaben = guthaben - 30
    monat = monat + 1
    print(f"Nach Monat {monat}: {guthaben} Euro")

print(f"Rest: {guthaben} Euro")`,
        annotations: [
          {
            line: 4,
            text: 'Die Bedingung wird VOR jedem Durchlauf geprüft. Trifft sie schon beim ersten Mal nicht zu, läuft der Rumpf kein einziges Mal.',
          },
          {
            line: 5,
            text: 'Hier verändert sich die Variable aus der Bedingung. Ohne diese Zeile liefe die Schleife endlos.',
          },
          {
            line: 9,
            text: 'Diese Zeile läuft erst, wenn die Bedingung nicht mehr zutrifft – der Rest liegt dann unter 30.',
          },
        ],
        output:
          'Nach Monat 1: 70 Euro\nNach Monat 2: 40 Euro\nNach Monat 3: 10 Euro\nRest: 10 Euro',
        trace: [
          { step: 1, description: '100 >= 30, Rumpf läuft.', state: 'guthaben = 70, monat = 1' },
          { step: 2, description: '70 >= 30, Rumpf läuft.', state: 'guthaben = 40, monat = 2' },
          { step: 3, description: '40 >= 30, Rumpf läuft.', state: 'guthaben = 10, monat = 3' },
          { step: 4, description: '10 >= 30 ist False.', state: 'Schleife endet' },
        ],
      },
      reflectionPrompts: [
        'Welche Variable müsste sich ändern, damit diese Schleife endet – und tut sie das?',
        'Woran entscheidest du künftig zwischen for und while?',
      ],
      commonMistakes: [
        {
          mistake: 'Die Variable aus der Bedingung im Rumpf nicht verändern.',
          why: 'Die Bedingung bleibt dann für immer True. Das Programm läuft weiter, bis es abgebrochen wird.',
          fix: 'Nach dem Schreiben jeder while-Schleife die Bedingung ansehen und im Rumpf die Stelle suchen, die den Wert verändert.',
        },
        {
          mistake: 'Die Startwerte vergessen.',
          why: 'Steht die Variable aus der Bedingung noch nirgends, meldet Python beim ersten Prüfen einen NameError.',
          fix: 'Alle Variablen der Bedingung vor der Schleife anlegen.',
        },
        {
          mistake: 'while verwenden, wo eine feste Anzahl bekannt ist.',
          why: 'Das erzeugt unnötigen Aufwand für Zähler und Abbruch – und damit mehr Fehlerquellen.',
          fix: 'Bei bekannter Anzahl for mit range() nehmen.',
        },
      ],
      estimatedMinutes: 15,
      primaryConceptSlugs: ['while-schleife', 'endlosschleife'],
      supportingConceptSlugs: ['if-bedingung', 'zaehler-variable'],
      prerequisiteConceptSlugs: ['for-schleife', 'if-bedingung'],
      exercises: [
        {
          slug: 'e3-while-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Wie oft läuft die Schleife?',
          prompt: 'Welche Ausgabe entsteht?',
          payload: {
            kind: 'predictOutput',
            code: `zahl = 5\n\nwhile zahl > 0:\n    print(zahl)\n    zahl = zahl - 2\n\nprint("Ende")`,
            expectedOutput: '5\n3\n1\nEnde',
            explanation:
              'Die Bedingung wird vor jedem Durchlauf geprüft. Ausgegeben wird jeweils der Wert VOR der Verringerung: 5, dann 3, dann 1. Nach dem dritten Durchlauf ist zahl gleich -1, die Bedingung trifft nicht mehr zu und die Schleife endet.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Schreibe nach jedem Durchlauf auf, welchen Wert zahl hat und ob die Bedingung noch zutrifft.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die Ausgabe steht vor der Verringerung. Ausgegeben wird also jeweils der aktuelle Wert, nicht der neue.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['while-schleife', 'code-tracing'],
        },
        {
          slug: 'e3-while-endlos',
          type: 'EXPLAIN_ERROR',
          title: 'Warum endet das nie?',
          prompt:
            'Der gezeigte Code läuft endlos und muss abgebrochen werden. Erkläre in eigenen Worten, woran das liegt und was fehlt.',
          payload: {
            kind: 'freeText',
            code: 'anzahl = 0\n\nwhile anzahl < 5:\n    print("Durchlauf")',
            requiredKeywordGroups: [
              {
                id: 'variable',
                anyOf: ['anzahl', 'variable', 'zaehler', 'zähler'],
                missingHint:
                  'Benenne die Variable, die in der Bedingung steht und über das Ende entscheidet.',
              },
              {
                id: 'veraenderung',
                anyOf: [
                  'wird nicht',
                  'nicht verändert',
                  'nicht veraendert',
                  'nicht erhöht',
                  'nicht erhoeht',
                  'bleibt',
                  'unverändert',
                  'unverandert',
                  'fehlt',
                ],
                missingHint:
                  'Sage ausdrücklich, was mit dieser Variable im Schleifenrumpf passiert – oder eben nicht passiert.',
              },
            ],
            minLength: 60,
            sampleAnswer:
              'Die Bedingung prüft die Variable anzahl. Im Schleifenrumpf wird anzahl aber nie verändert – sie bleibt bei 0. Damit ist anzahl < 5 in jedem Durchlauf wieder True, und die Schleife endet nie. Es fehlt eine Zeile im Rumpf, die anzahl erhöht, zum Beispiel anzahl = anzahl + 1.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Variable steht in der Bedingung – und wo im Rumpf ändert sie sich?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Eine while-Schleife endet nur, wenn sich der Wert in der Bedingung so verändert, dass sie irgendwann False ergibt.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zwei Punkte gehören in die Antwort: welche Variable betroffen ist und was mit ihr im Rumpf geschieht.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['endlosschleife', 'while-schleife'],
        },
        {
          slug: 'e3-while-parsons',
          type: 'PARSONS',
          title: 'Countdown zusammensetzen',
          prompt:
            'Ordne die Zeilen so an, dass ein Countdown von 3 bis 1 ausgegeben wird und danach "Start" erscheint. Achte auf die Einrückung.',
          payload: {
            kind: 'parsons',
            lines: [
              { id: 'w1', code: 'zaehler = 3', indent: 0, distractor: false },
              { id: 'w2', code: 'while zaehler > 0:', indent: 0, distractor: false },
              { id: 'w3', code: 'print(zaehler)', indent: 1, distractor: false },
              { id: 'w4', code: 'zaehler = zaehler - 1', indent: 1, distractor: false },
              { id: 'w5', code: 'print("Start")', indent: 0, distractor: false },
              { id: 'w6', code: 'zaehler = zaehler + 1', indent: 1, distractor: true },
            ],
            correctOrder: ['w1', 'w2', 'w3', 'w4', 'w5'],
            checkIndentation: true,
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'In welche Richtung muss sich der Zähler bewegen, damit die Bedingung irgendwann nicht mehr zutrifft?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die Bedingung lautet "größer als 0". Der Wert muss also kleiner werden.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Startwert, while-Zeile, im Rumpf erst ausgeben, dann verringern, danach die Abschlusszeile am linken Rand.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['while-schleife', 'zaehler-variable'],
        },
        {
          slug: 'e3-while-schreiben',
          type: 'WRITE_CODE',
          title: 'Verdopplung bis zum Ziel',
          prompt:
            'Ein Startkapital von 100 Euro verdoppelt sich jedes Jahr. Ermittle mit einer while-Schleife, nach wie vielen Jahren es erstmals 1000 Euro oder mehr beträgt.\n\nGib genau eine Zeile aus:\n\nNach 4 Jahren: 1600 Euro',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'while',
                description: 'Es wird eine while-Schleife verwendet.',
                mustMatch: '\\bwhile\\b',
                message:
                  'Die Anzahl der Jahre steht vorher nicht fest. Dafür ist while die passende Schleifenform.',
              },
            ],
          },
          starterCode: 'kapital = 100\nziel = 1000\njahre = 0\n',
          solution: `kapital = 100\nziel = 1000\njahre = 0\n\nwhile kapital < ziel:\n    kapital = kapital * 2\n    jahre = jahre + 1\n\nprint(f"Nach {jahre} Jahren: {kapital} Euro")`,
          solutionNotes:
            'Die Bedingung lautet "solange das Ziel noch nicht erreicht ist". Im Rumpf verändern sich beide beteiligten Größen: das Kapital, das in der Bedingung steht, und der Zähler für die Jahre. Nach vier Durchläufen sind es 1600 Euro – der erste Wert, der die Grenze erreicht.',
          publicTests: [
            {
              id: 't1',
              name: 'Nach 4 Jahren ist das Ziel erreicht',
              expectedStdout: 'Nach 4 Jahren: 1600 Euro',
              failureHint:
                'Prüfe: 100, 200, 400, 800, 1600 – ab welchem Wert ist die Grenze von 1000 erreicht?',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Das Kapital hat das Ziel erreicht',
              assertion:
                'assert kapital >= ziel, "Die Schleife muss laufen, bis das Ziel erreicht ist"',
              failureHint:
                'Nach der Schleife muss das Kapital mindestens so groß wie das Ziel sein.',
            },
            {
              id: 't3',
              name: 'Es wurde nicht zu oft verdoppelt',
              assertion:
                'assert jahre == 4, "Die Schleife soll beim ersten Erreichen des Ziels enden"',
              failureHint:
                'Die Schleife soll enden, sobald das Ziel erreicht ist – nicht erst danach.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Solange welche Aussage zutrifft, soll weiter verdoppelt werden?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Zwei Dinge ändern sich im Rumpf: der Betrag, der in der Bedingung steht, und der Jahreszähler.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: while mit der Bedingung "noch unter dem Ziel", im Rumpf verdoppeln und Jahre erhöhen, danach eine Ausgabe.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die Bedingung sieht so aus:',
              code: 'while kapital < ziel:',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Die Bedingung kapital < ziel bedeutet "solange das Ziel noch nicht erreicht ist". Im Rumpf verdoppelt sich das Kapital, und der Jahreszähler steigt um eins. Die Werte sind 200, 400, 800, 1600. Beim vierten Durchlauf wird 1600 erreicht; danach ist die Bedingung False und die Schleife endet. Würde die Bedingung <= lauten, liefe sie einen Durchlauf zu weit.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 5,
          conceptSlugs: ['while-schleife', 'zaehler-variable', 'akkumulator'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'break-und-continue',
      title: 'break und continue',
      learningObjectives: [
        'Du kannst mit break eine Schleife vorzeitig verlassen, sobald ein gesuchter Fall eintritt.',
        'Du kannst mit continue einzelne Durchläufe überspringen.',
        'Du kannst begründen, wann eine Bedingung ohne break lesbarer ist.',
      ],
      everydayProblem:
        'Du durchsuchst eine Liste von Kundennummern nach einem bestimmten Eintrag. Sobald du ihn gefunden hast, ist jedes weitere Vergleichen überflüssig – bei zehntausend Einträgen macht das einen spürbaren Unterschied.',
      mentalModel:
        'break ist der Notausgang: Es verlässt die Schleife sofort, egal wie viele Elemente noch übrig wären. continue ist die Abkürzung zur nächsten Runde: Der Rest des aktuellen Durchlaufs wird übersprungen, die Schleife läuft aber weiter. Beide sind nützlich, machen den Ablauf aber schwerer nachvollziehbar, weil man beim Lesen jederzeit mit einem Sprung rechnen muss. Faustregel: break lohnt sich beim Suchen, continue meist dann, wenn es das Alternativ-if deutlich flacher macht.',
      workedExample: {
        code: `kundennummern = [1042, 2087, 3311, 4590]
gesucht = 3311
gefunden_bei = -1

for position in range(len(kundennummern)):
    if kundennummern[position] == gesucht:
        gefunden_bei = position
        break

print(f"Gefunden an Position {gefunden_bei}")`,
        annotations: [
          {
            line: 5,
            text: 'range(len(...)) liefert die Positionen 0 bis 3. So ist neben dem Wert auch die Position bekannt.',
          },
          {
            line: 6,
            text: 'Mit eckigen Klammern wird auf ein einzelnes Element zugegriffen. Die Zählung beginnt bei 0.',
          },
          {
            line: 8,
            text: 'break verlässt die Schleife sofort. Die Position 3 wird gar nicht mehr geprüft.',
          },
          {
            line: 10,
            text: 'Der Startwert -1 zeigt an, dass nichts gefunden wurde. Bleibt er stehen, kam der gesuchte Wert nicht vor.',
          },
        ],
        output: 'Gefunden an Position 2',
        trace: [
          { step: 1, description: 'position = 0, Wert 1042.', state: 'kein Treffer' },
          { step: 2, description: 'position = 1, Wert 2087.', state: 'kein Treffer' },
          { step: 3, description: 'position = 2, Wert 3311.', state: 'Treffer, break' },
        ],
      },
      reflectionPrompts: [
        'Warum ist der Startwert -1 hier sinnvoller als 0?',
        'In welcher Situation würdest du auf break verzichten?',
      ],
      commonMistakes: [
        {
          mistake: 'break und continue verwechseln.',
          why: 'break beendet die gesamte Schleife, continue nur den aktuellen Durchlauf. Die Folgen sind völlig verschieden.',
          fix: 'Beim Schreiben laut mitsprechen: "raus aus der Schleife" für break, "weiter mit dem nächsten" für continue.',
        },
        {
          mistake: 'break in einer while-Schleife als einzige Abbruchmöglichkeit verwenden.',
          why: 'while True mit einem break tief im Rumpf verbirgt die eigentliche Abbruchbedingung.',
          fix: 'Wo möglich die Bedingung in die while-Zeile schreiben. Dort ist sie beim Lesen sofort sichtbar.',
        },
      ],
      estimatedMinutes: 13,
      primaryConceptSlugs: ['break-continue'],
      supportingConceptSlugs: ['for-schleife', 'while-schleife', 'liste'],
      prerequisiteConceptSlugs: ['for-schleife', 'while-schleife'],
      exercises: [
        {
          slug: 'e3-break-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'break und continue unterscheiden',
          prompt: 'Welche Ausgabe entsteht?',
          payload: {
            kind: 'predictOutput',
            code: `for i in range(1, 6):\n    if i == 3:\n        continue\n    if i == 5:\n        break\n    print(i)`,
            expectedOutput: '1\n2\n4',
            explanation:
              'Bei i = 3 überspringt continue den Rest des Durchlaufs, die Ausgabe entfällt – die Schleife läuft aber weiter. Bei i = 5 beendet break die Schleife sofort, bevor die Ausgabe erreicht wird. Übrig bleiben 1, 2 und 4.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Gehe die Werte 1 bis 5 einzeln durch und prüfe bei jedem, welche der beiden Bedingungen greift.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'continue überspringt nur den Rest des Durchlaufs. break verlässt die Schleife vollständig.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['break-continue', 'code-tracing'],
        },
        {
          slug: 'e3-break-wahl',
          type: 'SINGLE_CHOICE',
          title: 'break oder continue?',
          prompt:
            'Aus einer Liste sollen alle negativen Werte übersprungen, die übrigen aber vollständig verarbeitet werden. Was gehört in die Schleife?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'break, sobald ein negativer Wert auftritt',
                feedback:
                  'Damit würde die Verarbeitung beim ersten negativen Wert vollständig abbrechen. Alle folgenden Werte blieben unbearbeitet.',
              },
              {
                id: 'b',
                text: 'continue, sobald ein negativer Wert auftritt',
                feedback:
                  'Genau. continue überspringt nur diesen einen Durchlauf, die Schleife arbeitet danach normal weiter.',
              },
              {
                id: 'c',
                text: 'return, sobald ein negativer Wert auftritt',
                feedback:
                  'return gehört in eine Funktion und beendet diese vollständig. Außerhalb einer Funktion ist es hier nicht anwendbar.',
              },
              {
                id: 'd',
                text: 'Weder noch – die Liste müsste vorher sortiert werden',
                feedback:
                  'Eine Sortierung ändert nichts daran, dass einzelne Werte übersprungen werden sollen. Der Ablauf innerhalb der Schleife bleibt dasselbe Problem.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Soll die Schleife nach einem negativen Wert weiterlaufen oder nicht?',
            },
            {
              level: 2,
              kind: 'concept',
              text: '"Überspringen" betrifft nur den aktuellen Durchlauf. "Abbrechen" betrifft die ganze Schleife.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 3,
          conceptSlugs: ['break-continue'],
        },
        {
          slug: 'e3-break-schreiben',
          type: 'WRITE_CODE',
          title: 'Erste passende Bestellung finden',
          prompt:
            'Gegeben ist die Liste betraege = [45, 89, 230, 120, 310].\n\nFinde den ersten Betrag, der über 200 Euro liegt, und gib genau eine Zeile aus:\n\nErster grosser Betrag: 230\n\nSobald der Wert gefunden ist, soll nicht weiter gesucht werden. Kommt kein solcher Betrag vor, soll stattdessen ausgegeben werden:\n\nKein grosser Betrag gefunden',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'break',
                description: 'Die Suche endet beim ersten Treffer.',
                mustMatch: '\\bbreak\\b',
                message:
                  'Nach dem ersten Treffer soll nicht weiter gesucht werden. Dafür gibt es break.',
              },
            ],
          },
          starterCode: 'betraege = [45, 89, 230, 120, 310]\n',
          solution: `betraege = [45, 89, 230, 120, 310]\n\ngefunden = None\nfor betrag in betraege:\n    if betrag > 200:\n        gefunden = betrag\n        break\n\nif gefunden is None:\n    print("Kein grosser Betrag gefunden")\nelse:\n    print(f"Erster grosser Betrag: {gefunden}")`,
          solutionNotes:
            'Die Variable gefunden startet mit None – dem üblichen Python-Wert für "noch nichts vorhanden". Nach der Schleife lässt sich daran ablesen, ob es überhaupt einen Treffer gab. Der Vergleich erfolgt mit is None statt mit ==, weil None ein besonderer Einzelwert ist.',
          publicTests: [
            {
              id: 't1',
              name: 'Der erste Treffer wird gefunden',
              expectedStdout: 'Erster grosser Betrag: 230',
              failureHint:
                'Erwartet wird 230, nicht 310. Die Suche soll beim ersten passenden Wert enden.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Die Suche endet beim ersten Treffer',
              assertion:
                'assert gefunden == 230, "Es soll der erste passende Betrag gefunden werden"',
              failureHint:
                'Ohne break läuft die Schleife weiter und überschreibt den Fund mit einem späteren Wert.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Woran erkennst du nach der Schleife, ob überhaupt etwas gefunden wurde?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Startwert, der als Wert nicht vorkommen kann, dient als Markierung für "noch nichts gefunden".',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Markierung vor der Schleife, Schleife mit Prüfung und break beim Treffer, danach eine Fallunterscheidung für die Ausgabe.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Der Rumpf der Schleife sieht so aus:',
              code: 'if betrag > 200:\n    gefunden = betrag\n    break',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Die Variable gefunden startet mit None. Sobald ein Betrag über 200 gefunden ist, wird er dort abgelegt und break beendet die Schleife – 310 wird deshalb nie erreicht. Nach der Schleife zeigt der Wert von gefunden an, welcher der beiden Ausgabetexte erscheinen soll. Ohne break würde die Schleife weiterlaufen und den Fund mit 310 überschreiben.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 5,
          conceptSlugs: ['break-continue', 'for-schleife', 'liste'],
        },
        {
          slug: 'e3-break-refactor',
          type: 'REFACTOR',
          title: 'Endlosschleife entschärfen',
          prompt:
            'Das gezeigte Programm zählt bis 5, versteckt die Abbruchbedingung aber tief im Rumpf. Schreibe es so um, dass die Bedingung in der while-Zeile steht und kein break mehr nötig ist.\n\nDie Ausgabe muss unverändert bleiben.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'kein-break',
                description: 'Es wird kein break mehr verwendet.',
                mustNotMatch: '\\bbreak\\b',
                message:
                  'Es steht noch ein break im Code. Die Abbruchbedingung soll stattdessen in der while-Zeile stehen.',
              },
              {
                id: 'kein-while-true',
                description: 'Die Bedingung steht in der while-Zeile.',
                mustNotMatch: 'while\\s+True\\s*:',
                message:
                  'while True verbirgt die Abbruchbedingung. Schreibe die eigentliche Bedingung in die while-Zeile.',
              },
            ],
          },
          starterCode: `zaehler = 1\n\nwhile True:\n    print(zaehler)\n    zaehler = zaehler + 1\n    if zaehler > 5:\n        break\n`,
          solution: `zaehler = 1\n\nwhile zaehler <= 5:\n    print(zaehler)\n    zaehler = zaehler + 1`,
          solutionNotes:
            'Die Bedingung zaehler <= 5 sagt beim Lesen sofort, wie lange die Schleife läuft. In der Ausgangsfassung musste man dafür bis ans Ende des Rumpfes lesen. Bei einer festen Anzahl wäre hier übrigens auch eine for-Schleife mit range(1, 6) passend.',
          publicTests: [
            {
              id: 't1',
              name: 'Die Ausgabe bleibt unverändert',
              expectedStdout: '1\n2\n3\n4\n5',
              failureHint:
                'Es sollen weiterhin genau die Zahlen 1 bis 5 ausgegeben werden – je eine Zeile.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Der Zähler steht nach der Schleife auf 6',
              assertion:
                'assert zaehler == 6, "Nach dem letzten Durchlauf steht der Zaehler auf 6"',
              failureHint:
                'Nach der Ausgabe der 5 wird der Zähler ein letztes Mal erhöht, bevor die Bedingung ihn stoppt.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Bei welchem Wert von zaehler soll die Schleife noch laufen, bei welchem nicht mehr?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die Bedingung im Rumpf beschreibt, wann abgebrochen wird. In der while-Zeile steht das Gegenteil davon: wann weitergemacht wird.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: while mit der Weiterlauf-Bedingung, im Rumpf nur noch ausgeben und hochzählen.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die neue while-Zeile sieht so aus:',
              code: 'while zaehler <= 5:',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Im Original lautet die Abbruchbedingung zaehler > 5. Die Weiterlauf-Bedingung ist genau ihr Gegenteil: zaehler <= 5. Diese kommt in die while-Zeile, das break entfällt. Die Ausgabe bleibt identisch, weil die Prüfung an derselben Stelle im Ablauf steht: vor jedem Durchlauf.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 6,
          conceptSlugs: ['break-continue', 'while-schleife', 'endlosschleife'],
        },
      ],
    },
  ],
};
