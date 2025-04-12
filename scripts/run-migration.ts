import { db } from '../lib/db';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Running migrations...');
  
  try {
    // Run the comprehensive migration file
    console.log('Running comprehensive migration...');
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'lib/db/migrations/0008_create_all_tables.sql'),
      'utf-8'
    );
    
    // Split the SQL file into individual statements and execute each one
    const statements = migration.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        db.$client.exec(statement);
      }
    }
    
    console.log('Comprehensive migration completed successfully');
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

main(); 