import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { invoice, tokenUsage } from '@/lib/db/schema';
import { processInvoice } from '@/lib/invoice-processor';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { TokenUsage as TokenUsageType } from '@/lib/db/schema';
import { getCachedPrompt, savePromptToCache, hashPrompt } from '@/lib/prompt-cache';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

interface ExtractedResult {
  customerName: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  amount: number;
  currency: string;
  confidence: number;
  extractionMethod: string;
  processingErrors: string[];
  originalFileUrl: string;
  tokenUsage?: TokenUsageType;
}

// Function to check for duplicate invoices
async function checkForDuplicateInvoice(invoiceNumber: string) {
  console.log('Checking for duplicate invoice with number:', invoiceNumber);
  
  const duplicates = await db
    .select()
    .from(invoice)
    .where(
      eq(invoice.invoiceNumber, invoiceNumber)
    );
  
  console.log('Duplicate check results:', duplicates);
  return duplicates.length > 0 ? duplicates[0] : null;
}

export async function POST(req: Request) {
  try {
    console.log('Received upload request');
    
    // Check if the request is JSON or FormData
    const contentType = req.headers.get('content-type') || '';
    let invoiceData: {
      customerName: string;
      vendorName: string;
      invoiceNumber: string;
      invoiceDate: string;
      dueDate: string | null;
      amount: number;
      currency: string;
      confidence: number;
      extractionMethod: string;
      processingErrors: string[];
      status: 'pending' | 'processed' | 'error';
      originalFileUrl: string;
      forceSave: boolean;
      tokenUsage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        cost: number;
      };
    };
    
    if (contentType.includes('application/json')) {
      // Handle JSON data
      invoiceData = await req.json();
      console.log('JSON data received:', invoiceData);
      
      // Check for duplicate invoice
      const duplicate = await checkForDuplicateInvoice(
        invoiceData.invoiceNumber
      );
      
      if (duplicate && !invoiceData.forceSave) {
        console.log('Duplicate invoice detected:', duplicate);
        return NextResponse.json(
          { 
            error: 'Duplicate invoice detected',
            details: 'An invoice with the same invoice number already exists.',
            duplicateId: duplicate.id,
            duplicateDate: duplicate.createdAt
          },
          { status: 409 }
        );
      }
      
      // Create invoice record
      const invoiceId = nanoid();
      console.log('Creating invoice record with ID:', invoiceId);
      
      // Ensure all required fields are present and properly formatted
      const now = new Date();
      const invoiceRecord = {
        id: invoiceId,
        customerName: invoiceData.customerName || 'Unknown Customer',
        vendorName: invoiceData.vendorName || 'Unknown Vendor',
        invoiceNumber: invoiceData.invoiceNumber || 'Unknown',
        invoiceDate: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : now,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
        amount: invoiceData.amount || 0,
        currency: invoiceData.currency || 'USD',
        confidence: invoiceData.confidence || 0.5,
        extractionMethod: invoiceData.extractionMethod || 'manual',
        processingErrors: Array.isArray(invoiceData.processingErrors) 
          ? JSON.stringify(invoiceData.processingErrors)
          : invoiceData.processingErrors || JSON.stringify([]),
        status: invoiceData.status || 'processed',
        originalFileUrl: invoiceData.originalFileUrl || '',
        createdAt: now,
        updatedAt: now,
      };
      
      try {
        // Start a transaction to save both invoice and token usage
        await db.transaction(async (tx) => {
          // Insert invoice record
          await tx.insert(invoice).values(invoiceRecord);
          
          // If token usage information is provided, save it
          if (invoiceData.tokenUsage) {
            await tx.insert(tokenUsage).values({
              id: nanoid(),
              invoiceId: invoiceId,
              promptTokens: invoiceData.tokenUsage.promptTokens || 0,
              completionTokens: invoiceData.tokenUsage.completionTokens || 0,
              totalTokens: invoiceData.tokenUsage.totalTokens || 0,
              cost: invoiceData.tokenUsage.cost || 0,
              timestamp: now,
              operation: 'invoice_processing',
              cached: false,
              cacheKey: '',
              cacheHit: false,
              createdAt: now,
              updatedAt: now,
            });
          }
        });
        
        console.log('Invoice and token usage saved successfully');
        return NextResponse.json({ success: true, invoiceId });
      } catch (dbError) {
        console.error('Database error saving invoice:', dbError);
        return NextResponse.json(
          { 
            error: 'Database error saving invoice',
            details: dbError instanceof Error ? dbError.message : 'Unknown database error'
          },
          { status: 500 }
        );
      }
    } else {
      // Handle FormData (file upload)
      let formData;
      try {
        formData = await req.formData();
        console.log('FormData received:', formData);
      } catch (error) {
        console.error('Error parsing form data:', error);
        return NextResponse.json(
          { error: 'Failed to parse form data' },
          { status: 400 }
        );
      }

      const file = formData.get('file') as File;
      console.log('File object:', file);
      
      if (!file) {
        console.log('No file provided in request');
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        console.log('OpenAI API key not configured');
        return NextResponse.json(
          { error: 'OpenAI API key is not configured' },
          { status: 500 }
        );
      }

      // Upload file to blob storage
      console.log('Uploading file to blob storage:', file.name);
      let blob;
      try {
        blob = await put(file.name, file, {
          access: 'public',
        });
        console.log('File uploaded to:', blob.url);
      } catch (error) {
        console.error('Error uploading file to blob storage:', error);
        return NextResponse.json(
          { error: 'Failed to upload file to storage' },
          { status: 500 }
        );
      }

      const now = new Date();
      // Create initial invoice record
      const invoiceId = nanoid();
      console.log('Creating initial invoice record with ID:', invoiceId);
      try {
        await db.insert(invoice).values({
          id: invoiceId,
          createdAt: now,
          updatedAt: now,
          status: 'pending',
          originalFileUrl: blob.url,
          // Other fields will be updated after processing
          customerName: '',
          vendorName: '',
          invoiceNumber: '',
          invoiceDate: now, // Set a default date that will be updated
          amount: 0,
          currency: 'USD',
        });
      } catch (error) {
        console.error('Error creating initial invoice record:', error);
        return NextResponse.json(
          { error: 'Failed to create invoice record' },
          { status: 500 }
        );
      }

      try {
        // Process the invoice asynchronously
        console.log('Starting invoice processing for file:', file.name);
        const result = await processInvoice(blob.url, false);
        console.log('Invoice processing result:', JSON.stringify(result, null, 2));
        
        // Check for duplicate invoice
        const duplicate = await checkForDuplicateInvoice(
          result.invoiceNumber
        );
        
        // Check if forceSave is set in the form data
        const forceSave = formData.get('forceSave') === 'true';
        
        if (duplicate && !forceSave) {
          console.log('Duplicate invoice detected:', duplicate);
          // Clean up the pending invoice since it's a duplicate
          await db.delete(invoice).where(eq(invoice.id, invoiceId));
          
          return NextResponse.json(
            { 
              error: 'Duplicate invoice detected',
              details: 'An invoice with the same invoice number already exists.',
              duplicateId: duplicate.id,
              duplicateDate: duplicate.createdAt
            },
            { status: 409 }
          );
        }
        
        // Update invoice with extracted information
        console.log('Updating invoice with extracted information');
        try {
          const extractedResult = result as ExtractedResult;
          console.log('Processing extracted result with token usage:', extractedResult);

          // Update invoice record
          await db.update(invoice)
            .set({
              customerName: extractedResult.customerName,
              vendorName: extractedResult.vendorName,
              invoiceNumber: extractedResult.invoiceNumber,
              invoiceDate: extractedResult.invoiceDate,
              dueDate: extractedResult.dueDate,
              amount: extractedResult.amount,
              currency: extractedResult.currency || 'USD',
              status: 'processed',
              confidence: extractedResult.confidence,
              extractionMethod: extractedResult.extractionMethod,
              processingErrors: Array.isArray(extractedResult.processingErrors) 
                ? JSON.stringify(extractedResult.processingErrors)
                : JSON.stringify([]),
              updatedAt: new Date()
            })
            .where(eq(invoice.id, invoiceId));

          // Save token usage information if available
          if (extractedResult.tokenUsage) {
            console.log('Saving token usage:', extractedResult.tokenUsage);
            try {
              const tokenUsageRecord: TokenUsageType = {
                id: nanoid(),
                promptTokens: extractedResult.tokenUsage.promptTokens,
                completionTokens: extractedResult.tokenUsage.completionTokens,
                totalTokens: extractedResult.tokenUsage.totalTokens,
                cost: extractedResult.tokenUsage.cost,
                timestamp: new Date(),
                operation: 'invoice_processing',
                invoiceId: invoiceId,
                cached: Boolean(extractedResult.tokenUsage.cached),
                cacheKey: extractedResult.tokenUsage.cached ? hashPrompt(extractedResult.originalFileUrl || '') : '',
                cacheHit: Boolean(extractedResult.tokenUsage.cached),
                createdAt: new Date(),
                updatedAt: new Date()
              };
              await db.insert(tokenUsage).values(tokenUsageRecord);
              console.log('Token usage saved successfully with invoiceId:', invoiceId);
            } catch (tokenError) {
              console.error('Error storing token usage:', tokenError);
              // Continue processing even if token usage save fails
            }
          } else {
            console.log('No token usage data available to save');
          }

          console.log('Invoice and token usage saved successfully');
          return NextResponse.json({ success: true, invoiceId });
        } catch (dbError) {
          console.error('Database error updating invoice:', dbError);
          return NextResponse.json(
            { 
              error: 'Database error updating invoice',
              details: dbError instanceof Error ? dbError.message : 'Unknown database error'
            },
            { status: 500 }
          );
        }
      } catch (processError) {
        // Update invoice status to error
        console.error('Error during invoice processing:', processError);
        try {
          await db.update(invoice)
            .set({
              status: 'error',
              processingErrors: JSON.stringify([(processError as Error).message]),
              updatedAt: new Date(),
            })
            .where(eq(invoice.id, invoiceId));
        } catch (updateError) {
          console.error('Error updating invoice with error status:', updateError);
        }

        throw processError; // Re-throw to be caught by outer catch block
      }
    }
    
  } catch (error) {
    console.error('Error processing invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 