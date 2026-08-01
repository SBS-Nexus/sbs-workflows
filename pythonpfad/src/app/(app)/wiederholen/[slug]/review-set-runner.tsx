'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Callout, ProgressBar } from '@/components/ui/primitives';
import { ExercisePanel } from '@/components/exercise/exercise-panel';
import type { PublicExercise } from '@/server/services/exercise-service';

export function ReviewSetRunner({
  exercises,
}: {
  exercises: PublicExercise[];
}): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);

  const exercise = exercises[index];

  if (finished || !exercise) {
    return (
      <div className="space-y-4">
        <Callout tone="success" title="Set durchgearbeitet" live>
          Du hast {done.size} von {exercises.length} Aufgaben eigenständig gelöst. Was hier nicht
          auf Anhieb gelang, wird automatisch früher wieder eingeplant.
        </Callout>
        <Link
          href="/wiederholen"
          className="inline-block font-medium text-[var(--accent)] underline"
        >
          Zurück zum Wiederholungscenter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm">
          Aufgabe {index + 1} von {exercises.length}
        </p>
        <ProgressBar
          value={index}
          max={exercises.length}
          label={`Aufgabe ${index + 1} von ${exercises.length}`}
        />
      </div>

      <ExercisePanel
        key={exercise.slug}
        exercise={exercise}
        isReview
        askConfidence={false}
        onPassed={() => setDone((previous) => new Set(previous).add(exercise.slug))}
      />

      <div className="flex justify-end">
        {index < exercises.length - 1 ? (
          <Button type="button" onClick={() => setIndex((value) => value + 1)}>
            Weiter
          </Button>
        ) : (
          <Button type="button" onClick={() => setFinished(true)}>
            Set abschließen
          </Button>
        )}
      </div>
    </div>
  );
}
