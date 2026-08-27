import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentUser } from '@/server/auth/session';
import { getLabBySlug, LabNotFoundError } from '@/server/services/lab-service';
import { getPublicExercise } from '@/server/services/exercise-service';
import { AppHeader } from '@/components/app/app-header';
import { SectionHeading, Callout } from '@/components/ui/primitives';
import { LabRunner } from '@/components/labs/lab-runner';
import { ExerciseRunner } from '@/components/exercise/exercise-runner';

interface LabPageProps {
  params: Promise<{ slug: string }>;
}

const promptRepairConfigSchema = z.object({ relatedExerciseSlugs: z.array(z.string()).min(1) });

export async function generateMetadata({ params }: LabPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const lab = await getLabBySlug(slug);
    return { title: lab.title };
  } catch {
    return { title: 'Lab' };
  }
}

export default async function LabPage({ params }: LabPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (!user.onboardingCompleted) redirect('/onboarding');

  let lab;
  try {
    lab = await getLabBySlug(slug);
  } catch (error) {
    if (error instanceof LabNotFoundError) notFound();
    throw error;
  }

  return (
    <>
      <AppHeader userName={user.name} />
      <main id="hauptinhalt" className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <SectionHeading eyebrow="Lab" description={lab.summary}>
          {lab.title}
        </SectionHeading>

        <Callout tone="info" title="Anleitung" className="mb-6">
          {lab.instructions}
        </Callout>

        {lab.kind === 'PROMPT_REPAIR' ? (
          <PromptRepairLabBody config={lab.config} />
        ) : (
          <LabRunner slug={lab.slug} kind={lab.kind} config={lab.config} />
        )}
      </main>
    </>
  );
}

async function PromptRepairLabBody({ config }: { config: unknown }): Promise<React.ReactElement> {
  const { relatedExerciseSlugs } = promptRepairConfigSchema.parse(config);
  const exerciseSlug = relatedExerciseSlugs[0];
  const exercise = exerciseSlug ? await getPublicExercise(exerciseSlug) : null;

  if (!exercise) {
    return (
      <Callout tone="alert" title="Übung nicht verfügbar">
        Diese Lab-Übung konnte nicht geladen werden.
      </Callout>
    );
  }

  return (
    <div>
      <p className="mb-4 font-medium">{exercise.prompt}</p>
      <ExerciseRunner exercise={exercise} />
    </div>
  );
}
