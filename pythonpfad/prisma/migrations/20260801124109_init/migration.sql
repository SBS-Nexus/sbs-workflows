-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LEARNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('GENERAL', 'OFFICE_AUTOMATION', 'DATA_ANALYSIS', 'AI_APPLICATIONS', 'WEB_DEVELOPMENT', 'CAREER_CHANGE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('NONE', 'TUTORIALS_ONLY', 'OTHER_LANGUAGE', 'SOME_PYTHON');

-- CreateEnum
CREATE TYPE "LearningPace" AS ENUM ('RELAXED', 'STEADY', 'FOCUSED');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'FREE_TEXT', 'PREDICT_OUTPUT', 'PARSONS', 'CODE_COMPLETION', 'FIND_ERROR', 'EXPLAIN_ERROR', 'WRITE_CODE', 'REFACTOR', 'WRITE_TEST', 'COMPARE_SOLUTION', 'MINI_PROJECT', 'SPACED_REVIEW', 'TRANSFER');

-- CreateEnum
CREATE TYPE "AttemptResult" AS ENUM ('PASSED', 'PARTIAL', 'FAILED', 'SOLUTION_REVEALED');

-- CreateEnum
CREATE TYPE "ErrorCategory" AS ENUM ('NONE', 'SYNTAX', 'INDENTATION', 'NAME', 'TYPE', 'INDEX', 'KEY', 'VALUE', 'ATTRIBUTE', 'ZERO_DIVISION', 'RUNTIME_OTHER', 'LOGIC', 'TIMEOUT', 'EMPTY_SUBMISSION', 'CONCEPT');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('UNSURE', 'RATHER_UNSURE', 'RATHER_SURE', 'VERY_SURE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "LessonState" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LEARNER',
    "locale" TEXT NOT NULL DEFAULT 'de-DE',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "experience" "ExperienceLevel" NOT NULL DEFAULT 'NONE',
    "learningGoal" "LearningGoal" NOT NULL DEFAULT 'GENERAL',
    "dailyTimeBudget" INTEGER NOT NULL DEFAULT 20,
    "pace" "LearningPace" NOT NULL DEFAULT 'STEADY',
    "selfAssessment" INTEGER NOT NULL DEFAULT 0,
    "currentPathId" TEXT,
    "placementCompleted" BOOLEAN NOT NULL DEFAULT false,
    "placementScore" INTEGER,
    "aiTutorConsent" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfSecret" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "prerequisiteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "learningObjectives" TEXT[],
    "everydayProblem" TEXT NOT NULL,
    "mentalModel" TEXT NOT NULL,
    "workedExample" JSONB NOT NULL,
    "reflectionPrompts" TEXT[],
    "commonMistakes" JSONB NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 12,
    "order" INTEGER NOT NULL,
    "contentVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "prerequisiteConceptIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concepts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "prerequisiteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_concepts" (
    "lessonId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lesson_concepts_pkey" PRIMARY KEY ("lessonId","conceptId")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT,
    "slug" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "starterCode" TEXT,
    "solution" TEXT,
    "solutionNotes" TEXT,
    "publicTests" JSONB NOT NULL DEFAULT '[]',
    "hiddenTests" JSONB NOT NULL DEFAULT '[]',
    "hints" JSONB NOT NULL DEFAULT '[]',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "scaffoldLevel" INTEGER NOT NULL DEFAULT 3,
    "transferContext" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "contentVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_concepts" (
    "exerciseId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "exercise_concepts_pkey" PRIMARY KEY ("exerciseId","conceptId")
);

-- CreateTable
CREATE TABLE "review_sets" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unlockAfterDays" INTEGER NOT NULL DEFAULT 1,
    "requiredLessonSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',

    CONSTRAINT "review_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_set_items" (
    "reviewSetId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "review_set_items_pkey" PRIMARY KEY ("reviewSetId","exerciseId")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "requirements" TEXT[],
    "milestones" JSONB NOT NULL,
    "starterFiles" JSONB NOT NULL,
    "rubric" JSONB NOT NULL,
    "tests" JSONB NOT NULL DEFAULT '[]',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 45,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "conceptSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lessonSlugs" TEXT[],
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "state" "LessonState" NOT NULL DEFAULT 'NOT_STARTED',
    "lastSection" TEXT NOT NULL DEFAULT 'objective',
    "draftCode" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "submittedCode" TEXT NOT NULL,
    "result" "AttemptResult" NOT NULL,
    "errorType" "ErrorCategory" NOT NULL DEFAULT 'NONE',
    "errorSignature" TEXT,
    "passedTests" INTEGER NOT NULL DEFAULT 0,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "confidenceBefore" "Confidence",
    "confidenceAfter" "Confidence",
    "isReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_mastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "lastPracticedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "successfulRetrievals" INTEGER NOT NULL DEFAULT 0,
    "failedRetrievals" INTEGER NOT NULL DEFAULT 0,
    "transferSuccesses" INTEGER NOT NULL DEFAULT 0,
    "algorithmVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_mastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_queue_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "repetition" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT 'Regulärer Wiederholungsplan',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "automatedResult" JSONB NOT NULL DEFAULT '{}',
    "milestonesDone" INTEGER NOT NULL DEFAULT 0,
    "reflection" TEXT,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "activitiesCompleted" INTEGER NOT NULL DEFAULT 0,
    "activeMinutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "learning_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "mode" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'rule-based',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "contentSlug" TEXT,
    "value" DOUBLE PRECISION,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "occurredOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "course_modules_slug_key" ON "course_modules"("slug");

-- CreateIndex
CREATE INDEX "course_modules_courseId_idx" ON "course_modules"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_modules_courseId_order_key" ON "course_modules"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_slug_key" ON "lessons"("slug");

-- CreateIndex
CREATE INDEX "lessons_moduleId_idx" ON "lessons"("moduleId");

-- CreateIndex
CREATE INDEX "lessons_status_idx" ON "lessons"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_moduleId_order_key" ON "lessons"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "concepts_slug_key" ON "concepts"("slug");

-- CreateIndex
CREATE INDEX "concepts_difficulty_idx" ON "concepts"("difficulty");

-- CreateIndex
CREATE INDEX "lesson_concepts_conceptId_idx" ON "lesson_concepts"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_slug_key" ON "exercises"("slug");

-- CreateIndex
CREATE INDEX "exercises_lessonId_idx" ON "exercises"("lessonId");

-- CreateIndex
CREATE INDEX "exercises_type_idx" ON "exercises"("type");

-- CreateIndex
CREATE INDEX "exercises_status_idx" ON "exercises"("status");

-- CreateIndex
CREATE INDEX "exercise_concepts_conceptId_idx" ON "exercise_concepts"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "review_sets_slug_key" ON "review_sets"("slug");

-- CreateIndex
CREATE INDEX "review_set_items_exerciseId_idx" ON "review_set_items"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "learning_paths_userId_idx" ON "learning_paths"("userId");

-- CreateIndex
CREATE INDEX "lesson_progress_userId_state_idx" ON "lesson_progress"("userId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON "lesson_progress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "attempts_userId_createdAt_idx" ON "attempts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "attempts_userId_exerciseId_idx" ON "attempts"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "attempts_exerciseId_result_idx" ON "attempts"("exerciseId", "result");

-- CreateIndex
CREATE INDEX "attempts_createdAt_idx" ON "attempts"("createdAt");

-- CreateIndex
CREATE INDEX "concept_mastery_userId_nextReviewAt_idx" ON "concept_mastery"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "concept_mastery_userId_conceptId_key" ON "concept_mastery"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "review_queue_items_userId_dueAt_idx" ON "review_queue_items"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_queue_items_userId_exerciseId_key" ON "review_queue_items"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "project_submissions_userId_status_idx" ON "project_submissions"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_submissions_userId_projectId_key" ON "project_submissions"("userId", "projectId");

-- CreateIndex
CREATE INDEX "learning_sessions_userId_startedAt_idx" ON "learning_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "tutor_interactions_userId_createdAt_idx" ON "tutor_interactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_eventType_occurredOn_idx" ON "analytics_events"("eventType", "occurredOn");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_currentPathId_fkey" FOREIGN KEY ("currentPathId") REFERENCES "learning_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_concepts" ADD CONSTRAINT "lesson_concepts_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_concepts" ADD CONSTRAINT "lesson_concepts_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_concepts" ADD CONSTRAINT "exercise_concepts_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_concepts" ADD CONSTRAINT "exercise_concepts_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_set_items" ADD CONSTRAINT "review_set_items_reviewSetId_fkey" FOREIGN KEY ("reviewSetId") REFERENCES "review_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_set_items" ADD CONSTRAINT "review_set_items_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_mastery" ADD CONSTRAINT "concept_mastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_mastery" ADD CONSTRAINT "concept_mastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_queue_items" ADD CONSTRAINT "review_queue_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_queue_items" ADD CONSTRAINT "review_queue_items_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_submissions" ADD CONSTRAINT "project_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_submissions" ADD CONSTRAINT "project_submissions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_interactions" ADD CONSTRAINT "tutor_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
