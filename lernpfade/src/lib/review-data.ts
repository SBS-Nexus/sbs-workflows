export type ReviewDomain = 'python' | 'sql' | 'git' | 'ai' | 'language';

export type ReviewItem = {
  id: string;
  domain: ReviewDomain;
  label: string;
  prompt: string;
  answer: string;
  example?: string;
};

export const REVIEW_ITEMS: readonly ReviewItem[] = [
  {
    id: 'python-list-comprehension',
    domain: 'python',
    label: 'Python',
    prompt: 'Was ist eine List Comprehension?',
    answer: 'Eine kompakte Schreibweise, um aus einem Iterable eine neue Liste zu erzeugen.',
    example: '[x * 2 for x in zahlen]',
  },
  {
    id: 'python-dict',
    domain: 'python',
    label: 'Python',
    prompt: 'Wofür nutzt man ein dict?',
    answer: 'Für Schlüssel-Wert-Zuordnungen, wenn Werte über eindeutige Schlüssel adressiert werden.',
    example: "{ 'name': 'Ada', 'rolle': 'admin' }",
  },
  {
    id: 'sql-left-join',
    domain: 'sql',
    label: 'SQL',
    prompt: 'Was garantiert ein LEFT JOIN?',
    answer: 'Alle Zeilen der linken Tabelle bleiben erhalten, auch wenn rechts kein Treffer existiert.',
  },
  {
    id: 'sql-group-by',
    domain: 'sql',
    label: 'SQL',
    prompt: 'Wann braucht eine Aggregation typischerweise GROUP BY?',
    answer: 'Wenn Aggregatwerte getrennt für Gruppen von Zeilen berechnet werden sollen.',
    example: 'SELECT team, COUNT(*) FROM users GROUP BY team;',
  },
  {
    id: 'git-commit',
    domain: 'git',
    label: 'Git',
    prompt: 'Was ist ein Commit?',
    answer: 'Eine benannte Momentaufnahme des Repository-Zustands mit Elternbezug und Metadaten.',
  },
  {
    id: 'git-fetch',
    domain: 'git',
    label: 'Git',
    prompt: 'Was macht git fetch – und was bewusst nicht?',
    answer: 'Es lädt neue Remote-Referenzen und Objekte, verändert aber deinen Arbeitsbaum nicht.',
  },
  {
    id: 'git-pr',
    domain: 'git',
    label: 'GitHub',
    prompt: 'Was ist der Zweck eines Pull Requests?',
    answer: 'Eine Änderung vor dem Zusammenführen sichtbar, prüfbar und diskutierbar zu machen.',
  },
  {
    id: 'ai-token',
    domain: 'ai',
    label: 'AI',
    prompt: 'Was ist ein Token bei einem Sprachmodell?',
    answer: 'Eine Verarbeitungseinheit aus Text; sie ist weder zwingend ein Wort noch ein Zeichen.',
  },
  {
    id: 'ai-embedding',
    domain: 'ai',
    label: 'AI',
    prompt: 'Was ist ein Embedding?',
    answer: 'Eine numerische Vektorrepräsentation, die semantische Eigenschaften eines Inhalts abbildet.',
  },
  {
    id: 'ai-rag',
    domain: 'ai',
    label: 'AI',
    prompt: 'Wofür steht RAG?',
    answer: 'Retrieval-Augmented Generation: relevante Quellen werden gesucht und dem Modell als Kontext gegeben.',
  },
  {
    id: 'ai-agent',
    domain: 'ai',
    label: 'AI',
    prompt: 'Was unterscheidet einen Agenten von einem einzelnen LLM-Aufruf?',
    answer: 'Ein Agent kann über mehrere Schritte Zustand halten, Werkzeuge auswählen und Aktionen ausführen.',
  },
  {
    id: 'language-retrieval',
    domain: 'language',
    label: 'EN → DE',
    prompt: 'retrieval',
    answer: 'Abruf · Wiederauffinden',
    example: 'retrieval system → Abrufsystem',
  },
] as const;
