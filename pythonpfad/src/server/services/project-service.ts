import 'server-only';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { testCaseSchema, type TestCase } from '@/domain/content/exercise-payload';
import { recordAnonymousEvent } from './lesson-service';

/**
 * Fachdienst für die Projektwerkstatt.
 *
 * Ein Projekt gilt als abgenommen, wenn alle Meilensteine erfüllt sind UND eine
 * Reflexion vorliegt. Die Reflexion ist kein Formalismus: Sie zwingt dazu, die
 * eigene Vorgehensweise noch einmal zu benennen – das ist erwiesenermaßen einer
 * der wirksamsten Lernschritte am Ende eines Projekts.
 */

const milestonesSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    testIds: z.array(z.string()),
    hint: z.string(),
  }),
);

const starterFilesSchema = z.array(
  z.object({ path: z.string(), content: z.string(), readOnly: z.boolean().default(false) }),
);

const rubricSchema = z.array(z.object({ criterion: z.string(), description: z.string() }));

const filesSchema = z.array(z.object({ path: z.string(), content: z.string() }));

export interface ProjectView {
  slug: string;
  title: string;
  description: string;
  difficulty: number;
  estimatedMinutes: number;
  requirements: string[];
  milestones: z.infer<typeof milestonesSchema>;
  rubric: z.infer<typeof rubricSchema>;
  /** Sichtbare Testfälle – bei Projekten sind alle Tests sichtbar. */
  tests: Array<{ id: string; name: string; stdin?: string[]; expectedStdout?: string }>;
  files: Array<{ path: string; content: string; readOnly: boolean }>;
  submission: {
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'ACCEPTED' | 'NEEDS_REVISION';
    milestonesDone: number;
    reflection: string | null;
    milestoneResults: Record<string, boolean>;
    submittedAt: Date | null;
  } | null;
}

export async function listProjects(userId: string): Promise<
  Array<{
    slug: string;
    title: string;
    description: string;
    difficulty: number;
    estimatedMinutes: number;
    milestoneCount: number;
    status: string;
    milestonesDone: number;
  }>
> {
  const projects = await prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { difficulty: 'asc' },
  });

  const submissions = await prisma.projectSubmission.findMany({ where: { userId } });
  const byProjectId = new Map(submissions.map((s) => [s.projectId, s]));

  return projects.map((project) => {
    const submission = byProjectId.get(project.id);
    return {
      slug: project.slug,
      title: project.title,
      description: project.description,
      difficulty: project.difficulty,
      estimatedMinutes: project.estimatedMinutes,
      milestoneCount: milestonesSchema.parse(project.milestones).length,
      status: submission?.status ?? 'NOT_STARTED',
      milestonesDone: submission?.milestonesDone ?? 0,
    };
  });
}

export async function getProjectView(userId: string, slug: string): Promise<ProjectView | null> {
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project || project.status !== 'PUBLISHED') return null;

  const submission = await prisma.projectSubmission.findUnique({
    where: { userId_projectId: { userId, projectId: project.id } },
  });

  const starterFiles = starterFilesSchema.parse(project.starterFiles);
  const savedFiles = submission ? filesSchema.parse(submission.files) : [];
  const savedByPath = new Map(savedFiles.map((f) => [f.path, f.content]));

  const tests = z.array(testCaseSchema).parse(project.tests);

  return {
    slug: project.slug,
    title: project.title,
    description: project.description,
    difficulty: project.difficulty,
    estimatedMinutes: project.estimatedMinutes,
    requirements: project.requirements,
    milestones: milestonesSchema.parse(project.milestones),
    rubric: rubricSchema.parse(project.rubric),
    tests: tests.map((t) => ({
      id: t.id,
      name: t.name,
      ...(t.stdin !== undefined ? { stdin: t.stdin } : {}),
      ...(t.expectedStdout !== undefined ? { expectedStdout: t.expectedStdout } : {}),
    })),
    files: starterFiles.map((f) => ({
      path: f.path,
      content: savedByPath.get(f.path) ?? f.content,
      readOnly: f.readOnly,
    })),
    submission: submission
      ? {
          status: submission.status,
          milestonesDone: submission.milestonesDone,
          reflection: submission.reflection,
          milestoneResults: (submission.automatedResult ?? {}) as Record<string, boolean>,
          submittedAt: submission.submittedAt,
        }
      : null,
  };
}

