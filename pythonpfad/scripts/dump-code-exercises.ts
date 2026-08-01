/**
 * Exportiert alle Aufgaben und Projekte mit ausführbarem Code als JSON.
 *
 * Damit lassen sich die Musterlösungen gegen ihre eigenen Testfälle prüfen,
 * bevor Inhalte veröffentlicht werden (siehe scripts/verify_solutions.py).
 */
import { rawCourse, projects } from '../src/content';

interface DumpEntry {
  slug: string;
  kind: 'exercise' | 'project';
  solution: string;
  sourceChecks: Array<{ id: string; mustMatch?: string; mustNotMatch?: string; message: string }>;
  tests: Array<{
    id: string;
    name: string;
    setup?: string;
    stdin?: string[];
    expectedStdout?: string;
    assertion?: string;
  }>;
}

const entries: DumpEntry[] = [];

for (const mod of rawCourse.modules) {
  for (const lesson of mod.lessons) {
    for (const exercise of lesson.exercises) {
      if (exercise.payload.kind !== 'code' || !exercise.solution) continue;
      entries.push({
        slug: exercise.slug,
        kind: 'exercise',
        solution: exercise.solution,
        sourceChecks: (exercise.payload.sourceChecks ?? []).map((c) => ({
          id: c.id,
          ...(c.mustMatch !== undefined ? { mustMatch: c.mustMatch } : {}),
          ...(c.mustNotMatch !== undefined ? { mustNotMatch: c.mustNotMatch } : {}),
          message: c.message,
        })),
        tests: [...(exercise.publicTests ?? []), ...(exercise.hiddenTests ?? [])],
      });
    }
  }
}

// Projekte haben keine hinterlegte Musterlösung im Inhalt – geprüft wird hier,
// dass die Startdateien syntaktisch verarbeitbar sind und die Tests konsistent
// beschrieben sind. Die inhaltliche Prüfung übernimmt verify_solutions.py über
// die separat gepflegten Referenzlösungen.
for (const project of projects) {
  entries.push({
    slug: project.slug,
    kind: 'project',
    solution: project.starterFiles[0]?.content ?? '',
    sourceChecks: [],
    tests: project.tests,
  });
}

process.stdout.write(JSON.stringify(entries, null, 2));
