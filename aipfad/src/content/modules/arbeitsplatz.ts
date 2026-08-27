import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Modul 2: Technischer Arbeitsplatz (kompakt). Pfade, Terminal,
 * Umgebungsvariablen — die Grundlage, auf der jeder spätere Umgang mit
 * AI-Werkzeugen aufbaut.
 */
export const arbeitsplatzModule: ModuleDraft = {
  slug: 'technischer-arbeitsplatz',
  title: 'Technischer Arbeitsplatz',
  summary:
    'Pfade, Terminal und Umgebungsvariablen — die Werkzeuge, auf denen alles Weitere aufbaut.',
  rationale:
    'Bevor es um AI-Konzepte geht, braucht es einen gemeinsamen technischen Boden. Wer nie ein Terminal geöffnet hat, kann spätere Setup-Anleitungen nicht befolgen — diese kurze Stufe schließt genau diese Lücke.',
  prerequisiteModuleSlugs: ['orientierung'],
  status: 'PUBLISHED',
  lessons: [
    {
      slug: 'pfade-und-ordner',
      title: 'Pfade, Ordner und Dateiendungen',
      learningObjectives: [
        'Du kannst einen absoluten von einem relativen Pfad unterscheiden.',
        'Du erkennst an einer Dateiendung, um welche Art von Datei es sich vermutlich handelt.',
      ],
      everydayProblem:
        'Eine Fehlermeldung wie "Datei nicht gefunden: config.json" ist ohne Verständnis von Pfaden nicht zu beheben — man weiß nicht, wo der Computer überhaupt gesucht hat.',
      mentalModel:
        'Ein Pfad ist eine Wegbeschreibung durch verschachtelte Schubladen. "/dokumente/notizen.txt" heißt: öffne die Schublade "dokumente", darin liegt "notizen.txt". Ein relativer Pfad beschreibt den Weg ab der Schublade, in der du gerade stehst — nicht ab der Wurzel.',
      workedExample: {
        summary: 'Zwei Pfade zur selben Datei, aus unterschiedlichen Startpunkten.',
        annotations: [
          {
            step: 1,
            text: 'Absolut: /Users/mira/projekte/aipfad/README.md — funktioniert von überall.',
          },
          {
            step: 2,
            text: 'Relativ, wenn du bereits in /Users/mira/projekte/aipfad stehst: README.md.',
          },
          { step: 3, text: 'Relativ, wenn du in /Users/mira stehst: projekte/aipfad/README.md.' },
        ],
        outcome: 'Derselbe Ort, drei gültige Schreibweisen — je nachdem, wo du gerade stehst.',
      },
      reflectionPrompts: [
        'Wo auf deinem Rechner findest du typischerweise heruntergeladene Dateien wieder?',
        'Kannst du dir den Pfad zu einer Datei vorstellen, die du heute schon geöffnet hast?',
      ],
      commonMistakes: [
        {
          mistake:
            'Einen relativen Pfad verwenden und sich wundern, warum die Datei "nicht gefunden" wird.',
          why: 'Ein relativer Pfad hängt vom aktuellen Arbeitsverzeichnis ab — steht man an einer anderen Stelle, zeigt derselbe Text auf einen anderen Ort.',
          fix: 'Bei Unsicherheit erst prüfen, wo man gerade "steht" (siehe nächste Lektion, Befehl pwd).',
        },
      ],
      estimatedMinutes: 7,
      primaryConceptSlugs: ['pfad-und-pfadtrennzeichen'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: [],
      exercises: [
        {
          slug: 'pfade-fill-in',
          type: 'FILL_IN',
          title: 'Pfad vervollständigen',
          prompt: 'Ergänze die fehlenden Begriffe.',
          payload: {
            kind: 'fillIn',
            template:
              'Ein Pfad, der mit einem Schrägstrich beginnt, heißt {{blank:art}}-Pfad. Er beginnt immer an der {{blank:ort}} des Dateisystems.',
            blanks: [
              {
                id: 'art',
                accepted: ['absoluter', 'absolut'],
                description: 'Art des Pfads',
                wrongHint: 'Denk an das Gegenteil von "relativ".',
              },
              {
                id: 'ort',
                accepted: ['wurzel'],
                description: 'Startpunkt im Dateisystem',
                wrongHint: 'Der oberste Punkt der Ordnerstruktur.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Ein absoluter Pfad braucht keinen Bezugspunkt — er ist von überall gültig.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['pfad-und-pfadtrennzeichen'],
        },
      ],
    },
    {
      slug: 'terminal-grundlagen',
      title: 'Das Terminal',
      learningObjectives: [
        'Du kannst die Befehle pwd, ls, cd, mkdir und cat richtig einsetzen.',
        'Du erkennst, warum rm -rf besondere Vorsicht verlangt.',
      ],
      everydayProblem:
        'Viele Setup-Anleitungen für Entwicklerwerkzeuge bestehen aus Terminalbefehlen. Ohne Grundverständnis wirkt das wie eine Fremdsprache.',
      mentalModel:
        'Das Terminal ist ein Gespräch mit dem Computer in ganzen, kurzen Sätzen: ein Befehl, manchmal mit Zusatzangaben. Der Computer antwortet mit Text statt mit einem Klick-Ergebnis.',
      workedExample: {
        summary: 'Eine typische kurze Sitzung im Terminal.',
        annotations: [
          { step: 1, text: 'pwd zeigt: /Users/mira — hier "stehst" du gerade.' },
          { step: 2, text: 'ls zeigt den Inhalt dieses Ordners.' },
          { step: 3, text: 'cd projekte wechselt in den Unterordner "projekte".' },
          { step: 4, text: 'mkdir neu legt dort einen neuen, leeren Ordner an.' },
        ],
        outcome: 'Vier kurze Befehle genügen, um sich sicher im Dateisystem zu bewegen.',
      },
      reflectionPrompts: [
        'Welcher der fünf Befehle wirkt für dich am nützlichsten für den Alltag?',
        'Bei welchem Befehl würdest du dir vor dem Ausführen am ehesten Zeit zum Prüfen nehmen?',
      ],
      commonMistakes: [
        {
          mistake: 'rm -rf auf einen Ordner ausführen, ohne den Pfad noch einmal zu prüfen.',
          why: 'Der Befehl löscht sofort und endgültig — es gibt keinen Papierkorb und keine Rückfrage.',
          fix: 'Vor jedem rm -rf: pwd und ls ausführen, um sicherzugehen, im richtigen Ordner zu sein.',
        },
      ],
      estimatedMinutes: 10,
      primaryConceptSlugs: ['terminal-grundbegriffe'],
      supportingConceptSlugs: ['pfad-und-pfadtrennzeichen'],
      prerequisiteConceptSlugs: ['pfad-und-pfadtrennzeichen'],
      exercises: [
        {
          slug: 'terminal-simulation-uebung',
          type: 'TERMINAL_SIMULATION',
          title: 'Im Terminal navigieren',
          prompt: 'Finde die Datei "brief.txt" und zeige ihren Inhalt an.',
          payload: {
            kind: 'terminalSimulation',
            goalDescription:
              'Wechsle in den Ordner "post", liste seinen Inhalt auf und zeige den Inhalt von brief.txt an.',
            startingDirectory: '/home/lernperson',
            fileSystem: {
              '/home/lernperson': null,
              '/home/lernperson/post': null,
              '/home/lernperson/post/brief.txt': 'Liebe Grüße aus dem Terminal!',
              '/home/lernperson/bilder': null,
            },
            allowedCommands: ['pwd', 'ls', 'cd', 'cat'],
            dangerousCommands: [],
            expectedCommands: ['cd post', 'ls', 'cat brief.txt'],
          },
          hints: [
            { level: 1, kind: 'impulse', text: 'Welcher Befehl wechselt in einen Ordner?' },
            {
              level: 2,
              kind: 'concept',
              text: 'cd + Ordnername, danach ls zum Nachsehen, dann cat + Dateiname.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['terminal-grundbegriffe'],
        },
        {
          slug: 'terminal-scenario-rm',
          type: 'SCENARIO_DECISION',
          title: 'Gefährlichen Befehl einschätzen',
          prompt:
            'Du siehst in einer Anleitung den Befehl "rm -rf ./build". Was ist der sinnvollste erste Schritt?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Eine Online-Anleitung schlägt vor, vor einem Neustart den Ordner "build" mit rm -rf zu löschen. Du bist dir nicht sicher, ob du gerade im richtigen Projektordner stehst.',
            options: [
              {
                id: 'a',
                text: 'Direkt ausführen — die Anleitung wird schon stimmen.',
                quality: 'problematic',
                feedback:
                  'rm -rf lässt sich nicht rückgängig machen. Ungeprüft ausführen ist ein vermeidbares Risiko.',
              },
              {
                id: 'b',
                text: 'Erst pwd und ls ausführen, um den aktuellen Ort und Inhalt zu prüfen.',
                quality: 'optimal',
                feedback:
                  'Genau — bei nicht rückgängig zu machenden Befehlen lohnt sich die zusätzliche halbe Minute Prüfung immer.',
              },
              {
                id: 'c',
                text: 'Den ganzen Rechner neu starten, um sicherzugehen.',
                quality: 'problematic',
                feedback:
                  'Das löst das eigentliche Problem nicht — die Unsicherheit über den aktuellen Ort bleibt bestehen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was kannst du prüfen, bevor etwas Unwiderrufliches passiert?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['terminal-grundbegriffe'],
        },
      ],
    },
    {
      slug: 'umgebungsvariablen-und-geheimnisse',
      title: 'Umgebungsvariablen und .gitignore',
      learningObjectives: [
        'Du kannst erklären, wofür eine .env-Datei verwendet wird.',
        'Du erkennst, warum Geheimnisse nicht in den Quelltext gehören.',
      ],
      everydayProblem:
        'Ein versehentlich veröffentlichter Zugangsschlüssel in einem öffentlichen Code-Repository ist einer der häufigsten Sicherheitsvorfälle bei Einsteiger-Projekten.',
      mentalModel:
        'Der Quelltext ist wie ein Schaufenster — irgendwann sichtbar für andere. Eine .env-Datei ist die verschlossene Schublade dahinter: Zugangsschlüssel und Passwörter bleiben lokal, die .gitignore-Datei sorgt dafür, dass diese Schublade nie versehentlich mit ins Schaufenster wandert.',
      workedExample: {
        summary: 'Eine Zeile in .gitignore verhindert ein Datenleck.',
        annotations: [
          { step: 1, text: 'Die Datei .env enthält: API_SCHLUESSEL=geheim123' },
          { step: 2, text: 'Die Datei .gitignore enthält die Zeile: .env' },
          { step: 3, text: 'Git überspringt .env bei jedem Commit — der Schlüssel bleibt lokal.' },
        ],
        outcome:
          'Ohne diese eine Zeile würde der Schlüssel beim nächsten Hochladen öffentlich sichtbar.',
      },
      reflectionPrompts: [
        'Was würde im schlimmsten Fall passieren, wenn ein Zugangsschlüssel öffentlich einsehbar wäre?',
        'Kennst du ein Projekt, in dem du bereits mit einer .env-Datei gearbeitet hast?',
      ],
      commonMistakes: [
        {
          mistake:
            'Einen Zugangsschlüssel direkt in eine Quelltextdatei schreiben, "nur zum Testen".',
          why: 'Testcode wird oft versehentlich mit hochgeladen — "nur zum Testen" hält sich in der Praxis selten.',
          fix: 'Von Anfang an über eine .env-Datei arbeiten, die in .gitignore steht.',
        },
      ],
      estimatedMinutes: 6,
      primaryConceptSlugs: ['umgebungsvariablen'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: ['terminal-grundbegriffe'],
      exercises: [
        {
          slug: 'umgebungsvariablen-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Geheimnisse richtig ablegen',
          prompt: 'Wo sollte ein API-Zugangsschlüssel in einem Softwareprojekt stehen?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Direkt im Quelltext, gut sichtbar für alle Mitwirkenden.',
                feedback:
                  'Quelltext wird oft geteilt oder veröffentlicht — das ist der falsche Ort.',
              },
              {
                id: 'b',
                text: 'In einer .env-Datei, die nicht in die Versionsverwaltung aufgenommen wird.',
                feedback: 'Richtig — lokal, getrennt vom Quelltext, per .gitignore ausgeschlossen.',
              },
              {
                id: 'c',
                text: 'In einem Kommentar über der Zeile, die ihn verwendet.',
                feedback: 'Kommentare landen genauso im Quelltext wie Code — kein sichererer Ort.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was passiert mit Quelltext, wenn ein Projekt geteilt wird?',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 4,
          conceptSlugs: ['umgebungsvariablen'],
        },
      ],
    },
  ],
};
