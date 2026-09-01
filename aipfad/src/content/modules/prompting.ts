import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Modul 4: Prompting-Grundlagen. Prompting als Handwerk, nicht als
 * Formelsammlung — Ziel, Kontext, Constraints, Zerlegung, Iteration.
 */
export const promptingModule: ModuleDraft = {
  slug: 'prompting-grundlagen',
  title: 'Prompting-Grundlagen',
  summary: 'Ziel, Kontext, Constraints, Zerlegung, Iteration — wirksame Prompts als Handwerk.',
  rationale:
    'Sobald der technische Wortschatz aus LLM-Grundlagen sitzt, lässt sich Prompting nicht mehr als Zauberformeln lehren, sondern als Anwendung dessen, was ein Modell tatsächlich braucht: Ziel, Kontext und Grenzen.',
  prerequisiteModuleSlugs: ['llm-grundlagen'],
  status: 'PUBLISHED',
  lessons: [
    {
      slug: 'ziel-und-kontext',
      title: 'Ziel und Kontext',
      learningObjectives: [
        'Du kannst einen vagen Prompt an fehlendem Ziel oder Kontext erkennen.',
        'Du kannst einen Prompt um ein konkretes Ziel und nötigen Kontext ergänzen.',
      ],
      everydayProblem:
        '"Schreib mir was über unser Produkt" liefert fast immer ein enttäuschendes Ergebnis — nicht, weil das Modell schwach ist, sondern weil die Aufgabe selbst unterbestimmt ist.',
      mentalModel:
        'Ein Prompt ohne Ziel und Kontext ist wie eine Wegbeschreibung ohne Zielort: "Fahr einfach los" — jede Richtung ist technisch korrekt und trotzdem meistens falsch.',
      workedExample: {
        summary: 'Derselbe Auftrag, einmal vage und einmal konkret.',
        annotations: [
          { step: 1, text: 'Vage: "Schreib was über unser Produkt."' },
          { step: 2, text: 'Ziel ergänzt: "...für eine Ankündigung an bestehende Kundschaft."' },
          {
            step: 3,
            text: 'Kontext ergänzt: "Das Produkt ist eine Terminplanungs-App für kleine Praxen, Hauptvorteil: weniger Telefonanrufe."',
          },
        ],
        outcome: 'Erst mit Ziel und Kontext kann das Modell den Ergebnisraum sinnvoll eingrenzen.',
      },
      reflectionPrompts: [
        'Woran erkennst du im Rückblick, dass eine deiner eigenen Anfragen zu vage war?',
        'Welches Ziel hättest du bei deiner letzten KI-Anfrage genauer benennen können?',
      ],
      commonMistakes: [
        {
          mistake: 'Bei einem enttäuschenden Ergebnis sofort das Modell wechseln.',
          why: 'Oft liegt es nicht am Modell, sondern am fehlenden Ziel oder Kontext im Prompt.',
          fix: 'Erst prüfen: Steht das Ziel klar da? Fehlt Hintergrundwissen, das das Modell nicht haben kann?',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['prompt-ziel-und-kontext'],
      supportingConceptSlugs: [],
      prerequisiteConceptSlugs: ['nachrichtenrollen'],
      exercises: [
        {
          slug: 'ziel-kontext-single-choice',
          type: 'SINGLE_CHOICE',
          title: 'Was fehlt hier?',
          prompt:
            'Prompt: "Verbessere diesen Text." — Was fehlt für ein verlässliches Ergebnis am ehesten?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'a',
                text: 'Nichts — der Prompt ist bereits klar genug.',
                feedback:
                  'Ohne zu wissen, WOFÜR verbessert werden soll (kürzer? förmlicher? fehlerfrei?), bleibt viel Interpretationsspielraum.',
              },
              {
                id: 'b',
                text: 'Ziel und Kontext: wofür der Text gebraucht wird und was "besser" hier bedeuten soll.',
                feedback: 'Richtig.',
              },
              {
                id: 'c',
                text: 'Ein längerer, formellerer Satzbau.',
                feedback: 'Länge allein macht einen Prompt nicht präziser.',
              },
            ],
            correctOptionId: 'b',
          },
          hints: [
            { level: 1, kind: 'impulse', text: 'Was bedeutet "besser" in diesem Fall konkret?' },
          ],
          difficulty: 1,
          scaffoldLevel: 4,
          conceptSlugs: ['prompt-ziel-und-kontext'],
        },
      ],
    },
    {
      slug: 'constraints-und-beispiele',
      title: 'Constraints und Beispiele',
      learningObjectives: [
        'Du kannst erklären, wie Einschränkungen den Ergebnisraum eines Prompts eingrenzen.',
        'Du kannst ein Beispiel gezielt einsetzen, um ein gewünschtes Format zu zeigen.',
      ],
      everydayProblem:
        'Eine Antwort ist inhaltlich richtig, aber viel zu lang, im falschen Tonfall oder im falschen Format — und muss von Hand nachbearbeitet werden.',
      mentalModel:
        'Constraints sind die Leitplanken einer Straße: Sie verhindern nicht die Fahrt, sie verhindern das Abkommen von der Strecke. Ein Beispiel ist ein Wegweiser mit Foto — "so soll das Ziel ungefähr aussehen".',
      workedExample: {
        summary: 'Ein Prompt mit Ziel, Kontext und zusätzlichen Constraints.',
        annotations: [
          {
            step: 1,
            text: 'Ziel + Kontext: Ankündigungstext für Terminplanungs-App, Zielgruppe Praxen.',
          },
          { step: 2, text: 'Constraint: "Maximal 80 Wörter, keine Ausrufezeichen, Sie-Form."' },
          {
            step: 3,
            text: 'Beispiel: ein kurzer Beispielsatz im gewünschten Ton wird mitgegeben.',
          },
        ],
        outcome:
          'Constraints und ein Beispiel schränken den Ergebnisraum spürbar ein — weniger Nacharbeit.',
      },
      reflectionPrompts: [
        'Welche Einschränkung (Länge, Tonfall, Format) fehlt dir am häufigsten in eigenen Prompts?',
        'Wann hast du zuletzt ein Beispiel genutzt, um ein gewünschtes Format zu zeigen?',
      ],
      commonMistakes: [
        {
          mistake: 'Viele Constraints auf einmal ohne Priorität nennen.',
          why: 'Widersprüchliche oder zu viele gleichzeitige Einschränkungen verwirren das Ergebnis eher, als es zu schärfen.',
          fix: 'Die zwei bis drei wichtigsten Einschränkungen zuerst nennen, den Rest bei Bedarf nachschärfen.',
        },
      ],
      estimatedMinutes: 8,
      primaryConceptSlugs: ['prompt-constraints-und-beispiele'],
      supportingConceptSlugs: ['prompt-ziel-und-kontext'],
      prerequisiteConceptSlugs: ['prompt-ziel-und-kontext'],
      exercises: [
        {
          slug: 'constraints-multiple-choice',
          type: 'MULTIPLE_CHOICE',
          title: 'Echte Constraints erkennen',
          prompt: 'Welche der folgenden Zusätze sind echte Constraints? Mehrfachauswahl.',
          payload: {
            kind: 'multipleChoice',
            options: [
              {
                id: 'a',
                text: '"Maximal 80 Wörter."',
                feedback: 'Richtig — eine klare, prüfbare Grenze.',
              },
              {
                id: 'b',
                text: '"Mach es gut."',
                feedback: 'Zu unbestimmt, um den Ergebnisraum tatsächlich einzugrenzen.',
              },
              {
                id: 'c',
                text: '"Keine Ausrufezeichen verwenden."',
                feedback: 'Richtig — eine konkrete, prüfbare Regel.',
              },
              {
                id: 'd',
                text: '"Im Stil dieses Beispiels: [Beispieltext]"',
                feedback: 'Richtig — ein Beispiel ist eine Form von Constraint durch Vorbild.',
              },
            ],
            correctOptionIds: ['a', 'c', 'd'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Eine echte Einschränkung lässt sich hinterher prüfen — wurde sie eingehalten oder nicht?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['prompt-constraints-und-beispiele'],
        },
      ],
    },
    {
      slug: 'zerlegung-und-iteration',
      title: 'Zerlegung und Iteration',
      learningObjectives: [
        'Du kannst eine große, vage Aufgabe in prüfbare Teilschritte zerlegen.',
        'Du kannst ein unbefriedigendes Ergebnis gezielt nachbessern statt komplett neu zu formulieren.',
      ],
      everydayProblem:
        '"Erstelle mir ein komplettes Konzept für unsere Markteinführung" ist zu groß für eine einzelne Anfrage — das Ergebnis wird oberflächlich, egal wie gut das Modell ist.',
      mentalModel:
        'Ein großer Auftrag ist wie ein ganzes Haus auf einmal bauen zu wollen. Zerlegung heißt: erst das Fundament, dann die Wände, dann das Dach — jeder Schritt einzeln prüfbar.',
      workedExample: {
        summary: 'Eine große Aufgabe wird in Teilschritte zerlegt und iterativ verbessert.',
        annotations: [
          {
            step: 1,
            text: 'Groß: "Markteinführungskonzept" — zu vage für einen einzelnen Prompt.',
          },
          {
            step: 2,
            text: 'Zerlegt: erst Zielgruppenbeschreibung, dann Kernbotschaft, dann Kanalplan.',
          },
          {
            step: 3,
            text: 'Iteration: "Die Kernbotschaft ist zu technisch — bitte einfacher, für Laien."',
          },
        ],
        outcome:
          'Kleinere, geprüfte Teilergebnisse summieren sich zu einem tragfähigen Gesamtergebnis.',
      },
      reflectionPrompts: [
        'Bei welcher eigenen Aufgabe hättest du rückblickend besser in kleinere Schritte zerlegen sollen?',
        'Wie sieht für dich der Unterschied zwischen "neu formulieren" und "gezielt nachbessern" aus?',
      ],
      commonMistakes: [
        {
          mistake: 'Bei einem enttäuschenden Ergebnis den gesamten Prompt neu schreiben.',
          why: 'Oft ist nur ein Teil des Ergebnisses das Problem — Neuschreiben verliert die brauchbaren Teile mit.',
          fix: 'Gezielt nachbessern: "Der erste Absatz passt, der zweite ist zu lang — kürze nur den zweiten."',
        },
      ],
      estimatedMinutes: 9,
      primaryConceptSlugs: ['prompt-iteration'],
      supportingConceptSlugs: ['prompt-constraints-und-beispiele'],
      prerequisiteConceptSlugs: ['prompt-constraints-und-beispiele'],
      exercises: [
        {
          slug: 'zerlegung-prompt-repair',
          type: 'PROMPT_REPAIR',
          title: 'Einen zu großen Prompt reparieren',
          prompt: 'Verbessere den folgenden Prompt.',
          payload: {
            kind: 'promptRepair',
            flawedPrompt: 'Erstelle mir ein komplettes Marketingkonzept für unser neues Produkt.',
            flaws: [
              'Kein konkretes Ziel für einen einzelnen Arbeitsschritt.',
              'Keine Zerlegung — "komplettes Konzept" ist mehrere Aufgaben auf einmal.',
              'Kein Kontext zum Produkt oder zur Zielgruppe.',
            ],
            options: [
              {
                id: 'a',
                text: 'Erstelle mir ein noch ausführlicheres, komplettes Marketingkonzept mit allen Details.',
                quality: 'problematic',
                feedback: 'Das vergrößert das Problem, statt es zu zerlegen.',
              },
              {
                id: 'b',
                text: 'Beschreibe zunächst nur die Zielgruppe für unsere neue Terminplanungs-App für kleine Praxen — wer sie nutzt und welches Problem sie löst. Weitere Schritte folgen danach einzeln.',
                quality: 'optimal',
                feedback:
                  'Richtig — ein einzelner, konkreter erster Teilschritt mit Kontext, statt die ganze Aufgabe auf einmal.',
              },
              {
                id: 'c',
                text: 'Erstelle mir ein Marketingkonzept, aber mach es kurz.',
                quality: 'acceptable',
                feedback:
                  'Kürze allein löst das eigentliche Problem nicht — die Aufgabe bleibt mehrdeutig und unzerlegt.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welcher einzelne, kleine Teilschritt käme zuerst?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Zerlegung heißt: ein prüfbarer Schritt nach dem anderen, nicht alles auf einmal.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['prompt-iteration'],
        },
      ],
    },
  ],
};
