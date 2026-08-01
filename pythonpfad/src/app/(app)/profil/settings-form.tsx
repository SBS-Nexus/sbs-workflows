'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveSettingsAction, type SettingsState } from '@/server/actions/account-actions';
import { Button, Callout, Card, Field, inputClass } from '@/components/ui/primitives';
import { GOAL_OPTIONS } from '@/domain/path/learning-path';

const initialState: SettingsState = { ok: false };

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Wird gespeichert …' : 'Einstellungen speichern'}
    </Button>
  );
}

export function SettingsForm({
  defaults,
  externalAiConfigured,
}: {
  defaults: {
    name: string;
    learningGoal: string;
    dailyTimeBudget: number;
    pace: string;
    theme: string;
    reduceMotion: boolean;
    aiTutorConsent: boolean;
  };
  externalAiConfigured: boolean;
}): React.ReactElement {
  const [state, formAction] = useActionState(saveSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <Callout tone="success" live>
          {state.message}
        </Callout>
      ) : null}
      {state.error ? (
        <Callout tone="alert" title="Speichern nicht möglich" live>
          {state.error}
        </Callout>
      ) : null}

      <Card as="section" className="space-y-5">
        <h2 className="text-lg font-semibold">Lernen</h2>

        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={defaults.name}
            required
            className={inputClass}
          />
        </Field>

        <Field
          label="Lernziel"
          htmlFor="learningGoal"
          hint="Eine Änderung stellt deinen Lernpfad neu zusammen. Abgeschlossene Lektionen bleiben abgeschlossen."
        >
          <select
            id="learningGoal"
            name="learningGoal"
            defaultValue={defaults.learningGoal}
            className={inputClass}
          >
            {GOAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Zeit pro Tag" htmlFor="dailyTimeBudget" hint="In Minuten.">
          <select
            id="dailyTimeBudget"
            name="dailyTimeBudget"
            defaultValue={String(defaults.dailyTimeBudget)}
            className={inputClass}
          >
            {[10, 20, 30, 45, 60, 90].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} Minuten
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tempo" htmlFor="pace">
          <select id="pace" name="pace" defaultValue={defaults.pace} className={inputClass}>
            <option value="RELAXED">In Ruhe – mehr Wiederholungen</option>
            <option value="STEADY">Gleichmäßig</option>
            <option value="FOCUSED">Zügig – früher eigenständige Aufgaben</option>
          </select>
        </Field>
      </Card>

      <Card as="section" className="space-y-5">
        <h2 className="text-lg font-semibold">Darstellung und Bedienung</h2>

        <Field
          label="Farbschema"
          htmlFor="theme"
          hint="Diese Auswahl gilt auf allen deinen Geräten."
        >
          <select id="theme" name="theme" defaultValue={defaults.theme} className={inputClass}>
            <option value="system">Wie im System eingestellt</option>
            <option value="light">Hell</option>
            <option value="dark">Dunkel</option>
          </select>
        </Field>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="reduceMotion"
            defaultChecked={defaults.reduceMotion}
            className="mt-1 size-4"
          />
          <span>
            <span className="block font-medium">Bewegung reduzieren</span>
            <span className="block text-sm text-[var(--text-muted)]">
              Schaltet Übergänge und Animationen ab. Wird zusätzlich automatisch übernommen, wenn
              dein Betriebssystem das bereits verlangt.
            </span>
          </span>
        </label>
      </Card>

      <Card as="section" className="space-y-4">
        <h2 className="text-lg font-semibold">Lerncoach</h2>

        <p className="text-[0.95rem] text-[var(--text-muted)]">
          Der Lerncoach arbeitet standardmäßig regelbasiert und vollständig auf diesem Server. Dabei
          verlässt kein Code und keine Fehlermeldung das System.
        </p>

        {externalAiConfigured ? (
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="aiTutorConsent"
              defaultChecked={defaults.aiTutorConsent}
              className="mt-1 size-4"
            />
            <span>
              <span className="block font-medium">
                Externen KI-Anbieter für den Lerncoach nutzen
              </span>
              <span className="block text-sm text-[var(--text-muted)]">
                Wenn du zustimmst, werden bei einer Tutor-Anfrage die Aufgabenstellung, dein Code im
                Editor und die Fehlermeldung an den eingerichteten Anbieter übermittelt. Dein Name,
                deine E-Mail-Adresse und dein Lernverlauf werden nicht übertragen. Du kannst diese
                Einwilligung jederzeit hier zurücknehmen; der Lerncoach funktioniert dann weiter
                regelbasiert.
              </span>
            </span>
          </label>
        ) : (
          <>
            <Callout tone="info" title="Kein externer Anbieter eingerichtet">
              Auf dieser Installation ist kein KI-Anbieter konfiguriert. Der Lerncoach läuft
              ausschließlich regelbasiert. Es besteht nichts, dem du zustimmen könntest.
            </Callout>
            <input type="hidden" name="aiTutorConsent" value="" />
          </>
        )}
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
