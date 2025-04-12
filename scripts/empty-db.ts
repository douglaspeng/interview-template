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

async function emptyDatabase() {
  console.log('Starting to empty the database...');
  
  try {
    // Delete data from all tables in the correct order to respect foreign key constraints
    console.log('Deleting prompt cache data...');
    await db.delete(promptCache);
    
    console.log('Deleting token usage data...');
    await db.delete(tokenUsage);
    
    console.log('Deleting invoice line items...');
    await db.delete(invoiceLineItem);
    
    console.log('Deleting invoices...');
    await db.delete(invoice);
    
    console.log('Deleting suggestions...');
    await db.delete(suggestion);
    
    console.log('Deleting documents...');
    await db.delete(document);
    
    console.log('Deleting votes...');
    await db.delete(vote);
    
    console.log('Deleting messages...');
    await db.delete(message);
    
    console.log('Deleting chats...');
    await db.delete(chat);
    
    console.log('Database emptied successfully!');
  } catch (error) {
    console.error('Error emptying database:', error);
  }
}

// Run the function
emptyDatabase(); 