import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Modul 1: Orientierung. Kurze, unverbindliche Lektionen — was AIPfad ist,
 * was AI kann und nicht kann, wie Fortschritt gemessen wird. Text-Budget pro
 * Lektion bewusst knapp gehalten (siehe Plan §11).
 */
export const orientierungModule: ModuleDraft = {
  slug: 'orientierung',
  title: 'Orientierung',
  summary: 'Was AIPfad ist, was AI kann und nicht kann, wie dein Fortschritt gemessen wird.',
  rationale:
    'Bevor es an Technik geht, steht ein gemeinsames Bild: was diese Plattform ist, welche Grenzen KI-Systeme tatsächlich haben, und wie Fortschritt hier gemeint ist — als Orientierung, nicht als Messung.',
  prerequisiteModuleSlugs: [],
  status: 'PUBLISHED',
  lessons: [
    {
      slug: 'was-ist-aipfad',
      title: 'Was ist AIPfad?',
      learningObjectives: [
        'Du kannst erklären, warum AIPfad auf einen geführten Pfad und eine frei durchsuchbare Bibliothek statt auf lange Videos setzt.',
        'Du erkennst, warum jede Lernseite bewusst kurzgehalten ist.',
      ],
      everydayProblem:
        'Die meisten AI-Kurse bestehen aus langen Videos oder dichten Textseiten. Nach einer Stunde weißt du, dass du etwas gehört hast — aber nicht sicher, ob du es anwenden kannst.',
      mentalModel:
        'Stell dir AIPfad wie eine Werkstatt vor, nicht wie einen Hörsaal: ein Werkzeug wird kurz erklärt, du probierst es sofort aus, dann kommt das nächste. Jede Seite ist eine einzige Entscheidung, kein Kapitel.',
      workedExample: {
        summary:
          'Eine typische Lektion hat vier bis sechs kurze Schritte statt einer langen Seite: Ziel, Beispiel, ein bis zwei Aufgaben, kurze Reflexion.',
        annotations: [
          { step: 1, text: 'Lernziel und Alltagsproblem — warum das Konzept überhaupt zählt.' },
          { step: 2, text: 'Ein durchgerechnetes Beispiel, das du nachvollziehen kannst.' },
          { step: 3, text: 'Aufgaben mit abnehmender Hilfestellung.' },
          { step: 4, text: 'Kurze Reflexion — keine gespeicherte Antwort, nur ein Innehalten.' },
        ],
        outcome: 'Am Ende jeder Lektion hast du etwas angewendet, nicht nur gelesen.',
      },
      reflectionPrompts: [
        'Welcher Teil eines früheren Online-Kurses hat sich für dich am wenigsten gelohnt?',
        'Was würde für dich "ich habe das wirklich verstanden" von "ich habe davon gehört" unterscheiden?',
      ],
      commonMistakes: [
        {
          mistake: 'Lektionen im Schnelldurchlauf wegklicken, um schneller fertig zu sein.',
          why: 'Fortschritt in AIPfad wird nicht über Geschwindigkeit gemessen — Durchklicken schließt eine Lektion nicht ab.',
          fix: 'Jede Aufgabe muss mindestens einmal bestanden werden. Nimm dir für eine falsche Antwort die Zeit, die Rückmeldung zu lesen.',
        },
      ],
      estimatedMinutes: 6,
      primaryConceptSlugs: ['aipfad-lernprinzip'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: [],
      exercises: [
        {
          slug: 'was-ist-aipfad-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Grundprinzip erkennen',
          prompt: 'Was beschreibt das Lernprinzip von AIPfad am besten?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Möglichst viel Inhalt auf jeder Seite, damit nichts fehlt.',
                feedback:
                  'Das ist genau das Gegenteil — AIPfad reduziert bewusst, was auf einem Bildschirm steht.',
              },
              {
                id: 'b',
                text: 'Wenig Inhalt gleichzeitig, dafür echtes Verständnis durch Anwenden.',
                feedback: 'Genau — ein Bildschirm, eine Lernentscheidung.',
              },
              {
                id: 'c',
                text: 'Möglichst schnelles Durchklicken bis zum Zertifikat.',
                feedback:
                  'Durchklicken zählt hier nicht als Abschluss — jede Aufgabe muss bestanden werden.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Denk an den Unterschied zwischen einer Werkstatt und einem Hörsaal.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Es geht um das Verhältnis von Textmenge zu eigener Anwendung.',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 4,
          conceptSlugs: ['aipfad-lernprinzip'],
        },
      ],
    },
    {
      slug: 'was-kann-ai',
      title: 'Was kann AI — und was nicht?',
      learningObjectives: [
        'Du kannst zwei typische Stärken und zwei typische Schwächen heutiger Sprachmodelle benennen.',
        'Du erkennst, warum "die KI hat sich geirrt" eine unpräzise Aussage ist.',
      ],
      everydayProblem:
        'Werbung und Panikmache zeichnen oft ein Zerrbild: entweder kann AI angeblich alles, oder sie ist grundsätzlich unzuverlässig. Beides führt zu schlechten Entscheidungen im Alltag.',
      mentalModel:
        'Ein Sprachmodell ist wie eine sehr belesene Person, die schnell antwortet, ohne nachzuschlagen. Stark bei Sprache, Struktur und Mustern — schwach bei exaktem Zählen, aktuellen Fakten und dem ehrlichen Eingeständnis von Unsicherheit.',
      workedExample: {
        summary: 'Zwei Anfragen an ein Sprachmodell zeigen den Unterschied.',
        annotations: [
          { step: 1, text: '"Formuliere diesen Satz höflicher um" — eine Sprachaufgabe, stark.' },
          {
            step: 2,
            text: '"Wie viele Buchstaben hat dieser 400-Wörter-Text genau?" — exaktes Zählen, schwach.',
          },
        ],
        outcome:
          'Dieselbe Technologie liefert je nach Aufgabenart sehr unterschiedlich verlässliche Ergebnisse.',
      },
      reflectionPrompts: [
        'Bei welcher Aufgabe hast du einem KI-Werkzeug zuletzt vertraut, ohne das Ergebnis zu prüfen?',
        'Welche Aufgabe würdest du einem Sprachmodell nach dieser Lektion eher nicht mehr anvertrauen?',
      ],
      commonMistakes: [
        {
          mistake: 'Ein KI-Ergebnis wird ungeprüft übernommen, weil es selbstsicher klingt.',
          why: 'Der Tonfall eines Sprachmodells sagt nichts über die Richtigkeit aus — beides ist unabhängig voneinander gelernt.',
          fix: 'Bei Fakten, Zahlen und Zitaten: immer gegen eine echte Quelle prüfen, bevor du dich darauf verlässt.',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['ki-faehigkeiten-und-grenzen'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: ['aipfad-lernprinzip'],
      exercises: [
        {
          slug: 'was-kann-ai-scenario',
          type: 'SCENARIO_DECISION',
          title: 'Passende Aufgabe wählen',
          prompt: 'Für welche Aufgabe ist ein Sprachmodell die verlässlichste Wahl?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Ein Kollege möchte KI für eine von drei Aufgaben einsetzen: (A) die exakte Anzahl aller "e" in einem Vertrag zählen, (B) einen Entwurf für eine interne Ankündigung schreiben, (C) das aktuelle Datum der nächsten Bundestagswahl nennen.',
            options: [
              {
                id: 'a',
                text: 'Aufgabe A — exaktes Zählen.',
                quality: 'problematic',
                feedback:
                  'Exaktes Zählen in langen Texten ist eine bekannte Schwäche — hier lieber ein Textwerkzeug mit echter Zählfunktion nutzen.',
              },
              {
                id: 'b',
                text: 'Aufgabe B — einen Entwurf schreiben.',
                quality: 'optimal',
                feedback:
                  'Richtig. Textentwürfe sind eine Kernstärke — und ein Entwurf darf ohnehin noch überarbeitet werden.',
              },
              {
                id: 'c',
                text: 'Aufgabe C — ein aktuelles Datum nennen.',
                quality: 'problematic',
                feedback:
                  'Ohne Zugriff auf aktuelle, verlässliche Quellen ist das Risiko einer Halluzination hoch — das gehört geprüft.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welche der drei Aufgaben braucht Kreativität statt Präzision?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['ki-faehigkeiten-und-grenzen'],
        },
      ],
    },
    {
      slug: 'wie-fortschritt-gemessen-wird',
      title: 'Wie dein Fortschritt gemessen wird',
      learningObjectives: [
        'Du kannst erklären, warum AIPfad Kompetenzbänder statt Prozentzahlen anzeigt.',
        'Du erkennst, dass eine Pause keinen Fortschritt kostet.',
      ],
      everydayProblem:
        'Viele Lern-Apps zeigen Prozentwerte mit Nachkommastelle oder lassen eine Serie bei einer Pause auf null fallen. Das erzeugt Druck, sagt aber wenig über echtes Können aus.',
      mentalModel:
        'Dein Kompetenzstand wird wie ein grobes Wetterbild dargestellt — "wolkig, Auflockerung möglich" statt "63,2 % Bewölkung". Beide beschreiben denselben Zustand, aber eines davon täuscht Genauigkeit nur vor.',
      workedExample: {
        summary: 'Fünf Bänder ersetzen die Prozentzahl.',
        annotations: [
          {
            step: 1,
            text: 'Noch neu → Im Aufbau → Grundsätzlich anwendbar → Sicher → Nachhaltig beherrscht.',
          },
          {
            step: 2,
            text: 'Jede Änderung des Bandes erklärt AIPfad in einem Satz, nie nur mit einer Zahl.',
          },
        ],
        outcome:
          'Du siehst immer, warum sich dein Stand verändert hat — nie nur, dass er sich verändert hat.',
      },
      reflectionPrompts: [
        'Welche Rolle hat für dich in der Vergangenheit eine Serie ("Streak") beim Lernen gespielt?',
        'Was würde sich für dich ändern, wenn eine Pause nie als Rückschritt gezählt würde?',
      ],
      commonMistakes: [
        {
          mistake: 'Einen Kompetenzwert als objektives Urteil über die eigene Fähigkeit lesen.',
          why: 'Der Wert ist eine Orientierung für die Wiederholungsplanung, keine Prüfungsnote.',
          fix: 'Lies das Band und den erklärenden Satz — nicht nur die Farbe.',
        },
      ],
      estimatedMinutes: 5,
      primaryConceptSlugs: ['kompetenzstufen'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: ['aipfad-lernprinzip'],
      exercises: [
        {
          slug: 'fortschritt-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Bänder statt Zahlen',
          prompt: 'Warum zeigt AIPfad "Grundsätzlich anwendbar" statt "71 %"?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Weil Prozentzahlen technisch nicht möglich wären.',
                feedback:
                  'Technisch wäre das kein Problem — die Entscheidung ist bewusst pädagogisch.',
              },
              {
                id: 'b',
                text: 'Weil eine Nachkommastelle eine Genauigkeit vortäuscht, die eine Kompetenzschätzung nicht hat.',
                feedback:
                  'Genau — Bänder kommunizieren ehrlich, wie grob die Einschätzung tatsächlich ist.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was würde eine Zahl mit Nachkommastelle fälschlich suggerieren?',
            },
          ],
          difficulty: 1,
          scaffoldLevel: 4,
          conceptSlugs: ['kompetenzstufen'],
        },
      ],
    },
  ],
};
