import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tokenUsage } from '@/lib/db/schema';

export async function DELETE() {
  try {
    // Delete all token usage records
    await db.delete(tokenUsage);
    
    return NextResponse.json({ success: true, message: 'All token usage records deleted successfully' });
  } catch (error) {
    console.error('Error deleting all token usage records:', error);
    return NextResponse.json(
      { error: 'Failed to delete all token usage records' },
      { status: 500 }
    );
  }
} 