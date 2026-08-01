import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Stufe 1 – Erste Python-Schritte.
 *
 * Ab hier wird Code geschrieben. Jede Lektion folgt demselben Aufbau: Problem,
 * mentales Modell, durchgerechnetes Beispiel, Vorhersage, Umbau, eigene Lösung,
 * Transfer.
 */
export const modulErsteSchritte: ModuleDraft = {
  slug: 'erste-python-schritte',
  title: 'Erste Python-Schritte',
  summary:
    'Ausgabe, Kommentare, Variablen, Zahlen, Text und Eingaben – die Bausteine, aus denen jedes weitere Programm besteht.',
  rationale:
    'Diese fünf Lektionen bilden das Fundament. Alles Spätere – Bedingungen, Schleifen, Funktionen – setzt voraus, dass Variablen, Datentypen und die Umwandlung von Eingaben sicher sitzen. Deshalb wird hier gründlich geübt statt schnell weitergegangen.',
  prerequisiteModuleSlugs: ['digitale-grundlagen'],
  lessons: [
    // ---------------------------------------------------------------------
    {
      slug: 'ausgabe-und-kommentare',
      title: 'Ausgabe und Kommentare',
      learningObjectives: [
        'Du kannst mit print() Text und Zahlen ausgeben und weißt, dass jeder Aufruf eine eigene Zeile erzeugt.',
        'Du kannst Kommentare setzen, die erklären, warum etwas geschieht, statt zu wiederholen, was ohnehin dasteht.',
      ],
      everydayProblem:
        'Du hast ein Programm geschrieben, das rechnet – aber du siehst nichts. Solange nichts ausgegeben wird, bleibt jede Rechnung unsichtbar. Und in drei Wochen weißt du selbst nicht mehr, warum du eine bestimmte Zeile so geschrieben hast.',
      mentalModel:
        'print() ist das Fenster nach draußen. Alles, was im Programm passiert, bleibt unsichtbar, bis es durch dieses Fenster geschoben wird. Ein Kommentar ist dagegen eine Notiz am Rand: Der Interpreter überliest sie vollständig, für die nächste Person – oft du selbst – ist sie manchmal wertvoller als der Code darunter.',
      workedExample: {
        code: `# Preis inklusive Mehrwertsteuer, Satz laut Rechnung vom Lieferanten
netto = 250
print("Nettobetrag:")
print(netto)
print(netto * 1.19)`,
        annotations: [
          {
            line: 1,
            text: 'Der Kommentar erklärt die Herkunft der Zahl. Das steht nirgends im Code und wäre sonst verloren.',
          },
          {
            line: 3,
            text: 'Text muss in Anführungszeichen stehen. Ohne sie würde Python nach einer Variable namens Nettobetrag suchen.',
          },
          {
            line: 4,
            text: 'Hier stehen keine Anführungszeichen, weil netto ein Variablenname ist. Ausgegeben wird der Wert, nicht das Wort.',
          },
          {
            line: 5,
            text: 'print() kann auch eine Rechnung enthalten. Python berechnet erst das Ergebnis und gibt dann dieses aus.',
          },
        ],
        output: 'Nettobetrag:\n250\n297.5',
        trace: [
          { step: 1, description: 'Zeile 2 legt den Wert ab.', state: 'netto = 250' },
          {
            step: 2,
            description: 'Zeile 3 gibt den festen Text aus.',
            state: 'Ausgabe: Nettobetrag:',
          },
          { step: 3, description: 'Zeile 4 gibt den Wert von netto aus.', state: 'Ausgabe: 250' },
          {
            step: 4,
            description: 'Zeile 5 rechnet 250 * 1.19 und gibt das Ergebnis aus.',
            state: 'Ausgabe: 297.5',
          },
        ],
      },
      reflectionPrompts: [
        'Woran erkennst du, ob etwas als Text oder als Variablenname gemeint ist?',
        'Welcher Kommentar in deinem eigenen Code wäre in vier Wochen noch nützlich?',
      ],
      commonMistakes: [
        {
          mistake: 'print(Hallo) statt print("Hallo").',
          why: 'Ohne Anführungszeichen liest Python Hallo als Variablennamen. Existiert dieser nicht, folgt ein NameError.',
          fix: 'Fester Text kommt immer in Anführungszeichen. Nur Variablennamen stehen ohne.',
        },
        {
          mistake: 'Kommentare schreiben, die den Code nur wiederholen.',
          why: '"# addiere 1 zu x" neben x = x + 1 bringt keine zusätzliche Information und veraltet schnell.',
          fix: 'Im Kommentar das Warum festhalten: die Annahme, die Quelle einer Zahl, den Sonderfall.',
        },
      ],
      estimatedMinutes: 10,
      primaryConceptSlugs: ['print-ausgabe', 'kommentar'],
      supportingConceptSlugs: ['string'],
      prerequisiteConceptSlugs: ['quellcode'],
      exercises: [
        {
          slug: 'e1-print-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Ausgabe vorhersagen',
          prompt: 'Wie sieht die Ausgabe aus? Achte darauf, welche Zeilen Python überliest.',
          payload: {
            kind: 'predictOutput',
            code: `print("Start")\n# print("Mitte")\nprint("Ende")`,
            expectedOutput: 'Start\nEnde',
            explanation:
              'Die mittlere Zeile beginnt mit einem #. Python überliest sie vollständig, obwohl dort gültiger Code steht. Übrig bleiben zwei Ausgabezeilen.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche der drei Zeilen führt Python tatsächlich aus?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein # macht den Rest der Zeile für Python unsichtbar – auch wenn dort ein vollständiger Befehl steht.',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 3,
          conceptSlugs: ['print-ausgabe', 'kommentar'],
        },
        {
          slug: 'e1-print-luecken',
          type: 'CODE_COMPLETION',
          title: 'Ausgabe vervollständigen',
          prompt:
            'Ergänze die Lücken so, dass zuerst der feste Text "Bestellung" und danach der Wert der Variable anzahl ausgegeben wird.',
          payload: {
            kind: 'codeCompletion',
            template: `anzahl = 12\nprint({{blank:text}})\nprint({{blank:wert}})`,
            blanks: [
              {
                id: 'text',
                accepted: ['"Bestellung"', "'Bestellung'"],
                caseSensitive: true,
                description: 'fester Text "Bestellung"',
                wrongHint:
                  'Fester Text braucht Anführungszeichen. Ohne sie sucht Python nach einer Variable dieses Namens.',
              },
              {
                id: 'wert',
                accepted: ['anzahl'],
                caseSensitive: true,
                description: 'der Wert der Variable anzahl',
                wrongHint:
                  'Hier soll der gespeicherte Wert erscheinen, nicht das Wort. Variablennamen stehen ohne Anführungszeichen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was ist der Unterschied zwischen dem Wort anzahl und dem Wert, der darunter abgelegt ist?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Anführungszeichen bedeuten: nimm das wörtlich. Ohne Anführungszeichen bedeutet: schlage den Namen nach.',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 3,
          conceptSlugs: ['print-ausgabe', 'string'],
        },
        {
          slug: 'e1-print-fehler-finden',
          type: 'FIND_ERROR',
          title: 'Fehler finden',
          prompt: 'Dieses Programm bricht ab. Markiere die Zeile, die den Fehler verursacht.',
          payload: {
            kind: 'findError',
            codeLines: ['name = "Aylin"', 'print("Hallo")', 'print(Aylin)', 'print(name)'],
            faultyLineNumbers: [3],
            explanation:
              'In Zeile 3 steht Aylin ohne Anführungszeichen. Python sucht deshalb nach einer Variable mit diesem Namen. Es gibt aber nur die Variable name, deren Wert "Aylin" ist. Richtig wäre print(name) oder print("Aylin").',
            traceback:
              'Traceback (most recent call last):\n  File "<exec>", line 3, in <module>\nNameError: name \'Aylin\' is not defined',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Die Meldung nennt eine Zeilennummer. Was steht dort – ein Name oder ein Text?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'NameError bedeutet: Python kennt diesen Namen nicht. Suche im Programm, ob er irgendwo einen Wert bekommt.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['print-ausgabe', 'fehlermeldung'],
        },
        {
          slug: 'e1-print-schreiben',
          type: 'WRITE_CODE',
          title: 'Eigene Ausgabe schreiben',
          prompt:
            'Schreibe ein Programm, das genau diese drei Zeilen ausgibt:\n\nHallo\nPythonPfad\n42\n\nSetze außerdem einen Kommentar an den Anfang, der erklärt, wozu das Programm dient.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'kommentar',
                description: 'Das Programm enthält einen Kommentar.',
                mustMatch: '#\\s*\\S',
                message:
                  'Es fehlt noch ein Kommentar. Eine Zeile, die mit # beginnt und erklärt, wozu das Programm da ist.',
              },
            ],
          },
          starterCode: '# Wozu ist dieses Programm da?\n',
          solution: `# Gibt eine kurze Begrüßung und die Beispielzahl aus\nprint("Hallo")\nprint("PythonPfad")\nprint(42)`,
          solutionNotes:
            'Drei getrennte print()-Aufrufe erzeugen drei Zeilen. Die Zahl 42 steht ohne Anführungszeichen, weil sie als Zahl und nicht als Text ausgegeben werden soll – in der Ausgabe sieht beides gleich aus, im Programm sind es aber verschiedene Typen.',
          publicTests: [
            {
              id: 't1',
              name: 'Die drei Zeilen erscheinen in der richtigen Reihenfolge',
              expectedStdout: 'Hallo\nPythonPfad\n42',
              failureHint:
                'Prüfe die Reihenfolge und die Schreibweise. Jeder print()-Aufruf erzeugt genau eine Zeile.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wie viele Ausgabezeilen sollen entstehen – und wie viele print()-Aufrufe brauchst du dafür?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Text kommt in Anführungszeichen, Zahlen nicht. Ein Kommentar beginnt mit #.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: eine Kommentarzeile, danach drei print()-Zeilen untereinander.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die erste Ausgabezeile sieht so aus:',
              code: 'print("Hallo")',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Jeder print()-Aufruf schreibt seinen Inhalt und springt danach in die nächste Zeile. Drei Aufrufe untereinander erzeugen deshalb genau drei Zeilen. Der Kommentar in Zeile 1 wird überlesen und erscheint nicht in der Ausgabe.',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 5,
          conceptSlugs: ['print-ausgabe', 'kommentar'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'variablen-und-zuweisung',
      title: 'Variablen und Zuweisung',
      learningObjectives: [
        'Du kannst einer Variable einen Wert zuweisen und ihn später über den Namen wieder verwenden.',
        'Du kannst erklären, warum = in Python "bekommt den Wert von" bedeutet und nicht "ist gleich".',
        'Du kannst vorhersagen, welchen Wert eine Variable nach mehreren Zuweisungen hat.',
      ],
      everydayProblem:
        'In einem Kostenvoranschlag taucht derselbe Stundensatz an acht Stellen auf. Ändert sich der Satz, müsstest du acht Zahlen suchen und ersetzen – und würdest wahrscheinlich eine übersehen.',
      mentalModel:
        'Eine Variable ist ein beschriftetes Fach. Der Name steht außen auf dem Schild, der Wert liegt drin. Eine Zuweisung legt etwas Neues ins Fach; der alte Inhalt ist danach weg. Wichtig: Beim Lesen einer Zeile wird immer erst die rechte Seite vollständig ausgerechnet, dann landet das Ergebnis im Fach auf der linken Seite. Deshalb ist zaehler = zaehler + 1 kein Widerspruch, sondern völlig unproblematisch.',
      workedExample: {
        code: `stundensatz = 85
stunden = 6
honorar = stundensatz * stunden
print(honorar)

stundensatz = 95
print(honorar)`,
        annotations: [
          { line: 1, text: 'Der Wert 85 wird unter dem Namen stundensatz abgelegt.' },
          {
            line: 3,
            text: 'Rechts steht 85 * 6. Python rechnet das aus und legt das Ergebnis 510 unter honorar ab.',
          },
          {
            line: 6,
            text: 'Der Stundensatz wird auf 95 geändert. Das ändert nur dieses eine Fach.',
          },
          {
            line: 7,
            text: 'honorar ist weiterhin 510. Der Wert wurde in Zeile 3 einmal berechnet und ist danach unabhängig von stundensatz.',
          },
        ],
        output: '510\n510',
        trace: [
          {
            step: 1,
            description: 'Zeile 1 und 2 füllen zwei Fächer.',
            state: 'stundensatz = 85, stunden = 6',
          },
          {
            step: 2,
            description: 'Zeile 3 rechnet 85 * 6 = 510.',
            state: 'stundensatz = 85, stunden = 6, honorar = 510',
          },
          {
            step: 3,
            description: 'Zeile 6 überschreibt nur stundensatz.',
            state: 'stundensatz = 95, honorar = 510',
          },
          {
            step: 4,
            description: 'Zeile 7 gibt den unveränderten Wert von honorar aus.',
            state: 'Ausgabe: 510',
          },
        ],
      },
      reflectionPrompts: [
        'Warum bleibt honorar bei 510, obwohl sich stundensatz geändert hat?',
        'Wann würdest du einer Berechnung einen eigenen Variablennamen geben, statt sie direkt in print() zu schreiben?',
      ],
      commonMistakes: [
        {
          mistake: 'Erwarten, dass sich abgeleitete Werte automatisch mit aktualisieren.',
          why: 'Eine Zuweisung ist ein einmaliger Vorgang, keine dauerhafte Verbindung zwischen zwei Variablen.',
          fix: 'Nach einer Änderung die abhängige Berechnung erneut ausführen – später übernehmen das Funktionen.',
        },
        {
          mistake: '5 = alter statt alter = 5.',
          why: 'Links vom = steht immer der Name, rechts der Wert. Die Richtung ist festgelegt.',
          fix: 'Die Zeile beim Lesen in Worte fassen: "alter bekommt den Wert 5."',
        },
        {
          mistake: 'Namen wie x, a1 oder daten2 verwenden.',
          why: 'Beim Wiederlesen ist nicht mehr erkennbar, was gemeint war. Das kostet mehr Zeit, als das Tippen des längeren Namens gespart hat.',
          fix: 'Den Namen so wählen, dass er den Inhalt beschreibt: stundensatz, anzahl_teilnehmer, gesamtpreis.',
        },
      ],
      estimatedMinutes: 12,
      primaryConceptSlugs: ['variable', 'zuweisung'],
      supportingConceptSlugs: ['print-ausgabe', 'code-tracing'],
      prerequisiteConceptSlugs: ['print-ausgabe'],
      exercises: [
        {
          slug: 'e1-var-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Wert nach mehreren Zuweisungen',
          prompt: 'Welchen Wert gibt dieses Programm aus?',
          payload: {
            kind: 'predictOutput',
            code: `punkte = 10\npunkte = punkte + 5\npunkte = punkte * 2\nprint(punkte)`,
            expectedOutput: '30',
            explanation:
              'Zeile 2 rechnet zuerst die rechte Seite aus: 10 + 5 = 15. Dieses Ergebnis landet wieder unter punkte. Zeile 3 rechnet dann 15 * 2 = 30. Entscheidend ist die Reihenfolge: rechte Seite ausrechnen, dann zuweisen.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Schreibe nach jeder Zeile auf, welchen Wert punkte gerade hat.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Bei jeder Zuweisung wird zuerst die gesamte rechte Seite berechnet. Erst danach wird der Name neu belegt.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['variable', 'zuweisung', 'code-tracing'],
        },
        {
          slug: 'e1-var-namen',
          type: 'MULTIPLE_CHOICE',
          title: 'Gültige Variablennamen',
          prompt: 'Welche Namen sind in Python gültig UND gut lesbar? Es sind mehrere zutreffend.',
          payload: {
            kind: 'multipleChoice',
            options: [
              {
                id: 'a',
                text: 'anzahl_teilnehmer',
                feedback:
                  'Richtig. Kleinbuchstaben mit Unterstrichen sind in Python üblich und beschreiben den Inhalt.',
              },
              {
                id: 'b',
                text: '2te_rechnung',
                feedback:
                  'Ein Variablenname darf nicht mit einer Ziffer beginnen. Python meldet hier einen SyntaxError.',
              },
              {
                id: 'c',
                text: 'gesamtpreis_netto',
                feedback: 'Richtig. Der Name sagt sowohl, was drin ist, als auch in welcher Form.',
              },
              {
                id: 'd',
                text: 'x',
                feedback:
                  'Gültig, aber wenig aussagekräftig. Beim Wiederlesen bleibt unklar, was x bedeutet.',
              },
            ],
            correctOptionIds: ['a', 'c'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Zwei Fragen je Option: Ist der Name erlaubt? Und würdest du in vier Wochen noch wissen, was drin ist?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Namen dürfen Buchstaben, Ziffern und Unterstriche enthalten, aber nicht mit einer Ziffer beginnen.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['variable'],
        },
        {
          slug: 'e1-var-tausch-parsons',
          type: 'PARSONS',
          title: 'Werte tauschen',
          prompt:
            'Bringe die Zeilen so in eine Reihenfolge, dass die Werte von a und b am Ende vertauscht sind. Eine Zeile gehört nicht dazu.',
          payload: {
            kind: 'parsons',
            lines: [
              { id: 'p1', code: 'a = 3', indent: 0, distractor: false },
              { id: 'p2', code: 'b = 7', indent: 0, distractor: false },
              { id: 'p3', code: 'zwischenspeicher = a', indent: 0, distractor: false },
              { id: 'p4', code: 'a = b', indent: 0, distractor: false },
              { id: 'p5', code: 'b = zwischenspeicher', indent: 0, distractor: false },
              { id: 'p6', code: 'b = a', indent: 0, distractor: true },
            ],
            correctOrder: ['p1', 'p2', 'p3', 'p4', 'p5'],
            checkIndentation: false,
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wenn du a mit dem Wert von b überschreibst – wo ist der alte Wert von a dann noch zu finden?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Eine Zuweisung überschreibt den alten Inhalt unwiederbringlich. Wer ihn danach noch braucht, muss ihn vorher sichern.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: alten Wert sichern, dann erste Variable neu belegen, dann zweite Variable aus dem Zwischenspeicher belegen.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['variable', 'zuweisung', 'code-tracing'],
        },
        {
          slug: 'e1-var-rechnung-schreiben',
          type: 'WRITE_CODE',
          title: 'Rechnung mit Variablen',
          prompt:
            'Ein Verein zahlt für einen Raum eine Grundgebühr und zusätzlich einen Betrag je Stunde.\n\nLege drei Variablen an: grundgebuehr mit dem Wert 40, stundenpreis mit dem Wert 12 und stunden mit dem Wert 5. Berechne die Gesamtkosten in einer Variable gesamt und gib nur diese aus.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'variablen',
                description: 'Die Zwischenwerte stehen in Variablen.',
                mustMatch: 'grundgebuehr',
                message:
                  'Die Variable grundgebuehr fehlt noch. Lege die drei Werte einzeln unter den vorgegebenen Namen ab.',
              },
              {
                id: 'kein-literal',
                description: 'Das Ergebnis wird berechnet, nicht direkt hingeschrieben.',
                mustNotMatch: 'print\\(\\s*100\\s*\\)',
                message:
                  'Das Ergebnis soll aus den Variablen berechnet werden, nicht als feste Zahl in print() stehen.',
              },
            ],
          },
          starterCode:
            'grundgebuehr = 40\nstundenpreis = 12\nstunden = 5\n\n# Berechne hier die Gesamtkosten und gib sie aus\n',
          solution: `grundgebuehr = 40\nstundenpreis = 12\nstunden = 5\ngesamt = grundgebuehr + stundenpreis * stunden\nprint(gesamt)`,
          solutionNotes:
            'Punkt vor Strich gilt auch in Python: stundenpreis * stunden wird zuerst berechnet (60), danach kommt die Grundgebühr dazu. Klammern wären hier erlaubt, aber nicht nötig.',
          publicTests: [
            {
              id: 't1',
              name: 'Die Gesamtkosten betragen 100',
              expectedStdout: '100',
              failureHint:
                'Erwartet wird genau eine Ausgabezeile mit dem Gesamtbetrag. Prüfe, ob die Grundgebühr nur einmal und der Stundenpreis fünfmal einfließt.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Die Berechnung nutzt die Variablen',
              setup: '',
              assertion:
                'assert gesamt == grundgebuehr + stundenpreis * stunden, "gesamt passt nicht zu den drei Ausgangswerten"',
              failureHint:
                'Die Variable gesamt soll aus den drei Ausgangswerten berechnet werden. Steht dort eine feste Zahl?',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welcher Teil der Kosten hängt von der Stundenzahl ab, welcher nicht?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die Grundgebühr fällt einmal an. Der Stundenpreis fällt so oft an, wie Stunden gebucht sind.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: gesamt = Grundgebühr + (Stundenpreis mal Stunden). Danach gesamt ausgeben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Der variable Anteil sieht so aus:',
              code: 'stundenpreis * stunden',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Python wendet Punkt vor Strich an: stundenpreis * stunden ergibt 60, danach wird die Grundgebühr 40 addiert, also 100. Die Klammerung (grundgebuehr + stundenpreis) * stunden wäre falsch, weil dann auch die Grundgebühr fünfmal berechnet würde.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['variable', 'zuweisung', 'arithmetik'],
        },
        {
          slug: 'e1-var-transfer-lager',
          type: 'TRANSFER',
          title: 'Übertragen: Lagerbestand',
          prompt:
            'Ein Lager enthält 120 Kartons. Am Vormittag gehen 35 Kartons raus, am Nachmittag kommen 60 dazu.\n\nSchreibe ein Programm, das den Bestand in einer Variable bestand mitführt, nach jeder Bewegung aktualisiert und am Ende nur den Endbestand ausgibt.',
          transferContext:
            'Dasselbe Muster wie beim Punktezähler, aber in einem Lagerkontext mit Zu- und Abgängen.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'aktualisierung',
                description: 'Der Bestand wird schrittweise aktualisiert.',
                mustMatch: 'bestand\\s*(=|-=|\\+=)',
                message:
                  'Führe den Bestand in einer Variable namens bestand mit und aktualisiere sie nach jeder Bewegung.',
              },
            ],
          },
          starterCode: 'bestand = 120\n',
          solution: `bestand = 120\nbestand = bestand - 35\nbestand = bestand + 60\nprint(bestand)`,
          solutionNotes:
            'Der Kern ist derselbe wie bei punkte = punkte + 5: rechte Seite ausrechnen, Ergebnis unter demselben Namen ablegen. Kürzer geht es mit bestand -= 35 und bestand += 60 – beides bedeutet exakt dasselbe.',
          publicTests: [
            {
              id: 't1',
              name: 'Der Endbestand beträgt 145',
              expectedStdout: '145',
              failureHint:
                'Erwartet wird eine einzige Ausgabezeile mit dem Endbestand. Prüfe die Vorzeichen: Der Vormittag verringert, der Nachmittag erhöht.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Der Bestand steht in einer Variable',
              assertion: 'assert bestand == 145, "Die Variable bestand enthält nicht den Endwert"',
              failureHint:
                'Am Ende soll die Variable bestand den Endwert enthalten – nicht nur die Ausgabe stimmen.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Bewegung verringert den Bestand, welche erhöht ihn?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Wie beim Punktezähler: Der neue Wert entsteht aus dem alten Wert plus oder minus der Bewegung.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Startbestand, dann Abgang verrechnen, dann Zugang verrechnen, dann ausgeben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Der Abgang sieht so aus:',
              code: 'bestand = bestand - 35',
            },
            {
              level: 5,
              kind: 'explanation',
              text: '120 - 35 ergibt 85, danach 85 + 60 = 145. Jede Zeile berechnet erst die rechte Seite vollständig und legt das Ergebnis dann wieder unter bestand ab. Die Kurzformen bestand -= 35 und bestand += 60 machen genau dasselbe.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 6,
          conceptSlugs: ['variable', 'zuweisung', 'arithmetik'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'zahlen-und-rechnen',
      title: 'Zahlen und Rechnen',
      learningObjectives: [
        'Du kannst ganze Zahlen und Kommazahlen unterscheiden und benennen, wann Python welchen Typ liefert.',
        'Du kannst //, % und ** einsetzen und erklären, wofür sie im Alltag nützlich sind.',
      ],
      everydayProblem:
        'Du willst 47 Teilnehmende auf Tische zu je 6 Plätzen verteilen. Wie viele Tische sind voll besetzt, und wie viele Personen bleiben für den letzten Tisch übrig? Mit einer normalen Division allein kommst du hier nicht weiter.',
      mentalModel:
        'Python kennt zwei Zahlenarten: int für ganze Zahlen und float für Kommazahlen. Die normale Division / liefert immer eine Kommazahl – auch wenn das Ergebnis glatt aufgeht. Für "wie oft passt das ganz hinein" gibt es // und für "was bleibt übrig" gibt es %. Diese beiden zusammen sind die Antwort auf die Tischfrage. Kommazahlen speichert der Rechner übrigens nur näherungsweise. Deshalb ergibt 0.1 + 0.2 nicht exakt 0.3 – das ist kein Fehler in Python, sondern eine Eigenschaft der binären Darstellung.',
      workedExample: {
        code: `teilnehmende = 47
plaetze_pro_tisch = 6

volle_tische = teilnehmende // plaetze_pro_tisch
rest = teilnehmende % plaetze_pro_tisch

print(volle_tische)
print(rest)
print(teilnehmende / plaetze_pro_tisch)`,
        annotations: [
          {
            line: 4,
            text: '// teilt und schneidet den Rest ab. 47 // 6 ergibt 7, weil sechs Plätze siebenmal vollständig hineinpassen.',
          },
          {
            line: 5,
            text: '% liefert genau diesen abgeschnittenen Rest: 47 - 7 * 6 = 5.',
          },
          {
            line: 9,
            text: 'Die normale Division liefert eine Kommazahl. Sie beantwortet die Tischfrage nicht, weil ein halber Tisch nicht existiert.',
          },
        ],
        output: '7\n5\n7.833333333333333',
        trace: [
          {
            step: 1,
            description: '47 // 6 – wie oft passt 6 ganz hinein?',
            state: 'volle_tische = 7',
          },
          { step: 2, description: '47 % 6 – was bleibt übrig?', state: 'rest = 5' },
          {
            step: 3,
            description: '47 / 6 – exakte Division als Kommazahl.',
            state: '7.833333333333333',
          },
        ],
      },
      reflectionPrompts: [
        'Woran erkennst du, ob du in einer Aufgabe / oder // brauchst?',
        'Wofür ist der Rest-Operator % außerhalb dieser Aufgabe noch nützlich?',
      ],
      commonMistakes: [
        {
          mistake: '/ verwenden, wo eine ganze Anzahl gefragt ist.',
          why: '/ liefert immer eine Kommazahl. 7.83 Tische ergeben in der Sache keinen Sinn.',
          fix: 'Bei "wie viele vollständige …" gehört // hin, bei "wie viel bleibt übrig" gehört % hin.',
        },
        {
          mistake: 'Erwarten, dass 0.1 + 0.2 exakt 0.3 ergibt.',
          why: 'Kommazahlen werden binär nur näherungsweise gespeichert. Winzige Abweichungen sind normal.',
          fix: 'Bei Geldbeträgen mit ganzen Cent-Beträgen rechnen oder das Ergebnis mit round() auf die benötigten Stellen bringen.',
        },
      ],
      estimatedMinutes: 12,
      primaryConceptSlugs: ['zahlen', 'arithmetik'],
      supportingConceptSlugs: ['datentyp', 'variable'],
      prerequisiteConceptSlugs: ['variable'],
      exercises: [
        {
          slug: 'e1-zahlen-division',
          type: 'SINGLE_CHOICE',
          title: 'Welcher Operator passt?',
          prompt:
            'Aus 250 Blatt Papier sollen Hefte zu je 16 Blatt entstehen. Welcher Ausdruck liefert die Anzahl vollständiger Hefte?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: '250 / 16',
                feedback:
                  'Das liefert 15.625. Ein Heft aus 0.625 Blatt gibt es nicht – hier ist eine ganze Anzahl gefragt.',
              },
              {
                id: 'b',
                text: '250 // 16',
                feedback:
                  'Genau. // schneidet den Rest ab und liefert 15 – so viele vollständige Hefte lassen sich binden.',
              },
              {
                id: 'c',
                text: '250 % 16',
                feedback:
                  '% liefert die 10 übrig gebliebenen Blätter. Das ist die Antwort auf die andere Frage.',
              },
              {
                id: 'd',
                text: '250 ** 16',
                feedback:
                  '** ist die Potenz. 250 hoch 16 ist eine astronomisch große Zahl und hat mit der Aufgabe nichts zu tun.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Kann das Ergebnis eine Kommazahl sein, wenn nach vollständigen Heften gefragt ist?',
            },
            {
              level: 2,
              kind: 'concept',
              text: '// beantwortet "wie oft passt das ganz hinein", % beantwortet "was bleibt übrig".',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['arithmetik'],
        },
        {
          slug: 'e1-zahlen-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Punkt vor Strich',
          prompt: 'Was gibt dieses Programm aus? Achte auf die Rechenreihenfolge.',
          payload: {
            kind: 'predictOutput',
            code: `print(2 + 3 * 4)\nprint((2 + 3) * 4)\nprint(10 / 2)`,
            expectedOutput: '14\n20\n5.0',
            explanation:
              'Ohne Klammern gilt Punkt vor Strich: 3 * 4 = 12, dann + 2 ergibt 14. Mit Klammern wird zuerst 2 + 3 = 5 gerechnet, dann * 4 = 20. Die dritte Zeile zeigt die Besonderheit der Division: Sie liefert immer eine Kommazahl, deshalb 5.0 und nicht 5.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Die dritte Zeile hat eine Besonderheit. Wie sieht das Ergebnis einer Division in Python aus?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Der Operator / liefert immer einen float – auch dann, wenn die Rechnung glatt aufgeht.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['arithmetik', 'zahlen'],
        },
        {
          slug: 'e1-zahlen-luecken',
          type: 'CODE_COMPLETION',
          title: 'Sekunden umrechnen',
          prompt:
            'Aus einer Gesamtzahl von Sekunden sollen volle Minuten und die restlichen Sekunden berechnet werden. Ergänze die passenden Operatoren.',
          payload: {
            kind: 'codeCompletion',
            template: `sekunden_gesamt = 500\nminuten = sekunden_gesamt {{blank:op1}} 60\nrest_sekunden = sekunden_gesamt {{blank:op2}} 60\nprint(minuten)\nprint(rest_sekunden)`,
            blanks: [
              {
                id: 'op1',
                accepted: ['//'],
                caseSensitive: true,
                description: 'Operator für volle Minuten',
                wrongHint:
                  'Eine volle Minute ist eine ganze Zahl. Welcher Operator schneidet den Rest ab?',
              },
              {
                id: 'op2',
                accepted: ['%'],
                caseSensitive: true,
                description: 'Operator für die restlichen Sekunden',
                wrongHint:
                  'Gesucht ist, was nach den vollen Minuten übrig bleibt. Dafür gibt es einen eigenen Operator.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: '500 Sekunden sind 8 Minuten und wie viele Sekunden? Rechne es kurz im Kopf.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Zwei Operatoren teilen sich die Arbeit: einer liefert die ganze Anzahl, der andere den Rest.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['arithmetik'],
        },
        {
          slug: 'e1-zahlen-schreiben',
          type: 'WRITE_CODE',
          title: 'Rechnung aufteilen',
          prompt:
            'Eine Rechnung über 87 Euro soll auf 4 Personen aufgeteilt werden. Es wird nur in ganzen Euro abgerechnet; der Rest übernimmt eine Person zusätzlich.\n\nLege den Betrag je Person in einer Variable je_person und den verbleibenden Rest in einer Variable rest ab. Gib danach zwei Zeilen aus: zuerst je_person, dann rest.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'ganzzahl',
                description: 'Die Aufteilung nutzt die ganzzahlige Division.',
                mustMatch: '//',
                message:
                  'Für die ganzen Euro je Person braucht es die ganzzahlige Division //, nicht die normale Division.',
              },
            ],
          },
          starterCode: 'rechnung = 87\npersonen = 4\n',
          solution: `rechnung = 87\npersonen = 4\nje_person = rechnung // personen\nrest = rechnung % personen\nprint(je_person)\nprint(rest)`,
          solutionNotes:
            '87 // 4 ergibt 21, weil 4 * 21 = 84 gerade noch hineinpasst. 87 % 4 ergibt die verbleibenden 3 Euro. Die beiden Operatoren gehören inhaltlich zusammen: je_person * personen + rest ergibt immer wieder die Ausgangszahl.',
          publicTests: [
            {
              id: 't1',
              name: 'Betrag je Person und Rest werden ausgegeben',
              expectedStdout: '21\n3',
              failureHint:
                'Erwartet werden genau zwei Zeilen: erst der Betrag je Person, dann der Rest.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Die Aufteilung geht rechnerisch auf',
              assertion:
                'assert je_person * personen + rest == rechnung, "Betrag je Person und Rest ergeben zusammen nicht die Rechnungssumme"',
              failureHint:
                'Prüfe: Der Betrag je Person mal Personenzahl plus Rest muss wieder die Ausgangssumme ergeben.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wie viele volle Euro bekommt jede Person, wenn 87 durch 4 geteilt wird?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Dieselbe Kombination wie bei den Tischen: // für den ganzen Anteil, % für den Rest.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: je_person berechnen, rest berechnen, beide nacheinander ausgeben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Der Anteil je Person entsteht so:',
              code: 'je_person = rechnung // personen',
            },
            {
              level: 5,
              kind: 'explanation',
              text: '87 // 4 = 21 und 87 % 4 = 3. Zur Kontrolle: 21 * 4 + 3 = 87. Diese Beziehung gilt immer und eignet sich gut als Selbsttest, wenn du unsicher bist, ob du die Operatoren richtig herum verwendet hast.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['arithmetik', 'zahlen'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'text-und-f-strings',
      title: 'Text zusammensetzen',
      learningObjectives: [
        'Du kannst Text und Werte mit einem f-String zu einer lesbaren Ausgabe verbinden.',
        'Du kannst erklären, warum "5" + 5 nicht funktioniert und was stattdessen zu tun ist.',
      ],
      everydayProblem:
        'Deine Ausgabe lautet bisher nur "297.5". Für eine Rechnung, die jemand lesen soll, braucht es aber: "Rechnungsbetrag: 297.50 Euro". Text und Zahlen müssen dafür zusammenkommen.',
      mentalModel:
        'Ein f-String ist ein Textbaustein mit Aussparungen. Vor die Anführungszeichen kommt ein f, und überall dort, wo ein Wert eingesetzt werden soll, stehen geschweifte Klammern mit dem Variablennamen darin. Python setzt beim Ausführen die aktuellen Werte ein. Der Vorteil gegenüber dem Verbinden mit +: Es muss nichts umgewandelt werden, und der Text bleibt am Stück lesbar.',
      workedExample: {
        code: `kundin = "Frau Berger"
betrag = 297.5

print(f"Rechnungsbetrag für {kundin}: {betrag} Euro")
print(f"Gerundet: {betrag:.2f} Euro")
print("Ohne f-String: " + str(betrag))`,
        annotations: [
          {
            line: 4,
            text: 'Das f vor dem Anführungszeichen schaltet die Auswertung der geschweiften Klammern ein. Ohne das f würde wörtlich {kundin} ausgegeben.',
          },
          {
            line: 5,
            text: 'Hinter dem Doppelpunkt steht eine Formatangabe. .2f bedeutet: als Kommazahl mit genau zwei Nachkommastellen.',
          },
          {
            line: 6,
            text: 'Die Verbindung mit + verlangt, dass beide Seiten Text sind. str() wandelt die Zahl in Text um. Das funktioniert, ist aber schwerer zu lesen.',
          },
        ],
        output:
          'Rechnungsbetrag für Frau Berger: 297.5 Euro\nGerundet: 297.50 Euro\nOhne f-String: 297.5',
        trace: [
          {
            step: 1,
            description: 'Python ersetzt {kundin} durch den aktuellen Wert.',
            state: '"Rechnungsbetrag für Frau Berger: …"',
          },
          {
            step: 2,
            description: 'Die Formatangabe .2f erzwingt zwei Nachkommastellen.',
            state: '297.5 wird zu "297.50"',
          },
        ],
      },
      reflectionPrompts: [
        'Wann würdest du einen f-String verwenden und wann genügt ein einfacher print()-Aufruf?',
        'Was passiert, wenn du das f vor dem Anführungszeichen vergisst?',
      ],
      commonMistakes: [
        {
          mistake: 'Das f vor dem Anführungszeichen vergessen.',
          why: 'Ohne f sind die geschweiften Klammern gewöhnliche Zeichen. Die Ausgabe enthält dann wörtlich {name}.',
          fix: 'Wenn in der Ausgabe geschweifte Klammern auftauchen, fehlt fast immer das f.',
        },
        {
          mistake: 'Text und Zahl mit + verbinden wollen.',
          why: '"Alter: " + 30 löst einen TypeError aus. Python addiert nicht über Typgrenzen hinweg.',
          fix: 'Entweder f-String verwenden oder die Zahl vorher mit str() umwandeln.',
        },
      ],
      estimatedMinutes: 11,
      primaryConceptSlugs: ['string', 'f-string'],
      supportingConceptSlugs: ['variable', 'datentyp'],
      prerequisiteConceptSlugs: ['variable'],
      exercises: [
        {
          slug: 'e1-string-typfehler',
          type: 'EXPLAIN_ERROR',
          title: 'Warum bricht das ab?',
          prompt:
            'Der Code print("Alter: " + 30) bricht mit TypeError ab. Welche Erklärung trifft zu?',
          payload: {
            kind: 'singleChoice',
            code: 'alter = 30\nprint("Alter: " + alter)',
            options: [
              {
                id: 'a',
                text: 'Python kann Text und Zahl nicht mit + verbinden, weil beide unterschiedliche Typen sind.',
                feedback:
                  'Genau. Für Text bedeutet + "aneinanderhängen", für Zahlen "addieren". Bei gemischten Typen ist unklar, was gemeint ist – deshalb bricht Python ab, statt zu raten.',
              },
              {
                id: 'b',
                text: 'Die Variable alter existiert nicht.',
                feedback:
                  'Sie existiert – das wäre ein NameError. Hier meldet Python ausdrücklich einen TypeError, also ein Problem mit den Datentypen.',
              },
              {
                id: 'c',
                text: 'print() darf nur ein Argument bekommen.',
                feedback:
                  'print() kann mehrere Argumente verarbeiten. Der Fehler entsteht schon vorher, beim Auswerten des + zwischen Text und Zahl.',
              },
              {
                id: 'd',
                text: 'Zahlen dürfen nicht ausgegeben werden.',
                feedback:
                  'print(30) funktioniert problemlos. Das Problem ist die Verbindung mit dem Text, nicht die Ausgabe selbst.',
              },
            ],
            correctOptionId: 'a',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was bedeutet das Zeichen + bei Text, und was bedeutet es bei Zahlen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'TypeError zeigt immer an: Die Operation passt nicht zu den Typen der beteiligten Werte.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['string', 'datentyp', 'fehlermeldung'],
        },
        {
          slug: 'e1-string-luecken',
          type: 'CODE_COMPLETION',
          title: 'f-String vervollständigen',
          prompt: 'Die Ausgabe soll lauten: Anna hat 3 Termine. Ergänze die Lücken.',
          payload: {
            kind: 'codeCompletion',
            template: `name = "Anna"\ntermine = 3\nprint({{blank:praefix}}"{name} hat {{blank:platzhalter}} Termine.")`,
            blanks: [
              {
                id: 'praefix',
                accepted: ['f'],
                caseSensitive: true,
                description: 'Kennzeichen für einen f-String',
                wrongHint:
                  'Ohne dieses eine Zeichen vor dem Anführungszeichen bleiben die geschweiften Klammern gewöhnlicher Text.',
              },
              {
                id: 'platzhalter',
                accepted: ['{termine}'],
                caseSensitive: true,
                description: 'Platzhalter für die Anzahl der Termine',
                wrongHint:
                  'Der Platzhalter besteht aus geschweiften Klammern mit dem Variablennamen darin – ohne Anführungszeichen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wodurch weiß Python, dass geschweifte Klammern ausgewertet werden sollen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Zwei Bestandteile: das f direkt vor dem Anführungszeichen und der Variablenname in geschweiften Klammern.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['f-string'],
        },
        {
          slug: 'e1-string-vorhersage',
          type: 'PREDICT_OUTPUT',
          title: 'Mit und ohne f',
          prompt: 'Welche Ausgabe entsteht?',
          payload: {
            kind: 'predictOutput',
            code: `stadt = "Bremen"\nprint(f"Ort: {stadt}")\nprint("Ort: {stadt}")`,
            expectedOutput: 'Ort: Bremen\nOrt: {stadt}',
            explanation:
              'In der ersten Zeile schaltet das f die Auswertung ein, deshalb wird der Wert eingesetzt. In der zweiten Zeile fehlt das f – die geschweiften Klammern sind dort gewöhnliche Zeichen und erscheinen wörtlich in der Ausgabe.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Vergleiche die beiden Zeilen Zeichen für Zeichen. Worin unterscheiden sie sich?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Nur mit f werden geschweifte Klammern als Platzhalter behandelt.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['f-string', 'string'],
        },
        {
          slug: 'e1-string-schreiben',
          type: 'WRITE_CODE',
          title: 'Lesbare Rechnungszeile',
          prompt:
            'Gegeben sind artikel = "Druckerpapier", menge = 3 und einzelpreis = 4.5.\n\nGib genau eine Zeile aus, die so aussieht:\n\n3 x Druckerpapier: 13.50 Euro\n\nDer Gesamtpreis soll berechnet und mit genau zwei Nachkommastellen dargestellt werden.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'fstring',
                description: 'Die Ausgabe nutzt einen f-String.',
                mustMatch: 'f"|f\'',
                message:
                  'Setze die Ausgabe mit einem f-String zusammen. Das ist hier deutlich lesbarer als eine Verkettung mit +.',
              },
            ],
          },
          starterCode:
            'artikel = "Druckerpapier"\nmenge = 3\neinzelpreis = 4.5\n\n# Berechne den Gesamtpreis und gib die Zeile aus\n',
          solution: `artikel = "Druckerpapier"\nmenge = 3\neinzelpreis = 4.5\ngesamt = menge * einzelpreis\nprint(f"{menge} x {artikel}: {gesamt:.2f} Euro")`,
          solutionNotes:
            'Die Formatangabe :.2f sorgt für genau zwei Nachkommastellen – ohne sie stünde dort 13.5 statt 13.50. Das ist bei Geldbeträgen fast immer erwünscht.',
          publicTests: [
            {
              id: 't1',
              name: 'Die Zeile hat das geforderte Format',
              expectedStdout: '3 x Druckerpapier: 13.50 Euro',
              failureHint:
                'Achte auf Leerzeichen, den Doppelpunkt und die zwei Nachkommastellen. Erwartet wird genau eine Ausgabezeile.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wie viel kosten drei Packungen zu je 4.50 Euro – und wie viele Nachkommastellen soll das Ergebnis zeigen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'In einem f-String darf hinter dem Variablennamen eine Formatangabe stehen, eingeleitet durch einen Doppelpunkt.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Gesamtpreis berechnen, dann eine einzige print()-Zeile mit f-String und Formatangabe.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die Formatangabe für zwei Nachkommastellen sieht so aus:',
              code: '{gesamt:.2f}',
            },
            {
              level: 5,
              kind: 'explanation',
              text: '3 * 4.5 ergibt 13.5. Ohne Formatangabe würde genau das ausgegeben. Die Angabe :.2f rundet auf zwei Nachkommastellen und füllt bei Bedarf mit einer Null auf, sodass 13.50 erscheint.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['f-string', 'arithmetik'],
        },
      ],
    },

    // ---------------------------------------------------------------------
    {
      slug: 'eingabe-und-typumwandlung',
      title: 'Eingaben verarbeiten',
      learningObjectives: [
        'Du kannst mit input() eine Eingabe entgegennehmen und weißt, dass das Ergebnis immer eine Zeichenkette ist.',
        'Du kannst eine Eingabe mit int() oder float() umwandeln, um damit zu rechnen.',
        'Du kannst erklären, warum bei einer nicht umwandelbaren Eingabe ein ValueError entsteht.',
      ],
      everydayProblem:
        'Dein Programm rechnet bisher nur mit fest eingetragenen Zahlen. Sobald jemand anderes es benutzen soll, muss es fragen können – und mit der Antwort auch rechnen.',
      mentalModel:
        'input() ist wie ein Formularfeld: Was auch immer hineingeschrieben wird, kommt als Text heraus. Auch "42" ist zunächst nur eine Folge von zwei Zeichen, keine Zahl. Erst int("42") macht daraus die Zahl 42. Dieser Umwandlungsschritt ist die häufigste Stolperstelle für Einsteigerinnen und Einsteiger – und die Ursache hinter sehr vielen TypeError-Meldungen.',
      workedExample: {
        code: `eingabe = input("Wie viele Stunden? ")
stunden = int(eingabe)
lohn = stunden * 14

print(f"Verdienst: {lohn} Euro")
print(type(eingabe))
print(type(stunden))`,
        annotations: [
          {
            line: 1,
            text: 'Der Text in den Klammern erscheint als Frage vor der Eingabe. Zurück kommt immer eine Zeichenkette.',
          },
          {
            line: 2,
            text: 'int() wandelt die Zeichenkette in eine ganze Zahl um. Ohne diesen Schritt scheitert die Multiplikation in Zeile 3.',
          },
          {
            line: 6,
            text: 'type() zeigt den Datentyp an. Das ist bei der Fehlersuche oft die schnellste Diagnose.',
          },
        ],
        output: "Wie viele Stunden? 6\nVerdienst: 84 Euro\n<class 'str'>\n<class 'int'>",
        trace: [
          { step: 1, description: 'Die Eingabe "6" kommt als Text an.', state: 'eingabe = "6"' },
          { step: 2, description: 'int("6") liefert die Zahl 6.', state: 'stunden = 6' },
          { step: 3, description: '6 * 14 wird berechnet.', state: 'lohn = 84' },
        ],
      },
      reflectionPrompts: [
        'Warum liefert input() auch dann Text, wenn jemand eine Zahl eintippt?',
        'Woran erkennst du in einer Fehlermeldung, dass eine Umwandlung gefehlt hat?',
      ],
      commonMistakes: [
        {
          mistake: 'Mit dem Ergebnis von input() direkt rechnen.',
          why: 'input() * 2 verdoppelt bei Text nicht den Wert, sondern hängt den Text an sich selbst – oder bricht mit TypeError ab.',
          fix: 'Die Umwandlung mit int() oder float() direkt in die Zeile mit der Eingabe schreiben.',
        },
        {
          mistake: 'int() auf eine Kommazahl-Eingabe anwenden.',
          why: 'int("3.5") löst einen ValueError aus, weil "3.5" keine ganze Zahl darstellt.',
          fix: 'Bei möglichen Nachkommastellen float() verwenden.',
        },
      ],
      estimatedMinutes: 13,
      primaryConceptSlugs: ['input-eingabe', 'typumwandlung'],
      supportingConceptSlugs: ['datentyp', 'fehlermeldung', 'f-string'],
      prerequisiteConceptSlugs: ['string', 'zahlen'],
      exercises: [
        {
          slug: 'e1-input-typ',
          type: 'SINGLE_CHOICE',
          title: 'Was liefert input()?',
          prompt:
            'Jemand gibt bei input() die Zeichen 7 ein. Welchen Typ hat der zurückgegebene Wert?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'int, weil eine Zahl eingegeben wurde',
                feedback:
                  'input() prüft den Inhalt nicht. Es liefert immer eine Zeichenkette, auch wenn dort nur Ziffern stehen.',
              },
              {
                id: 'b',
                text: 'str, unabhängig davon, was eingegeben wurde',
                feedback:
                  'Genau. Deshalb ist die Umwandlung mit int() oder float() nötig, sobald gerechnet werden soll.',
              },
              {
                id: 'c',
                text: 'float, weil Python sicherheitshalber Kommazahlen nimmt',
                feedback:
                  'Python wandelt nichts von selbst um. Die Entscheidung über den Typ trifft die schreibende Person.',
              },
              {
                id: 'd',
                text: 'Das hängt davon ab, ob eine Zahl oder ein Wort eingegeben wurde',
                feedback:
                  'Der Rückgabetyp ist immer derselbe: str. Nur der Inhalt der Zeichenkette unterscheidet sich.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Kann input() überhaupt wissen, ob du eine Zahl oder ein Wort meinst?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'input() liest Zeichen. Ob diese Zeichen eine Zahl darstellen, entscheidet erst die Umwandlung.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['input-eingabe', 'datentyp'],
        },
        {
          slug: 'e1-input-fehler-finden',
          type: 'FIND_ERROR',
          title: 'Fehlende Umwandlung finden',
          prompt:
            'Dieses Programm soll das Alter in Tagen ausrechnen, bricht aber ab. Markiere die Zeile, in der die Ursache liegt.',
          payload: {
            kind: 'findError',
            codeLines: ['alter = input("Alter: ")', 'tage = alter * 365', 'print(tage)'],
            faultyLineNumbers: [2],
            explanation:
              'Zeile 1 ist korrekt: input() liefert planmäßig eine Zeichenkette. Der Fehler entsteht in Zeile 2, weil dort mit dieser Zeichenkette gerechnet wird. Text mal ganze Zahl bedeutet in Python "Text wiederholen" – "30" * 365 ergäbe eine sehr lange Zeichenkette. Richtig wäre tage = int(alter) * 365.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welchen Typ hat alter nach Zeile 1 – und passt dieser Typ zu der Rechnung in Zeile 2?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Die Ursache liegt nicht immer dort, wo Python abbricht. Verfolge, woher der beteiligte Wert stammt.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Die Eingabe selbst ist in Ordnung. Fehlerhaft ist die Stelle, an der ohne Umwandlung gerechnet wird.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['typumwandlung', 'fehlermeldung'],
        },
        {
          slug: 'e1-input-parsons',
          type: 'PARSONS',
          title: 'Eingabe verarbeiten',
          prompt:
            'Ordne die Zeilen so an, dass eine eingegebene Anzahl Kilometer in Meter umgerechnet und ausgegeben wird. Eine Zeile gehört nicht dazu.',
          payload: {
            kind: 'parsons',
            lines: [
              { id: 'i1', code: 'eingabe = input("Kilometer: ")', indent: 0, distractor: false },
              { id: 'i2', code: 'kilometer = float(eingabe)', indent: 0, distractor: false },
              { id: 'i3', code: 'meter = kilometer * 1000', indent: 0, distractor: false },
              { id: 'i4', code: 'print(meter)', indent: 0, distractor: false },
              { id: 'i5', code: 'meter = eingabe * 1000', indent: 0, distractor: true },
            ],
            correctOrder: ['i1', 'i2', 'i3', 'i4'],
            checkIndentation: false,
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Zwischen der Eingabe und der Rechnung fehlt ein Schritt. Welcher?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Eingabe entgegennehmen, umwandeln, rechnen, ausgeben – das ist die übliche Reihenfolge.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Kilometerangaben können Nachkommastellen haben. Deshalb float() und nicht int().',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['input-eingabe', 'typumwandlung', 'eva-prinzip'],
        },
        {
          slug: 'e1-input-schreiben',
          type: 'WRITE_CODE',
          title: 'Getränkerechnung',
          prompt:
            'Schreibe ein Programm, das zwei Eingaben nacheinander abfragt:\n\n1. die Anzahl der Getränke (ganze Zahl)\n2. den Preis je Getränk (kann Nachkommastellen haben)\n\nGib danach genau eine Zeile aus, die so aussieht:\n\nGesamt: 11.25 Euro\n\nDer Betrag hat immer zwei Nachkommastellen.',
          payload: {
            kind: 'code',
            sourceChecks: [
              {
                id: 'umwandlung',
                description: 'Die Eingaben werden umgewandelt.',
                mustMatch: 'int\\(|float\\(',
                message:
                  'Die Eingaben müssen vor der Rechnung umgewandelt werden – sonst rechnet Python mit Text.',
              },
            ],
          },
          starterCode: '# Zwei Eingaben abfragen, umwandeln, Gesamtpreis ausgeben\n',
          solution: `anzahl = int(input("Anzahl: "))\npreis = float(input("Preis je Getränk: "))\ngesamt = anzahl * preis\nprint(f"Gesamt: {gesamt:.2f} Euro")`,
          solutionNotes:
            'Die Umwandlung steht hier direkt um den input()-Aufruf herum. Das ist kompakt und gut lesbar. Für die Anzahl passt int(), für den Preis float(), weil dort Nachkommastellen vorkommen.',
          publicTests: [
            {
              id: 't1',
              name: 'Drei Getränke zu 3.75 Euro',
              stdin: ['3', '3.75'],
              expectedStdout: 'Gesamt: 11.25 Euro',
              failureHint:
                'Erwartet wird genau eine Ausgabezeile im Format "Gesamt: 11.25 Euro". Achte auf die Reihenfolge der beiden Eingaben und auf zwei Nachkommastellen.',
            },
          ],
          hiddenTests: [
            {
              id: 't2',
              name: 'Auch mit anderen Werten korrekt',
              stdin: ['5', '2.2'],
              expectedStdout: 'Gesamt: 11.00 Euro',
              failureHint:
                'Das Programm soll für beliebige Eingaben rechnen, nicht nur für ein festes Beispiel.',
            },
          ],
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche der beiden Eingaben kann Nachkommastellen enthalten, welche nicht?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Jede Eingabe kommt als Text an und braucht eine passende Umwandlung, bevor gerechnet werden kann.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Struktur: Anzahl abfragen und umwandeln, Preis abfragen und umwandeln, multiplizieren, mit f-String und :.2f ausgeben.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Eingabe und Umwandlung lassen sich in einer Zeile verbinden:',
              code: 'anzahl = int(input("Anzahl: "))',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Die innere Funktion wird zuerst ausgeführt: input() liefert den Text, int() macht daraus eine Zahl, und erst dieses Ergebnis wird zugewiesen. Für den Preis ist float() nötig, weil int("3.75") mit einem ValueError abbrechen würde. Die Formatangabe :.2f sorgt für die zwei Nachkommastellen im Ergebnis.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['input-eingabe', 'typumwandlung', 'f-string'],
        },
        {
          slug: 'e1-input-vergleich',
          type: 'COMPARE_SOLUTION',
          title: 'Zwei Lösungswege vergleichen',
          prompt:
            'Zwei Personen lösen dieselbe Aufgabe.\n\nVariante A:\n  eingabe = input("Zahl: ")\n  zahl = int(eingabe)\n\nVariante B:\n  zahl = int(input("Zahl: "))\n\nBeschreibe, worin sich die Varianten unterscheiden und in welcher Situation Variante A den Vorteil hat.',
          payload: {
            kind: 'freeText',
            requiredKeywordGroups: [
              {
                id: 'gleichwertig',
                anyOf: ['gleich', 'dasselbe', 'identisch', 'kein unterschied', 'gleiche ergebnis'],
                missingHint:
                  'Halte zuerst fest, ob beide Varianten fachlich dasselbe Ergebnis liefern.',
              },
              {
                id: 'zwischenschritt',
                anyOf: [
                  'zwischenschritt',
                  'zwischenwert',
                  'eingabe',
                  'prüfen',
                  'pruefen',
                  'ursprünglich',
                  'ursprunglich',
                  'original',
                  'roh',
                ],
                missingHint:
                  'Variante A behält etwas, das Variante B verwirft. Was ist das – und wozu könnte es nützlich sein?',
              },
            ],
            minLength: 90,
            sampleAnswer:
              'Beide Varianten liefern dasselbe Ergebnis: eine ganze Zahl aus der Eingabe. Variante B ist kürzer, weil sie den Zwischenschritt einspart. Variante A behält die ursprüngliche Eingabe als Text in einer eigenen Variable. Das ist dann von Vorteil, wenn die Eingabe vor der Umwandlung noch geprüft werden soll – etwa ob sie überhaupt aus Ziffern besteht – oder wenn sie später unverändert ausgegeben werden muss.',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was ist nach Variante B mit dem ursprünglich eingegebenen Text passiert?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Kürzerer Code ist nicht automatisch besserer Code. Ein Zwischenwert kann für Prüfungen nützlich sein.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zwei Punkte gehören in die Antwort: Sind die Ergebnisse gleich? Und wozu dient der Zwischenwert?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 6,
          conceptSlugs: ['typumwandlung', 'input-eingabe'],
        },
      ],
    },
  ],
};
