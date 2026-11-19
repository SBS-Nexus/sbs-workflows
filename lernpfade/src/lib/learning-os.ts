import { CORE_PATHS, NEXT_PATHS, STATUS_LABEL, type LearningPath, type PathStatus } from './catalog.ts';

/**
 * Learning OS — redaktionelle Inhalte der Startseite und der Designstudie.
 *
 * Ziele und Status kommen ausschließlich aus `catalog.ts`: Ein Pfad ohne
 * konfigurierte Adresse bekommt kein `href` und wird als „nicht verbunden"
 * gezeigt, nie als toter Link. Es gibt hier keine Fortschrittswerte.
 */

export type LearningOsTrack = {
  slug: 'python' | 'sql' | 'git' | 'ai';
  number: string;
  /** Kurzer Anzeigename in der Pfadzeile. */
  name: string;
  /** Name der Fach-App aus dem Katalog. */
  appName: string;
  category: string;
  description: string;
  micro: string;
  href?: string;
  status: PathStatus;
  statusLabel: string;
};

function catalogPath(slug: string): LearningPath {
  const path = [...CORE_PATHS, ...NEXT_PATHS].find((entry) => entry.slug === slug);
  if (!path) throw new Error(`Lernpfad „${slug}" fehlt im Katalog.`);
  return path;
}

function track(
  slug: LearningOsTrack['slug'],
  number: string,
  name: string,
  category: string,
  description: string,
  micro: string,
): LearningOsTrack {
  const path = catalogPath(slug);
  return {
    slug,
    number,
    name,
    appName: path.title,
    category,
    description,
    micro,
    ...(path.href ? { href: path.href } : {}),
    status: path.status,
    statusLabel: STATUS_LABEL[path.status],
  };
}

export const LEARNING_OS_TRACKS: readonly LearningOsTrack[] = [
  track('python', '01', 'Python', 'Logik & Code', 'Von der ersten Variable zum eigenen Denken in Systemen.', 'print("hello, world")'),
  track('sql', '02', 'SQL', 'Daten & Struktur', 'Stelle bessere Fragen. Finde Antworten in deinen Daten.', 'SELECT * FROM wissen;'),
  track('git', '03', 'Git & GitHub', 'Versionen & Zusammenarbeit', 'Verstehe, wie Ideen zu nachvollziehbaren Versionen werden.', 'git commit -m "learn"'),
  track('ai', '04', 'AI', 'Modelle & Intelligenz', 'Durchdringe, was LLMs können – und wo ihre Grenzen liegen.', 'reason → test → verify'),
];

/** Pfade, die im Katalog als geplant geführt werden — ohne Link, ohne Datum. */
export const LEARNING_OS_PLANNED: readonly { slug: string; title: string; statusLabel: string }[] = NEXT_PATHS.filter(
  (path) => path.status === 'planned',
).map((path) => ({ slug: path.slug, title: path.title, statusLabel: STATUS_LABEL[path.status] }));

/** Der VokabelPfad aus dem Katalog (lokaler MVP im Hub). */
export const LEARNING_OS_VOCAB = (() => {
  const path = catalogPath('vokabeln');
  return { href: path.href ?? '/vokabeln', statusLabel: STATUS_LABEL[path.status] };
})();

/** SQL-Ziel für die Brücke aus dem Lernmoment; `undefined` = nicht verbunden. */
export const LEARNING_OS_SQL_HREF = catalogPath('sql').href;

/*
 * Empfohlene Reihenfolge (Roadmap E1, Lücke L4): zwei Wege durch die Pfade.
 *
 * Einsteiger: Python → SQL → AI, Git & GitHub begleitet ab der ersten Woche.
 * Fachbereiche: SQL → AI. Adressen und Status kommen wie bei den Pfadzeilen
 * aus dem Katalog – ein nicht verbundener Pfad bekommt keinen Startlink.
 */

export type LearningOsRouteStep = {
  slug: 'python' | 'sql' | 'ai';
  name: string;
  appName: string;
  /** Warum dieser Schritt an dieser Stelle steht. */
  why: string;
  status: PathStatus;
  statusLabel: string;
};

export type LearningOsRoute = {
  id: 'einstieg' | 'fachbereich';
  eyebrow: string;
  title: string;
  audience: string;
  steps: readonly LearningOsRouteStep[];
  /** Was neben der Reihenfolge herläuft oder später dazukommt. */
  companion: { text: string; href?: string; linkLabel?: string };
  start: { label: string; href?: string };
};

function step(slug: LearningOsRouteStep['slug'], name: string, why: string): LearningOsRouteStep {
  const path = catalogPath(slug);
  return { slug, name, appName: path.title, why, status: path.status, statusLabel: STATUS_LABEL[path.status] };
}

const gitHref = catalogPath('git').href;
const pythonHref = catalogPath('python').href;
const sqlHref = catalogPath('sql').href;

export const LEARNING_OS_ROUTES: readonly LearningOsRoute[] = [
  {
    id: 'einstieg',
    eyebrow: 'Weg A · Neu im Thema',
    title: 'Erst Logik, dann Daten, dann AI.',
    audience: 'Für alle, die zum ersten Mal programmieren oder mit Daten arbeiten.',
    steps: [
      step(
        'python',
        'Python',
        'Variablen, Bedingungen, Funktionen: Hier lernst du, ein Problem in Schritte zu zerlegen. Darauf baut alles Weitere auf.',
      ),
      step(
        'sql',
        'SQL',
        'Wer in Schritten denken kann, lernt leichter, in Mengen zu denken: filtern, verbinden, zusammenfassen.',
      ),
      step(
        'ai',
        'AI',
        'Tokens, Embeddings und RAG ergeben erst Sinn, wenn du Code und Daten schon selbst in der Hand hattest.',
      ),
    ],
    companion: {
      text: 'Git & GitHub läuft ab der ersten Woche mit: Jede eigene Zeile Code bekommt von Anfang an eine nachvollziehbare Version.',
      ...(gitHref ? { href: gitHref, linkLabel: 'Git-Grundlagen ansehen' } : {}),
    },
    start: { label: 'Mit Python beginnen', ...(pythonHref ? { href: pythonHref } : {}) },
  },
  {
    id: 'fachbereich',
    eyebrow: 'Weg B · Fachbereich & Team',
    title: 'Direkt an die eigenen Daten, dann AI mit Verstand.',
    audience: 'Für Controlling, Vertrieb, Personal und alle, die täglich mit Auswertungen arbeiten.',
    steps: [
      step(
        'sql',
        'SQL',
        'Die Fragen gibt es schon – welche Kundinnen haben seit März nichts mehr bestellt? SQL beantwortet sie ohne Umweg über die IT.',
      ),
      step(
        'ai',
        'AI',
        'Prompting, die Grenzen von Sprachmodellen, Datenschutz und Governance. Seit dem 2. Februar 2025 verlangt die KI-Verordnung der EU (Art. 4), dass Unternehmen, die KI einsetzen, für ausreichende KI-Kompetenz ihrer Beschäftigten sorgen.',
      ),
    ],
    companion: {
      text: 'Python kommt dazu, sobald Auswertungen regelmäßig wiederkehren und automatisiert werden sollen.',
    },
    start: { label: 'Mit SQL beginnen', ...(sqlHref ? { href: sqlHref } : {}) },
  },
];
