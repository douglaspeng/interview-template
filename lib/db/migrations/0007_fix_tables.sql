-- Drop existing tables if they exist
DROP TABLE IF EXISTS promptCache;
DROP TABLE IF EXISTS TokenUsage;

-- Create promptCache table
CREATE TABLE IF NOT EXISTS promptCache (
  id TEXT PRIMARY KEY,
  promptHash TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  result TEXT NOT NULL,
  tokenUsage TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Create tokenUsage table
CREATE TABLE IF NOT EXISTS TokenUsage (
  id TEXT PRIMARY KEY NOT NULL,
  promptTokens INTEGER NOT NULL,
  completionTokens INTEGER NOT NULL,
  totalTokens INTEGER NOT NULL,
  cost REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  operation TEXT NOT NULL,
  invoiceId TEXT REFERENCES Invoice(id),
  cached INTEGER NOT NULL DEFAULT 0,
  cacheKey TEXT,
  cacheHit INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
); 