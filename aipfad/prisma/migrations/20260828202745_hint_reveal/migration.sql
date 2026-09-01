-- CreateTable
CREATE TABLE "hint_reveals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hint_reveals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hint_reveals_userId_exerciseId_idx" ON "hint_reveals"("userId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "hint_reveals_userId_exerciseId_level_key" ON "hint_reveals"("userId", "exerciseId", "level");

-- AddForeignKey
ALTER TABLE "hint_reveals" ADD CONSTRAINT "hint_reveals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_reveals" ADD CONSTRAINT "hint_reveals_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
