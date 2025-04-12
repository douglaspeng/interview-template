import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoice, tokenUsage, invoiceLineItem } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = await Promise.resolve(params.id);
    
    const result = await db.query.invoice.findFirst({
      where: eq(invoice.id, id)
    });
    
    if (!result) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = await Promise.resolve(params.id);
    
    // Use a transaction to ensure all deletes are atomic
    const result = await db.transaction(async (tx) => {
      // Delete related token usage records
      await tx.delete(tokenUsage)
        .where(eq(tokenUsage.invoiceId, id));
      
      // Delete related invoice line items
      await tx.delete(invoiceLineItem)
        .where(eq(invoiceLineItem.invoiceId, id));
      
      // Delete the invoice and get the result
      const result = await tx.delete(invoice)
        .where(eq(invoice.id, id))
        .returning();
      return result;
    });
    
    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = await Promise.resolve(params.id);
    const body = await request.json();
    
    // Convert date strings to Date objects
    const invoiceDate = new Date(body.invoiceDate);
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    
    const updatedInvoice = {
      ...body,
      invoiceDate,
      dueDate,
      updatedAt: new Date(),
    };

    const result = await db
      .update(invoice)
      .set(updatedInvoice)
      .where(eq(invoice.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
} 