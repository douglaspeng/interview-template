import { db } from '../lib/db';
import { promptCache } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function clearPromptCache() {
  try {
    console.log('Clearing prompt cache...');
    
    // Delete all records from the promptCache table
    const result = await db.delete(promptCache);
    
    console.log('Prompt cache cleared successfully');
  } catch (error) {
    console.error('Error clearing prompt cache:', error);
    process.exit(1);
  }
}

// Run the function
clearPromptCache(); 