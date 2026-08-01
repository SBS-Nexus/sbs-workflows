import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { listProjects } from '@/server/services/project-service';
import { Badge, Card, ProgressBar } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Projekte' };

const STATUS_LABELS: Record<
  string,
  { label: string; tone: 'neutral' | 'info' | 'success' | 'caution' }
> = {
  NOT_STARTED: { label: 'noch nicht begonnen', tone: 'neutral' },
  IN_PROGRESS: { label: 'in Arbeit', tone: 'info' },
  SUBMITTED: { label: 'Reflexion fehlt', tone: 'caution' },
  NEEDS_REVISION: { label: 'teilweise erfüllt', tone: 'caution' },
  ACCEPTED: { label: 'abgenommen', tone: 'success' },
};

export default async function ProjectsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const projects = await listProjects(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Projektwerkstatt</h1>
        <p className="mt-3 max-w-prose text-[var(--text-muted)]">
          In einem Projekt gibt es keine Lösungsschritte, sondern nur Anforderungen. Du
          entscheidest, wie du sie erfüllst. Die Meilensteine werden automatisch geprüft; abgenommen
          ist ein Projekt erst, wenn außerdem deine Reflexion vorliegt.
        </p>
      </header>

      <ul className="space-y-4">
        {projects.map((project) => {
          const status = STATUS_LABELS[project.status] ?? STATUS_LABELS.NOT_STARTED;
          return (
            <Card as="li" key={project.slug}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">
                    <Link href={`/projekte/${project.slug}`} className="hover:underline">
                      {project.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">
                    {project.description}
                  </p>
                </div>
                <Badge tone={status?.tone ?? 'neutral'}>{status?.label}</Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
                <span>Schwierigkeit {project.difficulty} von 5</span>
                <span aria-hidden="true">·</span>
                <span>etwa {project.estimatedMinutes} Minuten</span>
                <span aria-hidden="true">·</span>
                <span>{project.milestoneCount} Meilensteine</span>
              </div>

              {project.milestonesDone > 0 ? (
                <div className="mt-3 max-w-sm space-y-1">
                  <p className="text-sm">
                    {project.milestonesDone} von {project.milestoneCount} Meilensteinen erfüllt
                  </p>
                  <ProgressBar
                    value={project.milestonesDone}
                    max={project.milestoneCount}
                    label={`${project.milestonesDone} von ${project.milestoneCount} Meilensteinen erfüllt`}
                    tone={project.milestonesDone === project.milestoneCount ? 'success' : 'accent'}
                  />
                </div>
              ) : null}

              <Link
                href={`/projekte/${project.slug}`}
                className="mt-4 inline-block font-medium text-[var(--accent)] underline"
              >
                {project.status === 'NOT_STARTED' ? 'Projekt starten' : 'Weiterarbeiten'}
              </Link>
            </Card>
          );
        })}
      </ul>
    </div>
  );
}
