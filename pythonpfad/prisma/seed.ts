/**
 * Seed-Skript.
 *
 * Legt Kurs, Module, Lektionen, Konzepte, Aufgaben, Wiederholungssets und
 * Projekte an – sowie zwei Beispielkonten für die lokale Entwicklung.
 *
 * Das Skript ist idempotent: Es lässt sich beliebig oft ausführen und führt
 * dabei zum selben Inhaltsstand. Lernfortschritt bestehender Konten bleibt
 * erhalten, weil ausschließlich Inhalte per `upsert` geschrieben werden.
 */
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { parseContent, contentStats } from '../src/content';
import { hashPassword } from '../src/server/auth/password';
import { buildLearningPath } from '../src/domain/path/learning-path';

process.loadEnvFile?.(path.join(import.meta.dirname, '..', '.env'));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL ist nicht gesetzt. Kopiere .env.example nach .env.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  console.log('→ Inhalte werden geprüft …');
  const content = parseContent();

  const errors = content.validation.issues.filter((i) => i.severity === 'error');
  const warnings = content.validation.issues.filter((i) => i.severity === 'warning');

  for (const warning of warnings) {
    console.warn(`  ⚠ ${warning.where}: ${warning.message}`);
  }
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`  ✖ ${error.where}: ${error.message}`);
    }
    throw new Error(`${errors.length} Inhaltsfehler. Seeding abgebrochen.`);
  }

  const stats = contentStats();
  console.log(
    `  ✓ ${stats.modules} Module, ${stats.lessons} Lektionen, ${stats.exercises} Aufgaben ` +
      `(${stats.exerciseKinds} Interaktionsformen, ${stats.exerciseTypes} Aufgabentypen), ` +
      `${stats.concepts} Konzepte, ${stats.reviewSets} Wiederholungssets, ${stats.projects} Projekte`,
  );

  // --- Konzepte -----------------------------------------------------------
  console.log('→ Konzepte …');
  const conceptIdBySlug = new Map<string, string>();
  for (const concept of content.concepts) {
    const row = await prisma.concept.upsert({
      where: { slug: concept.slug },
      create: {
        slug: concept.slug,
        name: concept.name,
        description: concept.description,
        difficulty: concept.difficulty,
        prerequisiteIds: concept.prerequisiteSlugs,
      },
      update: {
        name: concept.name,
        description: concept.description,
        difficulty: concept.difficulty,
        prerequisiteIds: concept.prerequisiteSlugs,
      },
      select: { id: true },
    });
    conceptIdBySlug.set(concept.slug, row.id);
  }

  // --- Kurs, Module, Lektionen, Aufgaben ----------------------------------
  console.log('→ Kurs und Lektionen …');
  const course = await prisma.course.upsert({
    where: { slug: content.course.slug },
    create: {
      slug: content.course.slug,
      title: content.course.title,
      description: content.course.description,
      version: content.course.version,
      status: 'PUBLISHED',
    },
    update: {
      title: content.course.title,
      description: content.course.description,
      version: content.course.version,
    },
    select: { id: true },
  });

  const exerciseIdBySlug = new Map<string, string>();
  const pathLessons: Array<{
    slug: string;
    title: string;
    moduleSlug: string;
    moduleOrder: number;
    lessonOrder: number;
    estimatedMinutes: number;
    primaryConceptSlugs: string[];
  }> = [];

  for (const [moduleIndex, mod] of content.course.modules.entries()) {
    const estimatedMinutes = mod.lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0);

    const moduleRow = await prisma.courseModule.upsert({
      where: { slug: mod.slug },
      create: {
        courseId: course.id,
        slug: mod.slug,
        title: mod.title,
        summary: mod.summary,
        rationale: mod.rationale,
        order: moduleIndex,
        status: mod.status,
        prerequisiteIds: mod.prerequisiteModuleSlugs,
        estimatedMinutes,
      },
      update: {
        courseId: course.id,
        title: mod.title,
        summary: mod.summary,
        rationale: mod.rationale,
        order: moduleIndex,
        status: mod.status,
        prerequisiteIds: mod.prerequisiteModuleSlugs,
        estimatedMinutes,
      },
      select: { id: true },
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
          prerequisiteConceptIds: lesson.prerequisiteConceptSlugs,
        },
        update: {
          moduleId: moduleRow.id,
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
          prerequisiteConceptIds: lesson.prerequisiteConceptSlugs,
        },
        select: { id: true },
      });

      pathLessons.push({
        slug: lesson.slug,
        title: lesson.title,
        moduleSlug: mod.slug,
        moduleOrder: moduleIndex,
        lessonOrder: lessonIndex,
        estimatedMinutes: lesson.estimatedMinutes,
        primaryConceptSlugs: lesson.primaryConceptSlugs,
      });

      // Konzeptzuordnung der Lektion neu aufbauen.
      await prisma.lessonConcept.deleteMany({ where: { lessonId: lessonRow.id } });
      const lessonConceptSlugs = new Map<string, boolean>();
      for (const slug of lesson.primaryConceptSlugs) lessonConceptSlugs.set(slug, true);
      for (const slug of lesson.supportingConceptSlugs) {
        if (!lessonConceptSlugs.has(slug)) lessonConceptSlugs.set(slug, false);
      }
      for (const [slug, isPrimary] of lessonConceptSlugs) {
        const conceptId = conceptIdBySlug.get(slug);
        if (!conceptId) continue;
        await prisma.lessonConcept.create({
          data: { lessonId: lessonRow.id, conceptId, isPrimary },
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
            starterCode: exercise.starterCode ?? null,
            solution: exercise.solution ?? null,
            solutionNotes: exercise.solutionNotes ?? null,
            publicTests: exercise.publicTests,
            hiddenTests: exercise.hiddenTests,
            hints: exercise.hints,
            difficulty: exercise.difficulty,
            scaffoldLevel: exercise.scaffoldLevel,
            transferContext: exercise.transferContext ?? null,
            order: exerciseIndex,
            status: exercise.status,
          },
          update: {
            lessonId: lessonRow.id,
            type: exercise.type,
            title: exercise.title,
            prompt: exercise.prompt,
            payload: exercise.payload,
            starterCode: exercise.starterCode ?? null,
            solution: exercise.solution ?? null,
            solutionNotes: exercise.solutionNotes ?? null,
            publicTests: exercise.publicTests,
            hiddenTests: exercise.hiddenTests,
            hints: exercise.hints,
            difficulty: exercise.difficulty,
            scaffoldLevel: exercise.scaffoldLevel,
            transferContext: exercise.transferContext ?? null,
            order: exerciseIndex,
            status: exercise.status,
          },
          select: { id: true },
        });
        exerciseIdBySlug.set(exercise.slug, exerciseRow.id);

        await prisma.exerciseConcept.deleteMany({ where: { exerciseId: exerciseRow.id } });
        for (const [index, slug] of exercise.conceptSlugs.entries()) {
          const conceptId = conceptIdBySlug.get(slug);
          if (!conceptId) continue;
          // Das erstgenannte Konzept ist das Hauptkonzept der Aufgabe.
          await prisma.exerciseConcept.create({
            data: { exerciseId: exerciseRow.id, conceptId, weight: index === 0 ? 1 : 0.5 },
          });
        }
      }
    }
  }

  // --- Wiederholungssets --------------------------------------------------
  console.log('→ Wiederholungssets …');
  for (const set of content.reviewSets) {
    const row = await prisma.reviewSet.upsert({
      where: { slug: set.slug },
      create: {
        slug: set.slug,
        title: set.title,
        description: set.description,
        unlockAfterDays: set.unlockAfterDays,
        requiredLessonSlugs: set.requiredLessonSlugs,
        status: 'PUBLISHED',
      },
      update: {
        title: set.title,
        description: set.description,
        unlockAfterDays: set.unlockAfterDays,
        requiredLessonSlugs: set.requiredLessonSlugs,
      },
      select: { id: true },
    });

    await prisma.reviewSetItem.deleteMany({ where: { reviewSetId: row.id } });
    for (const [index, slug] of set.exerciseSlugs.entries()) {
      const exerciseId = exerciseIdBySlug.get(slug);
      if (!exerciseId) continue;
      await prisma.reviewSetItem.create({
        data: { reviewSetId: row.id, exerciseId, order: index },
      });
    }
  }

  // --- Projekte -----------------------------------------------------------
  console.log('→ Projekte …');
  for (const project of content.projects) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      create: {
        slug: project.slug,
        title: project.title,
        description: project.description,
        difficulty: project.difficulty,
        requirements: project.requirements,
        milestones: project.milestones,
        starterFiles: project.starterFiles,
        rubric: project.rubric,
        tests: project.tests,
        estimatedMinutes: project.estimatedMinutes,
        status: project.status,
        conceptSlugs: project.conceptSlugs,
      },
      update: {
        title: project.title,
        description: project.description,
        difficulty: project.difficulty,
        requirements: project.requirements,
        milestones: project.milestones,
        starterFiles: project.starterFiles,
        rubric: project.rubric,
        tests: project.tests,
        estimatedMinutes: project.estimatedMinutes,
        status: project.status,
        conceptSlugs: project.conceptSlugs,
      },
    });
  }

  // --- Beispielkonten -----------------------------------------------------
  if (shouldSeedDemoUsers()) {
    console.log('→ Beispielkonten …');
    await seedDemoUsers(course.id, pathLessons);

    console.log('\n✓ Seeding abgeschlossen.\n');
    console.log('  Beispielkonten für die lokale Entwicklung:');
    console.log('    lernende@example.org  /  LernenMachtSpass24');
    console.log('    admin@example.org     /  AdminZugangLokal24  (Rolle ADMIN)\n');
  } else {
    console.log('→ Beispielkonten übersprungen (SEED_DEMO_USERS ist nicht "true").');
    console.log('\n✓ Seeding abgeschlossen.\n');
  }
}

