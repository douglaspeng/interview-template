import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoice } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // Get the invoice number from the URL query parameters
    const url = new URL(request.url);
    const invoiceNumber = url.searchParams.get('number');
    
    console.log(`Find by number API called with invoice number: ${invoiceNumber}`);
    
    if (!invoiceNumber) {
      console.log('Invoice number is missing');
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      );
    }
    
    // Find the invoice by invoice number
    console.log(`Searching for invoice with number: ${invoiceNumber}`);
    const result = await db
      .select()
      .from(invoice)
      .where(eq(invoice.invoiceNumber, invoiceNumber));
    
    console.log(`Search result: ${JSON.stringify(result)}`);
    
    if (result.length === 0) {
      console.log(`No invoice found with number: ${invoiceNumber}`);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    console.log(`Found invoice: ${JSON.stringify(result[0])}`);
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error finding invoice by number:', error);
    return NextResponse.json(
      { error: 'Failed to find invoice' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceNumber } = body;
    
    console.log(`Find by number API (POST) called with invoice number: ${invoiceNumber}`);
    
    if (!invoiceNumber) {
      console.log('Invoice number is missing');
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      );
    }
    
    // Find the invoice by invoice number
    console.log(`Searching for invoice with number: ${invoiceNumber}`);
    const result = await db
      .select()
      .from(invoice)
      .where(eq(invoice.invoiceNumber, invoiceNumber));
    
    console.log(`Search result: ${JSON.stringify(result)}`);
    
    if (result.length === 0) {
      console.log(`No invoice found with number: ${invoiceNumber}`);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    console.log(`Found invoice: ${JSON.stringify(result[0])}`);
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error finding invoice by number:', error);
    return NextResponse.json(
      { error: 'Failed to find invoice' },
      { status: 500 }
    );
  }
} 