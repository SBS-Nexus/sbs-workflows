import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { getProjectView } from '@/server/services/project-service';
import { ProjectWorkspace } from './project-workspace';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await requireUser();
  const project = await getProjectView(user.id, slug);
  return { title: project?.title ?? 'Projekt' };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const user = await requireUser();
  const project = await getProjectView(user.id, slug);

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <nav aria-label="Brotkrumen" className="mb-3 text-sm text-[var(--text-muted)]">
        <Link href="/projekte" className="underline">
          Projektwerkstatt
        </Link>
      </nav>
      <ProjectWorkspace project={project} />
    </div>
  );
}
