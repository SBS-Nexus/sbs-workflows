'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CodeBlock,
  ProgressBar,
  cx,
} from '@/components/ui/primitives';
import { ExercisePanel } from '@/components/exercise/exercise-panel';
import {
  completeLessonAction,
  saveSectionAction,
  startLessonAction,
} from '@/server/actions/lesson-actions';
import type { LessonView } from '@/server/services/lesson-service';

/**
 * Lektionsoberfläche.
 *
 * Aufbau nach dem didaktischen Schema: Lernziel, Alltagsproblem, mentales
 * Modell, durchgerechnetes Beispiel mit Tracing, dann die Aufgaben in
 * aufsteigender Selbstständigkeit, zum Schluss Reflexion.
 *
 * Auf breiten Bildschirmen stehen Inhalt und Aufgaben nebeneinander, auf
 * schmalen liegen sie untereinander mit einer Abschnittsnavigation. Bewusst
 * keine winzigen parallelen Spalten auf dem Telefon.
 */

const SECTIONS = [
  { id: 'ziel', label: 'Lernziel' },
  { id: 'problem', label: 'Problem' },
  { id: 'modell', label: 'Modell' },
  { id: 'beispiel', label: 'Beispiel' },
  { id: 'aufgaben', label: 'Aufgaben' },
  { id: 'reflexion', label: 'Reflexion' },
] as const;

