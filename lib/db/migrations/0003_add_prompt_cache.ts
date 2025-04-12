import { sql } from 'drizzle-orm';
import { db } from '../index';

export async function up() {
  console.log('Creating prompt cache table...');
  
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS promptCache (
      id TEXT PRIMARY KEY,
      promptHash TEXT NOT NULL UNIQUE,
      prompt TEXT NOT NULL,
      result TEXT NOT NULL,
      tokenUsage TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  
  console.log('Prompt cache table created successfully');
}

export async function down() {
  console.log('Dropping prompt cache table...');
  
  await db.run(sql`
    DROP TABLE IF EXISTS promptCache;
  `);
  
  console.log('Prompt cache table dropped successfully');
} 