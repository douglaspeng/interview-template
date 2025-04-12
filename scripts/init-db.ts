import { db } from '../lib/db';
import { 
  promptCache, 
  tokenUsage, 
  invoiceLineItem, 
  invoice, 
  suggestion, 
  document, 
  vote, 
  message, 
  chat 
} from '../lib/db/schema';

async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    // Create all tables in the correct order to respect foreign key constraints
    console.log('Creating prompt cache table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS promptCache (
        id TEXT PRIMARY KEY,
        promptHash TEXT NOT NULL UNIQUE,
        prompt TEXT NOT NULL,
        result TEXT NOT NULL,
        tokenUsage TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating token usage table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS tokenUsage (
        id TEXT PRIMARY KEY,
        promptTokens INTEGER NOT NULL,
        completionTokens INTEGER NOT NULL,
        totalTokens INTEGER NOT NULL,
        cost REAL NOT NULL,
        invoiceId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoiceId) REFERENCES invoice(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Creating invoice table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS invoice (
        id TEXT PRIMARY KEY,
        invoiceNumber TEXT NOT NULL,
        invoiceDate TEXT NOT NULL,
        dueDate TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        vendorName TEXT NOT NULL,
        customerName TEXT NOT NULL,
        status TEXT NOT NULL,
        originalFileUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating invoice line items table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS invoiceLineItem (
        id TEXT PRIMARY KEY,
        invoiceId TEXT NOT NULL,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unitPrice REAL NOT NULL,
        amount REAL NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoiceId) REFERENCES invoice(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Creating chat table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS chat (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating message table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS message (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chatId) REFERENCES chat(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Creating document table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS document (
        id TEXT PRIMARY KEY,
        messageId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (messageId) REFERENCES message(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Creating suggestion table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS suggestion (
        id TEXT PRIMARY KEY,
        messageId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (messageId) REFERENCES message(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Creating vote table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS vote (
        id TEXT PRIMARY KEY,
        messageId TEXT NOT NULL,
        type TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (messageId) REFERENCES message(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase(); 