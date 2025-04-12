import { config } from 'dotenv';
import path from 'path';
import { put } from '@vercel/blob';
import fs from 'fs';

// Load environment variables from .env file
config();

// Import the invoice processor after loading environment variables
import { processInvoice } from './lib/invoice-processor';

async function testInvoiceProcessor() {
  try {
    console.log('Starting invoice processor test...');
    
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    console.log('OpenAI API key is set');

    // Path to the sample PDF file
    const pdfPath = path.join(process.cwd(), 'sample-data', 'SammyMaystoneLinesTest.pdf');
    console.log('Found PDF file:', pdfPath);

    // Read the PDF file
    const fileBuffer = fs.readFileSync(pdfPath);
    console.log('File size:', fileBuffer.length, 'bytes');

    // Upload file to blob storage
    console.log('Uploading file to blob storage...');
    const blob = await put('SammyMaystoneLinesTest.pdf', fileBuffer, {
      access: 'public',
    });
    console.log('File uploaded to:', blob.url);

    // Process the invoice
    console.log('Processing invoice...');
    const result = await processInvoice(blob.url, process.env.OPENAI_API_KEY);
    console.log('Processing result:', JSON.stringify(result, null, 2));

    if (result.processingErrors && result.processingErrors.length > 0) {
      console.log('Processing errors:');
      result.processingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testInvoiceProcessor(); 