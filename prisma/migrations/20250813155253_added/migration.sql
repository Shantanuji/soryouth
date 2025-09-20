-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "fieldMapping" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_sourceName_key" ON "LeadSource"("sourceName");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_apiKey_key" ON "LeadSource"("apiKey");
