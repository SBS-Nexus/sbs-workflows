import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Modul 6: Git & GitHub — zusammenarbeiten (Ausbaustufe 2).
 *
 * Trennt konsequent, was oft vermischt wird: Git ist das Werkzeug auf dem
 * eigenen Rechner, GitHub eine Plattform darum herum. Erst diese Trennung
 * macht verständlich, warum ein Pull Request kein Git-Befehl ist.
 *
 * Die Recovery-Lektion steht bewusst am Ende: Sie setzt voraus, dass
 * Commit-Verlauf, Staging Area und Remote verstanden sind — sonst lassen
 * sich die Folgen von reset und force push gar nicht einschätzen.
 */
export const gitZusammenarbeitModule: ModuleDraft = {
  slug: 'git-zusammenarbeit',
  title: 'Git & GitHub — zusammenarbeiten',
  summary:
    'Wie aus einem Repository auf deinem Rechner gemeinsame Arbeit wird: Remotes, der Unterschied zwischen fetch und pull, Pull Requests, Durchsichten, automatische Prüfungen — und der Weg zurück, wenn etwas schiefgeht.',
  rationale:
    'Git und GitHub werden meist in einem Atemzug genannt und dadurch verwechselt. Hier steht zuerst, was wo passiert — und am Ende, wie man einen Fehler wieder loswird, ohne die Arbeit anderer zu beschädigen.',
  prerequisiteModuleSlugs: ['git-grundlagen'],
  status: 'PUBLISHED',
  lessons: [
    // ---------------------------------------------------------------- 1
    {
      slug: 'remotes-verstehen',
      title: 'Repositories an zwei Orten',
      learningObjectives: [
        'Du kannst erklären, warum dein lokales Repository auch ohne Server vollständig funktionsfähig ist.',
        'Du kannst sagen, was "origin" bedeutet und was daran nicht besonders ist.',
      ],
      everydayProblem:
        'Du hörst, dein Code liege "auf GitHub". Gleichzeitig kannst du offline committen und im Verlauf blättern. Beides zugleich ergibt zunächst keinen Sinn.',
      mentalModel:
        'Es gibt zwei vollwertige Repositories: eines auf deinem Rechner, eines auf dem Server. Beide enthalten den ganzen Verlauf. Sie wissen nichts voneinander, bis du sie ausdrücklich abgleichst — deshalb funktioniert alles Lokale auch ohne Netz.',
      workedExample: {
        summary: 'Dieselbe Arbeit einmal lokal und einmal nach dem Abgleich.',
        annotations: [
          { step: 1, text: 'Drei Commits entstehen offline im lokalen Repository.' },
          { step: 2, text: 'Auf dem Server ist davon nichts zu sehen — noch kein Abgleich.' },
          { step: 3, text: 'Erst git push überträgt die Commits; ab jetzt sehen andere sie.' },
        ],
        outcome:
          '"Auf GitHub" ist kein Zustand deiner Arbeit, sondern das Ergebnis eines ausdrücklichen Schritts.',
      },
      reflectionPrompts: [
        'Was kannst du ohne Netzverbindung mit Git alles tun?',
        'Warum ist es sinnvoll, dass Git nicht automatisch überträgt?',
      ],
      commonMistakes: [
        {
          mistake: 'Annehmen, ein Commit sei automatisch auf dem Server.',
          why: 'Committen ist ein rein lokaler Vorgang; die Übertragung ist ein eigener, ausdrücklicher Schritt.',
          fix: 'Nach dem Commit bewusst git push ausführen — oder mit git status prüfen, wie viele Commits noch nicht übertragen sind.',
        },
      ],
      estimatedMinutes: 6,
      primaryConceptSlugs: ['remote-repository'],
      supportingConceptSlugs: ['git-repository'],
      prerequisiteConceptSlugs: ['git-repository'],
      exercises: [
        {
          slug: 'remote-origin-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Was ist origin?',
          prompt: 'Was bedeutet der Name "origin" in einem frisch geklonten Repository?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Ein von Git fest vorgegebener Begriff für den Hauptserver.',
                feedback:
                  'Nein — origin ist nur der Name, den git clone vergibt. Er lässt sich ändern, und es können mehrere Remotes nebeneinander stehen.',
              },
              {
                id: 'b',
                text: 'Der übliche Name für das Remote, aus dem geklont wurde.',
                feedback: 'Genau. Eine Gewohnheit, kein Zauberwort — der Name ist frei wählbar.',
              },
              {
                id: 'c',
                text: 'Der erste Commit im Verlauf.',
                feedback: 'Das wäre der Wurzel-Commit; origin bezeichnet ein Remote.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Woher kommt der Name — hast du ihn je selbst eingegeben?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['remote-repository'],
        },
        {
          slug: 'remote-offline-szenario',
          type: 'SCENARIO_DECISION',
          title: 'Arbeiten ohne Netz',
          prompt: 'Du sitzt im Zug ohne Verbindung. Was kannst du sinnvoll tun?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Du hast das Repository heute Morgen geklont. Jetzt bist du unterwegs, ohne Netzverbindung, und willst weiterarbeiten.',
            options: [
              {
                id: 'a',
                text: 'Weiterarbeiten, committen und später übertragen.',
                quality: 'optimal',
                feedback:
                  'Richtig. Dein lokales Repository ist vollständig — Commits, Verlauf und Branches funktionieren ohne Netz.',
              },
              {
                id: 'b',
                text: 'Änderungen sammeln und erst committen, wenn wieder Netz da ist.',
                quality: 'acceptable',
                feedback:
                  'Möglich, aber unnötig: Du verlierst die Möglichkeit, unterwegs in kleinen Schritten festzuhalten.',
              },
              {
                id: 'c',
                text: 'Gar nicht arbeiten, weil Git ohne Verbindung nicht funktioniert.',
                quality: 'problematic',
                feedback:
                  'Git ist verteilt: Alles außer dem Abgleich mit dem Remote läuft rein lokal.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Git-Befehle brauchen überhaupt eine Verbindung?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['remote-repository'],
        },
      ],
    },

    // ---------------------------------------------------------------- 2
    {
      slug: 'fetch-und-pull',
      title: 'fetch ist nicht pull',
      learningObjectives: [
        'Du kannst genau sagen, was git fetch verändert und was es ausdrücklich nicht verändert.',
        'Du kannst begründen, wann du fetch dem pull vorziehst.',
      ],
      everydayProblem:
        'Du führst git pull aus, um "mal zu sehen, was es Neues gibt" — und stehst plötzlich mitten in einem Merge-Konflikt, obwohl du nur nachsehen wolltest.',
      mentalModel:
        'fetch ist Nachsehen, pull ist Nachsehen und sofort Einbauen. fetch holt die neuen Commits und aktualisiert nur die Merkzettel wie origin/main; dein Branch und deine Dateien bleiben unangetastet. pull macht dasselbe und führt anschließend direkt zusammen.',
      workedExample: {
        summary: 'Derselbe Serverstand, einmal mit fetch und einmal mit pull abgeholt.',
        annotations: [
          {
            step: 1,
            text: 'git fetch: origin/main zeigt auf den neuen Stand, main bleibt stehen.',
          },
          {
            step: 2,
            text: 'Du vergleichst in Ruhe, was dazugekommen ist — nichts ist passiert.',
          },
          {
            step: 3,
            text: 'git pull hätte stattdessen sofort zusammengeführt, samt möglichem Konflikt.',
          },
        ],
        outcome:
          'Wer erst fetch und dann bewusst zusammenführt, wird von einem Konflikt nicht überrascht.',
      },
      reflectionPrompts: [
        'In welcher Situation willst du ausdrücklich NICHT sofort integrieren?',
        'Was bedeutet es, dass origin/main ein Merkzettel und kein eigener Branch von dir ist?',
      ],
      commonMistakes: [
        {
          mistake: 'git pull benutzen, um nur nachzusehen, ob es Neues gibt.',
          why: 'pull integriert sofort und kann mitten in der eigenen Arbeit einen Konflikt auslösen.',
          fix: 'Zum Nachsehen git fetch nutzen und danach entscheiden, ob und wann integriert wird.',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['fetch-und-pull'],
      supportingConceptSlugs: ['remote-repository', 'merge'],
      prerequisiteConceptSlugs: ['remote-repository', 'merge'],
      exercises: [
        {
          slug: 'fetch-pull-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Was verändert was?',
          prompt: 'Ordne jede Aussage dem Befehl zu, auf den sie zutrifft.',
          payload: {
            kind: 'classification',
            instruction: 'Du bist auf main und es gibt neue Commits auf dem Server.',
            categories: [
              { id: 'fetch', label: 'Trifft auf git fetch zu' },
              { id: 'pull', label: 'Trifft nur auf git pull zu' },
            ],
            items: [
              {
                id: 'i1',
                text: 'Holt neue Commits vom Server herunter',
                correctCategoryId: 'fetch',
                feedback:
                  'Das tun beide — pull führt es intern ebenfalls aus. Als Unterscheidungsmerkmal taugt es nicht, deshalb steht es bei fetch.',
              },
              {
                id: 'i2',
                text: 'Verändert die Dateien in deinem Arbeitsverzeichnis',
                correctCategoryId: 'pull',
                feedback:
                  'Nur pull integriert. fetch lässt dein Arbeitsverzeichnis ausdrücklich unangetastet.',
              },
              {
                id: 'i3',
                text: 'Kann unmittelbar einen Merge-Konflikt auslösen',
                correctCategoryId: 'pull',
                feedback: 'Ein Konflikt kann nur entstehen, wo tatsächlich zusammengeführt wird.',
              },
              {
                id: 'i4',
                text: 'Aktualisiert origin/main, ohne deinen Branch zu bewegen',
                correctCategoryId: 'fetch',
                feedback:
                  'Genau das ist der Kern von fetch: der Merkzettel wandert, dein Branch nicht.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Frag dich bei jeder Aussage: Muss dafür etwas zusammengeführt werden?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'pull ist fetch plus Integration. Alles, was nur mit Integration zu tun hat, gehört zu pull.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['fetch-und-pull'],
        },
        {
          slug: 'fetch-pull-szenario',
          type: 'SCENARIO_DECISION',
          title: 'Mitten in der Arbeit',
          prompt: 'Wie gehst du vor?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Du bist mitten in einer größeren Änderung, hast nicht committete Arbeit im Arbeitsverzeichnis und willst wissen, ob jemand anders inzwischen etwas auf main verändert hat.',
            options: [
              {
                id: 'a',
                text: 'git fetch ausführen und den Unterschied ansehen.',
                quality: 'optimal',
                feedback:
                  'Richtig. Du erfährst alles, was du wissen willst, ohne deine laufende Arbeit anzufassen.',
              },
              {
                id: 'b',
                text: 'git pull ausführen, um gleich auf dem neuesten Stand zu sein.',
                quality: 'problematic',
                feedback:
                  'Das integriert sofort — mitten in unfertiger Arbeit ist das der ungünstigste Zeitpunkt für einen Konflikt.',
              },
              {
                id: 'c',
                text: 'Erst die eigene Arbeit committen, dann git pull.',
                quality: 'acceptable',
                feedback:
                  'Sicher, aber du committest womöglich einen unfertigen Stand nur, um nachsehen zu können.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Willst du gerade nur wissen, was los ist — oder deinen Stand verändern?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['fetch-und-pull'],
        },
      ],
    },

    // ---------------------------------------------------------------- 3
    {
      slug: 'github-ist-nicht-git',
      title: 'GitHub ist nicht Git',
      learningObjectives: [
        'Du kannst für einen gegebenen Begriff sagen, ob er zu Git oder zur Plattform GitHub gehört.',
        'Du kannst erklären, warum Git ohne GitHub vollständig funktioniert.',
      ],
      everydayProblem:
        'In Anleitungen stehen git commit und Pull Request nebeneinander, als wäre beides dasselbe Werkzeug. In der Befehlsübersicht von Git findet sich "Pull Request" aber nirgends.',
      mentalModel:
        'Git ist das Versionsverwaltungssystem — es kennt Commits, Branches und Merges. GitHub ist ein Dienst, der Repositories hostet und darum herum die Zusammenarbeit organisiert: Issues, Pull Requests, Durchsichten, Rechte, automatische Prüfungen. Alles Zweite existiert nur auf der Plattform.',
      workedExample: {
        summary: 'Dieselbe Änderung, einmal rein mit Git und einmal über die Plattform.',
        annotations: [
          {
            step: 1,
            text: 'Nur Git: Branch, Commits, Merge — vollständig auf dem eigenen Rechner.',
          },
          {
            step: 2,
            text: 'Mit Plattform: derselbe Branch wird hochgeladen und als Vorschlag zur Diskussion gestellt.',
          },
          {
            step: 3,
            text: 'Der Merge selbst bleibt ein Git-Vorgang — nur ausgelöst über die Oberfläche.',
          },
        ],
        outcome:
          'Die Plattform fügt Sichtbarkeit, Diskussion und Regeln hinzu — nicht die Versionsverwaltung selbst.',
      },
      reflectionPrompts: [
        'Welche Begriffe aus deinem Alltag gehören zu Git, welche zur Plattform?',
        'Warum ist es nützlich, dass die Versionsverwaltung nicht an einen Anbieter gebunden ist?',
      ],
      commonMistakes: [
        {
          mistake: '"Git" und "GitHub" synonym verwenden.',
          why: 'Das verstellt den Blick darauf, was ohne Netz und ohne Anbieter funktioniert — und was nicht.',
          fix: 'Bei jedem Begriff fragen: Steht das in der Git-Dokumentation oder in der Plattform-Dokumentation?',
        },
      ],
      estimatedMinutes: 7,
      primaryConceptSlugs: ['github-plattform'],
      supportingConceptSlugs: ['remote-repository'],
      prerequisiteConceptSlugs: ['remote-repository'],
      exercises: [
        {
          slug: 'git-vs-github-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Git oder Plattform?',
          prompt: 'Ordne jeden Begriff zu.',
          payload: {
            kind: 'classification',
            instruction:
              'Manches gehört zum Versionsverwaltungssystem selbst, manches nur zur Plattform.',
            categories: [
              {
                id: 'git',
                label: 'Git',
                description: 'Funktioniert auch ohne Anbieter und ohne Netz.',
              },
              {
                id: 'plattform',
                label: 'GitHub',
                description: 'Existiert nur auf der Plattform.',
              },
            ],
            items: [
              {
                id: 'i1',
                text: 'Commit',
                correctCategoryId: 'git',
                feedback: 'Ein Commit ist ein Git-Begriff und entsteht rein lokal.',
              },
              {
                id: 'i2',
                text: 'Pull Request',
                correctCategoryId: 'plattform',
                feedback:
                  'Es gibt keinen Git-Befehl dafür — der Pull Request ist ein Konzept der Plattform.',
              },
              {
                id: 'i3',
                text: 'Branch',
                correctCategoryId: 'git',
                feedback: 'Ein Branch ist ein Zeiger im Git-Verlauf.',
              },
              {
                id: 'i4',
                text: 'Issue',
                correctCategoryId: 'plattform',
                feedback: 'Issues sind Vorgänge auf der Plattform, nicht Teil des Verlaufs.',
              },
              {
                id: 'i5',
                text: 'Merge',
                correctCategoryId: 'git',
                feedback: 'Das Zusammenführen selbst ist ein Git-Vorgang.',
              },
              {
                id: 'i6',
                text: 'Automatische Prüfung beim Hochladen',
                correctCategoryId: 'plattform',
                feedback: 'Prüfläufe starten auf der Plattform, nicht in Git.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Frag dich: Ginge das auch offline, ganz ohne Anbieter?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['github-plattform'],
        },
      ],
    },

    // ---------------------------------------------------------------- 4
    {
      slug: 'pull-requests',
      title: 'Der Weg eines Pull Requests',
      learningObjectives: [
        'Du kannst den Ablauf vom Issue bis zum Merge in der richtigen Reihenfolge beschreiben.',
        'Du kannst begründen, warum der Branch vor dem Pull Request hochgeladen sein muss.',
      ],
      everydayProblem:
        'Du hast eine Änderung fertig und sollst "einen PR aufmachen". Unklar bleibt, was vorher passieren muss und was danach noch kommt.',
      mentalModel:
        'Ein Pull Request ist ein Vorschlag mit Adresse: "Bitte übernehmt diesen Branch in jenen." Damit die Gegenseite ihn ansehen kann, muss der Branch auf dem Server liegen — deshalb kommt push immer vor dem Pull Request.',
      workedExample: {
        summary: 'Ein vollständiger Durchlauf von der Aufgabe bis zum aufgeräumten Branch.',
        annotations: [
          { step: 1, text: 'Ein Issue beschreibt, was zu tun ist.' },
          { step: 2, text: 'Ein eigener Branch nimmt die Arbeit auf.' },
          { step: 3, text: 'Commits halten die Schritte fest, push überträgt sie.' },
          {
            step: 4,
            text: 'Der Pull Request stellt sie zur Diskussion; Prüfungen laufen automatisch.',
          },
          { step: 5, text: 'Nach der Durchsicht wird gemerged und der Branch entfernt.' },
        ],
        outcome: 'Jeder Schritt hat einen Zweck — Überspringen fällt spätestens beim Merge auf.',
      },
      reflectionPrompts: [
        'Warum ist der eigene Branch für die Arbeit besser als direkt auf main zu committen?',
        'Was ginge verloren, wenn man die Durchsicht überspringt?',
      ],
      commonMistakes: [
        {
          mistake: 'Einen Pull Request öffnen wollen, ohne den Branch vorher zu pushen.',
          why: 'Die Plattform kennt nur, was auf dem Server liegt — ein rein lokaler Branch ist für sie nicht vorhanden.',
          fix: 'Erst git push, dann den Pull Request öffnen.',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['pull-request'],
      supportingConceptSlugs: ['github-plattform', 'branch'],
      prerequisiteConceptSlugs: ['github-plattform', 'branch'],
      exercises: [
        {
          slug: 'pr-ablauf-ordering',
          type: 'ORDERING',
          title: 'Der Ablauf',
          prompt: 'Bring die Schritte in die Reihenfolge, in der sie tatsächlich stattfinden.',
          payload: {
            kind: 'ordering',
            instruction: 'Von der beschriebenen Aufgabe bis zum aufgeräumten Branch.',
            items: [
              { id: 's1', text: 'Issue beschreibt die Aufgabe' },
              { id: 's2', text: 'Eigenen Branch anlegen' },
              { id: 's3', text: 'Änderung committen' },
              { id: 's4', text: 'Branch pushen' },
              { id: 's5', text: 'Pull Request öffnen' },
              { id: 's6', text: 'Automatische Prüfungen und Durchsicht' },
              { id: 's7', text: 'Mergen und Branch entfernen' },
            ],
            correctOrder: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welchen Schritt muss die Plattform sehen können, bevor ein Vorschlag überhaupt möglich ist?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['pull-request'],
        },
        {
          slug: 'pr-push-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Warum erst pushen?',
          prompt:
            'Warum muss der Branch auf dem Server liegen, bevor du einen Pull Request öffnen kannst?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Weil Git Commits sonst nicht speichert.',
                feedback: 'Commits sind lokal längst gespeichert — nur eben nicht auf dem Server.',
              },
              {
                id: 'b',
                text: 'Weil die Plattform nur vergleichen kann, was sie selbst kennt.',
                feedback:
                  'Genau. Der Pull Request zeigt den Unterschied zwischen zwei Branches auf dem Server.',
              },
              {
                id: 'c',
                text: 'Weil ein Pull Request die Commits erzeugt.',
                feedback: 'Umgekehrt: Der Pull Request verweist auf bereits vorhandene Commits.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was weiß die Plattform über deinen Rechner?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['pull-request'],
        },
      ],
    },

    // ---------------------------------------------------------------- 5
    {
      slug: 'durchsicht-und-pruefungen',
      title: 'Durchsicht und automatische Prüfungen',
      learningObjectives: [
        'Du kannst unterscheiden, welche Fragen eine automatische Prüfung beantwortet und welche nur ein Mensch beantworten kann.',
        'Du kannst eine rote Prüfung als Information einordnen statt als Urteil.',
      ],
      everydayProblem:
        'Am Pull Request hängt eine rote Markierung und ein Kommentar mit drei Anmerkungen. Unklar ist, was davon dich blockiert und was ein Vorschlag ist.',
      mentalModel:
        'Zwei verschiedene Instanzen sehen sich denselben Vorschlag an. Die Maschine prüft, was sich mechanisch prüfen lässt: Übersetzt es, laufen die Tests, halten die Regeln. Der Mensch prüft, was nur mit Kontext geht: Ist das die richtige Lösung, verstehen andere sie in einem Jahr noch.',
      workedExample: {
        summary: 'Ein Pull Request mit roter Prüfung und drei Anmerkungen.',
        annotations: [
          {
            step: 1,
            text: 'Die rote Prüfung nennt eine fehlgeschlagene Testdatei — sachlich und reproduzierbar.',
          },
          { step: 2, text: 'Eine Anmerkung fragt nach dem Warum einer Entscheidung.' },
          { step: 3, text: 'Zwei Anmerkungen schlagen Benennungen vor — kein Hindernis.' },
        ],
        outcome:
          'Rot heißt "hier stimmt etwas nicht", nicht "du hast versagt". Anmerkungen sind Gespräch, kein Befehl.',
      },
      reflectionPrompts: [
        'Welche Art von Fehler würde dir bei der eigenen Arbeit sicher entgehen?',
        'Was unterscheidet eine hilfreiche Anmerkung von einer, die nur Arbeit macht?',
      ],
      commonMistakes: [
        {
          mistake: 'Eine rote Prüfung als persönliche Bewertung lesen.',
          why: 'Die Prüfung ist mechanisch und kennt weder dich noch deine Absicht — sie meldet einen Sachverhalt.',
          fix: 'Die Ausgabe des Laufs lesen: Dort steht, welcher Schritt womit gescheitert ist.',
        },
      ],
      estimatedMinutes: 7,
      primaryConceptSlugs: ['code-review', 'continuous-integration'],
      supportingConceptSlugs: ['pull-request', 'diff'],
      prerequisiteConceptSlugs: ['pull-request'],
      exercises: [
        {
          slug: 'review-vs-ci-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Wer beantwortet was?',
          prompt: 'Ordne jede Frage der Instanz zu, die sie sinnvoll beantworten kann.',
          payload: {
            kind: 'classification',
            instruction: 'An einem Pull Request arbeiten Maschine und Mensch nebeneinander.',
            categories: [
              { id: 'ci', label: 'Automatische Prüfung' },
              { id: 'mensch', label: 'Durchsicht durch Menschen' },
            ],
            items: [
              {
                id: 'i1',
                text: 'Laufen alle Tests durch?',
                correctCategoryId: 'ci',
                feedback: 'Mechanisch prüfbar und deshalb gut automatisierbar.',
              },
              {
                id: 'i2',
                text: 'Ist das überhaupt die richtige Herangehensweise?',
                correctCategoryId: 'mensch',
                feedback: 'Dafür braucht es Kontext und Absicht — das kann keine Prüfung wissen.',
              },
              {
                id: 'i3',
                text: 'Hält der Code die vereinbarte Formatierung ein?',
                correctCategoryId: 'ci',
                feedback: 'Formatregeln sind eindeutig und werden deshalb automatisch geprüft.',
              },
              {
                id: 'i4',
                text: 'Wird jemand diese Stelle in einem Jahr noch verstehen?',
                correctCategoryId: 'mensch',
                feedback: 'Verständlichkeit lässt sich nicht messen — dafür ist die Durchsicht da.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Frag dich: Ließe sich diese Frage eindeutig mit ja oder nein beantworten?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['code-review', 'continuous-integration'],
        },
        {
          slug: 'rote-pruefung-szenario',
          type: 'SCENARIO_DECISION',
          title: 'Die Prüfung ist rot',
          prompt: 'Was tust du zuerst?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'An deinem Pull Request meldet eine automatische Prüfung einen Fehlschlag. Bei dir auf dem Rechner lief alles durch.',
            options: [
              {
                id: 'a',
                text: 'Die Ausgabe des Laufs öffnen und lesen, welcher Schritt gescheitert ist.',
                quality: 'optimal',
                feedback:
                  'Richtig. Dort steht der konkrete Schritt samt Fehlermeldung — alles andere ist Raten.',
              },
              {
                id: 'b',
                text: 'Den Lauf noch einmal starten, vielleicht war es ein Zufall.',
                quality: 'acceptable',
                feedback:
                  'Manchmal hilft das bei wackligen Prüfungen. Ohne die Ausgabe gelesen zu haben, ist es aber ein Ratespiel.',
              },
              {
                id: 'c',
                text: 'Die Prüfung überspringen und trotzdem mergen.',
                quality: 'problematic',
                feedback:
                  'Damit landet der gemeldete Fehler im gemeinsamen Stand und trifft alle anderen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche Information hast du noch nicht gelesen?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['continuous-integration'],
        },
      ],
    },

    // ---------------------------------------------------------------- 6
    {
      slug: 'sicher-zurueck',
      title: 'Sicher zurück zu einem guten Stand',
      learningObjectives: [
        'Du kannst restore, revert und reset danach unterscheiden, was sie jeweils verändern.',
        'Du kannst einschätzen, wann ein Befehl auch andere Mitwirkende trifft.',
      ],
      everydayProblem:
        'Etwas ist schiefgelaufen und im Netz stehen drei Befehle, die alle "rückgängig machen" heißen. Der falsche davon vernichtet einen halben Tag Arbeit.',
      mentalModel:
        'Die entscheidende Frage ist nicht "wie mache ich das rückgängig", sondern "was genau soll zurück". restore betrifft deine Dateien. revert legt einen neuen Commit an, der eine alte Änderung ausgleicht. reset verschiebt den Branch-Zeiger — und kann dabei Arbeit vernichten. Und: Was bereits veröffentlicht ist, nimmt man mit revert zurück, nicht mit reset.',
      workedExample: {
        summary: 'Drei Situationen, drei verschiedene Antworten.',
        annotations: [
          { step: 1, text: 'Datei verschlimmbessert, nichts committet: git restore.' },
          {
            step: 2,
            text: 'Fehlerhafter Commit ist schon veröffentlicht: git revert legt einen Ausgleich an.',
          },
          {
            step: 3,
            text: 'Lokale Commits sollen zu einem zusammengefasst werden: git reset --soft.',
          },
          {
            step: 4,
            text: 'git reset --hard löscht zusätzlich alles Uncommittete — dafür gibt es keine Rettung.',
          },
        ],
        outcome: 'Das Reflog rettet verlorene Commits. Nie committete Arbeit rettet es nicht.',
      },
      reflectionPrompts: [
        'Woran erkennst du, ob eine Änderung bereits andere erreicht hat?',
        'Warum ist revert bei veröffentlichten Commits die verträglichere Wahl als reset?',
      ],
      commonMistakes: [
        {
          mistake: 'git reset --hard benutzen, um "einmal sauber zu machen".',
          why: 'Der Befehl löscht auch alles, was nie committet wurde — und genau das lässt sich nicht wiederherstellen.',
          fix: 'Erst committen oder git stash, dann zurücksetzen. Und bei veröffentlichten Commits revert statt reset.',
        },
        {
          mistake:
            'Nach einem versehentlichen Zurücksetzen davon ausgehen, die Commits seien endgültig weg.',
          why: 'Git führt im Reflog Buch über jede Bewegung von HEAD, auch über die aus dem sichtbaren Verlauf verschwundenen.',
          fix: 'git reflog ansehen und zu der dort genannten Commit-Kennung zurückkehren.',
        },
      ],
      estimatedMinutes: 10,
      primaryConceptSlugs: ['aenderungen-zuruecknehmen', 'reflog'],
      supportingConceptSlugs: ['commit-verlauf', 'staging-area'],
      prerequisiteConceptSlugs: ['commit-verlauf', 'staging-area'],
      exercises: [
        {
          slug: 'sicherheit-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Wie gefährlich ist das?',
          prompt: 'Ordne jeden Befehl danach ein, was im schlimmsten Fall passieren kann.',
          payload: {
            kind: 'classification',
            instruction:
              'Entscheidend ist nicht, wie kompliziert ein Befehl aussieht, sondern was er unwiederbringlich zerstören kann.',
            categories: [
              { id: 'harmlos', label: 'Liest nur', description: 'Verändert nichts.' },
              {
                id: 'lokal',
                label: 'Verändert, aber rückholbar',
                description: 'Wirkt bei dir und lässt sich wiederherstellen.',
              },
              {
                id: 'destruktiv',
                label: 'Kann Arbeit vernichten',
                description: 'Etwas ist danach endgültig weg oder trifft andere.',
              },
            ],
            items: [
              {
                id: 'i1',
                text: 'git status',
                correctCategoryId: 'harmlos',
                feedback: 'Liest nur den Zustand und verändert nichts.',
              },
              {
                id: 'i2',
                text: 'git reflog',
                correctCategoryId: 'harmlos',
                feedback: 'Zeigt die Bewegungen von HEAD — reines Nachschlagen.',
              },
              {
                id: 'i3',
                text: 'git revert a1b2c3d',
                correctCategoryId: 'lokal',
                feedback:
                  'Legt einen zusätzlichen Commit an. Der Verlauf bleibt vollständig erhalten.',
              },
              {
                id: 'i4',
                text: 'git restore --staged datei.txt',
                correctCategoryId: 'lokal',
                feedback:
                  'Nimmt nur die Vormerkung zurück; die Änderung im Arbeitsverzeichnis bleibt.',
              },
              {
                id: 'i5',
                text: 'git reset --hard HEAD~3',
                correctCategoryId: 'destruktiv',
                feedback:
                  'Nicht committete Arbeit ist danach endgültig weg — dafür hilft auch das Reflog nicht.',
              },
              {
                id: 'i6',
                text: 'git push --force auf einen gemeinsamen Branch',
                correctCategoryId: 'destruktiv',
                feedback:
                  'Überschreibt den Stand, den andere bereits geholt haben — deren Arbeit kann verloren gehen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Frag dich bei jedem Befehl: Gibt es danach noch einen Weg zurück?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Zwei Dinge sind besonders heikel: nie committete Arbeit und alles, was andere schon haben.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 4,
          conceptSlugs: ['aenderungen-zuruecknehmen'],
        },
        {
          slug: 'recovery-szenario',
          type: 'SCENARIO_DECISION',
          title: 'Der Fehler ist schon veröffentlicht',
          prompt: 'Wie nimmst du ihn zurück?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Ein fehlerhafter Commit liegt seit gestern auf main, und mehrere Personen haben ihn bereits geholt. Er muss zurückgenommen werden.',
            options: [
              {
                id: 'a',
                text: 'git revert auf den fehlerhaften Commit anwenden und das Ergebnis pushen.',
                quality: 'optimal',
                feedback:
                  'Richtig. Es entsteht ein neuer Commit, der die Änderung ausgleicht — der Verlauf bleibt für alle stimmig.',
              },
              {
                id: 'b',
                text: 'git reset --hard auf den Commit davor und mit --force pushen.',
                quality: 'problematic',
                feedback:
                  'Damit verschwindet der Commit aus dem gemeinsamen Verlauf. Wer ihn schon hat, gerät in einen widersprüchlichen Zustand.',
              },
              {
                id: 'c',
                text: 'Die betroffenen Zeilen von Hand zurückschreiben und neu committen.',
                quality: 'acceptable',
                feedback:
                  'Das Ergebnis stimmt, aber revert macht die Absicht im Verlauf sichtbar und übersieht nichts.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was ändert sich dadurch, dass andere den Commit bereits haben?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Veröffentlichten Verlauf schreibt man nicht um — man ergänzt ihn.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 5,
          conceptSlugs: ['aenderungen-zuruecknehmen', 'reflog'],
        },
      ],
    },
  ],
};
