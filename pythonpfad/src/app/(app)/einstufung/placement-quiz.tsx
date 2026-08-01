'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout, Card, CodeBlock, cx, ProgressBar } from '@/components/ui/primitives';
import { submitPlacementAction } from '@/server/actions/onboarding-actions';
import type { PlacementResult } from '@/domain/placement/placement';

interface PublicQuestion {
  id: string;
  area: 'logic' | 'sequence' | 'reading' | 'python';
  question: string;
  code?: string;
  options: Array<{ id: string; text: string }>;
}

const AREA_LABELS: Record<PublicQuestion['area'], string> = {
  logic: 'Logisches Denken',
  sequence: 'Abläufe verstehen',
  reading: 'Code lesen',
  python: 'Python-Kenntnisse',
};

export function PlacementQuiz({ questions }: { questions: PublicQuestion[] }): React.ReactElement {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const question = questions[index];
  const answered = Object.keys(answers).length;

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const response = await submitPlacementAction(
        questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] ?? 'weiss-nicht' })),
      );
      if (!response.ok || !response.result) {
        setError(response.error ?? 'Die Auswertung hat nicht geklappt.');
        return;
      }
      setResult(response.result);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-5">
        <Callout tone="success" title="Einstufung abgeschlossen" live>
          {result.message}
        </Callout>

        <Card>
          <h2 className="text-lg font-semibold">Was gut lief</h2>
          <dl className="mt-3 space-y-3">
            {(Object.keys(result.byArea) as Array<keyof typeof result.byArea>).map((area) => {
              const entry = result.byArea[area];
              if (entry.total === 0) return null;
              return (
                <div key={area}>
                  <dt className="flex items-center justify-between text-sm font-medium">
                    <span>{AREA_LABELS[area]}</span>
                    <span className="text-[var(--text-muted)]">
                      {entry.correct} von {entry.total}
                    </span>
                  </dt>
                  <dd className="mt-1">
                    <ProgressBar
                      value={entry.correct}
                      max={entry.total}
                      label={`${AREA_LABELS[area]}: ${entry.correct} von ${entry.total} richtig`}
                    />
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Diese Zahlen sind eine Momentaufnahme aus acht Fragen. Sie sagen nichts darüber aus, wie
            gut du programmieren lernen kannst.
          </p>
        </Card>

        <div className="flex justify-end">
          <Button type="button" onClick={() => router.push('/lernen')}>
            Zu meinem Lernpfad
          </Button>
        </div>
      </div>
    );
  }

  if (!question) return <p>Keine Fragen vorhanden.</p>;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            Frage {index + 1} von {questions.length}
          </span>
          <span className="text-[var(--text-muted)]">{AREA_LABELS[question.area]}</span>
        </div>
        <ProgressBar
          value={index}
          max={questions.length}
          label={`Fortschritt: Frage ${index + 1} von ${questions.length}`}
        />
      </div>

      {error ? (
        <Callout tone="alert" title="Das hat nicht geklappt" live>
          {error}
        </Callout>
      ) : null}

      <Card>
        <fieldset>
          <legend className="text-lg font-medium">{question.question}</legend>
          {question.code ? (
            <div className="mt-3">
              <CodeBlock code={question.code} />
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                  answers[question.id] === option.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] hover:bg-[var(--surface-sunken)]',
                  option.id === 'weiss-nicht' && 'italic',
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() =>
                    setAnswers((previous) => ({ ...previous, [question.id]: option.id }))
                  }
                  className="mt-1 size-4 shrink-0"
                />
                <span className="text-[0.95rem]">{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          Zurück
        </Button>

        {index < questions.length - 1 ? (
          <Button type="button" onClick={() => setIndex((value) => value + 1)}>
            Weiter
          </Button>
        ) : (
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Wird ausgewertet …' : 'Einstufung abschließen'}
          </Button>
        )}
      </div>

      <p className="text-sm text-[var(--text-muted)]">
        {answered} von {questions.length} Fragen beantwortet. Unbeantwortete Fragen zählen wie „Weiß
        ich noch nicht“.
      </p>
    </div>
  );
}
