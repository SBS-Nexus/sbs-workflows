import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Stufe 10 (LP-10B): RAG – Wissen mit Quellen nutzen.
 *
 * Baut auf Stufe 9 (Embeddings & semantische Suche) auf und wiederholt
 * Kosinusähnlichkeit, Ranking und Top-k nicht. Neu sind Aufbereitung,
 * Kontextbudget, Belege und die Fehlerbilder der ganzen Pipeline.
 *
 * Alle Beispielwerte stammen aus dem RAG-Pipeline-Lab und sind didaktisch:
 * Satzvektoren redaktionell festgelegt, Budget in Wort-Einheiten statt
 * Tokens, Antworten aus vorgegebenen Aussagen statt aus einem Modell
 * (siehe docs/QUELLEN.md). Keine Anbieter, Modellnamen oder Preise.
 */
export const ragModule: ModuleDraft = {
  slug: 'rag-wissen-mit-quellen',
  title: 'RAG – Wissen mit Quellen nutzen',
  summary:
    'Dokumente in Chunks teilen, Belege finden, ein Kontextbudget füllen, Antworten nur aus Belegen bilden und die typischen Fehler einer RAG-Pipeline erkennen.',
  rationale:
    'Ein Sprachmodell kennt die eigenen Dokumente eines Unternehmens nicht. RAG holt passende Abschnitte in den Kontext — und eine Antwort ist nur so gut wie diese Belege. Wer versteht, wo Belege verloren gehen und wann „nicht genügend Informationen“ die richtige Antwort ist, kann RAG-Ergebnisse beurteilen statt ihnen blind zu vertrauen.',
  prerequisiteModuleSlugs: ['embeddings-semantische-suche'],
  status: 'PUBLISHED',
  lessons: [
    // -----------------------------------------------------------------------
    // Lektion 1 — Von Dokumenten zu Chunks
    // -----------------------------------------------------------------------
    {
      slug: 'von-dokumenten-zu-chunks',
      title: 'Von Dokumenten zu Chunks',
      learningObjectives: [
        'Du kannst erklären, wie Chunk-Größe und Overlap bestimmen, welche Sätze gemeinsam in einem Chunk landen.',
        'Du kannst die Zahl der Chunks für eine einfache Strategie selbst berechnen.',
        'Du erkennst, welche Metadaten ein Chunk braucht, damit eine Antwort belegbar bleibt.',
      ],
      everydayProblem:
        'Das Reisehandbuch sagt: „Bahnfahrten werden in der 2. Klasse erstattet. Ab vier Stunden Fahrzeit gilt diese Einschränkung nicht.“ Teilt man den Text Satz für Satz, steht im zweiten Abschnitt nur noch „gilt diese Einschränkung nicht“ — welche Einschränkung? Wer so zerschneidet, verliert genau die Ausnahme, nach der jemand fragt.',
      mentalModel:
        'Chunking ist wie das Zerschneiden eines Handbuchs in Karteikarten. Jede Karte muss allein verständlich sein und sagen, aus welchem Handbuch, welcher Fassung und von welcher Stelle sie stammt. Kleine Karten sind präzise, verlieren aber Zusammenhang. Größere Karten mit Overlap — jede Karte wiederholt den letzten Satz der vorigen — halten Regel und Ausnahme zusammen, kosten aber mehr Platz.',
      workedExample: {
        summary:
          'Das Dokument FIN-REISE (Version 3) mit vier Sätzen, einmal mit kleinen Chunks, einmal mit größeren Chunks und Overlap.',
        annotations: [
          {
            step: 1,
            text: 'Kleine Chunks (1 Satz, kein Overlap): vier Chunks. Satz 2 („2. Klasse“) und Satz 3 („gilt diese Einschränkung nicht“) landen in verschiedenen Chunks.',
          },
          {
            step: 2,
            text: 'Größere Chunks (2 Sätze, Overlap 1): Schrittweite 2 − 1 = 1. Chunks aus den Sätzen 1–2, 2–3 und 3–4 — drei Chunks.',
          },
          {
            step: 3,
            text: 'Der Chunk aus den Sätzen 2–3 enthält Regel und Ausnahme zusammen. Nur er belegt: „Ab vier Stunden Fahrzeit ist die 1. Klasse erlaubt.“',
          },
          {
            step: 4,
            text: 'Jeder Chunk trägt Quellenkennung, Version und Satzbereich mit, etwa „FIN-REISE · Version 3 · Sätze 2–3“.',
          },
        ],
        outcome:
          'Kleine Chunks: 4, Ausnahme zerschnitten. Größere Chunks mit Overlap: 3, Ausnahme erhalten — bei mehr Umfang je Chunk.',
      },
      reflectionPrompts: [
        'Welche Dokumente aus deinem Alltag enthalten Regeln, deren Ausnahme erst im nächsten Absatz steht?',
        'Warum hilft eine mitgegebene Überschrift einem Chunk, der allein unverständlich wäre?',
        'Woran würdest du merken, dass deine Chunks zu groß sind?',
      ],
      commonMistakes: [
        {
          mistake: 'Dokumente stur nach fester Zeichenzahl teilen.',
          why: 'Die Grenze fällt dann mitten in Sätze oder zwischen Regel und Ausnahme — der Chunk ist allein nicht mehr verständlich.',
          fix: 'An Satz- und Abschnittsgrenzen teilen und prüfen, ob zusammengehörige Aussagen zusammenbleiben.',
        },
        {
          mistake: 'Chunks ohne Quellenkennung und Version speichern.',
          why: 'Dann lässt sich weder ein Beleg nachprüfen noch die veraltete von der aktuellen Fassung unterscheiden.',
          fix: 'Zu jedem Chunk Quelle, Version, Gültigkeit und Position mitspeichern.',
        },
        {
          mistake: 'Overlap für eine Garantie halten, dass nichts verloren geht.',
          why: 'Overlap wiederholt nur einen Teil. Hängt eine Aussage an drei Sätzen, kann sie trotzdem zerschnitten werden.',
          fix: 'Kritische Stellen gezielt prüfen, statt sich auf eine Einstellung zu verlassen.',
        },
      ],
      estimatedMinutes: 12,
      primaryConceptSlugs: ['chunk-overlap-und-trennstellen', 'chunk-metadaten'],
      supportingConceptSlugs: ['chunking'],
      prerequisiteConceptSlugs: ['chunking'],
      exercises: [
        {
          slug: 'rag-overlap-zweck',
          type: 'SINGLE_CHOICE',
          title: 'Wozu dient Overlap?',
          prompt: 'Was bewirkt ein Overlap von einem Satz zwischen aufeinanderfolgenden Chunks?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'zusammenhang',
                text: 'Eine Aussage, die über eine Grenze reicht, steht zumindest in einem Chunk vollständig.',
                feedback:
                  'Richtig. Der wiederholte Satz verbindet zwei Nachbarn. Das kostet Platz und garantiert nicht alles, rettet aber viele Zwei-Satz-Aussagen.',
              },
              {
                id: 'weniger',
                text: 'Es entstehen weniger Chunks, weil Sätze geteilt werden.',
                feedback:
                  'Umgekehrt: Overlap verkleinert die Schrittweite, es entstehen eher mehr Chunks.',
              },
              {
                id: 'genauer',
                text: 'Die Kosinusähnlichkeit wird genauer berechnet.',
                feedback:
                  'Die Rechnung bleibt dieselbe. Overlap ändert nur, welche Sätze gemeinsam in einem Chunk stehen.',
              },
            ],
            correctOptionId: 'zusammenhang',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Denk an den Satz „Ab vier Stunden Fahrzeit gilt diese Einschränkung nicht.“ — was braucht er, um verständlich zu sein?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Overlap heißt: Der nächste Chunk beginnt nicht hinter dem vorigen, sondern wiederholt dessen letzten Satz.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Frag dich, welcher Chunk danach Regel und Ausnahme zusammen enthält.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 2,
          conceptSlugs: ['chunk-overlap-und-trennstellen'],
        },
        {
          slug: 'rag-chunks-zaehlen',
          type: 'FILL_IN',
          title: 'Chunks zählen',
          prompt:
            'Ein Dokument hat 5 Sätze. Es wird in Chunks zu je 2 Sätzen geteilt. Der letzte Chunk endet am letzten Satz; ein Chunk, der nichts Neues abdeckt, entsteht nicht.',
          payload: {
            kind: 'fillIn',
            template:
              'Mit Overlap 1 beträgt die Schrittweite {{blank:schritt}} Satz, und es entstehen {{blank:mit}} Chunks. Ohne Overlap entstehen {{blank:ohne}} Chunks.',
            blanks: [
              {
                id: 'schritt',
                accepted: ['1', 'einen', 'ein'],
                description: 'Schrittweite mit Overlap 1',
                wrongHint: 'Schrittweite = Sätze je Chunk − Overlap = 2 − 1.',
              },
              {
                id: 'mit',
                accepted: ['4', 'vier'],
                description: 'Anzahl der Chunks mit Overlap',
                wrongHint:
                  'Chunks beginnen bei Satz 1, 2, 3 und 4; der Chunk ab Satz 4 umfasst die Sätze 4–5 und endet am letzten Satz.',
              },
              {
                id: 'ohne',
                accepted: ['3', 'drei'],
                description: 'Anzahl der Chunks ohne Overlap',
                wrongHint: 'Ohne Overlap: Sätze 1–2, 3–4 und Satz 5 allein.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Schreib die Satznummern 1 bis 5 auf und markiere jedes Fenster.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Schrittweite = Sätze je Chunk − Overlap. Jedes Fenster beginnt eine Schrittweite nach dem vorigen.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Mit Overlap: Fenster ab Satz 1, 2, 3, … — hör auf, sobald ein Fenster den letzten Satz erreicht.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die Schrittweite ist 1. Das Fenster ab Satz 4 umfasst 4–5 und ist das letzte.',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Mit Overlap: 1–2, 2–3, 3–4, 4–5 = 4 Chunks. Ohne Overlap: 1–2, 3–4, 5 = 3 Chunks.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['chunk-overlap-und-trennstellen'],
        },
        {
          slug: 'rag-metadaten-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Welche Metadaten braucht ein Chunk?',
          prompt:
            'Ordne ein: Welche Angaben gehören an jeden Chunk, damit eine Antwort belegbar bleibt?',
          payload: {
            kind: 'classification',
            instruction: 'Wähle für jede Angabe eine Kategorie.',
            categories: [
              {
                id: 'noetig',
                label: 'Gehört an jeden Chunk',
                description: 'nötig, um einen Beleg nachzuprüfen',
              },
              {
                id: 'unnoetig',
                label: 'Für Belege nicht nötig',
                description: 'hilft beim Belegen nicht',
              },
            ],
            items: [
              {
                id: 'quelle',
                text: 'Quellenkennung des Dokuments, z. B. HR-URLAUB',
                correctCategoryId: 'noetig',
                feedback: 'Ohne Quellenkennung lässt sich ein Verweis nicht auflösen.',
              },
              {
                id: 'version',
                text: 'Version und Gültigkeitsbeginn',
                correctCategoryId: 'noetig',
                feedback: 'Nur damit lässt sich eine veraltete Fassung erkennen und aussortieren.',
              },
              {
                id: 'position',
                text: 'Position im Dokument, z. B. Sätze 2–3',
                correctCategoryId: 'noetig',
                feedback: 'Damit lässt sich die Stelle im Original nachlesen.',
              },
              {
                id: 'schrift',
                text: 'Schriftart des Originaldokuments',
                correctCategoryId: 'unnoetig',
                feedback: 'Die Gestaltung sagt nichts darüber, ob eine Aussage belegt ist.',
              },
              {
                id: 'aufrufe',
                text: 'Wie oft das Dokument bisher geöffnet wurde',
                correctCategoryId: 'unnoetig',
                feedback:
                  'Beliebtheit ist kein Beleg — ein oft gelesenes Dokument kann veraltet sein.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Stell dir vor, jemand fragt: „Woher stammt diese Aussage?“ Was musst du dann nennen können?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Beleg braucht Herkunft, Fassung und Fundstelle.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Drei Angaben sind nötig, zwei nicht.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['chunk-metadaten'],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Lektion 2 — Retrieval für RAG
    // -----------------------------------------------------------------------
    {
      slug: 'retrieval-fuer-rag',
      title: 'Retrieval für RAG',
      learningObjectives: [
        'Du kannst die Schritte einer RAG-Pipeline von den Dokumenten bis zur belegten Antwort ordnen.',
        'Du kannst an einer Rangliste ablesen, ob ein benötigter Beleg bei gegebenem Top-k im Kontext landet.',
        'Du erkennst, warum ein Treffer ohne Quellenangabe kein Beleg ist.',
      ],
      everydayProblem:
        'Jemand fragt: „Ab welchem Tag brauche ich eine Krankmeldung vom Arzt?“ Die Suche liefert zuerst den Satz über die Meldung bei der Teamleitung, dann den über das Hochladen der Bescheinigung. Der Satz mit der Antwort steht erst auf Platz 3. Ist k zu klein, beantwortet die Antwort eine andere Frage.',
      mentalModel:
        'Retrieval für RAG ist eine Vorauswahl, keine Antwort. Die Anfrage wird mit denselben Mitteln eingebettet wie die Chunks, die Chunks werden nach Ähnlichkeit sortiert, und nur die ersten k gelangen weiter. Das Ranking misst Nähe — ob ein Chunk die Frage beantwortet, zeigt erst der Blick auf seinen Inhalt und seine Quelle.',
      workedExample: {
        summary:
          'Anfrage „Ab welchem Tag brauche ich eine Krankmeldung vom Arzt?“ mit kleinen Chunks, didaktische Beispielwerte aus dem RAG-Pipeline-Lab.',
        annotations: [
          {
            step: 1,
            text: 'Platz 1 (0,989): HR-KRANK, Satz 1 — Meldung am ersten Tag bei der Teamleitung.',
          },
          {
            step: 2,
            text: 'Platz 2 (0,955): HR-KRANK, Satz 3 — Bescheinigung im Personalportal hochladen.',
          },
          {
            step: 3,
            text: 'Platz 3 (0,937): HR-KRANK, Satz 2 — Bescheinigung ab dem vierten Krankheitstag. Das ist der Beleg.',
          },
          {
            step: 4,
            text: 'Mit k = 2 fehlt der Beleg; erst mit k = 3 ist er im Kontext.',
          },
        ],
        outcome:
          'Der Beleg hängt an k: bei k = 2 nicht im Kontext, bei k = 3 schon. Alle drei Treffer stammen aus derselben, aktuellen Quelle HR-KRANK.',
      },
      reflectionPrompts: [
        'Warum landet der Satz über das Hochladen vor dem Satz mit der eigentlichen Antwort?',
        'Was würde passieren, wenn alle Chunks ohne Quellenangabe gespeichert wären?',
        'Wie würdest du k für eine eigene Dokumentsammlung festlegen?',
      ],
      commonMistakes: [
        {
          mistake: 'Den Treffer auf Platz 1 für die Antwort halten.',
          why: 'Platz 1 ist der ähnlichste Chunk, nicht zwingend der passende. Oft steht der eigentliche Beleg weiter hinten.',
          fix: 'Die Top-k-Chunks am Inhalt prüfen und k an echten Fragen testen.',
        },
        {
          mistake: 'Treffer ohne Quelle oder Version verwenden.',
          why: 'Ein Treffer, dessen Herkunft unbekannt ist, lässt sich nicht nachprüfen und nicht gegen eine neuere Fassung abwägen.',
          fix: 'Nur Chunks mit vollständigen Metadaten als Beleg zulassen.',
        },
        {
          mistake: 'Retrieval und Antwort als einen einzigen Schritt betrachten.',
          why: 'Dann bleibt unklar, ob ein Fehler aus der Suche oder aus der Antwort stammt.',
          fix: 'Erst prüfen, welche Belege im Kontext liegen, dann, was die Antwort daraus macht.',
        },
      ],
      estimatedMinutes: 12,
      primaryConceptSlugs: ['rag-pipeline', 'quellenidentifikation'],
      supportingConceptSlugs: ['top-k-retrieval', 'semantische-suche'],
      prerequisiteConceptSlugs: ['top-k-retrieval', 'chunk-metadaten'],
      exercises: [
        {
          slug: 'rag-pipeline-ordering',
          type: 'ORDERING',
          title: 'Die Schritte einer RAG-Pipeline',
          prompt: 'Bring die Schritte einer RAG-Pipeline in die richtige Reihenfolge.',
          payload: {
            kind: 'ordering',
            instruction: 'Von der Dokumentsammlung bis zur belegten Antwort.',
            items: [
              {
                id: 'chunken',
                text: 'Dokumente in Chunks teilen und Quelle, Version und Position mitspeichern.',
              },
              { id: 'einbetten', text: 'Jeden Chunk einbetten und mit seinem Vektor ablegen.' },
              {
                id: 'ranken',
                text: 'Die Anfrage einbetten und die Chunks nach Ähnlichkeit ranken.',
              },
              {
                id: 'auswahl',
                text: 'Top-k nehmen und so viele Chunks übernehmen, wie ins Kontextbudget passen.',
              },
              {
                id: 'antwort',
                text: 'Nur belegte Aussagen mit Verweis auf ihren Chunk ausgeben.',
              },
            ],
            correctOrder: ['chunken', 'einbetten', 'ranken', 'auswahl', 'antwort'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was muss schon erledigt sein, bevor überhaupt eine Frage gestellt wird?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ranken braucht Vektoren; Vektoren brauchen Chunks.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Aufbereiten, einbetten, ranken, auswählen, antworten.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 2,
          conceptSlugs: ['rag-pipeline'],
        },
        {
          slug: 'rag-kleinstes-k',
          type: 'SINGLE_CHOICE',
          title: 'Wann ist der Beleg im Kontext?',
          prompt: 'Welches ist das kleinste k, bei dem der benötigte Beleg im Kontext liegt?',
          payload: {
            kind: 'singleChoice',
            context:
              'Rangliste für „Ab welchem Tag brauche ich eine Krankmeldung vom Arzt?“ (kleine Chunks, didaktische Beispielwerte): 1. HR-KRANK Satz 1 — Meldung bei der Teamleitung (0,989) · 2. HR-KRANK Satz 3 — Bescheinigung hochladen (0,955) · 3. HR-KRANK Satz 2 — Bescheinigung ab dem vierten Krankheitstag (0,937). Das Budget reicht für alle drei.',
            options: [
              {
                id: 'k1',
                text: 'k = 1',
                feedback: 'Bei k = 1 liegt nur die Meldung bei der Teamleitung im Kontext.',
              },
              {
                id: 'k2',
                text: 'k = 2',
                feedback:
                  'Bei k = 2 kommt das Hochladen dazu — die Frage, ab wann, bleibt unbeantwortet.',
              },
              {
                id: 'k3',
                text: 'k = 3',
                feedback: 'Richtig. Der Beleg steht auf Platz 3 und ist erst ab k = 3 dabei.',
              },
            ],
            correctOptionId: 'k3',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welcher der drei Sätze beantwortet die Frage wirklich?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Chunk auf Platz p ist genau dann im Kontext, wenn k mindestens p ist — und das Budget reicht.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Der Beleg ist Satz 2 von HR-KRANK. Auf welchem Platz steht er?',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['rag-pipeline', 'top-k-retrieval'],
        },
        {
          slug: 'rag-treffer-ohne-quelle',
          type: 'SCENARIO_DECISION',
          title: 'Ein Treffer ohne Herkunft',
          prompt:
            'Ein Treffer passt gut, aber seine Herkunft ist unbekannt. Wie gehst du damit um?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Auf Platz 1 steht ein Chunk mit hoher Ähnlichkeit: „Urlaub muss drei Wochen vorher beantragt werden.“ Bei diesem Chunk fehlen Quellenkennung, Version und Position — er wurde vor Jahren aus einer unbekannten Datei übernommen.',
            options: [
              {
                id: 'verwenden',
                text: 'Verwenden — der Score ist hoch und der Satz klingt eindeutig.',
                quality: 'problematic',
                feedback:
                  'Ein hoher Score sagt nichts über Herkunft und Gültigkeit. Die Frist kann längst ersetzt sein.',
              },
              {
                id: 'nicht-als-beleg',
                text: 'Nicht als Beleg verwenden und die fehlenden Metadaten im Bestand nachtragen oder den Chunk entfernen.',
                quality: 'optimal',
                feedback:
                  'Richtig. Ohne Herkunft ist ein Treffer nicht nachprüfbar. Die Ursache liegt in der Aufbereitung und wird dort behoben.',
              },
              {
                id: 'mit-hinweis',
                text: 'Verwenden, aber mit dem Hinweis „Quelle unbekannt“.',
                quality: 'acceptable',
                feedback:
                  'Ehrlicher als ohne Hinweis, aber die Antwort nennt trotzdem eine Frist, die niemand prüfen kann.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Wie würdest du nachprüfen, ob die drei Wochen stimmen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Beleg braucht Herkunft, Fassung und Fundstelle.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Eine Option behebt die Ursache, eine mildert sie, eine ignoriert sie.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['quellenidentifikation', 'chunk-metadaten'],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Lektion 3 — Kontext und belegte Antworten
    // -----------------------------------------------------------------------
    {
      slug: 'kontext-und-belegte-antworten',
      title: 'Kontext und belegte Antworten',
      learningObjectives: [
        'Du kannst berechnen, welche Chunks ein begrenztes Kontextbudget aufnimmt und welche herausfallen.',
        'Du kannst Aussagen danach einordnen, ob ein Chunk im Kontext sie belegt.',
        'Du weißt, warum „nicht genügend Informationen“ ein korrektes Ergebnis sein kann.',
      ],
      everydayProblem:
        'Eine RAG-Antwort klingt vollständig und sicher. Später zeigt sich: Der entscheidende Abschnitt war gefunden worden, passte aber nicht mehr in den Kontext — und eine Aussage stammte aus keinem der Abschnitte. Niemand konnte das sehen, weil die Antwort keine Verweise hatte.',
      mentalModel:
        'Der Kontext ist ein Koffer mit fester Größe. Die Chunks werden in der Reihenfolge ihres Rangs eingepackt; was nicht mehr hineinpasst, bleibt draußen, und ein kleinerer Chunk dahinter darf noch nachrücken. Die Antwort darf nur aus dem Koffer schöpfen: Jede Aussage zeigt auf den Chunk, der sie trägt. Was in keinem Chunk steht, wird nicht als Tatsache gesagt.',
      workedExample: {
        summary:
          'Urlaubsfrage mit größeren Chunks und Overlap, k = 3, Kontextbudget 40 Einheiten (didaktische Wort-Einheiten aus dem Lab).',
        annotations: [
          {
            step: 1,
            text: 'Platz 1: HR-URLAUB Version 2, Sätze 2–3, 20 Einheiten → übernommen, belegt 20.',
          },
          {
            step: 2,
            text: 'Platz 2: HR-URLAUB Version 1, Sätze 1–2, 18 Einheiten → übernommen, belegt 38.',
          },
          {
            step: 3,
            text: 'Platz 3: HR-URLAUB Version 2, Sätze 1–2, 15 Einheiten → 38 + 15 = 53 > 40, nicht übernommen.',
          },
          {
            step: 4,
            text: 'Die Frist „zwei Wochen“ ist durch den Chunk auf Platz 1 belegt; „vier Wochen“ stammt aus der ersetzten Version 1 und wird zurückgehalten.',
          },
        ],
        outcome:
          'Im Kontext: zwei Chunks, 38 von 40 Einheiten. Belegte Antwort: zwei Wochen, mit Verweis auf HR-URLAUB Version 2, Sätze 2–3.',
      },
      reflectionPrompts: [
        'Warum ist ein Verweis auf den konkreten Chunk mehr wert als ein Verweis auf „das Personalhandbuch“?',
        'Wann wäre es besser, weniger, aber größere Chunks in den Kontext zu nehmen?',
        'Wie sollte eine Anwendung „nicht genügend Informationen“ formulieren, damit sie hilfreich bleibt?',
      ],
      commonMistakes: [
        {
          mistake: 'Annehmen, alles Gefundene stehe der Antwort zur Verfügung.',
          why: 'Das Kontextbudget ist begrenzt. Ein gefundener, aber nicht übernommener Chunk zählt für die Antwort nicht.',
          fix: 'Zwischen „gefunden“ und „im Kontext“ unterscheiden und sichtbar machen, was herausgefallen ist.',
        },
        {
          mistake: 'Eine Antwort ohne Verweise als belegt ansehen, weil sie plausibel klingt.',
          why: 'Plausibilität ist kein Beleg. Erst ein Verweis auf einen Chunk im Kontext macht eine Aussage nachprüfbar.',
          fix: 'Jede Tatsachenaussage mit ihrem Chunk verknüpfen; unbelegte Aussagen kennzeichnen oder weglassen.',
        },
        {
          mistake:
            '„Nicht genügend Informationen“ als Fehler des Systems werten und durch eine Vermutung ersetzen.',
          why: 'Fehlt der Beleg, ist eine Vermutung schlechter als ein ehrliches „weiß ich nicht“.',
          fix: '„Nicht genügend Informationen“ ausgeben und sagen, wo man weiterfragen kann.',
        },
      ],
      estimatedMinutes: 14,
      primaryConceptSlugs: ['kontextbudget', 'belegte-antwort'],
      supportingConceptSlugs: ['quellenidentifikation', 'context-window'],
      prerequisiteConceptSlugs: ['quellenidentifikation', 'context-window'],
      exercises: [
        {
          slug: 'rag-budget-rechnen',
          type: 'FILL_IN',
          title: 'Das Kontextbudget füllen',
          prompt:
            'Das Budget beträgt 40 Einheiten. Die Top-3-Chunks haben in Rangfolge 20, 18 und 15 Einheiten. Chunks werden in Rangfolge übernommen, solange sie passen.',
          payload: {
            kind: 'fillIn',
            template:
              'Platz 1 und 2 belegen zusammen {{blank:belegt}} Einheiten. Mit Platz 3 wären es {{blank:mit3}} Einheiten — zu viel. Frei bleiben {{blank:frei}} Einheiten.',
            blanks: [
              {
                id: 'belegt',
                accepted: ['38'],
                description: 'Einheiten von Platz 1 und 2',
                wrongHint: '20 + 18.',
              },
              {
                id: 'mit3',
                accepted: ['53'],
                description: 'Einheiten mit Platz 3',
                wrongHint: 'Zähle die 15 Einheiten von Platz 3 dazu.',
              },
              {
                id: 'frei',
                accepted: ['2'],
                description: 'freie Einheiten',
                wrongHint: 'Budget minus belegte Einheiten: 40 − 38.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Pack in Rangfolge ein und prüf vor jedem Chunk, ob er noch passt.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Chunk passt, wenn bisher belegt + seine Einheiten ≤ Budget.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Rechne 20 + 18, dann 20 + 18 + 15, dann 40 − das, was übernommen wurde.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Platz 1 und 2 belegen 38 Einheiten. Passt Platz 3 noch?',
            },
            {
              level: 5,
              kind: 'explanation',
              text: '20 + 18 = 38 passt; 38 + 15 = 53 > 40, Platz 3 fällt heraus; frei bleiben 40 − 38 = 2.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 4,
          conceptSlugs: ['kontextbudget'],
        },
        {
          slug: 'rag-belegt-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Belegt, veraltet oder unbelegt?',
          prompt:
            'Im Kontext liegen drei Chunks: HR-URLAUB Version 2 „Der Antrag muss mindestens zwei Wochen vor Urlaubsbeginn gestellt werden.“ · HR-URLAUB Version 1 (ersetzt durch Version 2) „Der Antrag muss mindestens vier Wochen vor Urlaubsbeginn vorliegen.“ · HR-KRANK „Ab dem vierten Krankheitstag brauchst du eine ärztliche Bescheinigung.“ Ordne jede Aussage ein.',
          payload: {
            kind: 'classification',
            instruction: 'Wähle für jede Aussage eine Kategorie.',
            categories: [
              { id: 'belegt', label: 'Belegt', description: 'aus aktueller Quelle im Kontext' },
              { id: 'veraltet', label: 'Nur veraltet belegt', description: 'Quelle ist ersetzt' },
              { id: 'unbelegt', label: 'Unbelegt', description: 'kein Chunk trägt sie' },
            ],
            items: [
              {
                id: 'zwei-wochen',
                text: 'Urlaub beantragst du mindestens zwei Wochen vorher.',
                correctCategoryId: 'belegt',
                feedback: 'Steht in HR-URLAUB Version 2, der aktuellen Fassung.',
              },
              {
                id: 'vier-wochen',
                text: 'Urlaub muss vier Wochen vorher beantragt werden.',
                correctCategoryId: 'veraltet',
                feedback: 'Steht nur in Version 1, die durch Version 2 ersetzt ist.',
              },
              {
                id: 'bescheinigung',
                text: 'Ab dem vierten Krankheitstag brauchst du eine Bescheinigung.',
                correctCategoryId: 'belegt',
                feedback: 'Steht wörtlich in HR-KRANK.',
              },
              {
                id: 'spontan',
                text: 'Einzelne Urlaubstage kannst du auch am selben Tag nehmen.',
                correctCategoryId: 'unbelegt',
                feedback: 'Davon steht in keinem der drei Chunks etwas.',
              },
              {
                id: 'email',
                text: 'Krankmeldungen schickst du per E-Mail an die Personalabteilung.',
                correctCategoryId: 'unbelegt',
                feedback: 'Klingt üblich, steht aber in keinem Chunk — plausibel ist nicht belegt.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Suche zu jeder Aussage den Chunk, der sie wörtlich oder sinngemäß enthält.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Belegt heißt: aus aktueller Quelle im Kontext. Eine ersetzte Version zählt nicht als Beleg.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zwei Aussagen sind belegt, eine nur veraltet, zwei gar nicht.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 3,
          conceptSlugs: ['belegte-antwort', 'quellenidentifikation'],
        },
        {
          slug: 'rag-nicht-genuegend-transfer',
          type: 'TRANSFER',
          title: 'Wenn die Quellen schweigen',
          prompt:
            'Ein Kundendienst-Assistent soll eine Frage beantworten, zu der es keinen Beleg gibt.',
          transferContext:
            'Kundendienst mit Produkthandbüchern statt Personalhandbuch: Dieselbe Regel, andere Folgen für Kundinnen und Kunden.',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Ein Kunde fragt nach der Garantie für ein Zubehörteil. Im Kontext liegen nur Handbuchabschnitte zu einem anderen Gerät desselben Herstellers; das Zubehörteil kommt in keinem Chunk vor.',
            options: [
              {
                id: 'aehnlich',
                text: 'Die Garantieangabe des anderen Geräts nennen — es ist vom selben Hersteller.',
                quality: 'problematic',
                feedback:
                  'Das überträgt eine Aussage auf etwas, für das sie nicht belegt ist. Für das Zubehörteil kann etwas anderes gelten.',
              },
              {
                id: 'nicht-genuegend',
                text: '„Dazu liegen mir keine Informationen vor“ — mit Verweis auf eine Stelle, die es weiß.',
                quality: 'optimal',
                feedback:
                  'Richtig. Ohne Beleg ist das die korrekte Antwort, und der Verweis macht sie hilfreich.',
              },
              {
                id: 'schaetzen',
                text: 'Eine übliche Garantiedauer schätzen und als ungefähr kennzeichnen.',
                quality: 'problematic',
                feedback:
                  '„Ungefähr“ ändert nichts daran, dass die Zahl aus keiner Quelle stammt. Sie wird trotzdem als Auskunft verstanden.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Welcher Chunk im Kontext belegt eine Aussage über das Zubehörteil?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Eine Aussage gilt nur für das, worüber der Beleg spricht.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zwei Optionen erfinden oder übertragen etwas, eine bleibt bei den Belegen.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['belegte-antwort'],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Lektion 4 — RAG-Fehler erkennen
    // -----------------------------------------------------------------------
    {
      slug: 'rag-fehler-erkennen',
      title: 'RAG-Fehler erkennen',
      learningObjectives: [
        'Du kannst einen RAG-Fehler der Aufbereitung, dem Retrieval oder der Antwort zuordnen.',
        'Du erkennst einen erfundenen Quellenverweis an seinen Merkmalen.',
        'Du kannst Kontext-Precision und Kontext-Recall für ein kleines Beispiel berechnen und von der Antwortqualität unterscheiden.',
      ],
      everydayProblem:
        'Eine Antwort ist falsch. Lag es an den Dokumenten, an der Suche oder an der Antwort selbst? Wer nur die Antwort sieht, dreht an der falschen Stelle — erhöht etwa k, obwohl eine veraltete Richtlinie im Bestand liegt, oder schreibt den Prompt um, obwohl die Chunks die Ausnahme zerschnitten haben.',
      mentalModel:
        'Eine RAG-Pipeline hat drei Stationen, und jede hat ihre eigenen Fehler. Aufbereitung: veraltete Fassungen, fehlende Metadaten, zerschnittene Belege. Retrieval: der Beleg liegt hinter Top-k oder passt nicht ins Budget. Antwort: Aussagen ohne Beleg, erfundene Quellen, eine Teilantwort. Die Evaluation prüft deshalb zwei Dinge getrennt: Liegen die nötigen Belege im Kontext? Und stützt die Antwort jede ihrer Aussagen?',
      workedExample: {
        summary:
          'Bahnfrage „Darf ich bei fünf Stunden Bahnfahrt in der 1. Klasse fahren?“, k = 3, Budget 40, beide Chunking-Strategien.',
        annotations: [
          {
            step: 1,
            text: 'Kleine Chunks: Kein Chunk enthält Regel und Ausnahme zusammen. Die Antwort sagt nur „2. Klasse“ — Vollständigkeit 0 von 1.',
          },
          {
            step: 2,
            text: 'Kontext-Precision bei kleinen Chunks: 0 von 3 Kontext-Chunks tragen die benötigte Aussage. Ursache: Aufbereitung, nicht Top-k.',
          },
          {
            step: 3,
            text: 'Größere Chunks mit Overlap: Im Kontext liegen 2 Chunks, einer davon trägt die Aussage. Kontext-Precision 1/2, Kontext-Recall 1/1.',
          },
          {
            step: 4,
            text: 'Antwort mit größeren Chunks: „Ab vier Stunden Fahrzeit ist die 1. Klasse erlaubt“, belegt durch FIN-REISE Version 3, Sätze 2–3. Vollständigkeit 1 von 1.',
          },
        ],
        outcome:
          'Dieselbe Frage, dieselbe Suche, anderes Chunking: Vollständigkeit 0 gegen 1. Der Fehler lag in der Aufbereitung.',
      },
      reflectionPrompts: [
        'Bei welchem Fehlerbild würdest du zuerst den Dokumentbestand prüfen, bei welchem die Antwort?',
        'Warum reicht es nicht, nur die Antworten zu bewerten?',
        'Welche fünf Fragen würdest du als Prüfsatz für eine RAG-Anwendung in deinem Bereich aufschreiben?',
      ],
      commonMistakes: [
        {
          mistake: 'Bei jeder falschen Antwort zuerst k erhöhen.',
          why: 'Liegt der Fehler in der Aufbereitung oder in der Antwort, bringt ein größeres k nur mehr Beifang.',
          fix: 'Erst den Fehler einer Station zuordnen, dann an dieser Station ansetzen.',
        },
        {
          mistake: 'Einen Quellenverweis für echt halten, weil er offiziell klingt.',
          why: 'Ein Verweis ist nur dann ein Beleg, wenn der genannte Chunk im Kontext liegt und die Aussage enthält.',
          fix: 'Jeden Verweis gegen den Kontext prüfen: Gibt es den Chunk, und steht dort, was behauptet wird?',
        },
        {
          mistake: 'Gute Retrieval-Werte mit einer guten Antwort gleichsetzen.',
          why: 'Auch mit allen Belegen im Kontext kann die Antwort etwas weglassen oder hinzudichten.',
          fix: 'Retrieval und Antwort getrennt bewerten: Belege im Kontext — und jede Aussage belegt.',
        },
      ],
      estimatedMinutes: 15,
      primaryConceptSlugs: ['rag-fehlerbilder', 'rag-evaluation'],
      supportingConceptSlugs: [
        'belegte-antwort',
        'precision-und-recall',
        'chunk-overlap-und-trennstellen',
      ],
      prerequisiteConceptSlugs: ['belegte-antwort', 'precision-und-recall'],
      exercises: [
        {
          slug: 'rag-fehlerbild-zuordnen',
          type: 'CLASSIFICATION',
          title: 'Wo liegt der Fehler?',
          prompt: 'Ordne jedes Fehlerbild der Station der RAG-Pipeline zu, an der es entsteht.',
          payload: {
            kind: 'classification',
            instruction: 'Wähle für jedes Fehlerbild eine Station.',
            categories: [
              {
                id: 'aufbereitung',
                label: 'Aufbereitung',
                description: 'Dokumente, Versionen, Chunking',
              },
              { id: 'retrieval', label: 'Retrieval', description: 'Ranking, Top-k, Budget' },
              { id: 'antwort', label: 'Antwort', description: 'Umgang mit dem Kontext' },
            ],
            items: [
              {
                id: 'grenze',
                text: 'Regel und Ausnahme stehen in getrennten Chunks.',
                correctCategoryId: 'aufbereitung',
                feedback: 'Die Trennstelle entsteht beim Chunking, lange vor jeder Anfrage.',
              },
              {
                id: 'veraltet',
                text: 'Eine ersetzte Fassung liegt ohne Versionsangabe im Bestand.',
                correctCategoryId: 'aufbereitung',
                feedback: 'Fehlende Metadaten sind ein Fehler der Aufbereitung.',
              },
              {
                id: 'platz-vier',
                text: 'Der Beleg steht auf Platz 4, k ist 3.',
                correctCategoryId: 'retrieval',
                feedback: 'Gefunden, aber hinter Top-k abgeschnitten — ein Retrieval-Fehler.',
              },
              {
                id: 'budget',
                text: 'Scheintreffer füllen das Budget, der Beleg passt nicht mehr hinein.',
                correctCategoryId: 'retrieval',
                feedback: 'Auswahl und Budget gehören zum Retrieval.',
              },
              {
                id: 'erfunden',
                text: 'Die Antwort nennt eine Richtlinie, die nicht im Kontext liegt.',
                correctCategoryId: 'antwort',
                feedback:
                  'Der Kontext enthält die Quelle nicht — der Verweis wurde in der Antwort erfunden.',
              },
              {
                id: 'teil',
                text: 'Der Beleg liegt im Kontext, die Antwort lässt die Ausnahme trotzdem weg.',
                correctCategoryId: 'antwort',
                feedback:
                  'Das Retrieval hat geliefert; die Antwort nutzt den Kontext unvollständig.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Frag bei jedem Fall: Wäre der Fehler schon da, bevor jemand eine Frage stellt?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Aufbereitung betrifft den Bestand, Retrieval die Auswahl, die Antwort den Umgang mit dem Kontext.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Je zwei Fälle gehören zu jeder Station.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 3,
          conceptSlugs: ['rag-fehlerbilder'],
        },
        {
          slug: 'rag-erfundene-quelle',
          type: 'MULTIPLE_CHOICE',
          title: 'Einen erfundenen Quellenverweis erkennen',
          prompt:
            'Eine Antwort lautet: „Laut Richtlinie gibt es 50 Euro pro Person für die Weihnachtsfeier.“ Woran erkennst du, dass der Verweis erfunden sein kann? Wähle alle zutreffenden.',
          payload: {
            kind: 'multipleChoice',
            options: [
              {
                id: 'nicht-im-kontext',
                text: 'Kein Chunk im Kontext stammt aus der genannten Richtlinie.',
                feedback:
                  'Genau. Ein Verweis auf etwas, das gar nicht im Kontext liegt, belegt nichts.',
              },
              {
                id: 'steht-nicht-da',
                text: 'Der verwiesene Chunk enthält die behauptete Aussage nicht.',
                feedback: 'Genau. Auch ein echter Chunk belegt nur, was wirklich in ihm steht.',
              },
              {
                id: 'offiziell',
                text: 'Die Richtlinie klingt offiziell und konkret.',
                feedback:
                  'Gerade erfundene Verweise klingen oft offiziell. Der Klang ist kein Prüfmerkmal.',
              },
              {
                id: 'sicher',
                text: 'Die Antwort ist ohne Einschränkung formuliert.',
                feedback: 'Sicherer Ton sagt nichts über die Grundlage — weder dafür noch dagegen.',
              },
            ],
            correctOptionIds: ['nicht-im-kontext', 'steht-nicht-da'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was müsstest du im Kontext nachsehen, um den Verweis zu prüfen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Prüfmerkmale beziehen sich auf den Kontext, nicht auf die Formulierung.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zwei Merkmale prüfen den Kontext, zwei nur den Ton.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 3,
          conceptSlugs: ['rag-fehlerbilder', 'belegte-antwort'],
        },
        {
          slug: 'rag-evaluation-rechnen',
          type: 'FILL_IN',
          title: 'Retrieval-Qualität ausrechnen',
          prompt:
            'Im Kontext liegen 2 Chunks; einer davon trägt die benötigte Aussage. Im ganzen Bestand gibt es genau einen Chunk, der sie trägt.',
          payload: {
            kind: 'fillIn',
            template:
              'Kontext-Precision = {{blank:precision}} · Kontext-Recall = {{blank:recall}} (als Bruch oder Dezimalzahl)',
            blanks: [
              {
                id: 'precision',
                accepted: ['1/2', '0,5', '0,50'],
                description: 'tragende Chunks im Kontext / Chunks im Kontext',
                wrongHint:
                  'Precision schaut auf den Kontext: Wie viele der 2 Chunks tragen die Aussage?',
              },
              {
                id: 'recall',
                accepted: ['1', '1/1', '1,0', '1,00'],
                description: 'tragende Chunks im Kontext / tragende Chunks im Bestand',
                wrongHint:
                  'Recall schaut auf den Bestand: Wie viele der tragenden Chunks sind im Kontext?',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Beide Maße haben denselben Zähler: tragende Chunks im Kontext.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Precision teilt durch die Chunks im Kontext, Recall durch die tragenden Chunks im ganzen Bestand.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zähler 1. Nenner für Precision: 2. Nenner für Recall: 1.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Precision = 1/2. Wie viele der tragenden Chunks im Bestand sind im Kontext?',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Precision 1/2 = 0,5: Die Hälfte des Kontexts ist Beifang. Recall 1/1 = 1: Der einzige tragende Chunk ist dabei.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['rag-evaluation', 'precision-und-recall'],
        },
        {
          slug: 'rag-station-transfer',
          type: 'TRANSFER',
          title: 'Beleg da, Antwort falsch',
          prompt:
            'In einer Wartungsanleitung liegt der richtige Beleg im Kontext, und die Antwort widerspricht ihm trotzdem. Wo setzt du an?',
          transferContext:
            'Technische Dokumentation im Maschinenbau statt Personalhandbuch: Eine falsche Angabe kann hier Schaden anrichten.',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Gefragt ist das Anzugsdrehmoment einer Schraube. Der Chunk im Kontext nennt den richtigen Wert mit Quelle und Version. Die Antwort nennt einen anderen Wert, ohne Verweis.',
            options: [
              {
                id: 'k',
                text: 'k erhöhen, damit noch mehr Belege in den Kontext kommen.',
                quality: 'problematic',
                feedback:
                  'Der Beleg ist bereits im Kontext. Mehr Chunks lösen nicht, dass die Antwort ihn nicht nutzt.',
              },
              {
                id: 'antwort-pruefen',
                text: 'Am Antwortschritt ansetzen: Jede Zahl muss auf einen Chunk im Kontext verweisen, sonst wird sie nicht ausgegeben.',
                quality: 'optimal',
                feedback:
                  'Richtig. Retrieval hat geliefert; der Fehler liegt in der Antwort. Eine Belegpflicht für jede Aussage fängt ihn ab.',
              },
              {
                id: 'neu-chunken',
                text: 'Die Anleitung in kleinere Chunks teilen.',
                quality: 'problematic',
                feedback:
                  'Der Chunk enthält den richtigen Wert bereits. Neues Chunking ändert an der Antwort nichts.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Liegt der Beleg im Kontext? Dann hat welche Station ihre Aufgabe erfüllt?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Retrieval-Qualität und Antwortqualität sind getrennte Fragen.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zwei Optionen ändern Aufbereitung oder Retrieval, eine die Antwort.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 5,
          conceptSlugs: ['rag-evaluation', 'rag-fehlerbilder'],
        },
      ],
    },
  ],
};