/** Vollständige Testfälle für einen Prüflauf im Browser. */
export async function getProjectTests(slug: string): Promise<TestCase[]> {
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { tests: true, status: true },
  });
  if (!project || project.status !== 'PUBLISHED') return [];
  return z.array(testCaseSchema).parse(project.tests);
}

export interface ProjectSubmitInput {
  userId: string;
  projectSlug: string;
  files: Array<{ path: string; content: string }>;
  testResults: Array<{ id: string; passed: boolean }>;
  reflection?: string;
}

export interface ProjectSubmitResult {
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'ACCEPTED' | 'NEEDS_REVISION';
  milestoneResults: Array<{ id: string; title: string; done: boolean; hint: string }>;
  milestonesDone: number;
  milestonesTotal: number;
  message: string;
}

export async function submitProject(
  input: ProjectSubmitInput,
): Promise<ProjectSubmitResult | { error: string }> {
  const project = await prisma.project.findUnique({ where: { slug: input.projectSlug } });
  if (!project) return { error: 'Projekt nicht gefunden.' };

  const milestones = milestonesSchema.parse(project.milestones);
  const passedIds = new Set(input.testResults.filter((r) => r.passed).map((r) => r.id));

  const milestoneResults = milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    done: milestone.testIds.every((id) => passedIds.has(id)),
    hint: milestone.hint,
  }));

  const done = milestoneResults.filter((m) => m.done).length;
  const allDone = done === milestones.length;
  const hasReflection = (input.reflection ?? '').trim().length >= 40;

  const status: ProjectSubmitResult['status'] = allDone
    ? hasReflection
      ? 'ACCEPTED'
      : 'SUBMITTED'
    : done > 0
      ? 'NEEDS_REVISION'
      : 'IN_PROGRESS';

  await prisma.projectSubmission.upsert({
    where: { userId_projectId: { userId: input.userId, projectId: project.id } },
    create: {
      userId: input.userId,
      projectId: project.id,
      files: input.files,
      status,
      automatedResult: Object.fromEntries(milestoneResults.map((m) => [m.id, m.done])),
      milestonesDone: done,
      reflection: input.reflection?.slice(0, 4000) ?? null,
      submittedAt: status === 'ACCEPTED' ? new Date() : null,
    },
    update: {
      files: input.files,
      status,
      automatedResult: Object.fromEntries(milestoneResults.map((m) => [m.id, m.done])),
      milestonesDone: done,
      reflection: input.reflection?.slice(0, 4000) ?? undefined,
      submittedAt: status === 'ACCEPTED' ? new Date() : null,
    },
  });

  if (status === 'ACCEPTED') {
    await recordAnonymousEvent('project_accepted', project.slug);
  }

  const message = allDone
    ? hasReflection
      ? 'Alle Meilensteine sind erfüllt und deine Reflexion liegt vor. Das Projekt ist abgenommen.'
      : 'Alle Meilensteine sind erfüllt. Es fehlt noch deine Reflexion – mindestens ein paar Sätze dazu, was dir schwergefallen ist und wie du es gelöst hast.'
    : done === 0
      ? 'Noch kein Meilenstein vollständig erfüllt. Arbeite dich von oben nach unten durch – der erste Meilenstein ist meist der Schlüssel für die folgenden.'
      : `${done} von ${milestones.length} Meilensteinen sind erfüllt. Sieh dir den ersten offenen Meilenstein an.`;

  return {
    status,
    milestoneResults,
    milestonesDone: done,
    milestonesTotal: milestones.length,
    message,
  };
}

/** Zwischenstand speichern, ohne zu bewerten. */
export async function saveProjectDraft(
  userId: string,
  projectSlug: string,
  files: Array<{ path: string; content: string }>,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });
  if (!project) return;

  await prisma.projectSubmission.upsert({
    where: { userId_projectId: { userId, projectId: project.id } },
    create: { userId, projectId: project.id, files, status: 'IN_PROGRESS' },
    update: { files },
  });
}
