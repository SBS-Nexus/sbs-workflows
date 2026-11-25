-- CreateTable
CREATE TABLE "learning_plans" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "targetLessons" INTEGER,
    "dueDate" DATE,

    CONSTRAINT "learning_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_plans_teamId_key" ON "learning_plans"("teamId");

-- CreateIndex
CREATE INDEX "learning_plan_items_planId_position_idx" ON "learning_plan_items"("planId", "position");

-- AddForeignKey
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "learning_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Von Hand ergänzt: Prüfungen, die Prisma nicht abbildet.
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_path_check" CHECK ("path" IN ('python', 'sql', 'ai'));
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_target_check" CHECK ("targetLessons" IS NULL OR ("targetLessons" >= 1 AND "targetLessons" <= 1000));
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_position_check" CHECK ("position" >= 0);
