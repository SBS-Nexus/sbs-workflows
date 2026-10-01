export type PathStatus = 'available' | 'building' | 'planned';

export type LearningPath = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  outcome: string;
  status: PathStatus;
  href?: string;
  accent: 'indigo' | 'teal' | 'violet' | 'amber' | 'sky' | 'rose';
  topics: readonly string[];
};

function optionalUrl(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && /^https?:\/\//.test(value) ? value.replace(/\/$/, '') : undefined;
}

const pythonUrl = optionalUrl('NEXT_PUBLIC_PYTHONPFAD_URL');
const sqlUrl = optionalUrl('NEXT_PUBLIC_SQLPFAD_URL');
const aiUrl = optionalUrl('NEXT_PUBLIC_AIPFAD_URL');
const gitUrl =
  optionalUrl('NEXT_PUBLIC_GITPFAD_URL') ??
  (aiUrl ? `${aiUrl}/lektion/warum-versionsverwaltung/1` : undefined);

export const CORE_PATHS: readonly LearningPath[] = [
  {
    slug: 'python',
    eyebrow: 'Programmieren',
    title: 'PythonPfad',
    description:
      'Programmieren von Grund auf verstehen, Code lesen, selbst schreiben und Fehler systematisch eingrenzen.',
    outcome: 'Von der ersten Zeile bis zu eigenen kleinen Anwendungen.',
    status: 'available',
    href: pythonUrl,
    accent: 'indigo',
    topics: ['Syntax', 'Logik', 'Funktionen', 'Daten', 'Projekte'],
  },
  {
    slug: 'sql',
    eyebrow: 'Daten',
    title: 'SQLPfad',
    description:
      'Datenbanken verstehen und echte Abfragen schreiben – nicht nur SELECT-Syntax auswendig lernen.',
    outcome: 'Daten sicher filtern, verbinden, aggregieren und auswerten.',
    status: 'available',
    href: sqlUrl,
    accent: 'teal',
    topics: ['SELECT', 'JOIN', 'GROUP BY', 'Datenmodell', 'Projekte'],
  },
  {
    slug: 'git',
    eyebrow: 'Softwarearbeit',
    title: 'Git & GitHub',
    description:
      'Commits, Branches, Pull Requests und Reviews als Arbeitsmodell verstehen – inklusive AI-gestützter Entwicklung.',
    outcome: 'Änderungen nachvollziehbar planen, prüfen und gemeinsam ausliefern.',
    status: 'available',
    href: gitUrl,
    accent: 'violet',
    topics: ['Git', 'Branches', 'Pull Requests', 'Reviews', 'AI Coding'],
  },
];

export const NEXT_PATHS: readonly LearningPath[] = [
  {
    slug: 'ai',
    eyebrow: 'AI Literacy',
    title: 'AIPfad',
    description:
      'LLMs, Tokens, Embeddings, RAG, Agents, MCP und AI-Governance als zusammenhängendes System lernen.',
    outcome: 'AI nicht nur benutzen, sondern verstehen, steuern und verifizieren.',
    status: 'building',
    href: aiUrl,
    accent: 'amber',
    topics: ['LLMs', 'Prompting', 'RAG', 'Agents', 'MCP'],
  },
  {
    slug: 'vokabeln',
    eyebrow: 'Wiederholen',
    title: 'VokabelPfad',
    description:
      'Sprachen und Fachbegriffe mit kurzen täglichen Sessions, aktivem Abruf und Spaced Repetition lernen.',
    outcome: 'Ein gemeinsamer Wiederholungsmotor für Sprache und technische Begriffe.',
    status: 'planned',
    accent: 'rose',
    topics: ['Vokabeln', 'Aussprache', 'Sätze', 'Spaced Repetition', 'Daily 5'],
  },
  {
    slug: 'typescript',
    eyebrow: 'Web & AI Apps',
    title: 'TypeScriptPfad',
    description:
      'TypeScript, APIs und moderne Web-Anwendungen mit klaren Typen und überprüfbaren Schnittstellen.',
    outcome: 'Die Brücke von AI-Prototypen zu robusten produktiven Anwendungen.',
    status: 'planned',
    accent: 'sky',
    topics: ['TypeScript', 'React', 'Next.js', 'APIs', 'Testing'],
  },
  {
    slug: 'data-analytics',
    eyebrow: 'Daten → AI',
    title: 'Data & Analytics',
    description:
      'Python und SQL zu belastbarer Analyse verbinden: Datenqualität, Statistik, Visualisierung und reproduzierbare Auswertungen.',
    outcome: 'Die Datengrundlage verstehen, auf der RAG, Evals und AI-Produkte überhaupt aufbauen.',
    status: 'planned',
    accent: 'teal',
    topics: ['pandas', 'Datenqualität', 'Statistik', 'Visualisierung', 'Datasets'],
  },
  {
    slug: 'automation',
    eyebrow: 'AI Engineering',
    title: 'Agenten & Automation',
    description:
      'Tool Calling, Workflows, Agenten, Evaluierungen und sichere Automatisierung praktisch zusammensetzen.',
    outcome: 'Von einzelnen Prompts zu belastbaren AI-Workflows.',
    status: 'planned',
    accent: 'violet',
    topics: ['Tools', 'Agents', 'Evals', 'Workflows', 'Governance'],
  },
  {
    slug: 'security',
    eyebrow: 'Trust & Security',
    title: 'SecurityPfad',
    description:
      'Auth, OAuth/OIDC, Secrets, Berechtigungen und typische Web- und Agentenrisiken anhand echter Systemgrenzen verstehen.',
    outcome: 'AI- und Websysteme bauen, ohne Sicherheit erst nachträglich anzuschrauben.',
    status: 'planned',
    accent: 'amber',
    topics: ['Auth', 'OAuth/OIDC', 'Secrets', 'Least Privilege', 'Agent Security'],
  },
];

export const STATUS_LABEL: Record<PathStatus, string> = {
  available: 'Verfügbar',
  building: 'In Ausbau',
  planned: 'Geplant',
};
