import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Stufe 0 – Digitale Grundlagen.
 *
 * Dieses Modul kommt vor der ersten Python-Zeile. Es klärt Begriffe, die in
 * jedem Tutorial vorausgesetzt werden, aber selten erklärt sind. Wer das
 * überspringt, stolpert später über Wörter statt über Konzepte.
 */
export const modulDigitaleGrundlagen: ModuleDraft = {
  slug: 'digitale-grundlagen',
  title: 'Digitale Grundlagen',
  summary:
    'Was ein Programm überhaupt ist, wer den Code liest, und wie sich fast jede Aufgabe in Eingabe, Verarbeitung und Ausgabe zerlegen lässt.',
  rationale:
    'Viele Einstiegskurse beginnen mit print("Hallo"). Das funktioniert, erklärt aber nicht, was dabei passiert. Zwei kurze Lektionen vorweg sparen später viel Verwirrung – besonders beim Lesen von Fehlermeldungen.',
  prerequisiteModuleSlugs: [],
  lessons: [
    {
      slug: 'was-ist-ein-programm',
      title: 'Was ist ein Programm?',
      learningObjectives: [
        'Du kannst in eigenen Worten erklären, was ein Programm ist und warum es genau in der aufgeschriebenen Reihenfolge abläuft.',
        'Du kannst Quellcode, Interpreter und laufendes Programm voneinander unterscheiden.',
      ],
      everydayProblem:
        'Stell dir vor, du erklärst jemandem am Telefon, wie man einen Kaffee kocht. Die Person macht ausschließlich das, was du sagst – in genau der Reihenfolge, in der du es sagst. Vergisst du "Wasser einfüllen", läuft die Maschine trocken. Genau so verhält sich ein Computer.',
      mentalModel:
        'Ein Programm ist ein Rezept, das ein sehr genauer und sehr schneller Mitarbeiter abarbeitet. Er denkt nicht mit und ergänzt nichts. Der Interpreter ist die Person, die das Rezept vorliest und jeden Schritt sofort ausführt. Stolpert sie über eine unverständliche Zeile, hält sie an und sagt genau, wo sie hängen geblieben ist. Wichtig: Der Computer "versteht" nichts im menschlichen Sinn – er wandelt Zeichen nach festen Regeln in Aktionen um.',
      workedExample: {
        code: `# Ein Programm mit drei Schritten
name = "Yusuf"
gruss = "Guten Morgen, " + name
print(gruss)`,
        annotations: [
          {
            line: 1,
            text: 'Alles hinter einem # ist ein Kommentar. Python überliest diese Zeile vollständig – sie ist nur für Menschen da.',
          },
          {
            line: 2,
            text: 'Der Text "Yusuf" wird unter dem Namen name abgelegt. Ab jetzt steht name für diesen Text.',
          },
          {
            line: 3,
            text: 'Zwei Textstücke werden zu einem verbunden und unter gruss abgelegt. Das Programm rechnet hier von rechts nach links: erst den Wert bilden, dann benennen.',
          },
          {
            line: 4,
            text: 'print() schreibt den Wert von gruss in die Ausgabe. Ohne diese Zeile würde das Programm laufen, aber nichts anzeigen.',
          },
        ],
        output: 'Guten Morgen, Yusuf',
        trace: [
          { step: 1, description: 'Zeile 2 wird ausgeführt.', state: 'name = "Yusuf"' },
          {
            step: 2,
            description: 'Zeile 3 verbindet beide Texte.',
            state: 'name = "Yusuf", gruss = "Guten Morgen, Yusuf"',
          },
          {
            step: 3,
            description: 'Zeile 4 gibt den Wert von gruss aus.',
            state: 'Ausgabe: Guten Morgen, Yusuf',
          },
        ],
      },
      reflectionPrompts: [
        'Woran erkennst du, dass eine Zeile nur für Menschen gedacht ist?',
        'Was würde passieren, wenn Zeile 3 und Zeile 2 vertauscht wären?',
      ],
      commonMistakes: [
        {
          mistake: 'Anzunehmen, der Computer errate die Absicht hinter einer Zeile.',
          why: 'Programmiersprachen haben feste Regeln. Es gibt keine Auslegung nach Sinn, nur nach Form.',
          fix: 'Beim Lesen von Code immer fragen: Was steht hier wörtlich – nicht: Was ist wohl gemeint?',
        },
        {
          mistake: 'Reihenfolge für nebensächlich halten.',
          why: 'Ein Wert muss existieren, bevor er verwendet werden kann. Python arbeitet strikt von oben nach unten.',
          fix: 'Bei Fehlern zuerst prüfen: Ist alles, was hier gebraucht wird, weiter oben schon entstanden?',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['programm', 'quellcode', 'interpreter'],
      supportingConceptSlugs: ['kommentar'],
      prerequisiteConceptSlugs: [],
      exercises: [
        {
          slug: 'g0-programm-definition',
          type: 'SINGLE_CHOICE',
          title: 'Was macht ein Programm aus?',
          prompt: 'Welche Beschreibung trifft am besten auf ein Programm zu?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Eine Sammlung von Anweisungen, die der Reihe nach ausgeführt werden.',
                feedback:
                  'Genau. Entscheidend ist die feste Reihenfolge: Der Computer arbeitet von oben nach unten und ergänzt nichts von selbst.',
              },
              {
                id: 'b',
                text: 'Eine Software, die selbstständig entscheidet, was für die Nutzerin oder den Nutzer am besten ist.',
                feedback:
                  'Ein Programm entscheidet nur das, was jemand vorher als Regel aufgeschrieben hat. Ohne Anweisung passiert nichts.',
              },
              {
                id: 'c',
                text: 'Eine Datei, in der Daten gespeichert werden.',
                feedback:
                  'Das beschreibt eine Datendatei. Ein Programm enthält Anweisungen, keine reinen Inhalte.',
              },
              {
                id: 'd',
                text: 'Ein Gerät, das Rechenaufgaben löst.',
                feedback:
                  'Das wäre die Hardware. Das Programm ist der Text, der dieser Hardware sagt, was zu tun ist.',
              },
            ],
            correctOptionId: 'a',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was hat das Telefon-Rezept aus dem Einstieg mit dem Programm gemeinsam?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Programm ist Text. Es tut nichts, bis jemand es ausführt – und dann genau das, was dort steht.',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 2,
          conceptSlugs: ['programm'],
        },
        {
          slug: 'g0-quellcode-interpreter',
          type: 'MULTIPLE_CHOICE',
          title: 'Quellcode und Interpreter',
          prompt: 'Welche Aussagen sind richtig? Es sind mehrere zutreffend.',
          payload: {
            kind: 'multipleChoice',
            options: [
              {
                id: 'a',
                text: 'Quellcode ist der Text, den Menschen schreiben und lesen.',
                feedback:
                  'Richtig. Quellcode ist zuerst ein Kommunikationsmittel unter Menschen und erst danach eine Anweisung an die Maschine.',
              },
              {
                id: 'b',
                text: 'Der Python-Interpreter liest den Quellcode und führt ihn aus.',
                feedback:
                  'Richtig. Er ist das Bindeglied zwischen deinem Text und dem, was der Rechner tatsächlich tut.',
              },
              {
                id: 'c',
                text: 'Quellcode läuft direkt auf dem Prozessor, ohne dass ein weiteres Programm nötig ist.',
                feedback:
                  'Der Prozessor versteht nur Maschinenbefehle. Python-Quellcode braucht immer den Interpreter dazwischen.',
              },
              {
                id: 'd',
                text: 'Wenn der Interpreter eine Zeile nicht versteht, meldet er einen Fehler und nennt die Stelle.',
                feedback:
                  'Richtig. Genau diese Meldung ist später dein wichtigstes Werkzeug bei der Fehlersuche.',
              },
            ],
            correctOptionIds: ['a', 'b', 'd'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Prüfe jede Aussage einzeln: Wer tut hier was – Mensch, Interpreter oder Prozessor?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Zwischen dem geschriebenen Text und der Ausführung steht immer ein Übersetzungsschritt.',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 3,
          conceptSlugs: ['quellcode', 'interpreter'],
        },
        {
          slug: 'g0-reihenfolge-parsons',
          type: 'PARSONS',
          title: 'Reihenfolge eines Ablaufs',
          prompt:
            'Bringe die Schritte in eine Reihenfolge, die tatsächlich funktioniert. Eine Zeile gehört nicht dazu.',
          payload: {
            kind: 'parsons',
            lines: [
              { id: 'l1', code: 'preis = 12', indent: 0, distractor: false },
              { id: 'l2', code: 'menge = 3', indent: 0, distractor: false },
              { id: 'l3', code: 'gesamt = preis * menge', indent: 0, distractor: false },
              { id: 'l4', code: 'print(gesamt)', indent: 0, distractor: false },
              { id: 'l5', code: 'print(unbekannt)', indent: 0, distractor: true },
            ],
            correctOrder: ['l1', 'l2', 'l3', 'l4'],
            checkIndentation: false,
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Werte müssen bereits existieren, bevor die Multiplikation ausgeführt werden kann?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Python arbeitet strikt von oben nach unten. Ein Name muss vor seiner Verwendung einen Wert bekommen haben.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Erst die beiden Ausgangswerte festlegen, dann das Ergebnis berechnen, dann ausgeben.',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 3,
          conceptSlugs: ['programm', 'code-tracing'],
        },
        {
          slug: 'g0-erklaeren-reihenfolge',
          type: 'FREE_TEXT',
          title: 'In eigenen Worten',
          prompt:
            'Erkläre in zwei bis drei Sätzen, warum die Reihenfolge der Zeilen in einem Programm wichtig ist.',
          payload: {
            kind: 'freeText',
            requiredKeywordGroups: [
              {
                id: 'reihenfolge',
                anyOf: [
                  'reihenfolge',
                  'nacheinander',
                  'von oben nach unten',
                  'der reihe nach',
                  'schritt für schritt',
                ],
                missingHint:
                  'Benenne ausdrücklich, in welcher Abfolge Python die Zeilen abarbeitet.',
              },
              {
                id: 'abhaengigkeit',
                anyOf: ['vorher', 'zuerst', 'existieren', 'bekannt', 'definiert', 'wert'],
                missingHint:
                  'Es fehlt der Grund: Ein Wert muss schon vorhanden sein, bevor eine spätere Zeile ihn benutzen kann.',
              },
            ],
            minLength: 60,
            sampleAnswer:
              'Python führt die Zeilen der Reihe nach von oben nach unten aus. Eine Zeile kann nur Werte verwenden, die vorher schon entstanden sind. Steht die Berechnung vor der Zuweisung, kennt Python den Namen an dieser Stelle noch nicht und bricht mit einem Fehler ab.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was passiert, wenn eine Zeile einen Namen verwendet, der weiter unten erst entsteht?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Zwei Dinge gehören in die Antwort: die Abarbeitungsrichtung und die Abhängigkeit zwischen den Zeilen.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['programm', 'code-tracing'],
        },
      ],
    },
    {
      slug: 'eingabe-verarbeitung-ausgabe',
      title: 'Eingabe, Verarbeitung, Ausgabe',
      learningObjectives: [
        'Du kannst eine Alltagsaufgabe in die drei Teile Eingabe, Verarbeitung und Ausgabe zerlegen, bevor du Code schreibst.',
        'Du kannst zu einem gegebenen Programm benennen, welche Zeile zu welchem der drei Teile gehört.',
      ],
      everydayProblem:
        'Ein Getränkeautomat nimmt Münzen entgegen, prüft den Betrag und gibt eine Flasche aus. Ein Onlineformular nimmt deine Daten entgegen, prüft sie und zeigt eine Bestätigung. Beide folgen demselben Muster – und fast jedes Programm, das du schreiben wirst, ebenfalls.',
      mentalModel:
        'Denke an eine Küche: Zutaten kommen herein (Eingabe), es wird geschnitten und gekocht (Verarbeitung), das Gericht kommt auf den Tisch (Ausgabe). Wenn ein Programm nicht das Erwartete tut, hilft die Frage: In welchem der drei Teile liegt das Problem? Meist ist es die Verarbeitung – aber überraschend oft stimmt schon die Eingabe nicht mit dem überein, was der Code erwartet.',
      workedExample: {
        code: `# Eingabe
grad_celsius = 22

# Verarbeitung
grad_fahrenheit = grad_celsius * 9 / 5 + 32

# Ausgabe
print(grad_fahrenheit)`,
        annotations: [
          {
            line: 2,
            text: 'Hier steht der Ausgangswert fest im Code. Später kommt er aus einer Eingabe oder einer Datei – die Rolle bleibt dieselbe.',
          },
          {
            line: 5,
            text: 'Die eigentliche Arbeit: Aus dem Eingangswert entsteht ein neuer Wert. Punkt vor Strich gilt wie in der Schule, deshalb wird erst multipliziert und geteilt, dann addiert.',
          },
          {
            line: 8,
            text: 'Das Ergebnis wird sichtbar gemacht. Ohne diesen Schritt bliebe die Rechnung folgenlos.',
          },
        ],
        output: '71.6',
        trace: [
          { step: 1, description: 'Eingabewert festlegen.', state: 'grad_celsius = 22' },
          {
            step: 2,
            description: '22 * 9 = 198, dann 198 / 5 = 39.6, dann + 32.',
            state: 'grad_fahrenheit = 71.6',
          },
          { step: 3, description: 'Ergebnis ausgeben.', state: 'Ausgabe: 71.6' },
        ],
      },
      reflectionPrompts: [
        'Welche Aufgabe aus deinem Alltag ließe sich in Eingabe, Verarbeitung und Ausgabe zerlegen?',
        'Warum ist es hilfreich, diese drei Teile zu trennen, bevor man mit dem Schreiben beginnt?',
      ],
      commonMistakes: [
        {
          mistake: 'Rechnen und Ausgeben in einer Zeile vermischen, bevor die Rechnung stimmt.',
          why: 'Wenn beides zusammenfällt, ist bei einem falschen Ergebnis unklar, ob die Rechnung oder die Darstellung schuld ist.',
          fix: 'Erst das Ergebnis in einer eigenen Variable ablegen, dann ausgeben. Das erleichtert die Fehlersuche erheblich.',
        },
        {
          mistake: 'Die Ausgabe vergessen.',
          why: 'Ein Programm ohne print() rechnet zwar, zeigt aber nichts an. Das wirkt so, als wäre gar nichts passiert.',
          fix: 'Nach jeder Berechnung prüfen: Wird das Ergebnis irgendwo sichtbar oder weiterverwendet?',
        },
      ],
      estimatedMinutes: 9,
      primaryConceptSlugs: ['eva-prinzip'],
      supportingConceptSlugs: ['print-ausgabe', 'code-tracing'],
      prerequisiteConceptSlugs: ['programm'],
      exercises: [
        {
          slug: 'g0-eva-zuordnung',
          type: 'SINGLE_CHOICE',
          title: 'Welcher Teil ist das?',
          prompt: 'Welche Zeile gehört im gezeigten Programm zur Verarbeitung?',
          payload: {
            kind: 'singleChoice',
            code: `1  liter = 45\n2  preis_pro_liter = 1.79\n3  kosten = liter * preis_pro_liter\n4  print(kosten)`,
            options: [
              {
                id: 'a',
                text: 'Zeile 1',
                feedback:
                  'Zeile 1 legt einen Ausgangswert fest. Das ist die Eingabe – hier fest im Code statt über eine Abfrage.',
              },
              {
                id: 'b',
                text: 'Zeile 3',
                feedback:
                  'Genau. Hier entsteht aus vorhandenen Werten ein neuer Wert. Das ist die eigentliche Verarbeitung.',
              },
              {
                id: 'c',
                text: 'Zeile 4',
                feedback:
                  'Zeile 4 macht das Ergebnis sichtbar. Das ist die Ausgabe, nicht die Verarbeitung.',
              },
              {
                id: 'd',
                text: 'Alle Zeilen gemeinsam',
                feedback:
                  'Die Zerlegung ist gerade deshalb hilfreich, weil sich die drei Teile einzelnen Zeilen zuordnen lassen.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'In welcher Zeile entsteht ein Wert, den es vorher noch nicht gab?',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 2,
          conceptSlugs: ['eva-prinzip'],
        },
        {
          slug: 'g0-eva-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Was gibt das Programm aus?',
          prompt:
            'Lies den Code, ohne ihn auszuführen. Was erscheint in der Ausgabe? Schreibe jede Ausgabezeile untereinander.',
          payload: {
            kind: 'predictOutput',
            code: `stunden = 7\nstundenlohn = 14\nlohn = stunden * stundenlohn\nprint(lohn)\nprint(stunden)`,
            expectedOutput: '98\n7',
            explanation:
              'Zeile 3 berechnet 7 * 14 = 98 und legt das Ergebnis unter lohn ab. Die Variable stunden wird dabei nicht verändert – sie behält den Wert 7. Deshalb erscheinen zwei Zeilen: erst 98, dann 7.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Zähle zuerst nach, wie viele print()-Aufrufe es gibt. So viele Ausgabezeilen entstehen.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Eine Berechnung verändert nur die Variable auf der linken Seite des Gleichheitszeichens. Die Werte rechts bleiben unangetastet.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['eva-prinzip', 'code-tracing'],
        },
        {
          slug: 'g0-eva-zerlegen',
          type: 'FREE_TEXT',
          title: 'Aufgabe zerlegen',
          prompt:
            'Eine Anwendung soll aus einer Anzahl gefahrener Kilometer und dem Verbrauch je 100 Kilometer die Spritkosten berechnen. Beschreibe, was jeweils Eingabe, Verarbeitung und Ausgabe ist.',
          payload: {
            kind: 'freeText',
            requiredKeywordGroups: [
              {
                id: 'eingabe',
                anyOf: ['eingabe', 'kilometer', 'verbrauch', 'preis'],
                missingHint:
                  'Benenne die Werte, die von außen in das Programm hineinkommen müssen.',
              },
              {
                id: 'verarbeitung',
                anyOf: ['verarbeitung', 'berechn', 'rechne', 'multipli', 'formel'],
                missingHint:
                  'Beschreibe den Rechenschritt, der aus den Eingaben ein Ergebnis macht.',
              },
              {
                id: 'ausgabe',
                anyOf: ['ausgabe', 'anzeig', 'ausgeben', 'print', 'ergebnis zeigen'],
                missingHint: 'Sage auch, was am Ende sichtbar werden soll.',
              },
            ],
            minLength: 80,
            sampleAnswer:
              'Eingabe: die gefahrenen Kilometer, der Verbrauch je 100 Kilometer und der Preis je Liter. Verarbeitung: Aus Kilometern und Verbrauch wird die verbrauchte Menge berechnet, diese wird mit dem Literpreis multipliziert. Ausgabe: Die berechneten Kosten werden angezeigt.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Zahlen kennt das Programm nicht von selbst und muss sie von außen bekommen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Drei Teile gehören in die Antwort. Prüfe, ob jeder davon vorkommt.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: "Eingabe: … Verarbeitung: … Ausgabe: …" – ein Satz je Teil genügt.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['eva-prinzip'],
        },
      ],
    },
  ],
};
