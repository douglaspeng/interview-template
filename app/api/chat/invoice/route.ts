import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/db';
import { invoice } from '@/lib/db/schema';
import { eq, and, gte, lte, like } from 'drizzle-orm';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Fetch all invoices to provide context to OpenAI
    const invoices = await db.select().from(invoice);
    
    // Format invoices for OpenAI context
    const formattedInvoices = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      vendorName: inv.vendorName,
      invoiceDate: new Date(inv.invoiceDate).toISOString(),
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
      amount: inv.amount / 100, // Convert from cents to dollars
      currency: inv.currency,
      status: inv.status
    }));

    // Create a system message with context about the invoices
    const systemMessage = {
      role: 'system',
      content: `You are an invoice assistant. You have access to the following invoices:
      ${JSON.stringify(formattedInvoices)}
      
      You can help with:
      1. Calculating totals (e.g., "sum up all invoices", "what is the total for all invoices")
      2. Displaying all invoices (e.g., "display all invoices", "show all invoices")
      3. Searching by vendor (e.g., "show me vendor Acme Corp", "search by vendor name John Smith")
      4. Searching by customer (e.g., "show me customer John Smith", "search by customer name Acme Corp")
      5. Searching by due date (e.g., "show me invoices due date from 2023-01-01 to 2023-12-31")
      6. Deleting invoices (e.g., "delete invoice INV-123")
      7. Answering follow-up questions about invoices (e.g., "what is the due date", "what is the customer")
      
      When asked to sum up invoices, calculate the total amount of all invoices.
      When asked to display all invoices, list them with their invoice numbers, amounts, and due dates.
      When asked to search by vendor, customer, or due date, return only the matching invoices.
      When asked to delete an invoice, return a message indicating the invoice was deleted.
      When asked follow-up questions, answer based on the most recent search results.
      
      Format currency values as USD with 2 decimal places.
      Format dates as YYYY-MM-DD.
      `
    };

    // Create the user message
    const userMessage = {
      role: 'user',
      content: question
    };

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system' as const, content: systemMessage.content },
        { role: 'user' as const, content: userMessage.content }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract the assistant's response
    const assistantResponse = response.choices[0].message.content;
    
    if (!assistantResponse) {
      return NextResponse.json({ response: 'No response from assistant' });
    }

    // Check if the response contains a command to perform an action
    if (assistantResponse.includes('ACTION: DELETE_INVOICE')) {
      // Extract invoice number from the response
      const invoiceNumberMatch = assistantResponse.match(/INVOICE_NUMBER: ([A-Za-z0-9-]+)/);
      if (invoiceNumberMatch) {
        const invoiceNumber = invoiceNumberMatch[1];
        
        // Find the invoice by number
        const invoiceToDelete = await db.select().from(invoice).where(eq(invoice.invoiceNumber, invoiceNumber));
        
        if (invoiceToDelete.length > 0) {
          // Delete the invoice
          await db.delete(invoice).where(eq(invoice.id, invoiceToDelete[0].id));
          
          return NextResponse.json({
            response: `Invoice #${invoiceNumber} has been deleted.`,
            action: 'DELETE_INVOICE',
            invoiceNumber
          });
        } else {
          return NextResponse.json({
            response: `Invoice #${invoiceNumber} not found.`,
            action: 'DELETE_INVOICE',
            invoiceNumber
          });
        }
      }
    }

    // Return the assistant's response
    return NextResponse.json({ response: assistantResponse });
  } catch (error) {
    console.error('Error processing invoice question:', error);
    return NextResponse.json(
      { error: 'Failed to process invoice question' },
      { status: 500 }
    );
  }
} 