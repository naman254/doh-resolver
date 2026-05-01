-- CreateTable
CREATE TABLE "ThreatIntelligence" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unusualPatterns" TEXT NOT NULL,
    "threatCategories" TEXT NOT NULL,
    "performanceNotes" TEXT NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "ThreatIntelligence_pkey" PRIMARY KEY ("id")
);
