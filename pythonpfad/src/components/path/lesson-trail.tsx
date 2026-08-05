import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/components/ui/primitives';
import { layoutTrail } from '@/domain/design/trail-layout';
import { moduleTheme, themeStyle } from '@/domain/design/module-theme';

/**
 * Der Lernpfad als Strecke.
 *
 * Vorher war das eine Liste aus Kästchen. Eine Liste sagt „hier ist noch mehr";
 * eine Strecke sagt „du bist hier, und da geht es weiter". Für einen Kurs, der
 * aufeinander aufbaut, ist das die ehrlichere Darstellung.
 *
 * Zur Zugänglichkeit: Die Reihenfolge im Dokument entspricht der Reihenfolge im
 * Kurs; verschoben wird nur die Darstellung. Jede Station ist ein Link mit
 * vollständigem Namen (Titel, Dauer, Zustand), die geschwungene Linie ist für
 * Hilfstechnik unsichtbar. Wer mit der Tastatur läuft, bekommt also dieselbe
 * Abfolge wie beim Lesen von oben nach unten.
 */

export type LessonState = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';

export interface TrailLesson {
  slug: string;
  title: string;
  estimatedMinutes: number;
  state: LessonState;
}

export interface TrailModule {
  slug: string;
  title: string;
  summary: string | null;
  order: number;
  lessons: TrailLesson[];
}

const ZUSTAND_TEXT: Record<LessonState, string> = {
  COMPLETED: 'abgeschlossen',
  IN_PROGRESS: 'begonnen',
  NOT_STARTED: 'noch nicht begonnen',
};

/** Höhe je Station und Ausschlag der Linie. Siehe trail-layout.ts. */
const STEP = 132;
const AMPLITUDE = 22;

export function LessonTrail({ modules }: { modules: readonly TrailModule[] }): ReactNode {
  return (
    <div className="space-y-10">
      {modules.map((mod) => (
        <ModuleSection key={mod.slug} mod={mod} />
      ))}
    </div>
  );
}

function ModuleSection({ mod }: { mod: TrailModule }): ReactNode {
  const theme = moduleTheme(mod.order);
  const erledigt = mod.lessons.filter((lesson) => lesson.state === 'COMPLETED').length;

  // Bis wohin die Linie durchgezogen ist: der zusammenhängende Anfang aus
  // abgeschlossenen Lektionen. Eine später übersprungene Lektion darf die
  // Linie nicht zurückfärben – deshalb der Anfang und nicht die Gesamtzahl.
  let durchgezogen = 0;
  while (durchgezogen < mod.lessons.length && mod.lessons[durchgezogen]?.state === 'COMPLETED') {
    durchgezogen += 1;
  }

  const layout = layoutTrail(mod.lessons.length, { step: STEP, amplitude: AMPLITUDE });
  // Dieselbe Rechnung mit weniger Punkten ergibt exakt den Anfang derselben
  // Linie – deshalb genügt ein zweiter Aufruf für den farbigen Teil.
  const bisher = layoutTrail(Math.min(durchgezogen + 1, mod.lessons.length), {
    step: STEP,
    amplitude: AMPLITUDE,
  });

  return (
    <section aria-labelledby={`modul-${mod.slug}`} style={themeStyle(theme)}>
      {/* Modulkopf. Die Farbe ist die Leitfarbe des Moduls und kommt auf der
          Lektionsseite wieder – daran erkennt man, wo man ist. */}
      <div className="glow-soft flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--akzent-soft)] p-5">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--akzent)] text-[var(--text-inverse)]"
        >
          <Icon name="lernen" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id={`modul-${mod.slug}`}
            className="text-lg font-black tracking-tight text-[var(--akzent)]"
          >
            {mod.title}
          </h3>
          {mod.summary ? <p className="mt-0.5 text-sm text-[var(--text)]">{mod.summary}</p> : null}
        </div>
        <p className="shrink-0 rounded-full bg-[var(--surface-raised)] px-3.5 py-1.5 text-sm font-bold text-[var(--akzent)]">
          {erledigt} von {mod.lessons.length}
        </p>
      </div>

      {/* Die Strecke */}
      <div
        className="relative mx-auto mt-2 w-full max-w-xl"
        style={{ height: `${layout.height}px` }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          viewBox={`0 0 100 ${layout.height}`}
          preserveAspectRatio="none"
          fill="none"
        >
          {/* Gestrichelt: der Weg, der noch vor einem liegt. */}
          <path
            d={layout.path}
            stroke="var(--border-strong)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="2 14"
            vectorEffect="non-scaling-stroke"
          />
          {/* Durchgezogen: der Weg, den man schon gegangen ist. */}
          {durchgezogen > 0 ? (
            <path
              d={bisher.path}
              stroke="var(--akzent)"
              strokeWidth="5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        <ol className="absolute inset-0">
          {mod.lessons.map((lesson, index) => {
            const point = layout.points[index];
            if (!point) return null;
            return (
              <li
                key={lesson.slug}
                className="absolute w-[10.5rem] -translate-x-1/2 -translate-y-1/2 text-center"
                style={{ left: `${point.x}%`, top: `${point.y}px` }}
              >
                <TrailNode lesson={lesson} nummer={index + 1} />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function TrailNode({ lesson, nummer }: { lesson: TrailLesson; nummer: number }): ReactNode {
  const aktiv = lesson.state === 'IN_PROGRESS';
  const fertig = lesson.state === 'COMPLETED';

  return (
    <Link
      href={`/lernen/${lesson.slug}`}
      className="group flex flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-offset-4"
    >
      <span
        aria-hidden="true"
        className={cx(
          'flex items-center justify-center rounded-full font-black transition-transform',
          'duration-200 group-hover:scale-110 group-active:translate-y-1',
          fertig && 'size-16 border-b-4 border-[var(--akzent)] bg-[var(--akzent)] text-[var(--text-inverse)]',
          aktiv &&
            'animate-float size-[4.5rem] border-4 border-[var(--akzent)] bg-[var(--surface-raised)] text-[var(--akzent)] shadow-[0_0_0_6px_var(--akzent-soft)]',
          !fertig &&
            !aktiv &&
            'size-16 border-b-4 border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-muted)]',
        )}
      >
        {fertig ? (
          <Icon name="haken" size={30} />
        ) : aktiv ? (
          <Icon name="abspielen" size={26} />
        ) : (
          <span className="text-xl">{nummer}</span>
        )}
      </span>

      {/*
       * Der Titel liegt auf einer eigenen Fläche. Ohne sie liefe die
       * geschwungene Linie mitten durch die Schrift – lesbar wäre dann weder
       * das eine noch das andere.
       */}
      <span
        className={cx(
          'line-clamp-2 rounded-lg bg-[var(--surface)] px-1.5 text-[0.8125rem] font-bold leading-snug',
          'group-hover:underline',
          aktiv ? 'text-[var(--akzent)]' : fertig ? 'text-[var(--text)]' : 'text-[var(--text-muted)]',
        )}
      >
        {lesson.title}
      </span>
      {/* Nur für Hilfstechnik: Ohne diesen Zusatz hieße jeder Link nur „Titel". */}
      <span className="sr-only">
        {`Lektion ${nummer}, etwa ${lesson.estimatedMinutes} Minuten, ${ZUSTAND_TEXT[lesson.state]}`}
      </span>
    </Link>
  );
}
