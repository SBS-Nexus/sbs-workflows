'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveOnboardingAction, type OnboardingState } from '@/server/actions/onboarding-actions';
import { Button, Callout, Card, cx } from '@/components/ui/primitives';
import { GOAL_OPTIONS } from '@/domain/path/learning-path';

const initialState: OnboardingState = { ok: false };

const EXPERIENCE_OPTIONS = [
  {
    value: 'NONE',
    label: 'Ich habe noch nie programmiert',
    description: 'Völlig in Ordnung. Der Kurs ist genau dafür gebaut.',
  },
  {
    value: 'TUTORIALS_ONLY',
    label: 'Ich habe Tutorials angeschaut, aber wenig selbst geschrieben',
    description: 'Sehr verbreitet. Hier liegt der Schwerpunkt auf dem Selberschreiben.',
  },
  {
    value: 'OTHER_LANGUAGE',
    label: 'Ich kenne eine andere Programmiersprache',
    description: 'Dann geht vieles schneller – die Denkweise kennst du schon.',
  },
  {
    value: 'SOME_PYTHON',
    label: 'Ich hatte schon mit Python zu tun',
    description: 'Die Einstufung findet heraus, wo du einsteigen kannst.',
  },
] as const;

const PACE_OPTIONS = [
  {
    value: 'RELAXED',
    label: 'In Ruhe',
    description: 'Mehr Wiederholungen, kleinere Schritte.',
  },
  { value: 'STEADY', label: 'Gleichmäßig', description: 'Der ausgewogene Standard.' },
  {
    value: 'FOCUSED',
    label: 'Zügig',
    description: 'Weniger Zwischenschritte, früher eigenständige Aufgaben.',
  },
] as const;

const TIME_OPTIONS = [10, 20, 30, 45, 60] as const;

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Wird gespeichert …' : 'Weiter zur Einstufung'}
    </Button>
  );
}

export function OnboardingForm({
  defaults,
}: {
  defaults: {
    experience: string;
    learningGoal: string;
    dailyTimeBudget: number;
    pace: string;
    selfAssessment: number;
  };
}): React.ReactElement {
  const [state, formAction] = useActionState(saveOnboardingAction, initialState);
  const [selfAssessment, setSelfAssessment] = useState(defaults.selfAssessment);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <Callout tone="alert" title="Da fehlt noch etwas" live>
          {state.error}
        </Callout>
      ) : null}

      <Card as="section">
        <fieldset>
          <legend className="text-lg font-semibold">
            Wie viel Programmiererfahrung bringst du mit?
          </legend>
          <div className="mt-3 space-y-2">
            {EXPERIENCE_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                name="experience"
                value={option.value}
                label={option.label}
                description={option.description}
                defaultChecked={defaults.experience === option.value}
              />
            ))}
          </div>
        </fieldset>
      </Card>

      <Card as="section">
        <fieldset>
          <legend className="text-lg font-semibold">Wofür möchtest du Python nutzen?</legend>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Die Grundlagen sind für alle Ziele gleich. Deine Auswahl bestimmt die Beispiele und
            später den Spezialisierungspfad.
          </p>
          <div className="mt-3 space-y-2">
            {GOAL_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                name="learningGoal"
                value={option.value}
                label={option.label}
                description={option.description}
                defaultChecked={defaults.learningGoal === option.value}
              />
            ))}
          </div>
        </fieldset>
      </Card>

      <Card as="section">
        <fieldset>
          <legend className="text-lg font-semibold">Wie viel Zeit hast du an einem Tag?</legend>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ehrlich schätzen hilft mehr als ambitioniert planen. Auch 10 Minuten am Tag bringen dich
            weiter.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIME_OPTIONS.map((minutes) => (
              <label
                key={minutes}
                className="cursor-pointer rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium has-checked:border-[var(--accent)] has-checked:bg-[var(--accent-soft)] has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus-ring)]"
              >
                <input
                  type="radio"
                  name="dailyTimeBudget"
                  value={minutes}
                  defaultChecked={defaults.dailyTimeBudget === minutes}
                  required
                  className="sr-only"
                />
                {minutes} Minuten
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card as="section">
        <fieldset>
          <legend className="text-lg font-semibold">In welchem Tempo möchtest du vorgehen?</legend>
          <div className="mt-3 space-y-2">
            {PACE_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                name="pace"
                value={option.value}
                label={option.label}
                description={option.description}
                defaultChecked={defaults.pace === option.value}
              />
            ))}
          </div>
        </fieldset>
      </Card>

      <Card as="section">
        <label htmlFor="selfAssessment" className="text-lg font-semibold">
          Wie sicher fühlst du dich beim Thema Programmieren gerade?
        </label>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Nur deine eigene Einschätzung – sie beeinflusst deinen Pfad nicht. Später vergleichen wir
          sie mit deinen tatsächlichen Ergebnissen, damit du deine Selbsteinschätzung schärfen
          kannst.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <input
            id="selfAssessment"
            name="selfAssessment"
            type="range"
            min={0}
            max={100}
            step={5}
            value={selfAssessment}
            onChange={(event) => setSelfAssessment(Number(event.target.value))}
            className="flex-1"
            aria-describedby="selfAssessment-value"
          />
          <output
            id="selfAssessment-value"
            htmlFor="selfAssessment"
            className="w-32 text-sm font-medium"
          >
            {selfAssessment < 20
              ? 'gar nicht sicher'
              : selfAssessment < 45
                ? 'eher unsicher'
                : selfAssessment < 70
                  ? 'geht so'
                  : selfAssessment < 90
                    ? 'ziemlich sicher'
                    : 'sehr sicher'}
          </output>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function RadioCard({
  name,
  value,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}): React.ReactElement {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-3',
        'has-checked:border-[var(--accent)] has-checked:bg-[var(--accent-soft)]',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required
        className="mt-1 size-4 shrink-0"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-[var(--text-muted)]">{description}</span>
      </span>
    </label>
  );
}
