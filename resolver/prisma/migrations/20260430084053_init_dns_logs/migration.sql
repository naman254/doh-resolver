-- CreateTable
CREATE TABLE "QueryLog" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedIp" TEXT,
    "cacheHit" BOOLEAN NOT NULL,
    "blocked" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,

    CONSTRAINT "QueryLog_pkey" PRIMARY KEY ("id")
);