/**
 * Sollen die Beispielkonten angelegt werden?
 *
 * Ihre Passwörter stehen im Repository. Sie dürfen deshalb niemals versehentlich
 * in einer erreichbaren Installation landen – und weil `db:seed` laut
 * Betriebsanleitung auch für spätere Inhaltsaktualisierungen läuft, genügt ein
 * einmaliges Löschen von Hand nicht: Ohne diese Sperre käme das
 * Administratorkonto bei jedem Inhaltsupdate zurück oder bekäme sein bekanntes
 * Passwort erneut gesetzt.
 *
 * Deshalb werden sie ausschließlich bei ausdrücklichem `SEED_DEMO_USERS=true`
 * angelegt, und in Produktion grundsätzlich nicht.
 */
function shouldSeedDemoUsers(): boolean {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SEED_DEMO_USERS === 'true') {
      console.warn(
        '  ⚠ SEED_DEMO_USERS=true wird in Produktion ignoriert. Beispielkonten werden nicht angelegt.',
      );
    }
    return false;
  }
  return process.env.SEED_DEMO_USERS === 'true';
}

async function seedDemoUsers(
  courseId: string,
  lessons: Parameters<typeof buildLearningPath>[0]['lessons'],
): Promise<void> {
  const learnerPassword = await hashPassword('LernenMachtSpass24');
  const adminPassword = await hashPassword('AdminZugangLokal24');

  const learner = await prisma.user.upsert({
    where: { email: 'lernende@example.org' },
    create: {
      email: 'lernende@example.org',
      name: 'Lea Beispiel',
      passwordHash: learnerPassword,
      role: 'LEARNER',
      onboardingCompleted: true,
      placementCompleted: true,
      placementScore: 25,
      experience: 'NONE',
      learningGoal: 'OFFICE_AUTOMATION',
      dailyTimeBudget: 20,
      pace: 'STEADY',
      selfAssessment: 20,
    },
    update: { passwordHash: learnerPassword },
    select: { id: true },
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.org' },
    create: {
      email: 'admin@example.org',
      name: 'Admin Beispiel',
      passwordHash: adminPassword,
      role: 'ADMIN',
      onboardingCompleted: true,
      placementCompleted: true,
      placementScore: 90,
      experience: 'SOME_PYTHON',
      learningGoal: 'GENERAL',
      dailyTimeBudget: 30,
      pace: 'FOCUSED',
      selfAssessment: 80,
    },
    update: { passwordHash: adminPassword },
  });

  // Lernpfad für das Beispielkonto anlegen, damit der Einstieg sofort
  // funktioniert, ohne das Onboarding erneut zu durchlaufen.
  const built = buildLearningPath({
    lessons,
    placementScore: 25,
    demonstratedConceptSlugs: [],
    learningGoal: 'OFFICE_AUTOMATION',
    dailyTimeBudget: 20,
    pace: 'STEADY',
  });

  const existingPath = await prisma.learningPath.findFirst({
    where: { userId: learner.id },
    select: { id: true },
  });

  const pathRow = existingPath
    ? await prisma.learningPath.update({
        where: { id: existingPath.id },
        data: { lessonSlugs: built.lessonSlugs, rationale: built.rationale },
        select: { id: true },
      })
    : await prisma.learningPath.create({
        data: {
          userId: learner.id,
          courseId,
          title: 'Mein Weg zu Python',
          lessonSlugs: built.lessonSlugs,
          rationale: built.rationale,
        },
        select: { id: true },
      });

  await prisma.user.update({
    where: { id: learner.id },
    data: { currentPathId: pathRow.id },
  });
}

main()
  .catch((error: unknown) => {
    console.error('\n✖ Seeding fehlgeschlagen:\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
