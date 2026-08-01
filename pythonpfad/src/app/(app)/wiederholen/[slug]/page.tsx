import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { getReviewSetExercises } from '@/server/services/review-service';
import { ReviewSetRunner } from './review-set-runner';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await requireUser();
  const set = await getReviewSetExercises(user.id, slug);
  return { title: set?.title ?? 'Wiederholungsset' };
}

export default async function ReviewSetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const user = await requireUser();
  const set = await getReviewSetExercises(user.id, slug);

  if (!set) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <nav aria-label="Brotkrumen" className="text-sm text-[var(--text-muted)]">
        <Link href="/wiederholen" className="underline">
          Wiederholungscenter
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{set.title}</h1>
        <p className="mt-3 max-w-prose text-[var(--text-muted)]">{set.description}</p>
      </header>

      <ReviewSetRunner exercises={set.exercises} />
    </div>
  );
}
