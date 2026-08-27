/**
 * Seed-Skript. Legt Kurs, Module, Lektionen, Konzepte, Aufgaben und Labs an.
 * Idempotent: beliebig oft ausführbar, ausschließlich `upsert`. Bestehender
 * Lernfortschritt bleibt unberührt, weil dieser in eigenen Tabellen liegt
 * (Attempt, ConceptMastery, …), die hier nicht angefasst werden.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';
import {
  courseSchema,
  conceptSchema,
  labSchema,
  validateCourseGraph,
  type ConceptContent,
} from '../src/domain/content/schema';
import { course } from '../src/content/course';
import { concepts as conceptDrafts } from '../src/content/concepts';
import { labs as labDrafts } from '../src/content/labs';
import { hashPassword } from '../src/server/auth/password';

const envDatei = path.join(import.meta.dirname, '..', '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL ist nicht gesetzt. Kopiere .env.example nach .env.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  console.log('→ Inhalte werden geprüft …');

  const parsedCourse = courseSchema.parse(course);
  const parsedConcepts: ConceptContent[] = conceptDrafts.map((c) => conceptSchema.parse(c));
  const parsedLabs = labDrafts.map((l) => labSchema.parse(l));

  const validation = validateCourseGraph({
    course: parsedCourse,
    concepts: parsedConcepts,
    labs: parsedLabs,
  });

  for (const issue of validation.issues.filter((i) => i.severity === 'warning')) {
    console.warn(`  ⚠ ${issue.where}: ${issue.message}`);
  }
  const errors = validation.issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    for (const issue of errors) console.error(`  ✖ ${issue.where}: ${issue.message}`);
    throw new Error(`${errors.length} Inhaltsfehler. Seeding abgebrochen.`);
  }
  console.log(
    `  ✓ ${parsedConcepts.length} Konzepte, ${validation.issues.length} Hinweis(e), keine Fehler.`,
  );

  // --- Konzepte -------------------------------------------------------------
  console.log('→ Konzepte …');
  const conceptIdBySlug = new Map<string, string>();
  for (const concept of parsedConcepts) {
    const row = await prisma.concept.upsert({
      where: { slug: concept.slug },
      create: {
        slug: concept.slug,
        name: concept.name,
        description: concept.description,
        difficulty: concept.difficulty,
        prerequisiteIds: [], // wird im zweiten Durchlauf auf echte IDs aufgelöst
      },
      update: {
        name: concept.name,
        description: concept.description,
        difficulty: concept.difficulty,
      },
    });
    conceptIdBySlug.set(concept.slug, row.id);
  }
  // Zweiter Durchlauf: prerequisiteIds als echte Concept-IDs eintragen.
  for (const concept of parsedConcepts) {
    const id = conceptIdBySlug.get(concept.slug);
    if (!id) continue;
    const prerequisiteIds = concept.prerequisiteSlugs
      .map((slug) => conceptIdBySlug.get(slug))
      .filter((v): v is string => Boolean(v));
    await prisma.concept.update({ where: { id }, data: { prerequisiteIds } });
  }

  // --- Kurs, Module, Lektionen, Aufgaben --------------------------------------
  console.log('→ Kurs, Module, Lektionen, Aufgaben …');
  const courseRow = await prisma.course.upsert({
    where: { slug: parsedCourse.slug },
    create: {
      slug: parsedCourse.slug,
      title: parsedCourse.title,
      description: parsedCourse.description,
      version: parsedCourse.version,
      status: 'PUBLISHED',
    },
    update: {
      title: parsedCourse.title,
      description: parsedCourse.description,
      version: parsedCourse.version,
    },
  });

  for (const [moduleIndex, mod] of parsedCourse.modules.entries()) {
    const moduleRow = await prisma.courseModule.upsert({
      where: { slug: mod.slug },
      create: {
        courseId: courseRow.id,
        slug: mod.slug,
        title: mod.title,
        summary: mod.summary,
        rationale: mod.rationale,
        order: moduleIndex,
        status: mod.status,
        prerequisiteIds: [],
      },
      update: {
        title: mod.title,
        summary: mod.summary,
        rationale: mod.rationale,
        order: moduleIndex,
        status: mod.status,
      },
    });

    for (const [lessonIndex, lesson] of mod.lessons.entries()) {
      const lessonRow = await prisma.lesson.upsert({
        where: { slug: lesson.slug },
        create: {
          moduleId: moduleRow.id,
          slug: lesson.slug,
          title: lesson.title,
          learningObjectives: lesson.learningObjectives,
          everydayProblem: lesson.everydayProblem,
          mentalModel: lesson.mentalModel,
          workedExample: lesson.workedExample,
          reflectionPrompts: lesson.reflectionPrompts,
          commonMistakes: lesson.commonMistakes,
          estimatedMinutes: lesson.estimatedMinutes,
          order: lessonIndex,
          contentVersion: lesson.contentVersion,
          status: lesson.status,
          prerequisiteConceptIds: lesson.prerequisiteConceptSlugs
            .map((slug) => conceptIdBySlug.get(slug))
            .filter((v): v is string => Boolean(v)),
        },
        update: {
          title: lesson.title,
          learningObjectives: lesson.learningObjectives,
          everydayProblem: lesson.everydayProblem,
          mentalModel: lesson.mentalModel,
          workedExample: lesson.workedExample,
          reflectionPrompts: lesson.reflectionPrompts,
          commonMistakes: lesson.commonMistakes,
          estimatedMinutes: lesson.estimatedMinutes,
          order: lessonIndex,
          contentVersion: lesson.contentVersion,
          status: lesson.status,
        },
      });

      // LessonConcept: primär + unterstützend.
      await prisma.lessonConcept.deleteMany({ where: { lessonId: lessonRow.id } });
      for (const slug of lesson.primaryConceptSlugs) {
        const conceptId = conceptIdBySlug.get(slug);
        if (!conceptId) continue;
        await prisma.lessonConcept.create({
          data: { lessonId: lessonRow.id, conceptId, isPrimary: true },
        });
      }
      for (const slug of lesson.supportingConceptSlugs) {
        const conceptId = conceptIdBySlug.get(slug);
        if (!conceptId) continue;
        await prisma.lessonConcept.create({
          data: { lessonId: lessonRow.id, conceptId, isPrimary: false },
        });
      }

      for (const [exerciseIndex, exercise] of lesson.exercises.entries()) {
        const exerciseRow = await prisma.exercise.upsert({
          where: { slug: exercise.slug },
          create: {
            lessonId: lessonRow.id,
            slug: exercise.slug,
            type: exercise.type,
            title: exercise.title,
            prompt: exercise.prompt,
            payload: exercise.payload,
            solutionNotes: exercise.solutionNotes,
            hints: exercise.hints,
            difficulty: exercise.difficulty,
            scaffoldLevel: exercise.scaffoldLevel,
            transferContext: exercise.transferContext,
            order: exerciseIndex,
            contentVersion: '1.0.0',
            status: exercise.status,
          },
          update: {
            type: exercise.type,
            title: exercise.title,
            prompt: exercise.prompt,
            payload: exercise.payload,
            solutionNotes: exercise.solutionNotes,
            hints: exercise.hints,
            difficulty: exercise.difficulty,
            scaffoldLevel: exercise.scaffoldLevel,
            transferContext: exercise.transferContext,
            order: exerciseIndex,
            status: exercise.status,
          },
        });

        await prisma.exerciseConcept.deleteMany({ where: { exerciseId: exerciseRow.id } });
        for (const [index, slug] of exercise.conceptSlugs.entries()) {
          const conceptId = conceptIdBySlug.get(slug);
          if (!conceptId) continue;
          await prisma.exerciseConcept.create({
            data: { exerciseId: exerciseRow.id, conceptId, weight: index === 0 ? 1 : 0.5 },
          });
        }
      }
    }
  }

  // --- Labs -------------------------------------------------------------------
  console.log('→ Labs …');
  for (const lab of parsedLabs) {
    const relatedConceptIds = lab.relatedConceptSlugs
      .map((slug) => conceptIdBySlug.get(slug))
      .filter((v): v is string => Boolean(v));

    await prisma.lab.upsert({
      where: { slug: lab.slug },
      create: {
        slug: lab.slug,
        kind: lab.kind,
        title: lab.title,
        summary: lab.summary,
        instructions: lab.instructions,
        config: lab.config as Prisma.InputJsonValue,
        estimatedMinutes: lab.estimatedMinutes,
        status: lab.status,
        relatedConceptIds,
        concepts: { connect: relatedConceptIds.map((id) => ({ id })) },
      },
      update: {
        title: lab.title,
        summary: lab.summary,
        instructions: lab.instructions,
        config: lab.config as Prisma.InputJsonValue,
        estimatedMinutes: lab.estimatedMinutes,
        status: lab.status,
        relatedConceptIds,
        concepts: { set: relatedConceptIds.map((id) => ({ id })) },
      },
    });
  }

  // --- Beispielkonto (nur lokale Entwicklung) ---------------------------------
  if (process.env.SEED_DEMO_USERS === 'true' && process.env.NODE_ENV !== 'production') {
    console.log('→ Beispielkonto …');
    const email = 'demo@aipfad.de';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          name: 'Demo',
          passwordHash: await hashPassword('demo-passwort-lokal'),
          onboardingCompleted: false,
        },
      });
      console.log('  ✓ demo@aipfad.de / demo-passwort-lokal (NUR lokale Entwicklung)');
    }
  }

  console.log('✓ Seeding abgeschlossen.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
