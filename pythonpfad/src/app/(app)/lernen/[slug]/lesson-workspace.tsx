'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button, Callout, Card, CodeBlock, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';
import { useFeedback } from '@/components/feedback/use-feedback';
import { ExercisePanel } from '@/components/exercise/exercise-panel';
import { WorkedExampleRunner } from '@/components/editor/worked-example-runner';
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
  const melde = useFeedback();

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
      // Nur, wenn die Lektion wirklich abgeschlossen wurde. Bei „noch Aufgaben
      // offen" ist die Antwort eine Information, kein Anlass zum Feiern.
      if (result.ok) melde('lektion-fertig');
    } finally {
      setBusy(false);
    }
  };

  const passedCount = passedSlugs.size;
  const isComplete = passedCount === lesson.exercises.length;

  return (
    <div
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6"
      style={themeStyle(moduleTheme(lesson.moduleOrder))}
    >
      <nav
        aria-label="Brotkrumen"
        className="mb-3 flex items-center gap-1.5 text-sm text-[var(--text-muted)]"
      >
        <Link href="/lernen" className="font-medium underline">
          Lernpfad
        </Link>
        <Icon name="vor" size={14} />
        <span className="font-medium text-[var(--akzent)]">{lesson.moduleTitle}</span>
      </nav>

      {/*
       * Kopfbereich in der Leitfarbe des Moduls.
       *
       * Die Farbe ist dieselbe wie auf dem Lernpfad – wer eine Lektion öffnet,
       * erkennt daran sofort, in welchem Modul er gelandet ist, noch bevor er
       * die Überschrift gelesen hat.
       */}
      <header className="mb-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--akzent-soft)]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-4">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--akzent)] text-[var(--text-inverse)]"
            >
              <Icon name="lernen" size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-4xl">
                {lesson.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Icon name="zeit" size={14} />
                  etwa {lesson.estimatedMinutes} Minuten
                </span>
                <span aria-hidden="true">·</span>
                {/*
                 * Diese Angabe ist zugleich die Textfassung der Fortschrittskette
                 * darunter. Als `status` wird sie beim Ändern vorgelesen – ohne
                 * dass es dafür eine zweite, unsichtbare Kopie braucht.
                 */}
                <span role="status">
                  {passedCount} von {lesson.exercises.length} Aufgaben gelöst
                </span>
                {lesson.progress.state === 'COMPLETED' ? (
                  <Badge tone="success">abgeschlossen</Badge>
                ) : null}
              </div>
            </div>
          </div>

          {/*
           * Fortschritt als Kette aus Gliedern statt als Balken. Bei drei bis
           * fünf Aufgaben sagt eine Kette mehr: Man sieht, wie viele Aufgaben
           * es überhaupt gibt, nicht nur einen Anteil.
           */}
          <div className="mt-6">
            <ol aria-hidden="true" className="flex gap-1.5">
              {lesson.exercises.map((exercise) => (
                <li
                  key={exercise.slug}
                  className={cx(
                    'h-2.5 flex-1 rounded-full transition-colors duration-500',
                    passedSlugs.has(exercise.slug)
                      ? isComplete
                        ? 'bg-[var(--success)]'
                        : 'bg-[var(--akzent)]'
                      : 'bg-[var(--border-strong)]',
                  )}
                />
              ))}
            </ol>
          </div>
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
                  'min-h-10 whitespace-nowrap rounded-full border-2 px-4 text-sm font-bold',
                  'transition-colors duration-150',
                  activeSection === section.id
                    ? 'border-[var(--akzent)] bg-[var(--akzent)] text-[var(--text-inverse)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--akzent)] hover:text-[var(--akzent)]',
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
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span aria-hidden="true" className="text-[var(--akzent)]">
                <Icon name="karte" size={20} />
              </span>
              Was du nach dieser Lektion kannst
            </h2>
            <ul className="mt-3 space-y-2">
              {lesson.learningObjectives.map((objective) => (
                <li key={objective} className="flex items-start gap-2.5 text-[0.95rem]">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--akzent-soft)] text-[var(--akzent)]"
                  >
                    <Icon name="haken" size={13} />
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
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span aria-hidden="true" className="text-[var(--akzent)]">
                <Icon name="gluehbirne" size={20} />
              </span>
              Das Problem
            </h2>
            <p className="mt-2 text-[0.95rem]">{lesson.everydayProblem}</p>
          </Card>

          <Card as="section" id="abschnitt-modell">
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span aria-hidden="true" className="text-[var(--akzent)]">
                <Icon name="funke" size={20} />
              </span>
              So kannst du es dir vorstellen
            </h2>
            <p className="mt-2 text-[0.95rem]">{lesson.mentalModel}</p>
          </Card>

          <Card as="section" id="abschnitt-beispiel">
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span aria-hidden="true" className="text-[var(--akzent)]">
                <Icon name="code" size={20} />
              </span>
              Beispiel, Zeile für Zeile
            </h2>
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

            {/*
             * Die Liste oben ist von Hand geschrieben und redaktionell geprüft.
             * Der Knopf darunter führt dasselbe Beispiel wirklich aus – und
             * lädt vor allem dazu ein, etwas zu verändern und nachzusehen, was
             * dann passiert.
             */}
            <WorkedExampleRunner code={lesson.workedExample.code} />
          </Card>

          <Card as="section">
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span aria-hidden="true" className="text-[var(--akzent)]">
                <Icon name="achtung" size={20} />
              </span>
              Typische Stolperstellen
            </h2>
            <ul className="mt-3 space-y-4">
              {lesson.commonMistakes.map((mistake) => (
                <li key={mistake.mistake}>
                  <p className="flex items-start gap-2.5 font-semibold">
                    <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--caution)]">
                      <Icon name="achtung" size={18} />
                    </span>
                    <span>{mistake.mistake}</span>
                  </p>
                  <p className="mt-1 pl-[1.75rem] text-[0.9375rem] text-[var(--text-muted)]">
                    <strong className="text-[var(--text)]">Warum:</strong> {mistake.why}
                  </p>
                  <p className="mt-1 pl-[1.75rem] text-[0.9375rem] text-[var(--text-muted)]">
                    <strong className="text-[var(--text)]">Abhilfe:</strong> {mistake.fix}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* --- Aufgaben --------------------------------------------------- */}
        <div className="space-y-5" id="abschnitt-aufgaben">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-black tracking-tight">
              <span aria-hidden="true" className="text-[var(--akzent)]">
                <Icon name="tastatur" size={22} />
              </span>
              Aufgaben
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Die Hilfen werden von Aufgabe zu Aufgabe weniger.
            </p>
          </div>

          {lesson.exercises.map((exercise, index) => (
            <div key={exercise.slug}>
              <p className="mb-2 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cx(
                    'flex size-7 items-center justify-center rounded-full text-sm font-black',
                    passedSlugs.has(exercise.slug)
                      ? 'bg-[var(--success)] text-[var(--text-inverse)]'
                      : 'bg-[var(--akzent-soft)] text-[var(--akzent)]',
                  )}
                >
                  {passedSlugs.has(exercise.slug) ? <Icon name="haken" size={15} /> : index + 1}
                </span>
                <span className="text-sm font-bold text-[var(--text-muted)]">
                  Aufgabe {index + 1} von {lesson.exercises.length}
                </span>
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
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span aria-hidden="true" className="text-[var(--akzent)]">
                <Icon name="profil" size={20} />
              </span>
              Kurz nachdenken
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Zwei Minuten hier bringen mehr als eine weitere Aufgabe. Deine Antwort wird nicht
              bewertet und nicht im Klartext gespeichert.
            </p>

            <ul className="mt-3 space-y-1.5">
              {lesson.reflectionPrompts.map((prompt) => (
                <li key={prompt} className="flex items-start gap-2.5 text-[0.95rem]">
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--akzent)]">
                    <Icon name="gluehbirne" size={17} />
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
                className="flex items-center gap-1.5 font-semibold text-[var(--akzent)] underline"
              >
                <Icon name="zurueck" size={16} />
                Vorherige Lektion
              </Link>
            ) : (
              <span />
            )}
            {lesson.nextSlug ? (
              <Link
                href={`/lernen/${lesson.nextSlug}`}
                className="flex items-center gap-1.5 font-semibold text-[var(--akzent)] underline"
              >
                Nächste Lektion
                <Icon name="vor" size={16} />
              </Link>
            ) : (
              <Link
                href="/projekte"
                className="flex items-center gap-1.5 font-semibold text-[var(--akzent)] underline"
              >
                Zu den Projekten
                <Icon name="vor" size={16} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
