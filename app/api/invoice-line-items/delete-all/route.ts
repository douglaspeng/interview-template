import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoiceLineItem } from '@/lib/db/schema';

export async function DELETE() {
  try {
    // Delete all invoice line items
    await db.delete(invoiceLineItem);
    
    return NextResponse.json({ success: true, message: 'All invoice line items deleted successfully' });
  } catch (error) {
    console.error('Error deleting all invoice line items:', error);
    return NextResponse.json(
      { error: 'Failed to delete all invoice line items' },
      { status: 500 }
    );
  }
} 