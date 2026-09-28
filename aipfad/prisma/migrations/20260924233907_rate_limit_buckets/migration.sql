-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "keyHash" TEXT NOT NULL,
    "hits" TIMESTAMP(3)[],
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("keyHash")
);

-- CreateIndex
CREATE INDEX "rate_limit_buckets_expiresAt_idx" ON "rate_limit_buckets"("expiresAt");
