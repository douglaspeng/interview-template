CREATE TABLE IF NOT EXISTS "TokenUsage" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "promptTokens" INTEGER NOT NULL,
  "completionTokens" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  "cost" REAL NOT NULL,
  "timestamp" INTEGER NOT NULL,
  "operation" TEXT NOT NULL,
  "invoiceId" TEXT REFERENCES "Invoice"("id"),
  "cached" INTEGER NOT NULL DEFAULT 0,
  "cacheKey" TEXT,
  "cacheHit" INTEGER NOT NULL DEFAULT 0,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
); 