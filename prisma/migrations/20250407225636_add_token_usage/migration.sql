-- CreateTable
CREATE TABLE "TokenUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "cost" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operation" TEXT NOT NULL,
    "invoiceId" TEXT,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "cacheKey" TEXT,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TokenUsage_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TokenUsage_invoiceId_idx" ON "TokenUsage"("invoiceId");

-- CreateIndex
CREATE INDEX "TokenUsage_timestamp_idx" ON "TokenUsage"("timestamp");

-- CreateIndex
CREATE INDEX "TokenUsage_operation_idx" ON "TokenUsage"("operation");
