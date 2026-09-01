import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Modul 3: LLM-Grundlagen. Das eigentliche Herzstück dieser Ausbaustufe —
 * wie Sprachmodelle tatsächlich arbeiten, ohne Marketingsprache.
 */
export const llmGrundlagenModule: ModuleDraft = {
  slug: 'llm-grundlagen',
  title: 'LLM-Grundlagen',
  summary: 'Tokens, Embeddings, Aufmerksamkeit, Kontextfenster, Nachrichtenrollen, Halluzination.',
  rationale:
    'Das ist der eigentliche Kern von AIPfad: keine Blackbox mehr, sondern nachvollziehbare Mechanik. Jede spätere Lektion zu Prompting, RAG oder Agents baut auf diesem Wortschatz auf.',
  prerequisiteModuleSlugs: ['technischer-arbeitsplatz'],
  status: 'PUBLISHED',
  lessons: [
    {
      slug: 'tokens-und-tokenisierung',
      title: 'Tokens und Tokenisierung',
      learningObjectives: [
        'Du kannst erklären, warum ein Sprachmodell Text als Tokens statt als Buchstaben verarbeitet.',
        'Du erkennst an einem Beispielsatz, wie eine grobe Tokenisierung aussehen könnte.',
      ],
      everydayProblem:
        'Warum kostet eine Anfrage an ein Sprachmodell unterschiedlich viel, je nachdem, in welcher Sprache man schreibt? Die Antwort liegt in der Tokenisierung.',
      mentalModel:
        'Tokens sind wie Puzzleteile eines Wortes. "Sprachmodell" könnte in "Sprach" und "modell" zerfallen — zwei Teile statt eines. Ein Modell rechnet ausschließlich mit solchen Teilen, nie mit ganzen Sätzen auf einmal.',
      workedExample: {
        summary:
          'Der Satz "Verstehe, was ein Sprachmodell wirklich sieht." in einer beispielhaften Zerlegung.',
        annotations: [
          { step: 1, text: '"Ver" + "stehe" — ein längeres Wort wird in zwei Teile zerlegt.' },
          { step: 2, text: '"," — Satzzeichen sind oft eigene Tokens.' },
          {
            step: 3,
            text: '" Sprach" + "modell" — ein deutsches Kompositum zerfällt in zwei Teile.',
          },
        ],
        outcome:
          'Aus einem 8-Wörter-Satz werden rund 10 Tokens — die Anzahl hängt von der Sprache und den Wörtern ab.',
      },
      reflectionPrompts: [
        'Warum könnten seltene Fachbegriffe in mehr Tokens zerfallen als alltägliche Wörter?',
        'Welche Wörter aus deinem eigenen Alltag könnten in besonders viele Tokens zerfallen?',
      ],
      commonMistakes: [
        {
          mistake: 'Annehmen, ein Token entspreche immer einem ganzen Wort.',
          why: 'Lange, seltene oder zusammengesetzte Wörter — im Deutschen besonders häufig — zerfallen oft in mehrere Tokens.',
          fix: 'Bei der Einschätzung der Kosten oder Länge einer Anfrage lieber mit "etwas mehr Tokens als Wörter" rechnen.',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['token', 'tokenisierung'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: [],
      exercises: [
        {
          slug: 'tokens-ordering',
          type: 'ORDERING',
          title: 'Vom Text zur Antwort',
          prompt:
            'Bring die Schritte in die richtige Reihenfolge, bevor ein Sprachmodell antwortet.',
          payload: {
            kind: 'ordering',
            instruction: 'Reihenfolge von der Eingabe bis zur Verarbeitung.',
            items: [
              { id: 'text', text: 'Der eingegebene Text liegt als Zeichenkette vor.' },
              { id: 'tokens', text: 'Der Text wird in Tokens zerlegt.' },
              { id: 'embed', text: 'Jedes Token wird auf einen Bedeutungsvektor abgebildet.' },
              { id: 'verarbeitung', text: 'Das Modell verarbeitet die Vektorfolge.' },
            ],
            correctOrder: ['text', 'tokens', 'embed', 'verarbeitung'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was muss geschehen, bevor überhaupt gerechnet werden kann?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['token', 'tokenisierung'],
        },
      ],
    },
    {
      slug: 'embeddings-und-aufmerksamkeit',
      title: 'Embeddings und Aufmerksamkeit',
      learningObjectives: [
        'Du kannst erklären, was ein Embedding über ein Token aussagt.',
        'Du erkennst die Rolle von Aufmerksamkeit (Attention) bei der Interpretation eines Satzes.',
      ],
      everydayProblem:
        'Wie "weiß" ein Modell, dass sich "es" im Satz "Die Katze jagte die Maus, weil es hungrig war" auf die Katze bezieht und nicht auf die Maus?',
      mentalModel:
        'Ein Embedding ist wie eine Koordinate auf einer Bedeutungslandkarte — ähnliche Begriffe liegen nah beieinander. Aufmerksamkeit ist der Blick, mit dem das Modell für jedes Wort entscheidet, welche anderen Wörter im Satz gerade wichtig sind.',
      workedExample: {
        summary: 'Aufmerksamkeit löst eine Mehrdeutigkeit auf.',
        annotations: [
          { step: 1, text: 'Satz: "Die Katze jagte die Maus, weil es hungrig war."' },
          { step: 2, text: 'Für das Wort "es" gewichtet das Modell "Katze" stärker als "Maus".' },
          {
            step: 3,
            text: 'Grund: Kater/Katze und Hunger passen im gelernten Muster besser zusammen als Maus und Jagdverhalten.',
          },
        ],
        outcome:
          'Die richtige Zuordnung entsteht aus gelernten Gewichtungen, nicht aus echtem Verstehen im menschlichen Sinn.',
      },
      reflectionPrompts: [
        'Fällt dir ein Satz ein, der ohne Kontext mehrdeutig wäre?',
        'Wie würdest du einer anderen Person in einem Satz erklären, was ein Embedding ist?',
      ],
      commonMistakes: [
        {
          mistake:
            'Embeddings mit "das Modell versteht die Bedeutung wie ein Mensch" gleichsetzen.',
          why: 'Ein Embedding ist eine erlernte statistische Position, kein bewusstes Verständnis.',
          fix: 'Embeddings als "Ähnlichkeit gemäß Trainingsdaten" verstehen, nicht als echtes Begreifen.',
        },
      ],
      estimatedMinutes: 9,
      primaryConceptSlugs: ['embedding', 'transformer-aufmerksamkeit'],
      supportingConceptSlugs: ['token'],
      prerequisiteConceptSlugs: ['tokenisierung'],
      exercises: [
        {
          slug: 'embedding-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Bedeutungsnähe erkennen',
          prompt:
            'Welche zwei Wörter lägen in einem gut trainierten Embedding-Raum vermutlich am nächsten beieinander?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: '"König" und "Königin"',
                feedback: 'Richtig — beide Wörter treten in sehr ähnlichen Zusammenhängen auf.',
              },
              {
                id: 'b',
                text: '"König" und "Fahrrad"',
                feedback: 'Diese Begriffe teilen kaum gemeinsame Verwendungskontexte.',
              },
              {
                id: 'c',
                text: '"König" und "gestern"',
                feedback: 'Ein Substantiv und ein Zeitwort ohne inhaltliche Nähe.',
              },
            ],
            correctOptionId: 'a',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Embeddings gruppieren Wörter, die in ähnlichen Sätzen auftauchen.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['embedding'],
        },
        {
          slug: 'attention-transfer',
          type: 'TRANSFER',
          title: 'Aufmerksamkeit in einem neuen Satz',
          prompt:
            'Im Satz "Der Arzt sprach mit der Patientin, bevor sie das Zimmer verließ" — worauf bezieht sich "sie" am wahrscheinlichsten, und warum ist das für ein Modell keine sichere Entscheidung?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Ein Sprachmodell muss "sie" im obigen Satz einem Bezugswort zuordnen, ohne zusätzlichen Kontext.',
            options: [
              {
                id: 'a',
                text: '"sie" bezieht sich eindeutig und garantiert auf die Patientin.',
                quality: 'problematic',
                feedback:
                  'Grammatisch naheliegend, aber ohne weiteren Kontext keine Garantie — Sprache lässt hier Spielraum.',
              },
              {
                id: 'b',
                text: 'Die Zuordnung ist eine wahrscheinlichkeitsbasierte Schätzung, keine sichere Ableitung.',
                quality: 'optimal',
                feedback:
                  'Genau — Aufmerksamkeit liefert eine Gewichtung, keinen Beweis. Bei mehrdeutigen Sätzen kann sie danebenliegen.',
              },
              {
                id: 'c',
                text: 'Das Modell fragt in so einem Fall automatisch nach, welche Person gemeint ist.',
                quality: 'problematic',
                feedback:
                  'Ohne explizite Aufforderung dazu trifft das Modell in der Regel einfach die wahrscheinlichste Annahme.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Ist die Zuordnung eine Gewissheit oder eine Wahrscheinlichkeit?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 6,
          transferContext: 'Neuer Beispielsatz, nicht aus dem Lektionsbeispiel übernommen.',
          conceptSlugs: ['transformer-aufmerksamkeit'],
        },
      ],
    },
    {
      slug: 'training-inferenz-und-kontext',
      title: 'Training, Inferenz und Kontextfenster',
      learningObjectives: [
        'Du kannst Training und Inferenz an ihrem jeweiligen Zweck unterscheiden.',
        'Du kannst erklären, warum ein Chatverlauf irgendwann "vergessen" wirkt.',
      ],
      everydayProblem:
        'Nach einer langen Unterhaltung mit einem Chatbot wirkt er plötzlich, als hätte er den Anfang des Gesprächs vergessen — obwohl nichts gelöscht wurde.',
      mentalModel:
        'Training ist wie das jahrelange Auswendiglernen eines Nachschlagewerks — einmalig, aufwendig, danach abgeschlossen. Inferenz ist das schnelle Nachschlagen bei einer konkreten Frage, ohne dabei etwas Neues zu lernen. Das Kontextfenster ist der Schreibtisch, auf dem nur begrenzt viele Notizzettel gleichzeitig Platz haben.',
      workedExample: {
        summary: 'Ein Kontextfenster füllt sich im Laufe eines Gesprächs.',
        annotations: [
          {
            step: 1,
            text: 'Nachricht 1–5: passen bequem auf den Schreibtisch (das Kontextfenster).',
          },
          {
            step: 2,
            text: 'Nachricht 30: der Schreibtisch ist voll, ältere Zettel fallen herunter.',
          },
          {
            step: 3,
            text: 'Das Modell antwortet weiterhin — aber ohne die frühen Nachrichten vor Augen zu haben.',
          },
        ],
        outcome:
          'Kein Fehler, sondern eine feste Grenze: Was nicht mehr im Kontextfenster liegt, ist für die aktuelle Antwort unsichtbar.',
      },
      reflectionPrompts: [
        'Was würdest du tun, wenn ein wichtiges Detail früh im Gespräch stand und lang zurückliegt?',
        'Woran könntest du im Gespräch selbst merken, dass ältere Nachrichten nicht mehr berücksichtigt werden?',
      ],
      commonMistakes: [
        {
          mistake: '"Das Modell lernt aus unserem Gespräch dazu" annehmen.',
          why: 'Inferenz verändert die Modellgewichte nicht — nach dem Gespräch ist nichts dauerhaft gelernt.',
          fix: 'Wichtige, wiederkehrende Informationen jedes Mal erneut mitgeben, statt auf Erinnerung zu hoffen.',
        },
      ],
      estimatedMinutes: 9,
      primaryConceptSlugs: ['training-vs-inferenz', 'context-window'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: ['transformer-aufmerksamkeit'],
      exercises: [
        {
          slug: 'training-inferenz-multiple-choice',
          type: 'MULTIPLE_CHOICE',
          title: 'Training oder Inferenz?',
          prompt: 'Welche Aussagen treffen auf Inferenz zu (nicht auf Training)? Mehrfachauswahl.',
          payload: {
            kind: 'multipleChoice',
            options: [
              {
                id: 'a',
                text: 'Findet bei jeder einzelnen Anfrage statt.',
                feedback: 'Richtig — jede Nachricht löst eine neue Inferenz aus.',
              },
              {
                id: 'b',
                text: 'Verändert die Modellgewichte dauerhaft.',
                feedback: 'Das ist Training, nicht Inferenz.',
              },
              {
                id: 'c',
                text: 'Nutzt bereits fertig gelernte, eingefrorene Gewichte.',
                feedback: 'Richtig — Inferenz verwendet, was Training zuvor gelernt hat.',
              },
              {
                id: 'd',
                text: 'Braucht typischerweise riesige Textmengen über Tage oder Wochen.',
                feedback: 'Das beschreibt Training.',
              },
            ],
            correctOptionIds: ['a', 'c'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was passiert bei jeder deiner Chatnachrichten — Lernen oder Anwenden?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['training-vs-inferenz'],
        },
        {
          slug: 'context-window-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Kontextfenster einschätzen',
          prompt:
            'Ein Gespräch wird sehr lang. Was passiert am ehesten, wenn das Kontextfenster voll ist?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Das Modell verweigert jede weitere Antwort.',
                feedback:
                  'In der Regel antwortet das Modell weiter — nur ohne die ältesten Inhalte im Blick.',
              },
              {
                id: 'b',
                text: 'Ältere Inhalte fallen heraus oder werden gekürzt und sind für die nächste Antwort nicht mehr sichtbar.',
                feedback: 'Richtig.',
              },
              {
                id: 'c',
                text: 'Das Modell speichert automatisch alles dauerhaft in einer Datenbank.',
                feedback:
                  'Das würde eine zusätzliche, bewusst gebaute Funktion voraussetzen — nicht das Standardverhalten.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            { level: 1, kind: 'impulse', text: 'Denk an den Schreibtisch mit begrenztem Platz.' },
          ],
          difficulty: 1,
          scaffoldLevel: 4,
          conceptSlugs: ['context-window'],
        },
      ],
    },
    {
      slug: 'nachrichtenrollen-und-halluzination',
      title: 'Nachrichtenrollen und Halluzination',
      learningObjectives: [
        'Du kannst die drei Nachrichtenrollen System, User und Assistant unterscheiden.',
        'Du kannst erklären, warum Halluzinationen strukturell entstehen, nicht zufällig.',
      ],
      everydayProblem:
        'Ein Chatbot nennt eine Quelle, die es gar nicht gibt — mit vollem Selbstvertrauen. Wie kann das passieren, ohne dass etwas "kaputt" ist?',
      mentalModel:
        'Ein Chatverlauf ist ein Skript mit drei Sprechrollen: System (die Regieanweisung im Hintergrund), User (deine Zeilen) und Assistant (die bisherigen Antworten). Eine Halluzination entsteht, weil das Modell bei jedem Wort nur das plausibelste nächste Token vorhersagt — ohne eingebauten Abgleich mit einer Faktendatenbank.',
      workedExample: {
        summary: 'Drei Rollen füllen gemeinsam das Kontextfenster.',
        annotations: [
          { step: 1, text: 'System: "Antworte auf Deutsch, höflich und knapp."' },
          { step: 2, text: 'User: "Was ist ein Kontextfenster?"' },
          {
            step: 3,
            text: 'Assistant: die vorherige Antwort des Modells — für den nächsten Zug wieder Teil des Kontexts.',
          },
        ],
        outcome: 'Alle drei Rollen zusammen bestimmen, wie die nächste Antwort ausfällt.',
      },
      reflectionPrompts: [
        'Wann würdest du einer KI-Antwort mit einer konkreten Zahl oder einem Zitat besonders kritisch begegnen?',
        'Welche der drei Nachrichtenrollen bestimmst du beim Chatten selbst, welche nicht?',
      ],
      commonMistakes: [
        {
          mistake:
            'Eine Halluzination als seltenen "Ausrutscher" statt als strukturelle Eigenschaft verstehen.',
          why: 'Ohne eingebauten Faktenabgleich kann jede Antwort — nicht nur seltene Ausnahmen — plausibel und falsch zugleich sein.',
          fix: 'Bei Fakten, Zahlen, Zitaten und Quellenangaben grundsätzlich gegenprüfen, unabhängig davon, wie sicher die Antwort klingt.',
        },
      ],
      estimatedMinutes: 9,
      primaryConceptSlugs: ['nachrichtenrollen', 'halluzination'],
      supportingConceptSlugs: ['training-vs-inferenz'],
      prerequisiteConceptSlugs: ['context-window', 'training-vs-inferenz'],
      exercises: [
        {
          slug: 'nachrichtenrollen-ordering',
          type: 'ORDERING',
          title: 'Rollen zuordnen',
          prompt:
            'Ordne die Zeilen eines Gesprächsausschnitts den passenden Rollen zu — von System bis zur aktuellen Frage.',
          payload: {
            kind: 'ordering',
            instruction: 'In der Reihenfolge, in der sie im Kontextfenster stehen.',
            items: [
              { id: 'system', text: 'System: "Antworte knapp und auf Deutsch."' },
              { id: 'user1', text: 'User: "Was ist ein Token?"' },
              {
                id: 'assistant1',
                text: 'Assistant: "Die kleinste Texteinheit, mit der ein Modell rechnet."',
              },
              { id: 'user2', text: 'User: "Und was ist ein Kontextfenster?"' },
            ],
            correctOrder: ['system', 'user1', 'assistant1', 'user2'],
          },
          hints: [{ level: 1, kind: 'impulse', text: 'Die Regieanweisung steht immer zuerst.' }],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['nachrichtenrollen'],
        },
        {
          slug: 'halluzination-scenario',
          type: 'SCENARIO_DECISION',
          title: 'Mit einer möglichen Halluzination umgehen',
          prompt:
            'Ein Sprachmodell nennt in einer Antwort ein konkretes Gesetz mit Paragraf und Jahr. Wie gehst du am besten damit um?',
          payload: {
            kind: 'scenarioDecision',
            scenario: 'Du brauchst die Angabe für ein offizielles Dokument.',
            options: [
              {
                id: 'a',
                text: 'Übernehmen — die Angabe klingt präzise und sicher formuliert.',
                quality: 'problematic',
                feedback:
                  'Sicherer Tonfall ist kein Beleg für Richtigkeit — das ist genau das Risiko einer Halluzination.',
              },
              {
                id: 'b',
                text: 'Die Angabe an einer offiziellen Quelle gegenprüfen, bevor sie verwendet wird.',
                quality: 'optimal',
                feedback:
                  'Richtig — bei Fakten mit Konsequenzen gehört eine unabhängige Prüfung dazu.',
              },
              {
                id: 'c',
                text: 'Das Modell erneut fragen, ob die Angabe stimmt.',
                quality: 'acceptable',
                feedback:
                  'Kann helfen, ist aber kein verlässlicher Beweis — dasselbe Modell kann seinen eigenen Fehler wiederholen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was sagt der selbstsichere Tonfall über die Richtigkeit aus?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 5,
          conceptSlugs: ['halluzination'],
        },
      ],
    },
  ],
};
