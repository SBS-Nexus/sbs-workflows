import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { getLessonView } from '@/server/services/lesson-service';
import { LessonWorkspace } from './lesson-workspace';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await requireUser();
  const lesson = await getLessonView(user.id, slug);
  return { title: lesson?.title ?? 'Lektion' };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const user = await requireUser();
  const lesson = await getLessonView(user.id, slug);

  if (!lesson) notFound();

  return <LessonWorkspace lesson={lesson} />;
}
