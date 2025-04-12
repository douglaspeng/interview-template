-- Create Invoice table
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  "customerName" TEXT NOT NULL,
  "vendorName" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "invoiceDate" INTEGER NOT NULL,
  "dueDate" INTEGER,
  "amount" INTEGER NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "status" TEXT NOT NULL,
  "originalFileUrl" TEXT NOT NULL,
  "confidence" INTEGER,
  "extraction_method" TEXT,
  "processing_errors" TEXT
);

-- Create TokenUsage table
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