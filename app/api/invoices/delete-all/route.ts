import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoice } from '@/lib/db/schema';

export async function DELETE() {
  try {
    // Delete all invoices
    await db.delete(invoice);
    
    return NextResponse.json({ success: true, message: 'All invoices deleted successfully' });
  } catch (error) {
    console.error('Error deleting all invoices:', error);
    return NextResponse.json(
      { error: 'Failed to delete all invoices' },
      { status: 500 }
    );
  }
} 