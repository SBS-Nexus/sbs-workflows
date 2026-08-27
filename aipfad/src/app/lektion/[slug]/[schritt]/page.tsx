import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { getCurrentUser } from '@/server/auth/session';
import {
  getLessonBySlug,
  startLesson,
  checkLessonCompletion,
} from '@/server/services/lesson-service';
import { getPublicExercise } from '@/server/services/exercise-service';
import { AppHeader } from '@/components/app/app-header';
import { ExerciseRunner } from '@/components/exercise/exercise-runner';
import { ButtonLink, Callout, ProgressBar } from '@/components/ui/primitives';
import { workedExampleSchema } from '@/domain/content/schema';

const commonMistakeSchema = z.object({ mistake: z.string(), why: z.string(), fix: z.string() });
const commonMistakesSchema = z.array(commonMistakeSchema);

interface LessonStepPageProps {
  params: Promise<{ slug: string; schritt: string }>;
}

export async function generateMetadata({ params }: LessonStepPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);
  return { title: lesson?.title ?? 'Lektion' };
}

export default async function LessonStepPage({
  params,
}: LessonStepPageProps): Promise<React.ReactElement> {
  const { slug, schritt } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (!user.onboardingCompleted) redirect('/onboarding');

  const lesson = await getLessonBySlug(slug);
  if (!lesson) notFound();

  const step = Number.parseInt(schritt, 10);
  const exerciseCount = lesson.exercises.length;
  // Schritt 1: Einführung, Schritt 2: Beispiel, Schritte 3..(2+n): Aufgaben, letzter Schritt: Reflexion.
  const totalSteps = exerciseCount + 3;
  if (!Number.isInteger(step) || step < 1 || step > totalSteps) notFound();

  await startLesson(lesson.id);

  const stepUrl = (target: number): string => `/lektion/${slug}/${target}`;

  return (
    <>
      <AppHeader userName={user.name} />
      <main id="hauptinhalt" className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
          {lesson.module.title}
        </p>
        <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight">{lesson.title}</h1>

        <div className="mt-4 mb-8">
          <ProgressBar value={step} max={totalSteps} label={`Schritt ${step} von ${totalSteps}`} />
          <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
            Schritt {step} von {totalSteps}
          </p>
        </div>

        {step === 1 ? <IntroStep lesson={lesson} /> : null}
        {step === 2 ? <ExampleStep lesson={lesson} /> : null}
        {step > 2 && step <= exerciseCount + 2 ? (
          <ExerciseStep exerciseId={lesson.exercises[step - 3]?.id} />
        ) : null}
        {step === totalSteps ? <ReflectionStep lesson={lesson} userId={user.id} /> : null}

        <nav className="mt-10 flex items-center justify-between border-t border-[var(--border)] pt-6">
          {step > 1 ? (
            <Link
              href={stepUrl(step - 1)}
              className="font-mono text-sm text-[var(--fg-muted)] hover:text-signal-600 dark:hover:text-signal-300"
            >
              ← Zurück
            </Link>
          ) : (
            <span />
          )}
          {step < totalSteps ? (
            <ButtonLink href={stepUrl(step + 1)} size="sm">
              Weiter →
            </ButtonLink>
          ) : (
            <ButtonLink href="/pfad" size="sm">
              Zum Pfad
            </ButtonLink>
          )}
        </nav>
      </main>
    </>
  );
}

function IntroStep({
  lesson,
}: {
  lesson: Awaited<ReturnType<typeof getLessonBySlug>> & object;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          Lernziel
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {lesson.learningObjectives.map((objective, index) => (
            <li key={index}>{objective}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          Warum das wichtig ist
        </h2>
        <p className="mt-2">{lesson.everydayProblem}</p>
      </section>
      <section>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          Mentales Modell
        </h2>
        <p className="mt-2">{lesson.mentalModel}</p>
      </section>
    </div>
  );
}

function ExampleStep({
  lesson,
}: {
  lesson: Awaited<ReturnType<typeof getLessonBySlug>> & object;
}): React.ReactElement {
  const example = workedExampleSchema.parse(lesson.workedExample);
  return (
    <div className="space-y-4">
      <p>{example.summary}</p>
      <ol className="space-y-3 border-l-2 border-[var(--border)] pl-4">
        {example.annotations.map((annotation) => (
          <li key={annotation.step}>
            <span className="font-mono text-xs font-semibold text-signal-600 dark:text-signal-300">
              {annotation.step}.
            </span>{' '}
            {annotation.text}
          </li>
        ))}
      </ol>
      <Callout tone="info" title="Ergebnis">
        {example.outcome}
      </Callout>
    </div>
  );
}

async function ExerciseStep({ exerciseId }: { exerciseId?: string }): Promise<React.ReactElement> {
  if (!exerciseId) notFound();
  const exercise = await getPublicExerciseById(exerciseId);
  if (!exercise) notFound();
  return <ExerciseRunner exercise={exercise} />;
}

async function getPublicExerciseById(id: string): ReturnType<typeof getPublicExercise> {
  // getPublicExercise arbeitet über den Slug; Lektionsschritte kennen nur die
  // ID aus der bereits geladenen Lektion. Ein zweiter kleiner Umweg über den
  // Slug hält exercise-service.ts als einzige Quelle für "was ist öffentlich
  // sichtbar" statt die Logik hier zu verdoppeln.
  const { prisma } = await import('@/server/db/prisma');
  const exercise = await prisma.exercise.findUnique({ where: { id }, select: { slug: true } });
  if (!exercise) return null;
  return getPublicExercise(exercise.slug);
}

async function ReflectionStep({
  lesson,
  userId,
}: {
  lesson: Awaited<ReturnType<typeof getLessonBySlug>> & object;
  userId: string;
}): Promise<React.ReactElement> {
  const mistakes = commonMistakesSchema.parse(lesson.commonMistakes);
  const completion = await checkLessonCompletion(userId, lesson.id);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          Typische Stolperstellen
        </h2>
        <ul className="mt-3 space-y-3">
          {mistakes.map((mistake, index) => (
            <li
              key={index}
              className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
            >
              <p className="font-medium">{mistake.mistake}</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{mistake.why}</p>
              <p className="mt-1 text-sm text-signal-600 dark:text-signal-300">{mistake.fix}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          Reflexion
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--fg-muted)]">
          {lesson.reflectionPrompts.map((prompt, index) => (
            <li key={index}>{prompt}</li>
          ))}
        </ul>
      </section>
      {completion.completed ? (
        <Callout tone="success" title="Lektion abgeschlossen">
          {completion.totalExercises === 1
            ? 'Die eine Aufgabe wurde bestanden.'
            : `Alle ${completion.totalExercises} Aufgaben wurden mindestens einmal bestanden.`}
        </Callout>
      ) : (
        <Callout tone="info" title="Noch nicht ganz">
          {completion.passedExercises} von {completion.totalExercises} Aufgaben bestanden. Eine
          Lektion gilt erst als abgeschlossen, wenn jede Aufgabe mindestens einmal bestanden wurde —
          Durchklicken allein genügt nicht.
        </Callout>
      )}
    </div>
  );
}
