'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  submitOnboardingAction,
  type OnboardingFormState,
} from '@/server/actions/onboarding-actions';
import { Button, Callout, Field } from '@/components/ui/primitives';

const initialState: OnboardingFormState = { ok: false };

const RADIO_BASE =
  'flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] p-3 ' +
  'has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30';

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Wird gespeichert …' : 'Weiter'}
    </Button>
  );
}

export function OnboardingForm(): React.ReactElement {
  const [state, formAction] = useActionState(submitOnboardingAction, initialState);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {state.error ? (
        <Callout tone="alert" title="Das hat nicht geklappt" live>
          {state.error}
        </Callout>
      ) : null}

      <Field
        label="Wofür möchtest du AIPfad vor allem nutzen?"
        htmlFor="learningGoal-general"
        error={state.fieldErrors?.learningGoal}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { value: 'GENERAL', label: 'Allgemeines Verständnis', id: 'learningGoal-general' },
            { value: 'DEVELOPER', label: 'Als Entwickler:in', id: 'learningGoal-developer' },
            {
              value: 'PRODUCT_ROLE',
              label: 'Als Product/Business-Rolle',
              id: 'learningGoal-product',
            },
            {
              value: 'GOVERNANCE_ROLE',
              label: 'Governance/Compliance',
              id: 'learningGoal-governance',
            },
            { value: 'LEADERSHIP', label: 'Als Entscheider:in', id: 'learningGoal-leadership' },
          ].map((option) => (
            <label key={option.id} htmlFor={option.id} className={RADIO_BASE}>
              <input
                type="radio"
                id={option.id}
                name="learningGoal"
                value={option.value}
                defaultChecked={option.value === 'GENERAL'}
                className="mt-1"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="Wie viel Erfahrung hast du mit AI-Werkzeugen?"
        htmlFor="experience-none"
        error={state.fieldErrors?.experience}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { value: 'NONE', label: 'Noch keine', id: 'experience-none' },
            { value: 'USED_CHATBOTS', label: 'Chatbots genutzt', id: 'experience-chatbots' },
            {
              value: 'TECHNICAL_BACKGROUND',
              label: 'Technischer Hintergrund',
              id: 'experience-technical',
            },
            {
              value: 'AI_PRACTITIONER',
              label: 'Arbeite bereits mit AI',
              id: 'experience-practitioner',
            },
          ].map((option) => (
            <label key={option.id} htmlFor={option.id} className={RADIO_BASE}>
              <input
                type="radio"
                id={option.id}
                name="experience"
                value={option.value}
                defaultChecked={option.value === 'NONE'}
                className="mt-1"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="Wie viel Zeit hast du pro Tag ungefähr?"
        htmlFor="dailyTimeBudget"
        hint="Nur zur groben Zeitschätzung des Pfads — kein festes Limit."
        error={state.fieldErrors?.dailyTimeBudget}
      >
        <select
          id="dailyTimeBudget"
          name="dailyTimeBudget"
          defaultValue="20"
          className="w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-raised)] px-3 text-sm"
        >
          <option value="10">10 Minuten</option>
          <option value="20">20 Minuten</option>
          <option value="40">40 Minuten</option>
          <option value="60">Eine Stunde oder mehr</option>
        </select>
      </Field>

      <Field label="Tempo" htmlFor="pace-steady" error={state.fieldErrors?.pace}>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: 'RELAXED', label: 'Entspannt', id: 'pace-relaxed' },
            { value: 'STEADY', label: 'Gleichmäßig', id: 'pace-steady' },
            { value: 'FOCUSED', label: 'Fokussiert', id: 'pace-focused' },
          ].map((option) => (
            <label key={option.id} htmlFor={option.id} className={RADIO_BASE}>
              <input
                type="radio"
                id={option.id}
                name="pace"
                value={option.value}
                defaultChecked={option.value === 'STEADY'}
                className="mt-1"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <SubmitButton />
    </form>
  );
}
