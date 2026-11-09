import type { LabDraft } from '@/domain/content/schema';

/**
 * Labs dieser Ausbaustufe. Alle deterministisch — kein Aufruf an einen
 * echten Tokenizer oder KI-Anbieter, siehe docs/CONTENT-POLICY.md.
 */
export const labs: LabDraft[] = [
  {
    slug: 'terminal-lab',
    kind: 'TERMINAL',
    title: 'Terminal-Simulator',
    summary: 'Übe grundlegende Terminalbefehle in einer sicheren, simulierten Umgebung.',
    instructions:
      'Bewege dich mit pwd, ls, cd, mkdir, touch, cat, cp, mv, rm, which, echo und clear durch einen simulierten Dateibaum. Nichts hier wirkt sich auf deinen echten Rechner aus.',
    config: {
      startingDirectory: '/home/lernperson',
      fileSystem: {
        '/home/lernperson': null,
        '/home/lernperson/dokumente': null,
        '/home/lernperson/dokumente/notizen.txt': 'Erste Notiz.',
        '/home/lernperson/bilder': null,
      },
      allowedCommands: [
        'pwd',
        'ls',
        'cd',
        'mkdir',
        'touch',
        'cat',
        'cp',
        'mv',
        'rm',
        'which',
        'echo',
        'clear',
      ],
      dangerousCommands: ['rm'],
    },
    estimatedMinutes: 12,
    relatedConceptSlugs: ['terminal-grundbegriffe', 'pfad-und-pfadtrennzeichen'],
  },
  {
    slug: 'tokenizer-lab',
    kind: 'TOKENIZER',
    title: 'Tokenizer-Lab',
    summary: 'Sieh dir an, wie Beispieltexte in Tokens zerfallen.',
    instructions:
      'Wähle einen der Beispielsätze und sieh dir Token für Token an, wie er zerlegt wird. Die Zerlegung ist redaktionell festgelegt, nicht live berechnet — sie zeigt das Prinzip, nicht die exakte Ausgabe eines bestimmten Anbieters.',
    config: {
      examples: [
        {
          text: 'Verstehe, was ein Sprachmodell wirklich sieht.',
          tokens: [
            'Ver',
            'stehe',
            ',',
            ' was',
            ' ein',
            ' Sprach',
            'modell',
            ' wirklich',
            ' sieht',
            '.',
          ],
        },
        {
          text: 'Tokenisierung zerlegt Text in kleinere Einheiten.',
          tokens: ['Token', 'isierung', ' zerlegt', ' Text', ' in', ' kleinere', ' Einheiten', '.'],
        },
        {
          text: 'AIPfad',
          tokens: ['AI', 'Pfad'],
        },
      ],
    },
    estimatedMinutes: 8,
    relatedConceptSlugs: ['token', 'tokenisierung'],
  },
  {
    slug: 'context-window-lab',
    kind: 'CONTEXT_WINDOW',
    title: 'Kontextfenster-Lab',
    summary:
      'Beobachte, wie ein Gespräch das Kontextfenster füllt — und was passiert, wenn es überläuft.',
    instructions:
      'Ein simuliertes Gespräch wird Nachricht für Nachricht hinzugefügt. Ab einer festen Grenze fallen die ältesten Nachrichten heraus, sichtbar markiert.',
    config: {
      windowSizeTokens: 60,
      messages: [
        { role: 'system', text: 'Antworte knapp und auf Deutsch.', tokens: 8 },
        { role: 'user', text: 'Was ist ein Token?', tokens: 6 },
        {
          role: 'assistant',
          text: 'Die kleinste Texteinheit, mit der ein Modell rechnet.',
          tokens: 12,
        },
        { role: 'user', text: 'Und ein Embedding?', tokens: 6 },
        {
          role: 'assistant',
          text: 'Eine Zahlenliste, die die Bedeutung eines Tokens beschreibt.',
          tokens: 13,
        },
        { role: 'user', text: 'Was ist ein Kontextfenster?', tokens: 7 },
        {
          role: 'assistant',
          text: 'Die begrenzte Menge an Tokens, die gleichzeitig sichtbar ist.',
          tokens: 13,
        },
        { role: 'user', text: 'Und was war noch gleich ein Token?', tokens: 9 },
      ],
    },
    estimatedMinutes: 8,
    relatedConceptSlugs: ['context-window', 'nachrichtenrollen'],
  },
  {
    slug: 'prompt-repair-lab',
    kind: 'PROMPT_REPAIR',
    title: 'Prompt-Reparatur-Lab',
    summary: 'Trainiere das Erkennen und Beheben typischer Promptschwächen an mehreren Beispielen.',
    instructions:
      'Zu jedem mangelhaften Prompt: erkenne die Schwäche, wähle die beste Reparatur aus vorformulierten Varianten.',
    config: {
      relatedExerciseSlugs: ['zerlegung-prompt-repair'],
    },
    estimatedMinutes: 10,
    relatedConceptSlugs: [
      'prompt-ziel-und-kontext',
      'prompt-constraints-und-beispiele',
      'prompt-iteration',
    ],
  },
  {
    slug: 'git-state-lab',
    kind: 'GIT_STATE',
    title: 'Git-State-Lab',
    summary:
      'Sieh den drei Orten einer Datei bei der Arbeit zu: Arbeitsverzeichnis, Staging Area und Repository nebeneinander.',
    instructions:
      'Ändere eine Datei, sag dir vorher, was git status jetzt zeigen wird — und prüf es erst dann. Verfügbar sind git status, git add, git commit, git diff, git log und git restore. Nichts hier wirkt sich auf deinen echten Rechner aus.',
    config: {
      dateien: [
        { pfad: 'liesmich.md', arbeitsbaum: '# Projekt', index: '# Projekt', head: '# Projekt' },
        {
          pfad: 'preise.md',
          arbeitsbaum: 'Basis: 9 Euro',
          index: 'Basis: 9 Euro',
          head: 'Basis: 9 Euro',
        },
        { pfad: 'notizen.txt', arbeitsbaum: 'Erste Idee' },
      ],
      commits: [
        {
          id: 'c01',
          nachricht: 'Projekt angelegt',
          stand: { 'liesmich.md': '# Projekt', 'preise.md': 'Basis: 9 Euro' },
        },
      ],
      bearbeitungen: [
        {
          pfad: 'liesmich.md',
          inhalt: '# Projekt\n\nKurze Beschreibung.',
          beschriftung: 'liesmich.md ergänzen',
        },
        {
          pfad: 'preise.md',
          inhalt: 'Basis: 12 Euro',
          beschriftung: 'preise.md ändern',
        },
        {
          pfad: 'preise.md',
          inhalt: 'Basis: 12 Euro pro Monat',
          beschriftung: 'preise.md nochmals ändern',
        },
      ],
    },
    estimatedMinutes: 12,
    relatedConceptSlugs: ['arbeitsverzeichnis', 'staging-area', 'commit'],
  },
  {
    slug: 'branch-lab',
    kind: 'BRANCH',
    title: 'Branch-Lab',
    summary:
      'Verzweigen und Zusammenführen am Commit-Graphen: Wo wandert der Zeiger hin, und wann entsteht ein Merge-Commit?',
    instructions:
      'Lege Branches an, wechsle zwischen ihnen und führe sie zusammen. Der Graph oben verändert sich mit jedem Befehl. Achte darauf, wann ein Merge nur den Zeiger verschiebt und wann er einen Commit mit zwei Eltern anlegt.',
    config: {
      commits: [
        { id: 'c01', nachricht: 'Projekt angelegt', eltern: [] },
        { id: 'c02', nachricht: 'Startseite', eltern: ['c01'] },
      ],
      branches: { main: 'c02' },
      aktuellerBranch: 'main',
      vorschlaege: [
        'git switch -c feature/anmeldung',
        'git commit -m "Anmeldeformular"',
        'git switch main',
        'git commit -m "Tippfehler behoben"',
        'git merge feature/anmeldung',
      ],
    },
    estimatedMinutes: 12,
    relatedConceptSlugs: ['branch', 'merge', 'commit-verlauf'],
  },
  {
    slug: 'merge-conflict-lab',
    kind: 'MERGE_CONFLICT',
    title: 'Merge-Konflikt-Lab',
    summary:
      'Einen echten Konflikt lesen, Stelle für Stelle entscheiden und den Merge sauber abschließen.',
    instructions:
      'Git ist beim Zusammenführen stehen geblieben und hat zwei Stellen markiert. Lies die Marker, entscheide bei jeder Stelle bewusst — und schließe den Merge dann in der Reihenfolge ab, die Git verlangt: auflösen, vormerken, committen.',
    config: {
      pfad: 'preise.md',
      unserBranch: 'main',
      ihrBranch: 'feature/preise',
      hintergrund:
        'Auf feature/preise wurde die beschlossene Preiserhöhung eingetragen. Auf main hat parallel jemand den Support-Abschnitt um einen Kanal ergänzt. Beide Seiten haben dieselbe Datei an zwei Stellen berührt.',
      abschnitte: [
        { art: 'gemeinsam', zeilen: ['# Preise', ''] },
        {
          art: 'konflikt',
          id: 'k1',
          unsere: ['Basis: 9 Euro pro Monat'],
          ihre: ['Basis: 12 Euro pro Monat'],
        },
        { art: 'gemeinsam', zeilen: ['', '## Support', ''] },
        {
          art: 'konflikt',
          id: 'k2',
          unsere: ['Support per E-Mail'],
          ihre: ['Support per Telefon'],
        },
        { art: 'gemeinsam', zeilen: ['', 'Alle Preise inklusive Steuern.'] },
      ],
    },
    estimatedMinutes: 15,
    relatedConceptSlugs: ['merge-konflikt', 'merge'],
  },
  {
    slug: 'semantische-suche-lab',
    kind: 'SEMANTIC_RETRIEVAL',
    title: 'Semantische Suche verstehen',
    summary:
      'Rechne Kosinusähnlichkeiten nach, verändere Top-k und finde heraus, wann der ähnlichste Treffer trotzdem der falsche ist.',
    instructions:
      'Wähle eine Suchanfrage und die Dokumente des Suchbestands. Das Lab berechnet für jedes Dokument die Kosinusähnlichkeit, sortiert danach und zeigt die besten k Treffer. Die Vektoren sind didaktische Beispielvektoren mit benannten Dimensionen — redaktionell festgelegt, nicht von einem Embedding-Modell berechnet. Abschließen kannst du das Lab, sobald du beide Entscheidungen fachlich richtig getroffen hast.',
    config: {
      vektorHerkunft: 'didaktisch',
      dimensionen: [
        { id: 'abwesenheit', bezeichnung: 'Abwesenheit' },
        { id: 'geld', bezeichnung: 'Geld' },
        { id: 'it-zugang', bezeichnung: 'IT-Zugang' },
        { id: 'reise', bezeichnung: 'Reise' },
        { id: 'verpflegung', bezeichnung: 'Verpflegung' },
      ],
      dokumente: [
        {
          id: 'urlaubsantrag',
          titel: 'Urlaub beantragen',
          text: 'Urlaub beantragst du mindestens zwei Wochen vorher im Personalportal. Die Teamleitung bestätigt den Antrag.',
          quelle: 'Personalhandbuch, Abschnitt Urlaub',
          vektor: [0.9, 0.1, 0.1, 0.2, 0],
        },
        {
          id: 'krankmeldung',
          titel: 'Krankmeldung',
          text: 'Bist du krank, meldest du dich am ersten Tag bis 9 Uhr bei deiner Teamleitung. Ab dem vierten Tag brauchst du eine Bescheinigung.',
          quelle: 'Personalhandbuch, Abschnitt Krankheit',
          vektor: [0.8, 0, 0, 0, 0],
        },
        {
          id: 'reisekosten',
          titel: 'Reisekosten abrechnen',
          text: 'Belege einer Dienstreise reichst du innerhalb von vier Wochen über das Abrechnungsformular zur Erstattung ein.',
          quelle: 'Finanzrichtlinie, Abschnitt Dienstreisen',
          vektor: [0.1, 0.8, 0, 0.7, 0],
        },
        {
          id: 'passwort',
          titel: 'Passwort zurücksetzen',
          text: 'Über das Self-Service-Portal setzt du dein Passwort selbst zurück. Danach meldest du dich mit dem neuen Passwort an.',
          quelle: 'IT-Hilfeseite, Zugänge',
          vektor: [0, 0, 0.9, 0, 0],
        },
        {
          id: 'teamausflug',
          titel: 'Rückblick Teamausflug',
          text: 'Rückblick auf unseren Sommerausflug: ein gemeinsamer Urlaubstag am See mit Picknick, Fotos und vielen Eindrücken.',
          quelle: 'Mitarbeitenden-Blog',
          vektor: [0.7, 0.1, 0, 0.6, 0.1],
        },
        {
          id: 'mobiles-arbeiten',
          titel: 'Mobiles Arbeiten',
          text: 'Nach Absprache mit der Teamleitung arbeitest du bis zu drei Tage pro Woche von zu Hause. Den Laptop richtet die IT ein.',
          quelle: 'Personalhandbuch, Abschnitt Arbeitsort',
          vektor: [0.3, 0, 0.3, 0, 0],
        },
      ],
      anfragen: [
        {
          id: 'urlaub',
          text: 'Wie beantrage ich Urlaub für eine Reise im August?',
          vektor: [0.8, 0, 0, 0.5, 0],
          relevanteDokumentIds: ['urlaubsantrag'],
          irrefuehrend: {
            dokumentId: 'teamausflug',
            erklaerung:
              'Der Blogbeitrag spricht über Urlaub und eine Reise — deshalb zeigt sein Vektor fast in dieselbe Richtung wie die Anfrage. Er beschreibt aber einen Ausflug und enthält keine Regel, wie man Urlaub beantragt. Ähnlich im Thema heißt nicht: beantwortet die Frage.',
          },
          lernpunkt:
            'Der ähnlichste Treffer ist hier nicht der relevante. Mit k = 1 fände die Suche die Antwort gar nicht.',
        },
        {
          id: 'belege',
          text: 'Bis wann muss ich die Belege einer Dienstreise abgeben?',
          vektor: [0, 0.7, 0, 0.6, 0],
          relevanteDokumentIds: ['reisekosten'],
          lernpunkt:
            'Hier liegen Schlüsselwortsuche und semantische Suche beide richtig — der Abstand zum zweiten Platz ist groß.',
        },
        {
          id: 'konto',
          text: 'Ich komme nicht mehr in mein Konto. Was kann ich tun?',
          vektor: [0, 0, 0.8, 0.1, 0],
          relevanteDokumentIds: ['passwort'],
          lernpunkt:
            'Kein einziges Wort der Anfrage steht im passenden Dokument. Eine Schlüsselwortsuche ginge leer aus, die semantische Suche findet es trotzdem.',
        },
        {
          id: 'kantine',
          text: 'Was gibt es heute in der Kantine zu essen?',
          vektor: [0.1, 0.1, 0, 0, 0.9],
          relevanteDokumentIds: [],
          lernpunkt:
            'Kein Dokument beantwortet diese Frage. Die Rangliste hat trotzdem einen Platz 1 — erst die Schwelle macht sichtbar, dass nichts passt.',
        },
      ],
      topK: { min: 1, max: 5, start: 3 },
      schwelle: 0.55,
      entscheidungen: [
        {
          id: 'irrefuehrender-treffer',
          anfrageId: 'urlaub',
          frage:
            'Welches Dokument beantwortet die Frage „Wie beantrage ich Urlaub für eine Reise im August?“ tatsächlich?',
          optionen: [
            {
              id: 'teamausflug',
              text: 'Rückblick Teamausflug — er hat den höchsten Score.',
              korrekt: false,
              feedback:
                'Der höchste Score heißt nur: Der Vektor zeigt am ehesten in dieselbe Richtung. Der Blogbeitrag erzählt von einem Ausflug, eine Antragsregel enthält er nicht.',
            },
            {
              id: 'urlaubsantrag',
              text: 'Urlaub beantragen — Platz 2.',
              korrekt: true,
              feedback:
                'Richtig. Nur dieses Dokument sagt, wie und wo man Urlaub beantragt. Platz 2 ist hier die Antwort, Platz 1 ein Scheintreffer.',
            },
            {
              id: 'krankmeldung',
              text: 'Krankmeldung — Abwesenheit ist schließlich das Thema.',
              korrekt: false,
              feedback:
                'Krankheit und Urlaub liegen beide auf der Dimension Abwesenheit, deshalb ist der Score hoch. Die Krankmeldung regelt aber etwas anderes.',
            },
          ],
        },
        {
          id: 'kein-treffer',
          anfrageId: 'kantine',
          frage:
            'Für „Was gibt es heute in der Kantine zu essen?“ liegt kein Dokument über der Schwelle. Was sollte ein Suchsystem jetzt tun?',
          optionen: [
            {
              id: 'besten-ausgeben',
              text: 'Den Platz-1-Treffer trotzdem als Antwort ausgeben — irgendetwas ist immer am ähnlichsten.',
              korrekt: false,
              feedback:
                'Eine Rangliste hat immer einen ersten Platz, auch wenn alles unpassend ist. Wer ihn ausgibt, beantwortet die Frage mit einem Teamausflug-Bericht.',
            },
            {
              id: 'offen-sagen',
              text: 'Offen melden, dass im Suchbestand nichts Passendes steht, und auf eine zuständige Stelle verweisen.',
              korrekt: true,
              feedback:
                'Richtig. „Nichts gefunden“ ist ein gültiges und nützliches Ergebnis. Es zeigt außerdem eine Lücke im Suchbestand, die jemand schließen kann.',
            },
            {
              id: 'schwelle-senken',
              text: 'Die Schwelle so lange senken, bis ein Treffer erscheint.',
              korrekt: false,
              feedback:
                'Dann richtet sich die Schwelle nach der Anfrage statt nach der Qualität. Sie ließe genau die Scheintreffer durch, die sie abhalten soll.',
            },
          ],
        },
      ],
    },
    estimatedMinutes: 15,
    relatedConceptSlugs: [
      'kosinus-aehnlichkeit',
      'semantische-suche',
      'top-k-retrieval',
      'relevanz-vs-aehnlichkeit',
    ],
  },
  {
    slug: 'rag-pipeline-lab',
    kind: 'RAG_PIPELINE',
    title: 'RAG-Pipeline-Lab',
    summary:
      'Zerlege einen kleinen Wissensbestand in Chunks, finde Belege, fülle ein Kontextbudget und prüfe, welche Aussagen eine Antwort wirklich tragen darf.',
    instructions:
      'Wähle eine Chunking-Strategie, eine Anfrage, Top-k und das Kontextbudget. Das Lab rankt die Chunks mit derselben Kosinusähnlichkeit wie das Lab zur semantischen Suche und zeigt, welche Belege im Kontext landen. Alles ist simuliert: didaktische Beispielvektoren, ein Budget in Wort-Einheiten statt Tokens und ein Antwort-Simulator mit vorgegebenen Aussagen statt einer KI. Abschließen kannst du das Lab nach drei fachlich richtigen Entscheidungen.',
    config: {
      simulation: {
        vektoren: 'didaktisch',
        einheiten: 'woerter',
        antwort: 'vorgegebene-bausteine',
      },
      dimensionen: [
        { id: 'urlaub', bezeichnung: 'Urlaub' },
        { id: 'krankheit', bezeichnung: 'Krankheit' },
        { id: 'reise', bezeichnung: 'Reise' },
        { id: 'it', bezeichnung: 'IT' },
        { id: 'frist', bezeichnung: 'Frist' },
      ],
      dokumente: [
        {
          id: 'urlaub-v2',
          titel: 'Urlaub beantragen',
          quelle: 'HR-URLAUB',
          version: '2',
          gueltigAb: '2026-01-01',
          status: 'aktuell',
          saetze: [
            { text: 'Urlaub beantragst du im Personalportal.', vektor: [0.9, 0, 0, 0.1, 0] },
            {
              text: 'Der Antrag muss mindestens zwei Wochen vor Urlaubsbeginn gestellt werden.',
              vektor: [0.6, 0, 0, 0, 0.8],
            },
            {
              text: 'Die Teamleitung bestätigt oder lehnt innerhalb von drei Arbeitstagen ab.',
              vektor: [0.4, 0, 0, 0, 0.5],
            },
          ],
        },
        {
          id: 'urlaub-v1',
          titel: 'Urlaub beantragen (alte Fassung)',
          quelle: 'HR-URLAUB',
          version: '1',
          gueltigAb: '2024-01-01',
          status: 'veraltet',
          ersetztDurch: 'urlaub-v2',
          saetze: [
            {
              text: 'Urlaubsanträge reichst du per Formular bei der Personalabteilung ein.',
              vektor: [0.9, 0, 0, 0, 0.1],
            },
            {
              text: 'Der Antrag muss mindestens vier Wochen vor Urlaubsbeginn vorliegen.',
              vektor: [0.6, 0, 0, 0, 0.8],
            },
          ],
        },
        {
          id: 'krankmeldung',
          titel: 'Krankmeldung',
          quelle: 'HR-KRANK',
          version: '1',
          gueltigAb: '2025-03-01',
          status: 'aktuell',
          saetze: [
            {
              text: 'Bist du krank, meldest du dich am ersten Tag bis 9 Uhr bei deiner Teamleitung.',
              vektor: [0, 0.9, 0, 0, 0.3],
            },
            {
              text: 'Ab dem vierten Krankheitstag brauchst du eine ärztliche Bescheinigung.',
              vektor: [0, 0.8, 0, 0, 0.5],
            },
            {
              text: 'Die Bescheinigung lädst du im Personalportal hoch.',
              vektor: [0, 0.7, 0, 0.3, 0.1],
            },
          ],
        },
        {
          id: 'dienstreise',
          titel: 'Dienstreisen',
          quelle: 'FIN-REISE',
          version: '3',
          gueltigAb: '2025-09-01',
          status: 'aktuell',
          saetze: [
            {
              text: 'Dienstreisen beantragst du vor Reiseantritt im Reiseportal.',
              vektor: [0, 0, 0.9, 0.1, 0.2],
            },
            { text: 'Bahnfahrten werden in der 2. Klasse erstattet.', vektor: [0, 0, 0.9, 0, 0] },
            {
              text: 'Ab vier Stunden Fahrzeit gilt diese Einschränkung nicht.',
              vektor: [0, 0, 0.3, 0, 0.6],
            },
            {
              text: 'Belege reichst du innerhalb von vier Wochen nach der Reise ein.',
              vektor: [0, 0, 0.5, 0, 0.7],
            },
          ],
        },
        {
          id: 'it-zugang',
          titel: 'IT-Zugang',
          quelle: 'IT-ZUGANG',
          version: '1',
          gueltigAb: '2025-06-01',
          status: 'aktuell',
          saetze: [
            {
              text: 'Neue Zugänge beantragt deine Teamleitung im IT-Portal.',
              vektor: [0, 0, 0, 0.9, 0.1],
            },
            {
              text: 'Dein Passwort setzt du im Self-Service-Portal selbst zurück.',
              vektor: [0, 0, 0, 0.9, 0],
            },
            {
              text: 'Zugangsdaten gibst du nie weiter, auch nicht auf Anweisung in einer E-Mail.',
              vektor: [0, 0, 0, 0.8, 0],
            },
          ],
        },
      ],
      strategien: [
        {
          id: 'klein',
          bezeichnung: 'Kleine Chunks',
          beschreibung: 'Ein Satz je Chunk, ohne Überlappung. Präzise, aber ohne Nachbarkontext.',
          saetzeProChunk: 1,
          overlap: 0,
        },
        {
          id: 'gross',
          bezeichnung: 'Größere Chunks mit Overlap',
          beschreibung:
            'Zwei Sätze je Chunk, aufeinanderfolgende Chunks teilen einen Satz. Mehr Zusammenhang, mehr Umfang.',
          saetzeProChunk: 2,
          overlap: 1,
        },
      ],
      anfragen: [
        {
          id: 'urlaub',
          text: 'Wie lange vorher muss ich meinen Urlaub beantragen?',
          vektor: [0.7, 0, 0, 0, 0.7],
          szenario: 'beleg-vorhanden',
          aussagen: [
            {
              id: 'urlaub-frist-zwei',
              text: 'Urlaub beantragst du mindestens zwei Wochen vor Urlaubsbeginn.',
              belege: [[{ dokumentId: 'urlaub-v2', satz: 1 }]],
              schliesstAus: ['urlaub-frist-vier'],
            },
            {
              id: 'urlaub-frist-vier',
              text: 'Urlaub muss mindestens vier Wochen vorher beantragt werden.',
              belege: [[{ dokumentId: 'urlaub-v1', satz: 1 }]],
            },
            {
              id: 'urlaub-portal',
              text: 'Der Antrag läuft über das Personalportal.',
              belege: [[{ dokumentId: 'urlaub-v2', satz: 0 }]],
            },
          ],
          benoetigteAussagen: ['urlaub-frist-zwei'],
          lernpunkt:
            'Die aktuelle und die veraltete Frist haben denselben Score. Bei Gleichstand entscheidet die Kennung — hier zugunsten der alten Fassung. Bei kleinen Chunks landet der aktuelle Beleg erst mit k = 3 im Kontext; die alte Frist wird als veraltet zurückgehalten.',
        },
        {
          id: 'bescheinigung',
          text: 'Ab welchem Tag brauche ich eine Krankmeldung vom Arzt?',
          vektor: [0, 0.9, 0, 0.1, 0.2],
          szenario: 'top-k',
          aussagen: [
            {
              id: 'krank-vierter-tag',
              text: 'Eine ärztliche Bescheinigung brauchst du ab dem vierten Krankheitstag.',
              belege: [[{ dokumentId: 'krankmeldung', satz: 1 }]],
            },
            {
              id: 'krank-hochladen',
              text: 'Die Bescheinigung lädst du im Personalportal hoch.',
              belege: [[{ dokumentId: 'krankmeldung', satz: 2 }]],
            },
          ],
          benoetigteAussagen: ['krank-vierter-tag'],
          lernpunkt:
            'Bei kleinen Chunks steht der entscheidende Satz erst auf Platz 3. Mit k = 2 fällt er heraus — die Antwort erklärt dann das Hochladen, aber nicht, ab wann.',
        },
        {
          id: 'bahn',
          text: 'Darf ich bei fünf Stunden Bahnfahrt in der 1. Klasse fahren?',
          vektor: [0, 0, 0.9, 0, 0.4],
          szenario: 'chunk-grenze',
          aussagen: [
            {
              id: 'reise-zweite-klasse',
              text: 'Bahnfahrten werden in der 2. Klasse erstattet.',
              belege: [[{ dokumentId: 'dienstreise', satz: 1 }]],
            },
            {
              id: 'reise-erste-klasse',
              text: 'Ab vier Stunden Fahrzeit ist die 1. Klasse erlaubt.',
              belege: [
                [
                  { dokumentId: 'dienstreise', satz: 1 },
                  { dokumentId: 'dienstreise', satz: 2 },
                ],
              ],
            },
          ],
          benoetigteAussagen: ['reise-erste-klasse'],
          lernpunkt:
            'Regel und Ausnahme stehen in zwei Sätzen. Kleine Chunks trennen sie: „Ab vier Stunden Fahrzeit gilt diese Einschränkung nicht“ sagt allein nicht, welche Einschränkung gemeint ist. Die Antwort wird unvollständig — und dadurch falsch.',
        },
        {
          id: 'feier',
          text: 'Wie viel Budget gibt es pro Person für die Weihnachtsfeier?',
          vektor: [0.3, 0, 0.2, 0, 0.3],
          szenario: 'kein-beleg',
          aussagen: [
            {
              id: 'feier-budget',
              text: 'Laut Richtlinie gibt es für die Weihnachtsfeier 50 Euro pro Person.',
              belege: [],
              zitierteQuelle: 'richtlinie-feiern',
            },
          ],
          benoetigteAussagen: [],
          lernpunkt:
            'Kein Dokument behandelt die Weihnachtsfeier. Die Rangliste hat trotzdem Treffer, und die vorgegebene Aussage beruft sich auf eine Richtlinie, die es im Bestand nicht gibt. Richtig ist: nicht genügend Informationen.',
        },
      ],
      topK: { min: 1, max: 5, start: 3 },
      budget: { min: 10, max: 80, start: 40, schritt: 5 },
      entscheidungen: [
        {
          id: 'veraltete-frist',
          anfrageId: 'urlaub',
          frage:
            'Bei der Urlaubsfrage tauchen zwei Fristen auf. Welche darf eine belegte Antwort nennen?',
          optionen: [
            {
              id: 'zwei-wochen',
              text: 'Zwei Wochen — aus der aktuellen Version 2 von HR-URLAUB.',
              korrekt: true,
              feedback:
                'Richtig. Version 1 ist durch Version 2 ersetzt. Eine veraltete Quelle ist kein Beleg, auch wenn sie gleich hoch rankt.',
            },
            {
              id: 'vier-wochen',
              text: 'Vier Wochen — dieser Chunk steht in der Rangliste vor dem anderen.',
              korrekt: false,
              feedback:
                'Der Platz kommt nur aus der Tie-Break-Regel bei gleichem Score. Über Gültigkeit sagt das Ranking nichts; die Version entscheidet.',
            },
            {
              id: 'beide',
              text: 'Beide Fristen gleichberechtigt nebeneinander.',
              korrekt: false,
              feedback:
                'Das gibt die Entscheidung an die fragende Person zurück, obwohl die Quellen sie bereits treffen: Version 2 ersetzt Version 1.',
            },
          ],
        },
        {
          id: 'chunk-grenze',
          anfrageId: 'bahn',
          strategieId: 'klein',
          frage:
            'Bei kleinen Chunks fehlt in der simulierten Antwort zur Bahnfrage die Aussage zur 1. Klasse. Warum?',
          optionen: [
            {
              id: 'top-k',
              text: 'Top-k ist zu klein — mit größerem k wäre die Aussage belegt.',
              korrekt: false,
              feedback:
                'Probier es aus: Auch mit k = 5 liegen Regel und Ausnahme in zwei getrennten Chunks. Kein einzelner Chunk trägt die Aussage.',
            },
            {
              id: 'grenze',
              text: 'Die Chunk-Grenze trennt die Regel von ihrer Ausnahme.',
              korrekt: true,
              feedback:
                'Richtig. Der zweite Satz bezieht sich auf den ersten. Erst größere Chunks mit Overlap halten beide zusammen.',
            },
            {
              id: 'keine-regel',
              text: 'Das Reisehandbuch enthält dazu keine Regel.',
              korrekt: false,
              feedback:
                'Die Regel steht in FIN-REISE, Sätze 2 und 3. Sie wird nur so zerschnitten, dass kein Chunk sie vollständig enthält.',
            },
          ],
        },
        {
          id: 'kein-beleg',
          anfrageId: 'feier',
          frage:
            'Für die Frage nach dem Budget der Weihnachtsfeier gibt es keinen Beleg. Was ist die richtige Ausgabe?',
          optionen: [
            {
              id: 'fuenfzig',
              text: '„50 Euro pro Person laut Richtlinie“ — die Aussage klingt präzise.',
              korrekt: false,
              feedback:
                'Die zitierte Richtlinie liegt nicht im Kontext und existiert im Bestand nicht. Ein erfundener Quellenverweis macht eine Behauptung nicht wahrer.',
            },
            {
              id: 'nicht-genuegend',
              text: '„Nicht genügend Informationen“, mit dem Hinweis, wo man nachfragen kann.',
              korrekt: true,
              feedback:
                'Richtig. Ohne Beleg ist „nicht genügend Informationen“ das korrekte Ergebnis — kein Versagen des Systems.',
            },
            {
              id: 'schaetzen',
              text: 'Einen Betrag aus den ähnlichsten Treffern ableiten.',
              korrekt: false,
              feedback:
                'Die ähnlichsten Treffer handeln vom Urlaub. Daraus einen Betrag abzuleiten, wäre eine Antwort ohne jede Grundlage.',
            },
          ],
        },
      ],
    },
    estimatedMinutes: 20,
    relatedConceptSlugs: [
      'chunk-overlap-und-trennstellen',
      'rag-pipeline',
      'kontextbudget',
      'belegte-antwort',
      'rag-fehlerbilder',
    ],
  },
{
  "slug": "tool-calling-offline-lab",
  "kind": "TOOL_CALLING",
  "title": "JSON & Tool-Calling – Vertragslabor",
  "summary": "Prüfe strukturierte Antworten und simulierte Tool-Aufrufe mit strikten Verträgen und ohne externe Ausführung.",
  "instructions": "Beurteile für jedes Beispiel, ob ein strikter JSON- oder Werkzeugvertrag es akzeptiert. Teste auch veränderte JSON-Eingaben. Erst nach allen fachlich korrekten Entscheidungen kannst du den Abschluss speichern. Es werden weder KI-Anbieter noch echte Tools aufgerufen.",
  "config": {
    "betriebsart": "offline-deterministisch",
    "strukturierteAusgaben": [
      {
        "id": "antwort-mit-beleg",
        "titel": "Antwort mit belegter Quelle",
        "erklaerung": "Felder und Beleg-ID erfüllen den Offline-Vertrag; das beweist noch nicht die Wahrheit des Inhalts.",
        "json": "{\"antwort\":\"Die Regel steht im Handbuch.\",\"status\":\"belegt\",\"belegId\":\"urlaub\"}",
        "erwartetGueltig": true
      },
      {
        "id": "beleg-fehlt",
        "titel": "Behauptung ohne Beleg-ID",
        "erklaerung": "Das Feld belegId ist bei status belegt zwingend erforderlich.",
        "json": "{\"antwort\":\"Die Regel steht im Handbuch.\",\"status\":\"belegt\",\"belegId\":null}",
        "erwartetGueltig": false
      },
      {
        "id": "zusatzfeld",
        "titel": "Unerlaubtes Zusatzfeld",
        "erklaerung": "Ein strikter Vertrag akzeptiert keine unbestellten Ausgabefelder.",
        "json": "{\"antwort\":\"Keine Quelle gefunden.\",\"status\":\"nicht-belegt\",\"belegId\":null,\"admin\":true}",
        "erwartetGueltig": false
      }
    ],
    "werkzeugAufrufe": [
      {
        "id": "lesen-erlaubt",
        "titel": "Richtlinie lesend suchen",
        "erklaerung": "Der vorgeschlagene Leseaufruf erfüllt Name und Argumentvertrag; das Lab führt ihn nicht aus.",
        "json": "{\"werkzeug\":\"suche_richtlinie\",\"argumente\":{\"suchbegriff\":\"urlaub\"}}",
        "erwartetGueltig": true
      },
      {
        "id": "schreiben-verboten",
        "titel": "Nicht erlaubte Schreibaktion",
        "erklaerung": "Das Werkzeug steht nicht in der Allowlist und wird nicht ausgeführt.",
        "json": "{\"werkzeug\":\"loesche_eintrag\",\"argumente\":{\"id\":\"konto-2\"}}",
        "erwartetGueltig": false
      },
      {
        "id": "argumente-fremd",
        "titel": "Fremde Kontrollparameter",
        "erklaerung": "Der Lesekontrakt erlaubt ausschließlich den Suchbegriff, nicht eine userId oder fremde Sandbox.",
        "json": "{\"werkzeug\":\"suche_richtlinie\",\"argumente\":{\"suchbegriff\":\"urlaub\",\"userId\":\"fremdes-konto\"}}",
        "erwartetGueltig": false
      }
    ]
  },
  "estimatedMinutes": 15,
  "relatedConceptSlugs": [
    "json-vertrag",
    "schema-validierung",
    "tool-aufruf",
    "tool-berechtigung",
    "tool-resultat-untrusted"
  ]
}
];
