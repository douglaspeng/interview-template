-- Drop existing tables if they exist
DROP TABLE IF EXISTS promptCache;
DROP TABLE IF EXISTS TokenUsage;
DROP TABLE IF EXISTS InvoiceLineItem;
DROP TABLE IF EXISTS Invoice;
DROP TABLE IF EXISTS Suggestion;
DROP TABLE IF EXISTS Document;
DROP TABLE IF EXISTS Vote;
DROP TABLE IF EXISTS Message;
DROP TABLE IF EXISTS Chat;

-- Create Chat table
CREATE TABLE IF NOT EXISTS Chat (
  id TEXT PRIMARY KEY NOT NULL,
  createdAt INTEGER NOT NULL,
  title TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private'
);

-- Create Message table
CREATE TABLE IF NOT EXISTS Message (
  id TEXT PRIMARY KEY NOT NULL,
  chatId TEXT NOT NULL,
  role TEXT NOT NULL,
  content BLOB NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (chatId) REFERENCES Chat(id)
);

-- Create Vote table
CREATE TABLE IF NOT EXISTS Vote (
  chatId TEXT NOT NULL,
  messageId TEXT NOT NULL,
  isUpvoted INTEGER NOT NULL,
  PRIMARY KEY (chatId, messageId),
  FOREIGN KEY (chatId) REFERENCES Chat(id),
  FOREIGN KEY (messageId) REFERENCES Message(id)
);

-- Create Document table
CREATE TABLE IF NOT EXISTS Document (
  id TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  kind TEXT NOT NULL DEFAULT 'text',
  PRIMARY KEY (id, createdAt)
);

-- Create Suggestion table
CREATE TABLE IF NOT EXISTS Suggestion (
  id TEXT NOT NULL,
  documentId TEXT NOT NULL,
  documentCreatedAt INTEGER NOT NULL,
  originalText TEXT NOT NULL,
  suggestedText TEXT NOT NULL,
  description TEXT,
  isResolved INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (documentId, documentCreatedAt) REFERENCES Document(id, createdAt)
);

-- Create Invoice table
CREATE TABLE IF NOT EXISTS Invoice (
  id TEXT PRIMARY KEY NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  customerName TEXT NOT NULL,
  vendorName TEXT NOT NULL,
  invoiceNumber TEXT NOT NULL,
  invoiceDate INTEGER NOT NULL,
  dueDate INTEGER,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  originalFileUrl TEXT NOT NULL,
  confidence INTEGER,
  extraction_method TEXT,
  processing_errors TEXT
);

-- Create InvoiceLineItem table
CREATE TABLE IF NOT EXISTS InvoiceLineItem (
  id TEXT PRIMARY KEY NOT NULL,
  invoiceId TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unitPrice INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (invoiceId) REFERENCES Invoice(id)
);

-- Create TokenUsage table
CREATE TABLE IF NOT EXISTS TokenUsage (
  id TEXT PRIMARY KEY NOT NULL,
  promptTokens INTEGER NOT NULL,
  completionTokens INTEGER NOT NULL,
  totalTokens INTEGER NOT NULL,
  cost REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  operation TEXT NOT NULL,
  invoiceId TEXT,
  cached INTEGER NOT NULL DEFAULT 0,
  cacheKey TEXT,
  cacheHit INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (invoiceId) REFERENCES Invoice(id)
);

-- Create promptCache table
CREATE TABLE IF NOT EXISTS promptCache (
  id TEXT PRIMARY KEY NOT NULL,
  promptHash TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  result TEXT NOT NULL,
  tokenUsage TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
); 