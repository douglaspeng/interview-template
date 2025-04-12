-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerName" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "confidence" REAL NOT NULL,
    "extractionMethod" TEXT NOT NULL,
    "processingErrors" TEXT,
    "status" TEXT NOT NULL,
    "originalFileUrl" TEXT
);
