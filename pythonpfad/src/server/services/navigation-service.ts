import 'server-only';
import { prisma } from '@/server/db/prisma';
import { STATIC_COMMANDS, type CommandEntry } from '@/lib/search/command-index';

/**
 * Stellt das Suchverzeichnis für die Befehlspalette zusammen.
 *
 * Das Verzeichnis wird im Rahmenlayout einmal je Seitenaufruf gelesen und an
 * den Browser gegeben. Das ist vertretbar, weil es klein ist (Größenordnung
 * einige Dutzend Einträge) und nur veröffentlichte Inhalte enthält – also
 * nichts, was nicht ohnehin über die Navigation erreichbar wäre.
 *
 * Personenbezogenes steht bewusst nicht darin. Der Fortschrittsvermerk sagt
 * „abgeschlossen" oder „begonnen", enthält aber keine Bewertungen, keine
 * Versuchszahlen und keine Zeitangaben.
 */
export async function buildCommandIndex(userId: string): Promise<CommandEntry[]> {
  const [lessons, projects, reviewSets, progress] = await Promise.all([
    prisma.lesson.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        slug: true,
        title: true,
        order: true,
        module: { select: { title: true, order: true } },
        concepts: { select: { concept: { select: { name: true } } } },
      },
      orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
    }),
    prisma.project.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true, description: true, difficulty: true },
      orderBy: { difficulty: 'asc' },
    }),
    prisma.reviewSet.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true, description: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: { state: true, lesson: { select: { slug: true } } },
    }),
  ]);

  const stateBySlug = new Map(progress.map((row) => [row.lesson.slug, row.state]));

  const lessonEntries: CommandEntry[] = lessons.map((lesson) => {
    const state = stateBySlug.get(lesson.slug);
    const conceptNames = lesson.concepts.map((link) => link.concept.name).join(' ');
    return {
      id: `lektion-${lesson.slug}`,
      title: lesson.title,
      keywords: `lektion ${lesson.module.title} ${conceptNames}`,
      group: 'Lektionen',
      href: `/lernen/${lesson.slug}`,
      hint:
        state === 'COMPLETED'
          ? 'abgeschlossen'
          : state === 'IN_PROGRESS'
            ? 'begonnen'
            : lesson.module.title,
      icon: '◆',
    };
  });

  const projectEntries: CommandEntry[] = projects.map((project) => ({
    id: `projekt-${project.slug}`,
    title: project.title,
    keywords: `projekt ${project.description}`,
    group: 'Projekte',
    href: `/projekte/${project.slug}`,
    hint: `Stufe ${project.difficulty}`,
    icon: '▣',
  }));

  const reviewEntries: CommandEntry[] = reviewSets.map((set) => ({
    id: `wiederholung-${set.slug}`,
    title: set.title,
    keywords: `wiederholung ${set.description}`,
    group: 'Wiederholen',
    href: `/wiederholen/${set.slug}`,
    icon: '↺',
  }));

  return [...STATIC_COMMANDS, ...lessonEntries, ...projectEntries, ...reviewEntries];
}
