import { processInvoice } from '../lib/invoice-processor';
import { db } from '../lib/db';
import { tokenUsage } from '../lib/db/schema';
import { nanoid } from 'nanoid';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Verify OpenAI API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  console.error('Please make sure you have a .env file with OPENAI_API_KEY defined');
  process.exit(1);
}

// TypeScript now knows this is defined
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testTokenUsage() {
  console.log('Starting token usage test...');
  console.log('Using OpenAI API key:', OPENAI_API_KEY.substring(0, 7) + '...');
  
  const filePath = path.join(process.cwd(), 'sample-data', 'AmazonWebServices.pdf');
  console.log('Using file path:', filePath);
  
  // First run - without cache
  console.log('\nFirst run (without cache):');
  const result1 = await processInvoice(filePath, true);
  console.log('Token usage:', result1.tokenUsage);
  
  // Save token usage to database
  if (result1.tokenUsage) {
    await db.insert(tokenUsage).values({
      id: nanoid(),
      promptTokens: result1.tokenUsage.promptTokens,
      completionTokens: result1.tokenUsage.completionTokens,
      totalTokens: result1.tokenUsage.totalTokens,
      cost: result1.tokenUsage.cost,
      timestamp: new Date(),
      operation: 'invoice_processing',
      cached: false,
      cacheKey: '',
      cacheHit: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  // Second run - with cache
  console.log('\nSecond run (with cache):');
  const result2 = await processInvoice(filePath, false);
  console.log('Token usage:', result2.tokenUsage);
  
  // Save token usage to database
  if (result2.tokenUsage) {
    await db.insert(tokenUsage).values({
      id: nanoid(),
      promptTokens: result2.tokenUsage.promptTokens,
      completionTokens: result2.tokenUsage.completionTokens,
      totalTokens: result2.tokenUsage.totalTokens,
      cost: result2.tokenUsage.cost,
      timestamp: new Date(),
      operation: 'invoice_processing',
      cached: true,
      cacheKey: '',
      cacheHit: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  // Compare results
  console.log('\nComparison:');
  console.log('First run (without cache):', result1.tokenUsage?.totalTokens, 'tokens');
  console.log('Second run (with cache):', result2.tokenUsage?.totalTokens, 'tokens');
  console.log('Token savings:', (result1.tokenUsage?.totalTokens || 0) - (result2.tokenUsage?.totalTokens || 0), 'tokens');
}

// Run the test
testTokenUsage(); 