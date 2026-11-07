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
];
