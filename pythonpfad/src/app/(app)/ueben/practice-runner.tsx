'use client';

import { useState } from 'react';
import { Button, ProgressBar, SectionHeading } from '@/components/ui/primitives';
import { ExercisePanel } from '@/components/exercise/exercise-panel';
import type { PublicExercise } from '@/server/services/exercise-service';

export function PracticeRunner({ exercises }: { exercises: PublicExercise[] }): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const exercise = exercises[index];

  if (!exercise) return <p>Keine Aufgaben vorhanden.</p>;

  return (
    <section aria-labelledby="uebungsaufgaben" className="space-y-4">
      <SectionHeading id="uebungsaufgaben">Übungsaufgaben</SectionHeading>

      <div className="space-y-1.5">
        <p className="text-sm">
          Aufgabe {index + 1} von {exercises.length} · {solved.size} in dieser Runde gelöst
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
        askConfidence={false}
        onPassed={() => setSolved((previous) => new Set(previous).add(exercise.slug))}
      />

      <div className="flex flex-wrap justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          Vorherige
        </Button>
        <Button
          type="button"
          onClick={() => setIndex((value) => Math.min(exercises.length - 1, value + 1))}
          disabled={index === exercises.length - 1}
        >
          Nächste Aufgabe
        </Button>
      </div>
    </section>
  );
}
