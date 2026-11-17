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
