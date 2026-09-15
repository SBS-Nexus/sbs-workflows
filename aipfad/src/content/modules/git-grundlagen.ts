import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Modul 5: Git — die Grundlagen (Ausbaustufe 2).
 *
 * Aufbau folgt dem mentalen Modell, nicht der Befehlsliste: erst die drei
 * Orte, dann was zwischen ihnen passiert, dann Verzweigen und
 * Zusammenführen. Befehle sind Mittel, nicht Lernziel — die vollständige
 * Befehlsreferenz steht im Nachschlagebereich.
 *
 * Eine Seite trägt eine Entscheidung. Deshalb sind Diff und Verlauf
 * getrennt von Staging und Commit, und Merge getrennt von Merge-Konflikt.
 */
export const gitGrundlagenModule: ModuleDraft = {
  slug: 'git-grundlagen',
  title: 'Git — die Grundlagen',
  summary:
    'Was Git auf deinem Rechner tut: die drei Orte einer Datei, Commits als Momentaufnahmen, Branches als Zeiger und das Zusammenführen zweier Wege.',
  rationale:
    'Git wird meist als Befehlsliste gelernt und bleibt deshalb rätselhaft. Hier steht zuerst das Modell — Arbeitsverzeichnis, Staging Area, Repository — weil sich danach fast jeder Befehl von selbst erklärt.',
  prerequisiteModuleSlugs: ['technischer-arbeitsplatz'],
  status: 'PUBLISHED',
  lessons: [
    // ---------------------------------------------------------------- 1
    {
      slug: 'warum-versionsverwaltung',
      title: 'Warum Versionsverwaltung?',
      learningObjectives: [
        'Du kannst benennen, welche drei Fragen eine Versionsverwaltung beantwortet, die Dateikopien nicht beantworten können.',
        'Du erkennst, warum gemeinsames Arbeiten ohne Versionsverwaltung an denselben Stellen scheitert.',
      ],
      everydayProblem:
        'Im Ordner liegen bericht_final.docx, bericht_final_v2.docx und bericht_final_wirklich.docx. Niemand weiß mehr, welche Fassung gilt, was sich zwischen ihnen geändert hat und warum jemand etwas geändert hat.',
      mentalModel:
        'Eine Versionsverwaltung ist kein besserer Ordner, sondern ein Logbuch: Sie hält jeden Stand mit Zeitpunkt, Urheberin und Begründung fest. Der aktuelle Stand ist nur der letzte Eintrag — alle früheren bleiben abrufbar.',
      workedExample: {
        summary: 'Dieselbe Woche Arbeit, einmal mit Dateikopien und einmal mit Versionsverwaltung.',
        annotations: [
          { step: 1, text: 'Mit Kopien: Der Dateiname trägt die Information — unzuverlässig.' },
          {
            step: 2,
            text: 'Mit Versionsverwaltung: Jeder Stand hat Zeitpunkt, Person und Begründung.',
          },
          {
            step: 3,
            text: 'Zwei Personen arbeiten parallel: Kopien überschreiben sich, Git führt zusammen.',
          },
        ],
        outcome:
          'Die Frage "warum steht das hier so" wird von einer Erinnerungsfrage zu einer Nachschlagefrage.',
      },
      reflectionPrompts: [
        'Wann hast du zuletzt eine Datei überschrieben und die vorherige Fassung gebraucht?',
        'Woran erkennst du in deinen jetzigen Projekten, warum etwas geändert wurde?',
      ],
      commonMistakes: [
        {
          mistake: 'Versionsverwaltung als reine Sicherungskopie verstehen.',
          why: 'Eine Sicherung stellt einen Stand wieder her, erklärt aber nicht, was sich wann warum geändert hat — und hilft beim parallelen Arbeiten gar nicht.',
          fix: 'Denk an ein Logbuch mit Begründungen, nicht an einen Papierkorb.',
        },
      ],
      estimatedMinutes: 6,
      primaryConceptSlugs: ['versionsverwaltung'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: ['terminal-grundbegriffe'],
      exercises: [
        {
          slug: 'git-warum-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Was Versionsverwaltung leistet',
          prompt: 'Was leistet eine Versionsverwaltung, das nummerierte Dateikopien nicht leisten?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Sie spart Speicherplatz, weil nur eine Datei übrig bleibt.',
                feedback:
                  'Speicherplatz ist nicht der Punkt — der gesamte Verlauf wird ja zusätzlich aufbewahrt.',
              },
              {
                id: 'b',
                text: 'Sie hält zu jedem Stand fest, wer ihn wann und mit welcher Begründung erzeugt hat.',
                feedback:
                  'Genau. Diese drei Angaben stecken in keinem Dateinamen und sind der eigentliche Gewinn.',
              },
              {
                id: 'c',
                text: 'Sie verhindert, dass zwei Personen dieselbe Datei bearbeiten.',
                feedback:
                  'Im Gegenteil: Git ist gerade dafür gebaut, dass mehrere parallel arbeiten und danach zusammenführen.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was steht in einem Dateinamen — und was steht ganz sicher nicht darin?',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 3,
          conceptSlugs: ['versionsverwaltung'],
        },
        {
          slug: 'git-warum-szenario',
          type: 'SCENARIO_DECISION',
          title: 'Zwei Personen, eine Datei',
          prompt:
            'Ihr seid zu zweit und bearbeitet dieselbe Textdatei an unterschiedlichen Stellen. Wie geht ihr vor?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Du und eine Kollegin arbeitet am selben Dokument. Sie ergänzt die Einleitung, du überarbeitest den Schluss. Beide beginnt ihr mit demselben Stand.',
            options: [
              {
                id: 'a',
                text: 'Ihr schickt euch die Datei abwechselnd zu und wartet jeweils aufeinander.',
                quality: 'problematic',
                feedback:
                  'Funktioniert, aber ihr blockiert euch. Genau dieses Warten soll Versionsverwaltung überflüssig machen.',
              },
              {
                id: 'b',
                text: 'Jede arbeitet für sich weiter, danach führt ihr beide Stände zusammen.',
                quality: 'optimal',
                feedback:
                  'Richtig. Weil eure Änderungen verschiedene Stellen betreffen, lassen sie sich problemlos zusammenführen.',
              },
              {
                id: 'c',
                text: 'Eine von euch schickt am Ende ihre Fassung und die andere übernimmt sie.',
                quality: 'problematic',
                feedback:
                  'Damit geht die Arbeit einer Person verloren — der Fehler, den Versionsverwaltung gerade verhindert.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wo genau in der Datei arbeitet ihr jeweils — überschneidet sich das überhaupt?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['versionsverwaltung'],
        },
      ],
    },

    // ---------------------------------------------------------------- 2
    {
      slug: 'die-drei-orte',
      title: 'Die drei Orte einer Datei',
      learningObjectives: [
        'Du kannst Arbeitsverzeichnis, Staging Area und Repository voneinander abgrenzen und sagen, was jeweils darin liegt.',
        'Du kannst vorhersagen, in welchem Zustand sich eine Datei nach einer Änderung befindet.',
      ],
      everydayProblem:
        'Du hast fünf Dateien geändert, aber nur drei davon gehören zur Aufgabe, an der du gerade arbeitest. Ein Commit über alles würde zwei unfertige Änderungen mit hineinziehen.',
      mentalModel:
        'Denk an einen Versandtisch: Im Arbeitsverzeichnis liegen alle Sachen herum. In den Karton (Staging Area) legst du nur, was wirklich mit soll. Erst das Zukleben und Beschriften (Commit) macht daraus eine dauerhafte Sendung.',
      workedExample: {
        summary:
          'Eine Datei wandert von "geändert" über "vorgemerkt" zu "festgehalten" — und der Zustand ist an jeder Station ablesbar.',
        annotations: [
          {
            step: 1,
            text: 'Datei im Editor geändert: Sie gilt als geändert, Git kennt sie noch nicht als Kandidat.',
          },
          { step: 2, text: 'git add legt eine Momentaufnahme in die Staging Area.' },
          {
            step: 3,
            text: 'Erneutes Bearbeiten: dieselbe Datei ist jetzt gleichzeitig vorgemerkt UND geändert.',
          },
          { step: 4, text: 'git commit nimmt ausschließlich die vorgemerkte Fassung mit.' },
        ],
        outcome:
          'Ein Commit enthält nie mehr und nie weniger als das, was zum Zeitpunkt des git add vorgemerkt war.',
      },
      reflectionPrompts: [
        'Warum ist es nützlich, dass zwischen "geändert" und "festgehalten" noch ein Schritt liegt?',
        'Wann hättest du dir gewünscht, nur einen Teil deiner Änderungen abgeben zu können?',
      ],
      commonMistakes: [
        {
          mistake:
            'Nach dem git add weiterarbeiten und annehmen, die neue Änderung sei mit vorgemerkt.',
          why: 'git add macht eine Momentaufnahme des damaligen Standes — spätere Bearbeitungen sind davon nicht erfasst.',
          fix: 'Vor dem Commit noch einmal git status lesen: Eine doppelt aufgeführte Datei ist genau dieser Fall.',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['git-repository', 'arbeitsverzeichnis', 'staging-area'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: ['versionsverwaltung'],
      exercises: [
        {
          slug: 'drei-orte-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Zustände zuordnen',
          prompt: 'Ordne jede Datei dem Zustand zu, in dem sie sich gerade befindet.',
          payload: {
            kind: 'classification',
            instruction:
              'In einem Repository wurde zuletzt ein Commit gemacht. Danach ist Folgendes passiert.',
            categories: [
              {
                id: 'untracked',
                label: 'unversioniert',
                description: 'Git kennt diese Datei noch gar nicht.',
              },
              {
                id: 'modified',
                label: 'geändert',
                description: 'Bekannt, seit dem letzten Commit geändert, nicht vorgemerkt.',
              },
              {
                id: 'staged',
                label: 'vorgemerkt',
                description: 'Die Änderung liegt bereit für den nächsten Commit.',
              },
              {
                id: 'committed',
                label: 'unverändert',
                description: 'Identisch mit dem letzten Commit.',
              },
            ],
            items: [
              {
                id: 'i1',
                text: 'notizen.txt — neu angelegt, noch kein git add',
                correctCategoryId: 'untracked',
                feedback: 'Eine neu angelegte Datei kennt Git erst nach dem ersten git add.',
              },
              {
                id: 'i2',
                text: 'liesmich.md — im Editor geändert, kein git add',
                correctCategoryId: 'modified',
                feedback:
                  'Die Datei ist Git bekannt und weicht vom letzten Commit ab — das ist "geändert".',
              },
              {
                id: 'i3',
                text: 'preise.md — geändert und anschließend git add ausgeführt',
                correctCategoryId: 'staged',
                feedback: 'Nach git add liegt die Änderung in der Staging Area.',
              },
              {
                id: 'i4',
                text: 'lizenz.txt — seit dem letzten Commit nicht angefasst',
                correctCategoryId: 'committed',
                feedback: 'Ohne Änderung stimmt die Datei mit dem letzten Commit überein.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Frag dich bei jeder Datei zuerst: Kennt Git sie überhaupt schon?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Danach: Weicht sie vom letzten Commit ab — und wenn ja, wurde das schon vorgemerkt?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['arbeitsverzeichnis', 'staging-area'],
        },
        {
          slug: 'drei-orte-interpretation',
          type: 'INTERPRETATION',
          title: 'Was landet im Commit?',
          prompt: 'Sieh dir den Zustand an und entscheide, was ein Commit jetzt mitnehmen würde.',
          payload: {
            kind: 'interpretation',
            ansicht: {
              art: 'gitStatus',
              eintraege: [
                { pfad: 'preise.md', status: 'staged', auchUngestagt: true },
                { pfad: 'liesmich.md', status: 'modified', auchUngestagt: true },
                { pfad: 'notizen.txt', status: 'untracked', auchUngestagt: false },
              ],
            },
            frage: 'Du führst jetzt git commit aus. Was ist danach festgehalten?',
            options: [
              {
                id: 'a',
                text: 'Alle drei Dateien in ihrem aktuellen Stand.',
                feedback:
                  'Nein. Nur Vorgemerktes kommt mit — liesmich.md und notizen.txt sind es nicht.',
              },
              {
                id: 'b',
                text: 'Nur preise.md, und zwar in der Fassung von vor der letzten Bearbeitung.',
                feedback:
                  'Richtig. preise.md ist vorgemerkt, wurde danach aber erneut geändert — mit kommt die vorgemerkte Fassung.',
              },
              {
                id: 'c',
                text: 'Nur preise.md, in ihrem allerneuesten Stand.',
                feedback:
                  'Fast. Vorgemerkt wurde ein früherer Stand; die spätere Änderung bleibt liegen — deshalb steht die Datei doppelt.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Warum taucht preise.md in zwei Abschnitten gleichzeitig auf?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'git add macht eine Momentaufnahme. Was danach passiert, steht nicht mehr im Karton.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['staging-area', 'commit'],
        },
      ],
    },

    // ---------------------------------------------------------------- 3
    {
      slug: 'commit-schreiben',
      title: 'Einen Commit schreiben',
      learningObjectives: [
        'Du kannst einen Commit als Momentaufnahme mit Begründung beschreiben statt als gespeicherte Datei.',
        'Du kannst beurteilen, ob eine Commit-Nachricht später noch nützlich ist.',
      ],
      everydayProblem:
        'Im Verlauf stehen zwanzig Commits mit Nachrichten wie "fix", "update" und "änderungen". Ein halbes Jahr später sucht jemand die Stelle, an der ein Verhalten eingeführt wurde — und findet sie nicht.',
      mentalModel:
        'Eine Commit-Nachricht schreibst du nicht für jetzt, sondern für die Person, die in einem Jahr wissen will, warum. Der Code zeigt das Was; die Nachricht muss das Warum liefern.',
      workedExample: {
        summary: 'Dieselbe Änderung, dreimal unterschiedlich begründet.',
        annotations: [
          { step: 1, text: '"update" — sagt nichts, was der Verlauf nicht schon zeigt.' },
          { step: 2, text: '"Datei geändert" — beschreibt das Offensichtliche.' },
          {
            step: 3,
            text: '"Anmeldung lehnt leere Passwörter ab" — nennt Wirkung und macht die Stelle auffindbar.',
          },
        ],
        outcome: 'Eine gute Nachricht beantwortet die Frage, die man später tatsächlich stellt.',
      },
      reflectionPrompts: [
        'Welche Commit-Nachricht hättest du gern in einem fremden Projekt vorgefunden?',
        'Woran würdest du merken, dass ein Commit zu viel auf einmal enthält?',
      ],
      commonMistakes: [
        {
          mistake: 'Einen ganzen Arbeitstag in einen einzigen Commit legen.',
          why: 'Ein solcher Commit lässt sich später weder verstehen noch gezielt zurücknehmen — er vermischt mehrere Absichten.',
          fix: 'Nutze die Staging Area, um pro Absicht einen eigenen Commit zu bauen.',
        },
      ],
      estimatedMinutes: 7,
      primaryConceptSlugs: ['commit'],
      supportingConceptSlugs: ['staging-area'],
      prerequisiteConceptSlugs: ['staging-area'],
      exercises: [
        {
          slug: 'commit-nachricht-auswahl',
          type: 'SINGLE_CHOICE',
          title: 'Nützliche Commit-Nachricht',
          prompt:
            'Du hast die Anmeldung so geändert, dass leere Passwörter abgelehnt werden. Welche Nachricht hilft später am meisten?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'fix',
                feedback: 'Sagt weder, was behoben wurde, noch warum.',
              },
              {
                id: 'b',
                text: 'login.ts geändert',
                feedback:
                  'Welche Datei geändert wurde, zeigt der Commit ohnehin. Die Nachricht soll das Warum liefern.',
              },
              {
                id: 'c',
                text: 'Anmeldung lehnt leere Passwörter ab',
                feedback:
                  'Genau. Die Nachricht nennt die Wirkung und macht die Stelle später auffindbar.',
              },
            ],
            correctOptionId: 'c',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Stell dir vor, du suchst in einem Jahr genau diese Änderung. Wonach würdest du suchen?',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 3,
          conceptSlugs: ['commit'],
        },
        {
          slug: 'commit-ablauf-ordering',
          type: 'ORDERING',
          title: 'Der Weg in den Commit',
          prompt: 'Bring die Schritte in die Reihenfolge, in der sie tatsächlich ablaufen.',
          payload: {
            kind: 'ordering',
            instruction: 'Du hast zwei Dateien geändert und willst nur eine davon festhalten.',
            items: [
              { id: 's1', text: 'Dateien im Editor bearbeiten' },
              { id: 's2', text: 'Mit git status ansehen, was sich geändert hat' },
              { id: 's3', text: 'Mit git add nur die gewünschte Datei vormerken' },
              { id: 's4', text: 'Mit git commit -m die Vormerkung festhalten' },
            ],
            correctOrder: ['s1', 's2', 's3', 's4'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was musst du wissen, bevor du sinnvoll auswählen kannst?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['commit', 'staging-area'],
        },
      ],
    },

    // ---------------------------------------------------------------- 4
    {
      slug: 'diff-und-verlauf',
      title: 'Diff und Verlauf lesen',
      learningObjectives: [
        'Du kannst einen Diff zeilenweise lesen und sagen, was hinzukam und was wegfiel.',
        'Du kannst erklären, warum git diff nach einem git add scheinbar nichts mehr zeigt.',
      ],
      everydayProblem:
        'Vor dem Commit willst du noch einmal sehen, was du eigentlich geändert hast. Du tippst git diff — und die Ausgabe ist leer, obwohl du sicher etwas geändert hast.',
      mentalModel:
        'git diff vergleicht immer zwei bestimmte Stände. Ohne Zusatz vergleicht es Arbeitsverzeichnis gegen Staging Area. Ist alles vorgemerkt, gibt es dort nichts mehr zu zeigen — der Unterschied liegt dann zwischen Staging Area und letztem Commit.',
      workedExample: {
        summary: 'Ein Diff mit einer entfernten und zwei hinzugekommenen Zeilen.',
        annotations: [
          { step: 1, text: 'Zeilen mit - fallen weg, Zeilen mit + kommen hinzu.' },
          { step: 2, text: 'Zeilen ohne Zeichen stehen nur zur Orientierung dabei.' },
          { step: 3, text: 'Nach git add zeigt git diff --staged denselben Unterschied.' },
        ],
        outcome:
          'Die Frage ist nie "zeigt git diff etwas", sondern "welche zwei Stände vergleiche ich gerade".',
      },
      reflectionPrompts: [
        'Warum ist es sinnvoll, den eigenen Diff vor dem Commit noch einmal zu lesen?',
        'Welche zwei Stände willst du vergleichen, wenn du prüfen möchtest, was gleich committet wird?',
      ],
      commonMistakes: [
        {
          mistake: 'Aus einem leeren git diff schließen, es gebe keine Änderungen.',
          why: 'Ohne Zusatz zeigt der Befehl nur die NICHT vorgemerkten Änderungen — vorgemerkte bleiben unsichtbar.',
          fix: 'Mit git diff --staged nachsehen, was tatsächlich zum Commit bereitliegt.',
        },
      ],
      estimatedMinutes: 7,
      primaryConceptSlugs: ['diff', 'commit-verlauf'],
      supportingConceptSlugs: ['staging-area'],
      prerequisiteConceptSlugs: ['commit'],
      exercises: [
        {
          slug: 'diff-lesen-interpretation',
          type: 'INTERPRETATION',
          title: 'Einen Diff lesen',
          prompt: 'Lies den Diff und entscheide, was sich fachlich geändert hat.',
          payload: {
            kind: 'interpretation',
            ansicht: {
              art: 'diff',
              pfad: 'anmeldung.ts',
              zeilen: [
                { marke: 'kontext', text: 'function anmelden(passwort) {' },
                { marke: 'weg', text: '  if (passwort) {' },
                { marke: 'hinzu', text: '  if (passwort && passwort.length >= 8) {' },
                { marke: 'kontext', text: '    return true;' },
                { marke: 'kontext', text: '  }' },
              ],
            },
            frage: 'Was ändert dieser Diff am Verhalten?',
            options: [
              {
                id: 'a',
                text: 'Die Anmeldung akzeptiert jetzt zusätzlich kurze Passwörter.',
                feedback: 'Umgekehrt: Die Bedingung wurde strenger, nicht großzügiger.',
              },
              {
                id: 'b',
                text: 'Die Anmeldung verlangt jetzt zusätzlich eine Mindestlänge von acht Zeichen.',
                feedback:
                  'Richtig. Die entfernte Zeile prüfte nur auf Vorhandensein, die neue zusätzlich auf Länge.',
              },
              {
                id: 'c',
                text: 'Die Funktion gibt jetzt immer true zurück.',
                feedback:
                  'Die Rückgabe ist unverändert — sie steht als Kontextzeile ohne Zeichen da.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Vergleiche die Zeile mit - und die Zeile mit + direkt miteinander.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['diff'],
        },
        {
          slug: 'diff-staged-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Leerer Diff',
          prompt:
            'Du hast eine Datei geändert und git add ausgeführt. git diff zeigt nichts. Was stimmt?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Die Änderung ist verloren gegangen.',
                feedback: 'Nein — sie liegt vorgemerkt in der Staging Area und ist vollständig da.',
              },
              {
                id: 'b',
                text: 'git diff vergleicht Arbeitsverzeichnis und Staging Area; die sind jetzt gleich.',
                feedback:
                  'Genau. Der Unterschied liegt nun zwischen Staging Area und letztem Commit — sichtbar mit git diff --staged.',
              },
              {
                id: 'c',
                text: 'git diff funktioniert erst nach einem Commit.',
                feedback:
                  'Doch, es funktioniert jederzeit — es kommt nur darauf an, welche Stände verglichen werden.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche zwei Orte vergleicht git diff, wenn du nichts weiter angibst?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['diff', 'staging-area'],
        },
      ],
    },

    // ---------------------------------------------------------------- 5
    {
      slug: 'branches-verstehen',
      title: 'Branches sind Zeiger',
      learningObjectives: [
        'Du kannst erklären, warum das Anlegen eines Branches praktisch nichts kostet.',
        'Du kannst vorhersagen, welcher Branch sich durch einen neuen Commit bewegt.',
      ],
      everydayProblem:
        'Du willst etwas ausprobieren, ohne den funktionierenden Stand zu gefährden. Eine Kopie des ganzen Ordners fühlt sich falsch an — und wäre in einer Woche hoffnungslos veraltet.',
      mentalModel:
        'Ein Branch ist ein Lesezeichen, kein Regal. Er zeigt auf einen Commit und wandert mit, wenn du auf ihm committest. Deshalb kostet ein neuer Branch nichts: Es entsteht nur ein zweites Lesezeichen auf derselben Seite.',
      workedExample: {
        summary:
          'Zwei Branches zeigen zunächst auf denselben Commit; ein Commit bewegt genau einen davon.',
        annotations: [
          {
            step: 1,
            text: 'main und feature zeigen beide auf denselben Commit — nichts wurde kopiert.',
          },
          { step: 2, text: 'Auf feature wird committet: nur feature wandert weiter.' },
          {
            step: 3,
            text: 'main steht unverändert da, der alte Stand bleibt jederzeit erreichbar.',
          },
        ],
        outcome: 'Verzweigen ist billig, weil nur ein Zeiger entsteht — keine Kopie.',
      },
      reflectionPrompts: [
        'Warum wäre ein Branch teuer, wenn er eine Kopie aller Dateien wäre?',
        'Wann würdest du für eine Änderung einen eigenen Branch anlegen?',
      ],
      commonMistakes: [
        {
          mistake: 'Annehmen, ein Branch enthalte eine eigene Kopie aller Dateien.',
          why: 'Ein Branch ist nur ein Zeiger auf einen Commit; die Dateien selbst liegen im Verlauf.',
          fix: 'Beim Wechsel passt Git das Arbeitsverzeichnis an — es wird nichts dupliziert.',
        },
        {
          mistake: 'git checkout und git switch für dasselbe halten.',
          why: 'checkout kann sehr viel mehr als Branches wechseln und richtet dadurch versehentlich Schaden an.',
          fix: 'Zum Wechseln git switch nutzen, zum Zurücksetzen von Dateien git restore.',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['branch'],
      supportingConceptSlugs: ['commit-verlauf'],
      prerequisiteConceptSlugs: ['commit-verlauf'],
      exercises: [
        {
          slug: 'branch-graph-interpretation',
          type: 'INTERPRETATION',
          title: 'Welcher Zeiger bewegt sich?',
          prompt: 'Sieh dir den Verlauf an und entscheide, was ein Commit jetzt bewirkt.',
          payload: {
            kind: 'interpretation',
            ansicht: {
              art: 'branchGraph',
              commits: [
                { id: 'c01', nachricht: 'Erster Commit', eltern: [] },
                { id: 'c02', nachricht: 'Startseite', eltern: ['c01'] },
                { id: 'c03', nachricht: 'Anmeldeformular', eltern: ['c02'] },
              ],
              branches: { main: 'c02', 'feature/anmeldung': 'c03' },
              aktuellerBranch: 'feature/anmeldung',
            },
            frage: 'Du bist auf feature/anmeldung und machst einen weiteren Commit. Was passiert?',
            options: [
              {
                id: 'a',
                text: 'Beide Branches wandern auf den neuen Commit.',
                feedback: 'Nein — ein Commit bewegt nur den Zeiger, auf dem du gerade stehst.',
              },
              {
                id: 'b',
                text: 'Nur feature/anmeldung wandert weiter, main bleibt auf c02.',
                feedback: 'Genau. Deshalb bleibt der Stand auf main durch deine Arbeit unberührt.',
              },
              {
                id: 'c',
                text: 'Der neue Commit hat zwei Eltern.',
                feedback:
                  'Zwei Eltern hat nur ein Merge-Commit. Ein gewöhnlicher Commit hat genau einen.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Auf welchem Branch stehst du gerade — und was heißt das für die anderen?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['branch'],
        },
        {
          slug: 'branch-befehl-auswahl',
          type: 'SINGLE_CHOICE',
          title: 'Branch anlegen und wechseln',
          prompt:
            'Du willst einen neuen Branch anlegen und sofort darauf weiterarbeiten. Welcher Befehl macht beides?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'git branch feature',
                feedback:
                  'Das legt den Branch an, wechselt aber nicht darauf — du arbeitest weiter, wo du warst.',
              },
              {
                id: 'b',
                text: 'git switch -c feature',
                feedback: 'Richtig. Anlegen und Wechseln in einem Schritt.',
              },
              {
                id: 'c',
                text: 'git merge feature',
                feedback: 'Das führt einen bestehenden Branch herein — es legt keinen an.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welcher Befehl bewegt HEAD, und welcher legt nur einen Zeiger an?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['branch'],
        },
      ],
    },

    // ---------------------------------------------------------------- 6
    {
      slug: 'merge-verstehen',
      title: 'Zwei Wege zusammenführen',
      learningObjectives: [
        'Du kannst Fast-Forward und Merge-Commit auseinanderhalten und sagen, wann welcher Fall eintritt.',
        'Du erkennst am Verlauf, ob zwei Entwicklungslinien auseinandergelaufen sind.',
      ],
      everydayProblem:
        'Dein Branch ist fertig und soll zurück in main. Manchmal entsteht dabei ein zusätzlicher Commit, manchmal nicht — und es ist unklar, warum.',
      mentalModel:
        'Git fragt beim Merge nur eines: Liegt mein aktueller Stand vollständig in der Vorgeschichte des anderen? Wenn ja, muss nichts zusammengeführt werden — der Zeiger wandert einfach vor. Wenn nein, sind beide Linien auseinandergelaufen und es braucht einen Commit mit zwei Eltern.',
      workedExample: {
        summary: 'Derselbe Merge, einmal als Fast-Forward und einmal mit Merge-Commit.',
        annotations: [
          { step: 1, text: 'Auf main ist seit dem Verzweigen nichts passiert: Fast-Forward.' },
          { step: 2, text: 'Auf main wurde inzwischen committet: beide Linien sind auseinander.' },
          { step: 3, text: 'Jetzt entsteht ein Commit mit zwei Eltern, der beide Wege hält.' },
        ],
        outcome:
          'Die Art des Merges ist keine Einstellung, sondern eine Folge der Lage im Verlauf.',
      },
      reflectionPrompts: [
        'Woran erkennst du im Verlauf, dass ein Merge-Commit nötig war?',
        'Warum ist ein Merge-Commit kein Zeichen dafür, dass etwas schiefgegangen ist?',
      ],
      commonMistakes: [
        {
          mistake: 'Den Merge-Commit für überflüssigen Ballast halten.',
          why: 'Er hält fest, dass hier zwei Entwicklungslinien zusammengeführt wurden — eine Information, die sonst verloren ginge.',
          fix: 'Den Merge-Commit als Teil des Verlaufs lesen, nicht als Störung.',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['merge'],
      supportingConceptSlugs: ['branch'],
      prerequisiteConceptSlugs: ['branch'],
      exercises: [
        {
          slug: 'merge-art-interpretation',
          type: 'INTERPRETATION',
          title: 'Fast-Forward oder Merge-Commit?',
          prompt: 'Sieh dir den Verlauf an und entscheide, welche Art von Merge nötig ist.',
          payload: {
            kind: 'interpretation',
            ansicht: {
              art: 'branchGraph',
              commits: [
                { id: 'c01', nachricht: 'Erster Commit', eltern: [] },
                { id: 'c02', nachricht: 'Startseite', eltern: ['c01'] },
                { id: 'c03', nachricht: 'Anmeldeformular', eltern: ['c02'] },
                { id: 'c04', nachricht: 'Tippfehler in der Startseite', eltern: ['c02'] },
              ],
              branches: { main: 'c04', 'feature/anmeldung': 'c03' },
              aktuellerBranch: 'main',
            },
            frage: 'Du bist auf main und führst git merge feature/anmeldung aus. Was passiert?',
            options: [
              {
                id: 'a',
                text: 'Ein Fast-Forward: main wandert einfach auf c03.',
                feedback:
                  'Dafür müsste main vollständig in der Vorgeschichte von c03 liegen. Auf main gibt es aber mit c04 einen eigenen Commit.',
              },
              {
                id: 'b',
                text: 'Ein Merge-Commit mit c04 und c03 als Eltern.',
                feedback:
                  'Genau. Beide Linien haben sich seit c02 getrennt entwickelt — das hält nur ein Commit mit zwei Eltern zusammen.',
              },
              {
                id: 'c',
                text: 'Nichts, die Branches sind bereits auf demselben Stand.',
                feedback:
                  'Sie zeigen auf verschiedene Commits und enthalten jeweils Arbeit, die der andere nicht hat.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Ab welchem Commit haben sich die beiden Linien getrennt?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Fast-Forward geht nur, wenn auf dem Zielbranch seit dem Verzweigen nichts passiert ist.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['merge', 'branch'],
        },
        {
          slug: 'merge-entscheidung-szenario',
          type: 'SCENARIO_DECISION',
          title: 'Vor dem Merge',
          prompt: 'Wie gehst du vor, bevor du deinen Branch zurückführst?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Dein Branch ist fertig. Während du gearbeitet hast, sind auf main mehrere Commits dazugekommen. Du willst deine Arbeit sauber zurückführen.',
            options: [
              {
                id: 'a',
                text: 'Erst ansehen, was auf main dazugekommen ist, dann zusammenführen.',
                quality: 'optimal',
                feedback:
                  'Richtig. Wer weiß, was dazugekommen ist, wird von Konflikten nicht überrascht.',
              },
              {
                id: 'b',
                text: 'Sofort mergen und schauen, was passiert.',
                quality: 'acceptable',
                feedback:
                  'Geht meistens gut, weil ein Merge sich abbrechen lässt. Angenehmer ist es, vorher zu wissen, worauf man trifft.',
              },
              {
                id: 'c',
                text: 'main mit dem eigenen Stand überschreiben, um Konflikte zu vermeiden.',
                quality: 'problematic',
                feedback:
                  'Damit gehen die Commits der anderen verloren — genau das, was Versionsverwaltung verhindern soll.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was weißt du über den Zielbranch, bevor du zusammenführst?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['merge'],
        },
      ],
    },

    // ---------------------------------------------------------------- 7
    {
      slug: 'merge-konflikte',
      title: 'Merge-Konflikte auflösen',
      learningObjectives: [
        'Du kannst die Konfliktmarker lesen und sagen, welche Fassung von welcher Seite stammt.',
        'Du kennst die Reihenfolge auflösen, vormerken, committen und weißt, warum der mittlere Schritt nötig ist.',
      ],
      everydayProblem:
        'Beim Zusammenführen bricht Git ab und hinterlässt in der Datei Zeilen aus spitzen Klammern und Gleichheitszeichen. Die Datei sieht kaputt aus, und es ist unklar, was jetzt zu tun ist.',
      mentalModel:
        'Ein Konflikt ist keine Störung, sondern eine Rückfrage. Git hat alles zusammengeführt, was es eindeutig konnte, und legt dir die eine Stelle vor, an der zwei Antworten aufeinandertreffen. Entscheiden kann das nur jemand, der weiß, was gemeint war.',
      workedExample: {
        summary: 'Eine Konfliktstelle mit beiden Fassungen, dazwischen die Markerzeilen.',
        annotations: [
          { step: 1, text: 'Nach <<<<<<< steht deine Fassung, die des Branches, auf dem du bist.' },
          { step: 2, text: 'Nach ======= folgt die Fassung des Branches, den du hereinholst.' },
          { step: 3, text: 'Nach >>>>>>> steht, woher diese zweite Fassung kommt.' },
          {
            step: 4,
            text: 'Du ersetzt den ganzen Block durch das, was gelten soll — Marker inklusive.',
          },
        ],
        outcome:
          'Nach dem Auflösen verlangt Git ausdrücklich ein git add: erst damit gilt die Datei als erledigt.',
      },
      reflectionPrompts: [
        'Warum kann Git diese Entscheidung nicht selbst treffen?',
        'Was würde passieren, wenn du die Markerzeilen im Text stehen lässt und committest?',
      ],
      commonMistakes: [
        {
          mistake: 'Die Konfliktmarker im Text stehen lassen und trotzdem committen.',
          why: 'Git prüft den Inhalt nicht — die Markerzeilen landen dann als Text im Projekt.',
          fix: 'Nach dem Auflösen die Datei noch einmal ganz durchsehen, bevor du sie vormerkst.',
        },
        {
          mistake: 'Nach dem Auflösen direkt committen wollen.',
          why: 'Git betrachtet die Datei erst nach einem ausdrücklichen git add als aufgelöst.',
          fix: 'Immer auflösen, dann git add, dann git commit.',
        },
      ],
      estimatedMinutes: 10,
      primaryConceptSlugs: ['merge-konflikt'],
      supportingConceptSlugs: ['merge'],
      prerequisiteConceptSlugs: ['merge'],
      exercises: [
        {
          slug: 'konflikt-aufloesen',
          type: 'CONFLICT_RESOLUTION',
          title: 'Eine Konfliktdatei auflösen',
          prompt:
            'Entscheide für jede Konfliktstelle, welche Fassung gelten soll — und begründe es dir vorher.',
          payload: {
            kind: 'conflictResolution',
            pfad: 'preise.md',
            unserLabel: 'main',
            ihrLabel: 'feature/preise',
            abschnitte: [
              { art: 'gemeinsam', zeilen: ['# Preise', ''] },
              {
                art: 'konflikt',
                id: 'k1',
                unsere: ['Basis: 9 Euro pro Monat'],
                ihre: ['Basis: 12 Euro pro Monat'],
                korrekt: 'ihre',
                feedback:
                  'Die Preiserhöhung war der Zweck des Branches feature/preise — der alte Wert auf main ist der überholte.',
              },
              { art: 'gemeinsam', zeilen: ['', '## Support', ''] },
              {
                art: 'konflikt',
                id: 'k2',
                unsere: ['Support per E-Mail'],
                ihre: ['Support per Telefon'],
                korrekt: 'beide',
                feedback:
                  'Hier haben beide Seiten je einen Kanal ergänzt. Keiner ersetzt den anderen — beide gehören in die Liste.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Frag dich bei jeder Stelle: Ersetzt die eine Fassung die andere, oder ergänzen sie sich?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Wozu wurde der hereingeholte Branch angelegt? Das entscheidet oft, welche Fassung gilt.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 5,
          conceptSlugs: ['merge-konflikt'],
        },
        {
          slug: 'konflikt-ablauf-ordering',
          type: 'ORDERING',
          title: 'Der Weg aus dem Konflikt',
          prompt: 'Bring die Schritte in die Reihenfolge, die Git tatsächlich verlangt.',
          payload: {
            kind: 'ordering',
            instruction: 'Ein Merge ist mit einem Konflikt stehen geblieben.',
            items: [
              { id: 's1', text: 'Die betroffene Stelle in der Datei entscheiden' },
              { id: 's2', text: 'Die Konfliktmarker vollständig entfernen' },
              { id: 's3', text: 'Die Datei mit git add als aufgelöst vormerken' },
              { id: 's4', text: 'Den Merge mit git commit abschließen' },
            ],
            correctOrder: ['s1', 's2', 's3', 's4'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welcher Schritt wird am häufigsten übersprungen — und warum bleibt der Merge dann unfertig?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['merge-konflikt'],
        },
      ],
    },
  ],
};
