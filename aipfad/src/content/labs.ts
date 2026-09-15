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
];
