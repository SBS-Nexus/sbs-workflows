/**
 * Inhaltsvalidierung als ausführbarer Befehl: `npm run content:validate`.
 *
 * Bewusst NUR ein Adapter. Die fachlichen Regeln stehen ausschließlich in
 * `src/domain/content/schema.ts` — dieselben Funktionen, die auch das
 * Seed-Skript und die Unit-Tests aufrufen. Eine zweite Fassung der Regeln
 * hier wäre genau das Auseinanderlaufen, gegen das dieses Projekt sonst
 * überall argumentiert: Die eine Quelle der Wahrheit bekommt einen zweiten
 * Ausführungsweg, keine zweite Wahrheit.
 *
 * Der Befehl war in `package.json` seit Ausbaustufe 1 deklariert, die Datei
 * dazu fehlte — die Inhaltsprüfung hing damit allein an einem Unit-Test.
 *
 * Keine Datenbank, kein Netz, keine Seiteneffekte: Es wird gelesen, geprüft
 * und berichtet.
 */

import { z } from 'zod';
import {
  courseSchema,
  conceptSchema,
  labSchema,
  validateCourseGraph,
  validateCommandReference,
  type ConceptContent,
  type ContentIssue,
  type LabContent,
} from '../src/domain/content/schema';
import { course } from '../src/content/course';
import { concepts as conceptDrafts } from '../src/content/concepts';
import { labs as labDrafts } from '../src/content/labs';
import { SETUP_SECTIONS } from '../src/content/setup-commands';

/**
 * Ein Schemafehler wird zum gewöhnlichen Befund, statt das Skript zu
 * beenden. Sonst verdeckte der erste Fehler alle weiteren, und man liefe
 * dieselbe Prüfung mehrfach, um nacheinander zu erfahren, was in einem
 * Durchgang dastehen kann.
 */
function pruefeSchema<T>(
  schema: z.ZodType<T>,
  wert: unknown,
  where: string,
  issues: ContentIssue[],
): T | null {
  const ergebnis = schema.safeParse(wert);
  if (ergebnis.success) return ergebnis.data;

  for (const einzeln of ergebnis.error.issues) {
    const pfad = einzeln.path.map(String).join('.');
    issues.push({
      severity: 'error',
      where: pfad.length > 0 ? `${where}.${pfad}` : where,
      message: einzeln.message,
    });
  }
  return null;
}

/**
 * Feste Reihenfolge, damit zwei Läufe über denselben Stand Zeile für Zeile
 * dasselbe ergeben: erst die Fehler, dann die Warnungen, innerhalb dessen
 * nach Ort und Meldung. Verglichen wird ohne Locale — sonst hinge die
 * Ausgabe an der Spracheinstellung des Rechners.
 */
function sortiere(issues: ContentIssue[]): ContentIssue[] {
  const rang = (issue: ContentIssue): number => (issue.severity === 'error' ? 0 : 1);
  const vergleiche = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

  return [...issues].sort(
    (a, b) => rang(a) - rang(b) || vergleiche(a.where, b.where) || vergleiche(a.message, b.message),
  );
}

function main(): number {
  const issues: ContentIssue[] = [];

  // --- Laden und gegen die Schemata prüfen ---------------------------------
  const parsedCourse = pruefeSchema(courseSchema, course, 'course', issues);

  const parsedConcepts: ConceptContent[] = [];
  for (const [i, entwurf] of conceptDrafts.entries()) {
    const geprueft = pruefeSchema(
      conceptSchema,
      entwurf,
      `concept[${i}]:${(entwurf as { slug?: string }).slug ?? '?'}`,
      issues,
    );
    if (geprueft) parsedConcepts.push(geprueft);
  }

  const parsedLabs: LabContent[] = [];
  for (const [i, entwurf] of labDrafts.entries()) {
    const geprueft = pruefeSchema(
      labSchema,
      entwurf,
      `lab[${i}]:${(entwurf as { slug?: string }).slug ?? '?'}`,
      issues,
    );
    if (geprueft) parsedLabs.push(geprueft);
  }

  const referenzBefehle = SETUP_SECTIONS.flatMap((abschnitt) => abschnitt.commands);

  // --- Beziehungsprüfungen -------------------------------------------------
  // Ohne gültigen Kurs ergäbe der Graph keinen Sinn; die Schemafehler oben
  // stehen dann für sich und der Lauf schlägt ohnehin fehl.
  if (parsedCourse) {
    issues.push(
      ...validateCourseGraph({
        course: parsedCourse,
        concepts: parsedConcepts,
        labs: parsedLabs,
        referenzBefehle: referenzBefehle.map((befehl) => befehl.command),
      }).issues,
    );
  }

  issues.push(...validateCommandReference(referenzBefehle).issues);

  // --- Bericht -------------------------------------------------------------
  for (const issue of sortiere(issues)) {
    const zeile = `${issue.severity.toUpperCase()} ${issue.where}: ${issue.message}`;
    if (issue.severity === 'error') console.error(zeile);
    else console.log(zeile);
  }

  const fehler = issues.filter((i) => i.severity === 'error').length;
  const warnungen = issues.length - fehler;

  // Warnungen allein lassen den Lauf bestehen — dieselbe Regel, die
  // `ContentValidationResult.ok` und das Seed-Skript anwenden. Sie melden
  // etwas, das jemand ansehen soll, nicht etwas, das den Kurs kaputt macht.
  console.log(fehler === 0 ? 'CONTENT_VALIDATION=PASS' : 'CONTENT_VALIDATION=FAIL');
  console.log(`ERRORS=${fehler}`);
  console.log(`WARNINGS=${warnungen}`);

  return fehler === 0 ? 0 : 1;
}

process.exitCode = main();
