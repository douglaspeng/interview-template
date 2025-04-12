import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoice } from '@/lib/db/schema';
import { eq, like, and, gte, lte } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // Get the search parameters from the URL query parameters
    const url = new URL(request.url);
    const vendor = url.searchParams.get('vendor');
    const customer = url.searchParams.get('customer');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    if (!vendor && !customer && (!startDate || !endDate)) {
      return NextResponse.json(
        { error: 'Either vendor, customer, or date range parameters are required' },
        { status: 400 }
      );
    }
    
    let result;
    
    // Search by vendor name
    if (vendor) {
      result = await db
        .select()
        .from(invoice)
        .where(like(invoice.vendorName, `%${vendor}%`));
    }
    
    // Search by customer name
    if (customer) {
      result = await db
        .select()
        .from(invoice)
        .where(like(invoice.customerName, `%${customer}%`));
    }
    
    // Search by due date range
    if (startDate && endDate) {
      // Parse the dates - assuming format like "2023-01-01" or "01/01/2023"
      let parsedStartDate: Date;
      let parsedEndDate: Date;
      
      try {
        // Try to parse the dates
        parsedStartDate = new Date(startDate);
        parsedEndDate = new Date(endDate);
        
        // Check if the dates are valid
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format. Please use YYYY-MM-DD or MM/DD/YYYY format' },
            { status: 400 }
          );
        }
        
        // Set the end date to the end of the day
        parsedEndDate.setHours(23, 59, 59, 999);
        
        result = await db
          .select()
          .from(invoice)
          .where(
            and(
              gte(invoice.dueDate, parsedStartDate),
              lte(invoice.dueDate, parsedEndDate)
            )
          );
      } catch (error) {
        console.error('Error parsing dates:', error);
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json({ invoices: result || [] });
  } catch (error) {
    console.error('Error searching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to search invoices' },
      { status: 500 }
    );
  }
} 