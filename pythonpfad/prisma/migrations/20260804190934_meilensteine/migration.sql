-- CreateTable
CREATE TABLE "milestone_awards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "milestone_awards_userId_idx" ON "milestone_awards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_awards_userId_key_key" ON "milestone_awards"("userId", "key");

-- AddForeignKey
ALTER TABLE "milestone_awards" ADD CONSTRAINT "milestone_awards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
