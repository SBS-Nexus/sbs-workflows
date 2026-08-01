'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Callout, Card, ProgressBar, cx } from '@/components/ui/primitives';
import { PythonWorkbench } from '@/components/editor/python-workbench';
import { TutorPanel } from '@/components/tutor/tutor-panel';
import {
  getProjectTestsAction,
  saveProjectDraftAction,
  submitProjectAction,
} from '@/server/actions/project-actions';
import type { ProjectView } from '@/server/services/project-service';
import type { RunResult } from '@/lib/runner/types';
import type { ProjectSubmitResult } from '@/server/services/project-service';

/**
 * Arbeitsbereich für ein Projekt.
 *
 * Links stehen Anforderungen, Meilensteine und Bewertungsraster, rechts der
 * Editor. Die Meilensteine bleiben beim Arbeiten sichtbar – sie sind die
 * eigentliche Anleitung, ohne den Lösungsweg vorzugeben.
 */
export function ProjectWorkspace({ project }: { project: ProjectView }): React.ReactElement {
  const firstFile = project.files[0];
  const [code, setCode] = useState(firstFile?.content ?? '');
  const [result, setResult] = useState<ProjectSubmitResult | null>(
    project.submission
      ? {
          status: project.submission.status,
          milestonesDone: project.submission.milestonesDone,
          milestonesTotal: project.milestones.length,
          milestoneResults: project.milestones.map((m) => ({
            id: m.id,
            title: m.title,
            done: project.submission?.milestoneResults[m.id] === true,
            hint: m.hint,
          })),
          message: '',
        }
      : null,
  );
  const [reflection, setReflection] = useState(project.submission?.reflection ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  // Zwischenstand automatisch sichern.
  useEffect(() => {
    if (!firstFile) return;
    const timer = setTimeout(() => {
      void saveProjectDraftAction({
        projectSlug: project.slug,
        files: [{ path: firstFile.path, content: code }],
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [code, firstFile, project.slug]);

  const handleSubmit = async (): Promise<void> => {
    if (!firstFile) return;
    setBusy(true);
    setError(null);

    try {
      const bundle = await getProjectTestsAction(project.slug);
      if (!bundle.ok) {
        setError(bundle.error);
        return;
      }

      const runner = await import('@/lib/runner/pyodide-runner');
      const run = await runner.getSharedRunner().run({
        code,
        tests: bundle.tests,
        timeoutMs: 20_000,
      });
      setLastRun(run);

      const response = await submitProjectAction({
        projectSlug: project.slug,
        files: [{ path: firstFile.path, content: code }],
        testResults: run.testResults.map((t) => ({ id: t.id, passed: t.passed })),
        reflection,
      });

      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.result);
    } finally {
      setBusy(false);
    }
  };

  const done = result?.milestonesDone ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Schwierigkeit {project.difficulty} von 5</Badge>
          <Badge tone="neutral">etwa {project.estimatedMinutes} Minuten</Badge>
          {result?.status === 'ACCEPTED' ? <Badge tone="success">abgenommen</Badge> : null}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{project.title}</h1>
        <p className="mt-3 max-w-prose text-[var(--text-muted)]">{project.description}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* --- Anforderungen ---------------------------------------------- */}
        <div className="space-y-5">
          <Card as="section">
            <h2 className="text-lg font-semibold">Anforderungen</h2>
            <ul className="mt-3 space-y-2">
              {project.requirements.map((requirement) => (
                <li key={requirement} className="flex items-start gap-2 text-[0.95rem]">
                  <span aria-hidden="true" className="mt-1 text-[var(--accent)]">
                    ◆
                  </span>
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card as="section">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Meilensteine</h2>
              <span className="text-sm text-[var(--text-muted)]">
                {done} / {project.milestones.length}
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={done}
                max={project.milestones.length}
                label={`${done} von ${project.milestones.length} Meilensteinen erfüllt`}
                tone={done === project.milestones.length ? 'success' : 'accent'}
              />
            </div>

            <ol className="mt-4 space-y-3">
              {project.milestones.map((milestone, index) => {
                const state = result?.milestoneResults.find((m) => m.id === milestone.id);
                return (
                  <li
                    key={milestone.id}
                    className={cx(
                      'rounded-lg border p-3',
                      state?.done
                        ? 'border-[var(--success)] bg-[var(--success-soft)]'
                        : 'border-[var(--border)]',
                    )}
                  >
                    <p className="flex items-start gap-2 font-medium">
                      <span aria-hidden="true">{state?.done ? '✓' : index + 1}</span>
                      <span>
                        <span className="sr-only">
                          {state?.done ? 'Erfüllt: ' : 'Noch offen: '}
                        </span>
                        {milestone.title}
                      </span>
                    </p>
                    <p className="mt-1 pl-6 text-[0.9375rem] text-[var(--text-muted)]">
                      {milestone.description}
                    </p>
                    {!state?.done ? (
                      <details className="mt-2 pl-6">
                        <summary className="cursor-pointer text-sm font-medium">
                          Denkanstoß anzeigen
                        </summary>
                        <p className="mt-1 text-sm">{milestone.hint}</p>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card as="section">
            <h2 className="text-lg font-semibold">Woran das Projekt gemessen wird</h2>
            <dl className="mt-3 space-y-3">
              {project.rubric.map((item) => (
                <div key={item.criterion}>
                  <dt className="font-medium">{item.criterion}</dt>
                  <dd className="text-[0.9375rem] text-[var(--text-muted)]">{item.description}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        {/* --- Arbeitsbereich ---------------------------------------------- */}
        <div className="space-y-5">
          <Card as="section">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                <span className="font-mono text-base">{firstFile?.path ?? 'main.py'}</span>
              </h2>
              <span className="text-sm text-[var(--text-muted)]">
                Zwischenstand wird automatisch gespeichert
              </span>
            </div>

            <PythonWorkbench
              code={code}
              onCodeChange={setCode}
              ariaLabel={`Python-Editor für das Projekt ${project.title}`}
              starterCode={firstFile?.content ?? ''}
              visibleTests={project.tests}
              onRunComplete={setLastRun}
              minHeight="22rem"
            />
          </Card>

          <TutorPanel code={code} traceback={lastRun?.error?.traceback} />

          <Card as="section">
            <h2 className="text-lg font-semibold">Reflexion</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Für die Abnahme erforderlich, mindestens 40 Zeichen. Was war schwierig? Wie bist du
              auf deine Lösung gekommen? Was würdest du beim nächsten Mal anders angehen?
            </p>
            <label htmlFor="projekt-reflexion" className="sr-only">
              Deine Reflexion zum Projekt
            </label>
            <textarea
              id="projekt-reflexion"
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              rows={5}
              className="mt-3 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3 text-[0.95rem]"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {reflection.trim().length} von mindestens 40 Zeichen
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void handleSubmit()} disabled={busy}>
                {busy ? 'Wird geprüft …' : 'Projekt einreichen und prüfen'}
              </Button>
            </div>

            {error ? (
              <div className="mt-3">
                <Callout tone="alert" title="Das hat nicht geklappt" live>
                  {error}
                </Callout>
              </div>
            ) : null}

            {result?.message ? (
              <div className="mt-3">
                <Callout
                  tone={
                    result.status === 'ACCEPTED'
                      ? 'success'
                      : result.status === 'SUBMITTED'
                        ? 'caution'
                        : 'info'
                  }
                  live
                >
                  {result.message}
                </Callout>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
