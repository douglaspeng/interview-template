import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { processInvoice } from '@/lib/invoice-processor';
import { db } from '@/lib/db';
import { tokenUsage } from '@/lib/db/schema';
import { nanoid } from 'nanoid';

export async function POST(req: Request) {
  try {
    console.log('Received process request');
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
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

    try {
      // Process the invoice
      console.log('Starting invoice processing for file:', file.name);
      const result = await processInvoice(blob.url, false);
      console.log('Invoice processing result:', JSON.stringify(result, null, 2));
      
      // Store token usage information if available
      if (result.tokenUsage) {
        try {
          const tokenUsageId = nanoid();
          await db.insert(tokenUsage).values({
            id: tokenUsageId,
            promptTokens: result.tokenUsage.promptTokens,
            completionTokens: result.tokenUsage.completionTokens,
            totalTokens: result.tokenUsage.totalTokens,
            cost: result.tokenUsage.cost,
            timestamp: new Date(),
            operation: 'invoice_processing',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('Token usage information stored in database');
        } catch (tokenError) {
          console.error('Error storing token usage:', tokenError);
          // Continue with the response even if token storage fails
        }
      }
      
      // Ensure the originalFileUrl is included in the result
      const responseData = {
        ...result,
        originalFileUrl: blob.url
      };
      
      return NextResponse.json(responseData);
    } catch (processError) {
      console.error('Error during invoice processing:', processError);
      return NextResponse.json(
        { 
          error: 'Failed to process invoice',
          details: processError instanceof Error ? processError.message : 'Unknown error'
        },
        { status: 500 }
      );
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