'use client';

import { useState } from 'react';
import { Badge, Button, Callout, ProgressBar } from '@/components/ui/primitives';
import { ExercisePanel } from '@/components/exercise/exercise-panel';
import type { PublicExercise } from '@/server/services/exercise-service';
import type { DueReview } from '@/server/services/review-service';

/**
 * Führt durch die heute fälligen Wiederholungen – eine Aufgabe nach der anderen.
 * Der Fortschritt bleibt sichtbar, damit erkennbar ist, wie weit es noch ist.
 */
export function ReviewRunner({
  exercises,
  meta,
}: {
  exercises: PublicExercise[];
  meta: DueReview[];
}): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [doneSlugs, setDoneSlugs] = useState<Set<string>>(new Set());

  const exercise = exercises[index];
  const info = exercise ? meta.find((m) => m.exerciseSlug === exercise.slug) : undefined;

  if (!exercise) {
    return (
      <Callout tone="success" title="Alle Wiederholungen erledigt" live>
        Du hast alle heute fälligen Aufgaben bearbeitet. Der nächste Termin richtet sich nach deinen
        Ergebnissen.
      </Callout>
    );
  }

  const isLast = index === exercises.length - 1;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm">
          Aufgabe {index + 1} von {exercises.length} · {doneSlugs.size} erledigt
        </p>
        <ProgressBar
          value={doneSlugs.size}
          max={exercises.length}
          label={`${doneSlugs.size} von ${exercises.length} Wiederholungen erledigt`}
          tone="success"
        />
      </div>

      {info ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
          {info.lessonTitle ? <Badge tone="neutral">aus: {info.lessonTitle}</Badge> : null}
          {info.overdueDays > 0 ? (
            <Badge tone="caution">
              seit {info.overdueDays} {info.overdueDays === 1 ? 'Tag' : 'Tagen'} fällig
            </Badge>
          ) : null}
          <span>{info.reason}</span>
        </div>
      ) : null}

      <ExercisePanel
        key={exercise.slug}
        exercise={exercise}
        lessonSlug={info?.lessonSlug ?? null}
        isReview
        onPassed={() => setDoneSlugs((previous) => new Set(previous).add(exercise.slug))}
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
        {!isLast ? (
          <Button type="button" onClick={() => setIndex((value) => value + 1)}>
            Nächste Wiederholung
          </Button>
        ) : (
          <p className="self-center text-sm text-[var(--text-muted)]">
            Das war die letzte für heute.
          </p>
        )}
      </div>
    </div>
  );
}
