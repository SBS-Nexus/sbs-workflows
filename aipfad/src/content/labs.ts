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
];
