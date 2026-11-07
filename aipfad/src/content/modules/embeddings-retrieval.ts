import type { ModuleDraft } from '@/domain/content/schema';

/**
 * Stufe 9 (LP-10A): Embeddings & semantische Suche.
 *
 * Baut auf Stufe 4 auf, die Embeddings als Bedeutungskoordinaten eines Tokens
 * einführt, und wiederholt diese Grundidee nicht. Hier geht es um das, was
 * danach kommt: Vektoren vergleichen, nach Ähnlichkeit sortieren und
 * Suchergebnisse fachlich beurteilen. RAG folgt bewusst erst im nächsten
 * Ausbauschritt.
 *
 * Alle Zahlen sind didaktische Beispielwerte (siehe docs/QUELLEN.md) — keine
 * Ausgabe eines bestimmten Embedding-Modells, keine Modellnamen, Preise oder
 * API-Parameter (docs/CONTENT-POLICY.md).
 */
export const embeddingsRetrievalModule: ModuleDraft = {
  slug: 'embeddings-semantische-suche',
  title: 'Embeddings & semantische Suche',
  summary:
    'Vektoren und Text-Embeddings, Kosinusähnlichkeit, semantisches Retrieval mit Top-k und Schwelle, Relevanz, Precision, Recall und Chunking.',
  rationale:
    'Bevor ein Sprachmodell mit eigenen Dokumenten arbeiten kann, muss jemand die passenden Dokumente finden. Dieses Modul zeigt, wie semantische Suche rechnet, warum der ähnlichste Treffer nicht der richtige sein muss und wie man Suchergebnisse fachlich beurteilt — die Grundlage für RAG in der nächsten Stufe.',
  prerequisiteModuleSlugs: ['llm-grundlagen'],
  status: 'PUBLISHED',
  lessons: [
    // -----------------------------------------------------------------------
    // Lektion 1 — Vektoren und Embeddings
    // -----------------------------------------------------------------------
    {
      slug: 'vektoren-und-embeddings',
      title: 'Vektoren und Embeddings',
      learningObjectives: [
        'Du kannst erklären, warum ein Embedding einen Text als Zahlenvektor statt als Zeichenkette darstellt.',
        'Du kannst den Unterschied zwischen einem Token-Embedding und einem Text-Embedding benennen.',
        'Du erkennst, warum nur Vektoren aus demselben Modell und mit gleicher Dimension vergleichbar sind.',
      ],
      everydayProblem:
        'Im Firmen-Wiki steht die Antwort auf „Wie komme ich wieder in mein Konto?“ unter der Überschrift „Passwort zurücksetzen“. Die Wiki-Suche findet sie nicht, weil kein Wort übereinstimmt. Ein Mensch erkennt sofort, dass beides dasselbe meint — wie kann ein Programm das erkennen?',
      mentalModel:
        'Stell dir eine Landkarte vor, auf der jede Bedeutung einen Ort hat. Ein Text-Embedding ist die Adresse eines ganzen Textes auf dieser Karte — nur mit sehr vielen Achsen statt zwei. Jede Zahl im Vektor ist eine Koordinate. Texte mit ähnlicher Bedeutung bekommen ähnliche Adressen. Gezeichnet hat die Karte ein Modell aus Beispieltexten; dort, wo diese Beispiele dünn oder einseitig waren, kann die Karte falsch sein.',
      workedExample: {
        summary:
          'Drei Sätze als didaktische Beispielvektoren mit drei benannten Dimensionen (Urlaub | Geld | IT). Die Zahlen sind redaktionell gewählt, nicht von einem Modell berechnet.',
        annotations: [
          {
            step: 1,
            text: '„Ich möchte nächste Woche freinehmen.“ → (0,9 | 0,1 | 0,0): fast nur Urlaub.',
          },
          {
            step: 2,
            text: '„Wie beantrage ich Urlaub?“ → (0,8 | 0,0 | 0,1): ebenfalls Urlaub — obwohl kein Wort mit dem ersten Satz übereinstimmt.',
          },
          {
            step: 3,
            text: '„Mein Laptop startet nicht.“ → (0,0 | 0,0 | 0,9): zeigt in eine ganz andere Richtung.',
          },
          {
            step: 4,
            text: 'Echte Text-Embeddings haben typischerweise Hunderte oder mehr Dimensionen, und keine davon heißt „Urlaub“: Die Bedeutung verteilt sich über viele Zahlen. Die benannten Achsen sind hier eine Lernhilfe.',
          },
        ],
        outcome:
          'Die beiden Urlaubssätze liegen nah beieinander, der Laptop-Satz weit weg — ohne dass ein einziges Wort übereinstimmen muss.',
      },
      reflectionPrompts: [
        'Welche zwei Formulierungen aus deinem Arbeitsalltag meinen dasselbe, teilen aber kein Wort?',
        'Warum wäre es irreführend, eine einzelne Zahl eines echten Embeddings als „Urlaubsachse“ zu deuten?',
        'Was könnte passieren, wenn du interne Abkürzungen einbettest, die in den Trainingstexten eines Modells kaum vorkamen?',
      ],
      commonMistakes: [
        {
          mistake:
            'Annehmen, jede Zahl im Embedding stehe für ein bestimmtes, benennbares Merkmal.',
          why: 'Bei echten Modellen ist Bedeutung über viele Dimensionen verteilt; einzelne Zahlen lassen sich in der Regel nicht sinnvoll benennen.',
          fix: 'Embeddings als Ganzes vergleichen, statt einzelne Positionen zu interpretieren.',
        },
        {
          mistake: 'Vektoren aus zwei verschiedenen Embedding-Modellen miteinander vergleichen.',
          why: 'Jedes Modell zeichnet seine eigene Landkarte. Dieselbe Position bedeutet in zwei Modellen nichts Gemeinsames — selbst wenn die Anzahl der Dimensionen zufällig gleich ist.',
          fix: 'Anfragen und Dokumente immer mit demselben Modell einbetten und bei einem Modellwechsel alle Dokumente neu einbetten.',
        },
        {
          mistake: 'Ein Embedding für eine Zusammenfassung des Textes halten.',
          why: 'Aus dem Vektor lässt sich der Text nicht zurücklesen; er hält nur fest, wo der Text relativ zu anderen liegt.',
          fix: 'Den Originaltext immer zusammen mit seinem Vektor speichern und Treffer am Text prüfen.',
        },
      ],
      estimatedMinutes: 10,
      primaryConceptSlugs: ['vektor-und-dimension', 'text-embedding'],
      supportingConceptSlugs: ['embedding', 'token'],
      prerequisiteConceptSlugs: ['embedding'],
      exercises: [
        {
          slug: 'emb-text-oder-token',
          type: 'SINGLE_CHOICE',
          title: 'Welches Embedding für ganze Absätze?',
          prompt:
            'Ein Suchsystem soll ganze Absätze aus dem Personalhandbuch miteinander und mit Fragen vergleichen. Welche Darstellung braucht es dafür?',
          payload: {
            kind: 'singleChoice',
            options: [
              {
                id: 'token',
                text: 'Ein Token-Embedding je Wortteil, ohne sie zusammenzufassen.',
                feedback:
                  'Token-Embeddings gehören zu einzelnen Tokens. Für den Vergleich ganzer Absätze bräuchte man dann viele Vektoren je Absatz und keine einzelne Zahl für die Nähe.',
              },
              {
                id: 'text',
                text: 'Ein Text-Embedding je Absatz — ein Vektor für den ganzen Absatz.',
                feedback:
                  'Richtig. Ein Text-Embedding fasst einen ganzen Text in einem Vektor zusammen; dann lässt sich jeder Absatz mit jeder Frage direkt vergleichen.',
              },
              {
                id: 'buchstaben',
                text: 'Keine — es reicht, gleiche Buchstaben zu zählen.',
                feedback:
                  'Gleiche Buchstaben sagen nichts über Bedeutung. „Konto“ und „Passwort“ haben fast keine gemeinsamen Buchstaben und gehören trotzdem zusammen.',
              },
            ],
            correctOptionId: 'text',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Verglichen werden ganze Absätze — wie viele Vektoren je Absatz wären am einfachsten zu vergleichen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Token-Embeddings beschreiben einzelne Wortteile. Text-Embeddings beschreiben einen ganzen Text.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Für einen Vergleich „Absatz gegen Frage“ braucht jede Seite genau einen Vektor.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 2,
          conceptSlugs: ['text-embedding', 'embedding'],
        },
        {
          slug: 'emb-vergleichbar-mc',
          type: 'MULTIPLE_CHOICE',
          title: 'Wann sind Vektoren vergleichbar?',
          prompt:
            'Welche Aussagen über den Vergleich von Embeddings stimmen? Wähle alle zutreffenden.',
          payload: {
            kind: 'multipleChoice',
            options: [
              {
                id: 'gleiches-modell',
                text: 'Anfrage und Dokumente müssen mit demselben Modell eingebettet sein.',
                feedback:
                  'Stimmt. Jedes Modell hat seine eigene Landkarte; Positionen aus zwei Modellen passen nicht zueinander.',
              },
              {
                id: 'gleiche-dimension',
                text: 'Zwei Vektoren mit unterschiedlich vielen Dimensionen lassen sich nicht sinnvoll vergleichen.',
                feedback:
                  'Stimmt. Das Skalarprodukt braucht zu jeder Position ein Gegenstück — ohne gleiche Länge gibt es keine Rechnung.',
              },
              {
                id: 'mehr-ist-besser',
                text: 'Ein Vektor mit 1.000 Dimensionen ist immer genauer als einer mit 300.',
                feedback:
                  'Nein. Die Anzahl der Dimensionen sagt allein nichts über die Qualität für deine Daten; das muss man an eigenen Beispielen prüfen.',
              },
              {
                id: 'zuruecklesen',
                text: 'Aus dem Vektor lässt sich der ursprüngliche Text zuverlässig zurückgewinnen.',
                feedback:
                  'Nein. Der Vektor hält eine Position fest, nicht den Wortlaut. Deshalb speichert man den Originaltext mit.',
              },
            ],
            correctOptionIds: ['gleiches-modell', 'gleiche-dimension'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Denk an die Landkarte: Was passiert, wenn zwei Karten verschiedene Maßstäbe und Achsen haben?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Vergleich rechnet Position für Position. Was braucht es dafür auf beiden Seiten?',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zwei Aussagen betreffen Voraussetzungen des Vergleichs, zwei behaupten etwas über Qualität und Inhalt.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die Aussage über das gleiche Modell stimmt. Prüfe die übrigen drei einzeln.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['vektor-und-dimension', 'text-embedding'],
        },
        {
          slug: 'emb-fehlerquellen-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Fehlerquelle oder unbedenklich?',
          prompt:
            'Ein Team richtet eine Suche über das Personalhandbuch ein. Ordne jede Situation ein: typische Fehlerquelle beim Einsatz von Embeddings oder unbedenklich?',
          payload: {
            kind: 'classification',
            instruction: 'Wähle für jede Situation eine Kategorie.',
            categories: [
              {
                id: 'fehlerquelle',
                label: 'Fehlerquelle',
                description: 'kann zu falschen oder fehlenden Treffern führen',
              },
              {
                id: 'unbedenklich',
                label: 'Unbedenklich',
                description: 'gute oder neutrale Praxis',
              },
            ],
            items: [
              {
                id: 'modellwechsel',
                text: 'Nach einem Modellwechsel werden nur neue Dokumente eingebettet, alte Vektoren bleiben stehen.',
                correctCategoryId: 'fehlerquelle',
                feedback:
                  'Alte und neue Vektoren liegen dann auf verschiedenen Landkarten. Vergleiche zwischen ihnen sind bedeutungslos.',
              },
              {
                id: 'abkuerzungen',
                text: 'Interne Abkürzungen wie „UA“ für Urlaubsantrag kamen in den Trainingstexten des Modells kaum vor.',
                correctCategoryId: 'fehlerquelle',
                feedback:
                  'Was ein Modell kaum gesehen hat, kann es schlecht einordnen. „UA“ landet womöglich weit weg von „Urlaubsantrag“.',
              },
              {
                id: 'gleiches-modell',
                text: 'Anfragen und Dokumente werden mit demselben Modell eingebettet.',
                correctCategoryId: 'unbedenklich',
                feedback: 'Genau so muss es sein — sonst wären die Vektoren nicht vergleichbar.',
              },
              {
                id: 'originaltext',
                text: 'Neben jedem Vektor wird der Originaltext gespeichert.',
                correctCategoryId: 'unbedenklich',
                feedback:
                  'Gute Praxis: Nur am Text lässt sich prüfen, ob ein Treffer die Frage wirklich beantwortet.',
              },
              {
                id: 'verneinung',
                text: 'Die Suche soll „Im August kein Urlaub möglich“ sicher von „Im August Urlaub möglich“ trennen.',
                correctCategoryId: 'fehlerquelle',
                feedback:
                  'Sätze, die sich nur durch eine Verneinung unterscheiden, teilen fast alle Wörter und das Thema. Ihre Embeddings können deshalb sehr nah beieinanderliegen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Frag dich bei jeder Situation: Liegen die Vektoren danach noch auf derselben, verlässlichen Landkarte?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Modell kann nur einordnen, was es in ähnlicher Form gelernt hat — und es misst Themennähe, nicht Logik.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Drei Situationen sind Fehlerquellen, zwei sind gute Praxis.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Der Modellwechsel ohne Neu-Einbetten ist eine Fehlerquelle; der gespeicherte Originaltext ist unbedenklich.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['text-embedding', 'vektor-und-dimension'],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Lektion 2 — Ähnlichkeit berechnen
    // -----------------------------------------------------------------------
    {
      slug: 'aehnlichkeit-berechnen',
      title: 'Ähnlichkeit berechnen',
      learningObjectives: [
        'Du kannst das Skalarprodukt und die Länge kleiner Vektoren von Hand berechnen.',
        'Du kannst die Kosinusähnlichkeit aus Skalarprodukt und Vektorlängen ableiten und ihr Ergebnis deuten.',
        'Du weißt, warum ein hoher Ähnlichkeitswert nichts darüber aussagt, ob ein Text inhaltlich stimmt.',
      ],
      everydayProblem:
        'Zwei Hilfeartikel sollen danach sortiert werden, wie gut sie zu einer Frage passen. „Passt gut“ ist aber kein Rechenbefehl. Bevor ein Programm sortieren kann, braucht es eine Zahl für Nähe — und wer sie nutzt, sollte wissen, was diese Zahl aussagt und was nicht.',
      mentalModel:
        'Denk an zwei Pfeile, die vom selben Punkt ausgehen. Die Kosinusähnlichkeit fragt nur: Zeigen sie in dieselbe Richtung? Wie lang die Pfeile sind, spielt keine Rolle. Zeigen sie genau gleich, ist der Wert 1; stehen sie im rechten Winkel zueinander, ist er 0; zeigen sie entgegengesetzt, ist er −1. Ein Pfeil ohne Länge — der Nullvektor — hat keine Richtung. Für ihn gibt es keinen Wert, auch nicht 0.',
      workedExample: {
        summary:
          'Kosinusähnlichkeit von a = (3, 4) mit b = (4, 3) und mit c = (6, 8), Schritt für Schritt.',
        annotations: [
          { step: 1, text: 'Skalarprodukt a · b = 3 · 4 + 4 · 3 = 12 + 12 = 24.' },
          { step: 2, text: 'Längen: |a| = √(3² + 4²) = √25 = 5, ebenso |b| = √(4² + 3²) = 5.' },
          {
            step: 3,
            text: 'Kosinus(a, b) = 24 / (5 · 5) = 24 / 25 = 0,96 — sehr ähnliche Richtung.',
          },
          {
            step: 4,
            text: 'Für c = (6, 8): a · c = 18 + 32 = 50, |c| = √100 = 10, Kosinus(a, c) = 50 / (5 · 10) = 1. c ist doppelt so lang wie a, zeigt aber genau in dieselbe Richtung.',
          },
        ],
        outcome:
          'Kosinus(a, b) = 0,96 und Kosinus(a, c) = 1: Die Länge eines Vektors ändert die Kosinusähnlichkeit nicht, nur seine Richtung zählt.',
      },
      reflectionPrompts: [
        'Warum ist es für eine Suche nützlich, dass die Länge eines Vektors die Kosinusähnlichkeit nicht beeinflusst?',
        'Zwei Aussagen widersprechen sich, haben aber eine Ähnlichkeit von 0,9. Wie kann das sein?',
        'Was sollte ein Programm tun, wenn es die Ähnlichkeit zu einem Nullvektor berechnen soll?',
      ],
      commonMistakes: [
        {
          mistake:
            'Die Kosinusähnlichkeit als Prozentzahl der Übereinstimmung lesen („0,8 heißt zu 80 % gleich“).',
          why: 'Der Wert ist der Kosinus eines Winkels, kein Anteil. Wie hoch ein „guter“ Wert ist, hängt vom Modell und von den Daten ab.',
          fix: 'Werte nur innerhalb derselben Rangliste und desselben Modells vergleichen und Schwellen an eigenen Beispielen prüfen.',
        },
        {
          mistake: 'Bei der Vektorlänge die Wurzel vergessen.',
          why: 'Ohne Wurzel rechnet man mit dem Quadrat der Länge; das Ergebnis liegt dann oft nicht mehr zwischen −1 und 1.',
          fix: 'Die Länge ist √(v₁² + v₂² + …). Das Endergebnis gegen das Intervall von −1 bis 1 prüfen.',
        },
        {
          mistake:
            'Einen hohen Ähnlichkeitswert als Beleg dafür nehmen, dass ein Dokument die Frage richtig beantwortet.',
          why: 'Ähnlichkeit misst Nähe in der Bedeutung, nicht Wahrheit: „Urlaub zwei Wochen vorher beantragen“ und „Urlaub vier Wochen vorher beantragen“ liegen fast gleich.',
          fix: 'Den Inhalt des Treffers selbst lesen, besonders bei Zahlen, Fristen und Verneinungen.',
        },
      ],
      estimatedMinutes: 12,
      primaryConceptSlugs: ['skalarprodukt-und-vektorlaenge', 'kosinus-aehnlichkeit'],
      supportingConceptSlugs: ['vektor-und-dimension'],
      prerequisiteConceptSlugs: ['vektor-und-dimension'],
      exercises: [
        {
          slug: 'emb-kosinus-ordering',
          type: 'ORDERING',
          title: 'Der Rechenweg der Kosinusähnlichkeit',
          prompt:
            'Bring die Schritte zur Kosinusähnlichkeit zweier Vektoren in die richtige Reihenfolge.',
          payload: {
            kind: 'ordering',
            instruction: 'Vom Vektorpaar bis zur Deutung des Ergebnisses.',
            items: [
              {
                id: 'dimension',
                text: 'Prüfen, ob beide Vektoren gleich viele Dimensionen haben.',
              },
              {
                id: 'skalar',
                text: 'Das Skalarprodukt bilden: Werte Position für Position multiplizieren und addieren.',
              },
              {
                id: 'teilen',
                text: 'Das Skalarprodukt durch das Produkt der beiden Vektorlängen teilen.',
              },
              {
                id: 'intervall',
                text: 'Kontrollieren, dass das Ergebnis zwischen −1 und 1 liegt.',
              },
              {
                id: 'deuten',
                text: 'Den Wert mit den Werten anderer Dokumente derselben Rangliste vergleichen.',
              },
            ],
            correctOrder: ['dimension', 'skalar', 'teilen', 'intervall', 'deuten'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was muss feststehen, bevor du überhaupt Position für Position rechnen kannst?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Kosinus = Skalarprodukt / (Länge a · Länge b). Was steht im Zähler, was im Nenner?',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Erst prüfen, dann rechnen, dann kontrollieren, zuletzt deuten.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 2,
          conceptSlugs: ['kosinus-aehnlichkeit', 'skalarprodukt-und-vektorlaenge'],
        },
        {
          slug: 'emb-kosinus-fill-in',
          type: 'FILL_IN',
          title: 'Kosinusähnlichkeit selbst rechnen',
          prompt:
            'Berechne die Kosinusähnlichkeit von a = (1, 2, 2) und b = (2, 1, 2). Die Länge von b ist bereits angegeben.',
          payload: {
            kind: 'fillIn',
            template:
              'Skalarprodukt a · b = {{blank:skalar}}. Länge |a| = {{blank:laenge}}, Länge |b| = 3. Kosinusähnlichkeit = {{blank:kosinus}} (als Bruch oder auf zwei Nachkommastellen gerundet).',
            blanks: [
              {
                id: 'skalar',
                accepted: ['8'],
                description: 'Summe der Produkte 1·2 + 2·1 + 2·2',
                wrongHint:
                  'Multipliziere Position für Position: 1 · 2, 2 · 1 und 2 · 2 — und addiere die drei Ergebnisse.',
              },
              {
                id: 'laenge',
                accepted: ['3'],
                description: 'Wurzel aus 1² + 2² + 2²',
                wrongHint: '1² + 2² + 2² = 9. Vergiss die Wurzel nicht.',
              },
              {
                id: 'kosinus',
                accepted: ['8/9', '0,89', '0,889'],
                description: 'Skalarprodukt geteilt durch das Produkt der Längen',
                wrongHint: 'Teile das Skalarprodukt durch |a| · |b| = 3 · 3 = 9.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Rechne in drei Schritten: Skalarprodukt, Länge, Division.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Skalarprodukt: a₁·b₁ + a₂·b₂ + a₃·b₃. Länge: √(a₁² + a₂² + a₃²).',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Setze die Zahlen ein: 1·2 + 2·1 + 2·2 und √(1 + 4 + 4).',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Das Skalarprodukt ist 8. Jetzt fehlen |a| und die Division durch |a| · |b|.',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'a · b = 2 + 2 + 4 = 8, |a| = √9 = 3, |b| = 3, Kosinus = 8 / 9 ≈ 0,89: eine sehr ähnliche Richtung.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['skalarprodukt-und-vektorlaenge', 'kosinus-aehnlichkeit'],
        },
        {
          slug: 'emb-aehnlich-nicht-wahr',
          type: 'TRANSFER',
          title: 'Hoher Score, unklare Antwort',
          prompt:
            'Eine Suche über Lieferverträge liefert zwei fast gleich ähnliche Treffer mit unterschiedlichen Fristen. Was tust du?',
          transferContext:
            'Vertragsprüfung statt Personalhandbuch: Dieselbe Rechnung, aber mit Folgen für eine verbindliche Frist.',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Gesucht ist die Kündigungsfrist eines Liefervertrags. Treffer 1 (Ähnlichkeit 0,93): „Der Vertrag kann mit einer Frist von drei Monaten gekündigt werden.“ Treffer 2 (Ähnlichkeit 0,92): „Abweichend davon gilt für Rahmenverträge eine Frist von sechs Monaten.“',
            options: [
              {
                id: 'hoechster-score',
                text: '0,93 ist der höchste Wert — die Frist beträgt drei Monate.',
                quality: 'problematic',
                feedback:
                  'Der Unterschied von 0,01 sagt nichts darüber, welche Regel gilt. Ob ein Rahmenvertrag vorliegt, steht in keinem Score.',
              },
              {
                id: 'beide-lesen',
                text: 'Beide Treffer lesen und klären, ob ein Rahmenvertrag vorliegt; erst dann die Frist nennen.',
                quality: 'optimal',
                feedback:
                  'Genau. Ähnlichkeit hat die passenden Stellen gefunden — welche davon gilt, ist eine fachliche Prüfung am Text.',
              },
              {
                id: 'neue-suche',
                text: 'Die Suche mit „Rahmenvertrag Kündigungsfrist“ wiederholen und dann antworten.',
                quality: 'acceptable',
                feedback:
                  'Das kann weitere Stellen liefern, ersetzt aber nicht die Klärung, welcher Vertragstyp vorliegt.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was misst die Ähnlichkeit — und was müsste man wissen, um die Frist sicher zu nennen?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ähnlichkeit ist Nähe in der Bedeutung, keine Prüfung, ob eine Aussage im konkreten Fall gilt.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Zwei Treffer, zwei Fristen, ein Unterschied von 0,01: Entscheidet hier der Score oder der Inhalt?',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['kosinus-aehnlichkeit'],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Lektion 3 — Semantisches Retrieval
    // -----------------------------------------------------------------------
    {
      slug: 'semantisches-retrieval',
      title: 'Semantisches Retrieval',
      learningObjectives: [
        'Du kannst den Ablauf einer semantischen Suche von der Anfrage bis zur Trefferliste beschreiben.',
        'Du kannst erklären, was Top-k festlegt und warum eine Rangliste immer einen ersten Platz hat.',
        'Du erkennst, wann eine Schlüsselwortsuche und wann eine semantische Suche das bessere Ergebnis liefert.',
      ],
      everydayProblem:
        'Ein Support-Team hat 2.000 Hilfeartikel. Kundinnen und Kunden schreiben „Ich komme nicht mehr rein“, die Artikel heißen „Zugangsdaten zurücksetzen“. Die Schlüsselwortsuche findet nichts. Und auf „Was gibt es heute in der Kantine?“ liefert eine semantische Suche trotzdem irgendeinen Artikel. Beides ist ein Problem.',
      mentalModel:
        'Semantische Suche arbeitet in zwei Phasen. Vorher: Jedes Dokument bekommt einmal seinen Vektor und wird mit ihm abgelegt. Bei jeder Anfrage: Die Anfrage bekommt mit demselben Modell ihren Vektor, wird mit allen Dokumentvektoren verglichen, und die Dokumente werden nach Score sortiert. Top-k schneidet die Liste nach k Plätzen ab. Eine Schwelle entscheidet, ob überhaupt etwas gut genug ist — sonst lautet die Antwort ehrlich „nichts gefunden“.',
      workedExample: {
        summary:
          'Anfrage „Bis wann muss ich die Belege einer Dienstreise abgeben?“ gegen drei Dokumente, mit den didaktischen Beispielwerten aus dem Lab.',
        annotations: [
          {
            step: 1,
            text: 'Anfrage einbetten — mit demselben Modell, mit dem die Dokumente eingebettet wurden.',
          },
          {
            step: 2,
            text: 'Scores: Reisekosten abrechnen 0,996 · Rückblick Teamausflug 0,500 · Urlaub beantragen 0,221.',
          },
          {
            step: 3,
            text: 'Sortieren und Top-k = 2 anwenden: Reisekosten abrechnen, Rückblick Teamausflug.',
          },
          {
            step: 4,
            text: 'Schwelle 0,55 anwenden: Nur „Reisekosten abrechnen“ bleibt als Antwortkandidat übrig.',
          },
        ],
        outcome:
          'Ein klarer Treffer bleibt. Der zweite Platz fällt an der Schwelle heraus, obwohl er in den Top-2 lag.',
      },
      reflectionPrompts: [
        'Welche Fragen in deinem Bereich würden Menschen mit ganz anderen Worten stellen, als sie in den Dokumenten stehen?',
        'Warum ist „nichts gefunden“ manchmal die beste Antwort einer Suche?',
        'Wie würdest du prüfen, ob eine Schwelle von 0,55 für deine eigenen Dokumente passt?',
      ],
      commonMistakes: [
        {
          mistake: 'Den ersten Platz der Rangliste immer als Antwort verwenden.',
          why: 'Eine Rangliste sortiert nur. Sie hat auch dann einen ersten Platz, wenn kein Dokument passt.',
          fix: 'Eine Mindestähnlichkeit festlegen und „kein passender Treffer“ als eigenes, gültiges Ergebnis behandeln.',
        },
        {
          mistake: 'Top-k einmal festlegen und nie überprüfen.',
          why: 'Ist k zu klein, fehlen relevante Dokumente; ist k zu groß, rutschen Scheintreffer mit hinein.',
          fix: 'k an echten Beispielanfragen ausprobieren und die Wirkung auf die Treffer ansehen.',
        },
        {
          mistake:
            'Semantische Suche für exakte Kennungen wie Bestell- oder Artikelnummern einsetzen.',
          why: '„A-4711“ und „A-4712“ sehen für ein Embedding fast gleich aus, bezeichnen aber völlig verschiedene Dinge.',
          fix: 'Für exakte Kennungen eine Schlüsselwort- oder Feldsuche nutzen.',
        },
      ],
      estimatedMinutes: 12,
      primaryConceptSlugs: ['semantische-suche', 'top-k-retrieval'],
      supportingConceptSlugs: ['kosinus-aehnlichkeit', 'text-embedding'],
      prerequisiteConceptSlugs: ['kosinus-aehnlichkeit', 'text-embedding'],
      exercises: [
        {
          slug: 'emb-retrieval-ablauf',
          type: 'ORDERING',
          title: 'Der Ablauf einer semantischen Suche',
          prompt: 'Bring die Schritte einer semantischen Suche in die richtige Reihenfolge.',
          payload: {
            kind: 'ordering',
            instruction: 'Von der Vorbereitung des Suchbestands bis zu den Antwortkandidaten.',
            items: [
              {
                id: 'dokumente',
                text: 'Alle Dokumente einmal einbetten und mit ihrem Vektor speichern.',
              },
              { id: 'anfrage', text: 'Die Anfrage mit demselben Modell einbetten.' },
              {
                id: 'vergleichen',
                text: 'Die Kosinusähnlichkeit der Anfrage zu jedem Dokumentvektor berechnen.',
              },
              { id: 'sortieren', text: 'Die Dokumente nach Score absteigend sortieren.' },
              {
                id: 'auswahl',
                text: 'Die ersten k Plätze nehmen und an der Schwelle prüfen.',
              },
            ],
            correctOrder: ['dokumente', 'anfrage', 'vergleichen', 'sortieren', 'auswahl'],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was kann schon passieren, bevor überhaupt jemand eine Frage stellt?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Verglichen werden immer zwei Vektoren. Beide müssen also existieren, bevor gerechnet wird.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Vorbereiten, einbetten, vergleichen, sortieren, auswählen.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['semantische-suche'],
        },
        {
          slug: 'emb-kleinstes-k',
          type: 'SINGLE_CHOICE',
          title: 'Wie groß muss k sein?',
          prompt:
            'Welches ist das kleinste k, bei dem das relevante Dokument unter den Treffern ist?',
          payload: {
            kind: 'singleChoice',
            context:
              'Rangliste für „Wie beantrage ich Urlaub für eine Reise im August?“ (didaktische Beispielwerte aus dem Lab): 1. Rückblick Teamausflug 0,977 · 2. Urlaub beantragen 0,932 · 3. Krankmeldung 0,848 · 4. Mobiles Arbeiten 0,600. Die Frage beantwortet nur „Urlaub beantragen“.',
            options: [
              {
                id: 'k1',
                text: 'k = 1',
                feedback:
                  'Mit k = 1 kommt nur der Teamausflug-Rückblick zurück — die eigentliche Antwort fehlt.',
              },
              {
                id: 'k2',
                text: 'k = 2',
                feedback:
                  'Richtig. Ab k = 2 ist „Urlaub beantragen“ dabei — zusammen mit einem Scheintreffer auf Platz 1.',
              },
              {
                id: 'k3',
                text: 'k = 3',
                feedback:
                  'Bei k = 3 ist das Dokument dabei, aber schon bei einem kleineren k. Gefragt war das kleinste.',
              },
              {
                id: 'keins',
                text: 'Bei keinem k — der Score des relevanten Dokuments ist zu niedrig.',
                feedback:
                  '0,932 ist hoch und liegt auf Platz 2. Es wird gefunden, sobald k groß genug ist.',
              },
            ],
            correctOptionId: 'k2',
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Top-k heißt: die ersten k Plätze der Rangliste. Auf welchem Platz steht das relevante Dokument?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Ein Dokument auf Platz p ist genau dann dabei, wenn k mindestens p ist.',
            },
            {
              level: 3,
              kind: 'structure',
              text: '„Urlaub beantragen“ steht auf Platz 2.',
            },
          ],
          difficulty: 2,
          scaffoldLevel: 3,
          conceptSlugs: ['top-k-retrieval', 'semantische-suche'],
        },
        {
          slug: 'emb-suchverfahren-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Schlüsselwort oder semantisch?',
          prompt: 'Welches Suchverfahren passt jeweils besser? Ordne jeden Fall zu.',
          payload: {
            kind: 'classification',
            instruction: 'Wähle für jeden Fall das passendere Suchverfahren.',
            categories: [
              {
                id: 'schluesselwort',
                label: 'Schlüsselwortsuche',
                description: 'findet genau die eingegebene Zeichenfolge',
              },
              {
                id: 'semantisch',
                label: 'Semantische Suche',
                description: 'findet Texte mit ähnlicher Bedeutung',
              },
            ],
            items: [
              {
                id: 'bestellnummer',
                text: 'Eine Kundin sucht die Bestellung „B-20931“.',
                correctCategoryId: 'schluesselwort',
                feedback:
                  'Bei Kennungen zählt jedes Zeichen. „B-20931“ und „B-20932“ wären für ein Embedding fast gleich.',
              },
              {
                id: 'umschreibung',
                text: 'Jemand fragt „Ich komme nicht mehr in mein Konto“; der passende Artikel heißt „Passwort zurücksetzen“.',
                correctCategoryId: 'semantisch',
                feedback:
                  'Kein Wort stimmt überein, die Bedeutung schon — genau dafür ist semantische Suche da.',
              },
              {
                id: 'fehlercode',
                text: 'Ein Techniker sucht den exakten Fehlercode „E-1043“ in Protokollen.',
                correctCategoryId: 'schluesselwort',
                feedback:
                  'Ein Fehlercode ist eine Kennung. Ein ähnlicher Code wäre hier ein falscher Treffer.',
              },
              {
                id: 'synonym',
                text: 'In einer Dokumentsammlung heißt es mal „Dienstwagen“, mal „Firmenfahrzeug“.',
                correctCategoryId: 'semantisch',
                feedback:
                  'Verschiedene Wörter, eine Sache: Die semantische Suche findet beide Schreibweisen.',
              },
              {
                id: 'paragraf',
                text: 'Gesucht ist genau „§ 14 Abs. 2“ eines Vertrags.',
                correctCategoryId: 'schluesselwort',
                feedback:
                  'Eine exakte Fundstelle ist eine Kennung. „§ 15 Abs. 2“ wäre ähnlich — und falsch.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Würde ein „ähnlicher“ Treffer hier helfen oder schaden?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Semantische Suche ist stark bei Umschreibungen, schwach bei exakten Kennungen.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Drei Fälle drehen sich um Kennungen, zwei um verschiedene Wörter für dieselbe Sache.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Die Bestellnummer gehört zur Schlüsselwortsuche, die Konto-Frage zur semantischen Suche.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 5,
          conceptSlugs: ['semantische-suche', 'top-k-retrieval'],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Lektion 4 — Retrieval richtig beurteilen
    // -----------------------------------------------------------------------
    {
      slug: 'retrieval-beurteilen',
      title: 'Retrieval richtig beurteilen',
      learningObjectives: [
        'Du kannst False Positives und False Negatives an einer Trefferliste erkennen.',
        'Du kannst Precision und Recall für eine kleine Trefferliste berechnen und deuten.',
        'Du erkennst, wann Chunking Zusammenhang zerstört und wann ein anderes Suchverfahren besser passt.',
      ],
      everydayProblem:
        'Eine Suche liefert fünf Treffer mit hohen Scores, und alle klingen passend. Trotzdem fehlt die eine Ausnahmeregel, auf die es ankommt, und zwei Treffer gehören zu einem anderen Produkt. Wer nur auf die Scores schaut, merkt davon nichts.',
      mentalModel:
        'Stell dir die Suche als Netz vor, das du in einen Teich wirfst. Precision fragt: Wie viel von dem, was im Netz hängt, wolltest du wirklich fangen? Recall fragt: Wie viel von dem, was du fangen wolltest, hängt im Netz? Ein größeres Netz — ein größeres k — fängt mehr vom Gewünschten, aber auch mehr Beifang. Welcher Fisch der gewünschte ist, sagt dir nicht das Netz, sondern dein fachliches Urteil.',
      workedExample: {
        summary:
          'Top-3 für die Urlaubsanfrage aus dem Lab, mit dem fachlichen Urteil neben jedem Treffer.',
        annotations: [
          {
            step: 1,
            text: 'Treffer: Rückblick Teamausflug (nicht relevant), Urlaub beantragen (relevant), Krankmeldung (nicht relevant).',
          },
          {
            step: 2,
            text: 'False Positives: Teamausflug und Krankmeldung — hoch eingestuft, beantworten die Frage aber nicht.',
          },
          {
            step: 3,
            text: 'Precision = relevante Treffer / gelieferte Treffer = 1 / 3 ≈ 0,33.',
          },
          {
            step: 4,
            text: 'Recall = gefundene relevante / alle relevanten = 1 / 1 = 1. Bei k = 1 fehlte das relevante Dokument: ein False Negative, Recall 0.',
          },
        ],
        outcome:
          'Bei k = 3: Precision ≈ 0,33, Recall 1. Bei k = 1: Precision 0, Recall 0. Das Netz muss groß genug sein — und der Beifang muss danach aussortiert werden.',
      },
      reflectionPrompts: [
        'Was ist in deinem Einsatzfall teurer: ein fehlendes relevantes Dokument oder ein unpassender Treffer?',
        'Wer in deinem Team könnte beurteilen, welche Dokumente für eine Anfrage wirklich relevant sind?',
        'Bei welchen Dokumenten aus deinem Alltag stehen Regel und Ausnahme weit auseinander?',
      ],
      commonMistakes: [
        {
          mistake: 'Hohe Scores als Nachweis guter Suchqualität nehmen.',
          why: 'Scores vergleichen Dokumente nur untereinander. Ob die Treffer relevant sind, zeigt erst ein fachliches Urteil.',
          fix: 'Eine kleine Liste echter Anfragen mit bekannten relevanten Dokumenten anlegen und Precision und Recall daran messen.',
        },
        {
          mistake: 'Dokumente in möglichst kleine Stücke teilen, damit die Treffer genauer werden.',
          why: 'Steht die Ausnahme im nächsten Absatz, landet sie in einem anderen Chunk und fehlt im Treffer — die Regel wirkt dann vollständig.',
          fix: 'Chunks entlang inhaltlicher Grenzen bilden, die Überschrift mitgeben und prüfen, ob Regel und Ausnahme zusammenbleiben.',
        },
        {
          mistake: 'Bei schlechten Ergebnissen nur an k oder an der Schwelle drehen.',
          why: 'Sind Dokumente schlecht zerlegt, veraltet oder fehlen sie, kann keine Einstellung der Suche das ausgleichen.',
          fix: 'Erst den Suchbestand und das Chunking prüfen, dann die Einstellungen.',
        },
      ],
      estimatedMinutes: 14,
      primaryConceptSlugs: ['relevanz-vs-aehnlichkeit', 'precision-und-recall', 'chunking'],
      supportingConceptSlugs: ['top-k-retrieval', 'semantische-suche'],
      prerequisiteConceptSlugs: ['top-k-retrieval'],
      exercises: [
        {
          slug: 'emb-fp-fn-klassifikation',
          type: 'CLASSIFICATION',
          title: 'Treffer, Scheintreffer, verpasster Treffer',
          prompt:
            'Anfrage: „Wie viele Urlaubstage habe ich in Teilzeit?“ Die Suche liefert Top-5. Ordne jeden Fall ein.',
          payload: {
            kind: 'classification',
            instruction: 'Wähle für jeden Fall die passende Kategorie.',
            categories: [
              {
                id: 'treffer',
                label: 'Richtiger Treffer',
                description: 'geliefert und relevant',
              },
              {
                id: 'false-positive',
                label: 'False Positive',
                description: 'geliefert, aber nicht relevant',
              },
              {
                id: 'false-negative',
                label: 'False Negative',
                description: 'relevant, aber nicht geliefert',
              },
            ],
            items: [
              {
                id: 'teilzeit',
                text: '„Urlaubsanspruch in Teilzeit“ steht auf Platz 1.',
                correctCategoryId: 'treffer',
                feedback: 'Geliefert und beantwortet die Frage — ein richtiger Treffer.',
              },
              {
                id: 'vollzeit',
                text: '„Urlaubsanspruch in Vollzeit“ steht auf Platz 2 und sagt nichts zu Teilzeit.',
                correctCategoryId: 'false-positive',
                feedback:
                  'Thematisch sehr nah, beantwortet aber eine andere Frage. Genau das ist ein False Positive.',
              },
              {
                id: 'sonderregel',
                text: '„Sonderregel bei weniger als 20 Wochenstunden“ beantwortet die Frage, steht aber auf Platz 9.',
                correctCategoryId: 'false-negative',
                feedback:
                  'Relevant, aber bei k = 5 nicht geliefert. Wer nur die Treffer liest, übersieht die Ausnahme.',
              },
              {
                id: 'sommerfest',
                text: '„Rückblick Sommerfest“ steht auf Platz 3.',
                correctCategoryId: 'false-positive',
                feedback: 'Geliefert, aber ohne jeden Bezug zur Frage — ein Scheintreffer.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Stell bei jedem Fall zwei Fragen: Wurde es geliefert? Beantwortet es die Frage?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'False Positive: geliefert, aber nicht relevant. False Negative: relevant, aber nicht geliefert.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Bei Top-5 ist alles ab Platz 6 nicht geliefert.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 3,
          conceptSlugs: ['relevanz-vs-aehnlichkeit', 'precision-und-recall'],
        },
        {
          slug: 'emb-precision-recall-fill-in',
          type: 'FILL_IN',
          title: 'Precision und Recall ausrechnen',
          prompt:
            'Top-4 liefert die Dokumente A, B, C und D. Fachlich relevant sind A, C und F — F wurde nicht gefunden. Berechne Precision und Recall.',
          payload: {
            kind: 'fillIn',
            template:
              'Precision = {{blank:precision}} · Recall = {{blank:recall}} (als Bruch oder auf zwei Nachkommastellen gerundet)',
            blanks: [
              {
                id: 'precision',
                accepted: ['2/4', '1/2', '0,5', '0,50'],
                description: 'relevante unter den gelieferten Treffern',
                wrongHint:
                  'Precision schaut nur auf die vier gelieferten Dokumente: Wie viele davon sind relevant?',
              },
              {
                id: 'recall',
                accepted: ['2/3', '0,67', '0,667'],
                description: 'gefundene unter allen relevanten Dokumenten',
                wrongHint:
                  'Recall schaut auf alle drei relevanten Dokumente: Wie viele davon wurden gefunden?',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Precision und Recall haben denselben Zähler. Sie unterscheiden sich im Nenner.',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Precision = relevant und geliefert / geliefert. Recall = relevant und geliefert / relevant gesamt.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Relevant und geliefert sind A und C — also 2.',
            },
            {
              level: 4,
              kind: 'partial',
              text: 'Precision = 2 / 4. Für den Recall teilst du 2 durch die Zahl aller relevanten Dokumente.',
            },
            {
              level: 5,
              kind: 'explanation',
              text: 'Precision = 2/4 = 0,5, Recall = 2/3 ≈ 0,67: Die Hälfte der Treffer ist Beifang, und ein Drittel des Relevanten fehlt.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['precision-und-recall'],
        },
        {
          slug: 'emb-chunking-kontextverlust',
          type: 'SCENARIO_DECISION',
          title: 'Regel und Ausnahme getrennt',
          prompt:
            'Die Suche liefert eine Regel ohne ihre Ausnahme. Woran liegt das, und was hilft am meisten?',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Das Reisehandbuch wurde in Chunks von je zwei Sätzen geteilt. Chunk 14 lautet: „Bahnfahrten werden in der 2. Klasse erstattet.“ Chunk 15 beginnt mit: „Ausnahme: Ab vier Stunden Fahrzeit ist die 1. Klasse erlaubt.“ Auf die Frage „Darf ich für fünf Stunden Zugfahrt 1. Klasse buchen?“ landet nur Chunk 14 in den Treffern.',
            options: [
              {
                id: 'inhaltlich-teilen',
                text: 'Entlang inhaltlicher Abschnitte teilen, sodass Regel und Ausnahme in einem Chunk bleiben, und die Abschnittsüberschrift mitgeben.',
                quality: 'optimal',
                feedback:
                  'Genau. Der Kontextverlust entsteht beim Zerschneiden; behebt man ihn dort, findet die Suche die Regel samt Ausnahme.',
              },
              {
                id: 'k-erhoehen',
                text: 'k erhöhen, bis Chunk 15 ebenfalls auftaucht.',
                quality: 'acceptable',
                feedback:
                  'Kann helfen, ist aber Glück: Chunk 15 allein spricht von „Ausnahme“, ohne zu sagen, wovon. Sein Vektor passt nicht sicher zur Frage.',
              },
              {
                id: 'einzelsaetze',
                text: 'In noch kleinere Chunks mit je einem Satz teilen.',
                quality: 'problematic',
                feedback:
                  'Das verschärft das Problem: Noch mehr Sätze verlieren ihren Zusammenhang.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Was weiß Chunk 15 allein noch darüber, wofür seine Ausnahme gilt?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Jeder Chunk wird einzeln eingebettet. Zusammenhang über die Chunkgrenze hinweg geht dabei verloren.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Eine Option behebt die Ursache, eine mildert die Folge, eine verschlimmert sie.',
            },
          ],
          difficulty: 3,
          scaffoldLevel: 4,
          conceptSlugs: ['chunking', 'relevanz-vs-aehnlichkeit'],
        },
        {
          slug: 'emb-verfahren-waehlen',
          type: 'TRANSFER',
          title: 'Ein anderes Verfahren wählen',
          prompt:
            'Im Ersatzteilkatalog findet die semantische Suche ständig die Dichtung der falschen Pumpe. Was ist die beste Abhilfe?',
          transferContext:
            'Technischer Kundendienst mit Ersatzteilkatalog statt Personalhandbuch: Hier entscheidet eine Kennung, nicht die Bedeutung.',
          payload: {
            kind: 'scenarioDecision',
            scenario:
              'Ein Kundendienst durchsucht einen Ersatzteilkatalog. Anfragen lauten etwa „Dichtung für Pumpe P-220“. Die semantische Suche liefert oft Dichtungen für P-210 oder P-230 mit Ähnlichkeiten über 0,9, weil sich die Beschreibungen fast gleichen.',
            options: [
              {
                id: 'k-erhoehen',
                text: 'k erhöhen, damit die richtige Dichtung irgendwo dabei ist.',
                quality: 'problematic',
                feedback:
                  'Der Recall steigt vielleicht, die Precision sinkt aber, und jemand muss trotzdem nach der Nummer aussortieren.',
              },
              {
                id: 'kombinieren',
                text: 'Exakt nach der Teilenummer filtern und die semantische Suche nur für die Beschreibung nutzen.',
                quality: 'optimal',
                feedback:
                  'Genau. Die Kennung entscheidet exakt, die Bedeutung hilft bei Umschreibungen wie „Dichtring“ statt „Dichtung“.',
              },
              {
                id: 'schwelle-hoch',
                text: 'Die Schwelle auf 0,95 anheben.',
                quality: 'problematic',
                feedback:
                  'Auch die falschen Dichtungen liegen über 0,9. Eine Schwelle trennt nach Ähnlichkeit, nicht nach Teilenummer.',
              },
              {
                id: 'kleiner-chunken',
                text: 'Die Katalogeinträge in kleinere Chunks teilen.',
                quality: 'problematic',
                feedback:
                  'Die Einträge sind schon kurz. Das Problem ist nicht der Zuschnitt, sondern dass fast gleiche Texte verschiedene Teile meinen.',
              },
            ],
          },
          hints: [
            {
              level: 1,
              kind: 'impulse',
              text: 'Worin unterscheiden sich P-210, P-220 und P-230 — in der Bedeutung oder in der Kennung?',
            },
            {
              level: 2,
              kind: 'concept',
              text: 'Semantische Suche misst Bedeutungsnähe. Bei Kennungen ist Nähe genau das Problem.',
            },
            {
              level: 3,
              kind: 'structure',
              text: 'Drei Optionen drehen an der semantischen Suche, eine ergänzt sie um ein anderes Verfahren.',
            },
          ],
          difficulty: 4,
          scaffoldLevel: 5,
          conceptSlugs: ['relevanz-vs-aehnlichkeit', 'chunking', 'semantische-suche'],
        },
      ],
    },
  ],
};