export function LessonWorkspace({ lesson }: { lesson: LessonView }): React.ReactElement {
  const [activeSection, setActiveSection] = useState<string>(
    lesson.progress.lastSection === 'objective' ? 'ziel' : lesson.progress.lastSection,
  );
  const [passedSlugs, setPassedSlugs] = useState<Set<string>>(
    new Set(lesson.exercises.filter((e) => e.lastResult === 'PASSED').map((e) => e.slug)),
  );
  const [reflection, setReflection] = useState('');
  const [completion, setCompletion] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void startLessonAction(lesson.slug);
  }, [lesson.slug]);

  const goTo = (section: string): void => {
    setActiveSection(section);
    void saveSectionAction(lesson.slug, section);
    document.getElementById(`abschnitt-${section}`)?.scrollIntoView({ block: 'start' });
  };

  const handleComplete = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await completeLessonAction({ lessonSlug: lesson.slug, reflection });
      setCompletion({ ok: result.ok, message: result.message });
    } finally {
      setBusy(false);
    }
  };

  const passedCount = passedSlugs.size;
  const isComplete = passedCount === lesson.exercises.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <nav aria-label="Brotkrumen" className="mb-3 text-sm text-[var(--text-muted)]">
        <Link href="/lernen" className="underline">
          Lernpfad
        </Link>
        <span aria-hidden="true"> › </span>
        <span>{lesson.moduleTitle}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
          <span>etwa {lesson.estimatedMinutes} Minuten</span>
          <span aria-hidden="true">·</span>
          <span>
            {passedCount} von {lesson.exercises.length} Aufgaben gelöst
          </span>
          {lesson.progress.state === 'COMPLETED' ? (
            <Badge tone="success">abgeschlossen</Badge>
          ) : null}
        </div>
        <div className="mt-3 max-w-md">
          <ProgressBar
            value={passedCount}
            max={lesson.exercises.length}
            label={`${passedCount} von ${lesson.exercises.length} Aufgaben gelöst`}
            tone={isComplete ? 'success' : 'accent'}
          />
        </div>
      </header>

      {/* Abschnittsnavigation – auf Mobilgeräten der wichtigste Wegweiser. */}
      <nav aria-label="Abschnitte der Lektion" className="mb-6 overflow-x-auto">
        <ul className="flex gap-1.5 pb-1">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => goTo(section.id)}
                aria-current={activeSection === section.id ? 'true' : undefined}
                className={cx(
                  'min-h-10 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium',
                  activeSection === section.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)]',
                )}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* --- Lerninhalt ------------------------------------------------ */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-2">
          <Card as="section" id="abschnitt-ziel">
            <h2 className="text-lg font-semibold">Was du nach dieser Lektion kannst</h2>
            <ul className="mt-3 space-y-2">
              {lesson.learningObjectives.map((objective) => (
                <li key={objective} className="flex items-start gap-2 text-[0.95rem]">
                  <span aria-hidden="true" className="mt-1 text-[var(--accent)]">
                    ◆
                  </span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
            {lesson.concepts.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {lesson.concepts
                  .filter((c) => c.isPrimary)
                  .map((concept) => (
                    <Badge key={concept.slug} tone="info">
                      {concept.name}
                    </Badge>
                  ))}
              </div>
            ) : null}
          </Card>

          <Card as="section" id="abschnitt-problem">
            <h2 className="text-lg font-semibold">Das Problem</h2>
            <p className="mt-2 text-[0.95rem]">{lesson.everydayProblem}</p>
          </Card>

          <Card as="section" id="abschnitt-modell">
            <h2 className="text-lg font-semibold">So kannst du es dir vorstellen</h2>
            <p className="mt-2 text-[0.95rem]">{lesson.mentalModel}</p>
          </Card>

          <Card as="section" id="abschnitt-beispiel">
            <h2 className="text-lg font-semibold">Beispiel, Zeile für Zeile</h2>
            <div className="mt-3">
              <CodeBlock
                code={lesson.workedExample.code}
                label="Beispielprogramm"
                highlightLines={lesson.workedExample.annotations.map((a) => a.line)}
              />
            </div>

            <h3 className="mt-4 text-sm font-semibold">Was in den markierten Zeilen passiert</h3>
            <dl className="mt-2 space-y-2">
              {lesson.workedExample.annotations.map((annotation) => (
                <div key={annotation.line} className="flex gap-3 text-[0.9375rem]">
                  <dt className="w-16 shrink-0 font-mono text-[var(--accent)]">
                    Zeile {annotation.line}
                  </dt>
                  <dd>{annotation.text}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-4 text-sm font-semibold">Ausgabe</h3>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--surface-sunken)] p-3 font-mono text-sm">
              {lesson.workedExample.output}
            </pre>

            {lesson.workedExample.trace.length > 0 ? (
              <>
                <h3 className="mt-4 text-sm font-semibold">Schritt für Schritt nachvollzogen</h3>
                <ol className="mt-2 space-y-1.5">
                  {lesson.workedExample.trace.map((step) => (
                    <li key={step.step} className="flex gap-3 text-[0.9375rem]">
                      <span
                        aria-hidden="true"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-xs font-semibold"
                      >
                        {step.step}
                      </span>
                      <span>
                        {step.description}{' '}
                        <span className="font-mono text-[var(--text-muted)]">{step.state}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </Card>

          <Card as="section">
            <h2 className="text-lg font-semibold">Typische Stolperstellen</h2>
            <ul className="mt-3 space-y-4">
              {lesson.commonMistakes.map((mistake) => (
                <li key={mistake.mistake}>
                  <p className="flex items-start gap-2 font-medium">
                    <span aria-hidden="true" className="text-[var(--caution)]">
                      !
                    </span>
                    <span>{mistake.mistake}</span>
                  </p>
                  <p className="mt-1 pl-6 text-[0.9375rem] text-[var(--text-muted)]">
                    <strong className="text-[var(--text)]">Warum:</strong> {mistake.why}
                  </p>
                  <p className="mt-1 pl-6 text-[0.9375rem] text-[var(--text-muted)]">
                    <strong className="text-[var(--text)]">Abhilfe:</strong> {mistake.fix}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* --- Aufgaben --------------------------------------------------- */}
        <div className="space-y-5" id="abschnitt-aufgaben">
          <h2 className="text-lg font-semibold">
            Aufgaben
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              Die Hilfen werden von Aufgabe zu Aufgabe weniger.
            </span>
          </h2>

          {lesson.exercises.map((exercise, index) => (
            <div key={exercise.slug}>
              <p className="mb-1.5 text-sm font-medium text-[var(--text-muted)]">
                Aufgabe {index + 1} von {lesson.exercises.length}
              </p>
              <ExercisePanel
                exercise={exercise}
                lessonSlug={lesson.slug}
                onPassed={() => setPassedSlugs((previous) => new Set(previous).add(exercise.slug))}
              />
            </div>
          ))}

          {/* --- Reflexion und Abschluss ----------------------------------- */}
          <Card as="section" id="abschnitt-reflexion">
            <h2 className="text-lg font-semibold">Kurz nachdenken</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Zwei Minuten hier bringen mehr als eine weitere Aufgabe. Deine Antwort wird nicht
              bewertet und nicht im Klartext gespeichert.
            </p>

            <ul className="mt-3 space-y-1.5">
              {lesson.reflectionPrompts.map((prompt) => (
                <li key={prompt} className="flex items-start gap-2 text-[0.95rem]">
                  <span aria-hidden="true" className="text-[var(--accent)]">
                    ?
                  </span>
                  <span>{prompt}</span>
                </li>
              ))}
            </ul>

            <label htmlFor="reflexion" className="mt-4 block text-sm font-semibold">
              Deine Notiz (freiwillig)
            </label>
            <textarea
              id="reflexion"
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3 text-[0.95rem]"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void handleComplete()} disabled={busy}>
                {busy ? 'Wird geprüft …' : 'Lektion abschließen'}
              </Button>
              {!isComplete ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Noch {lesson.exercises.length - passedCount} Aufgabe(n) offen.
                </p>
              ) : null}
            </div>

            {completion ? (
              <div className="mt-3">
                <Callout tone={completion.ok ? 'success' : 'caution'} live>
                  {completion.message}
                </Callout>
              </div>
            ) : null}
          </Card>

          {/* --- Weiter ---------------------------------------------------- */}
          <nav
            aria-label="Weitere Lektionen"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4"
          >
            {lesson.previousSlug ? (
              <Link
                href={`/lernen/${lesson.previousSlug}`}
                className="text-[var(--accent)] underline"
              >
                ← Vorherige Lektion
              </Link>
            ) : (
              <span />
            )}
            {lesson.nextSlug ? (
              <Link href={`/lernen/${lesson.nextSlug}`} className="text-[var(--accent)] underline">
                Nächste Lektion →
              </Link>
            ) : (
              <Link href="/projekte" className="text-[var(--accent)] underline">
                Zu den Projekten →
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
