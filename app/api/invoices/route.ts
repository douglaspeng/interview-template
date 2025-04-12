import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoice, tokenUsage } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = (page - 1) * limit;

    // Get total count
    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(invoice);
    const total = totalCount[0].count;

    // Get paginated results
    const invoices = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        vendorName: invoice.vendorName,
        customerName: invoice.customerName,
        amount: invoice.amount,
        currency: invoice.currency,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        originalFileUrl: invoice.originalFileUrl,
        tokenUsage: {
          totalTokens: tokenUsage.totalTokens,
          cost: tokenUsage.cost,
        },
      })
      .from(invoice)
      .leftJoin(tokenUsage, eq(invoice.id, tokenUsage.invoiceId))
      .orderBy(desc(invoice.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { forceSave, ...invoiceData } = body;

    // Log the received data for debugging
    console.log('Received invoice data:', JSON.stringify(invoiceData, null, 2));

    // Validate required fields
    const requiredFields = ['customerName', 'vendorName', 'invoiceNumber', 'invoiceDate', 'amount', 'confidence', 'extractionMethod'];
    const missingFields = requiredFields.filter(field => !invoiceData[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({
          message: 'Missing required fields',
          details: `The following fields are required: ${missingFields.join(', ')}`,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Ensure invoiceDate is a valid Date
    try {
      invoiceData.invoiceDate = new Date(invoiceData.invoiceDate);
      if (isNaN(invoiceData.invoiceDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      console.log('Invalid invoice date:', invoiceData.invoiceDate);
      return new Response(
        JSON.stringify({
          message: 'Invalid invoice date',
          details: 'The invoice date must be a valid date string',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Ensure dueDate is a valid Date or null
    if (invoiceData.dueDate) {
      try {
        invoiceData.dueDate = new Date(invoiceData.dueDate);
        if (isNaN(invoiceData.dueDate.getTime())) {
          invoiceData.dueDate = null;
        }
      } catch (error) {
        invoiceData.dueDate = null;
      }
    }

    // Ensure processingErrors is a string or null
    if (invoiceData.processingErrors) {
      if (typeof invoiceData.processingErrors === 'string') {
        // Already a string, do nothing
      } else if (Array.isArray(invoiceData.processingErrors)) {
        // Convert array to JSON string
        invoiceData.processingErrors = JSON.stringify(invoiceData.processingErrors);
      } else {
        // Convert to JSON string or set to null
        invoiceData.processingErrors = JSON.stringify(invoiceData.processingErrors) || null;
      }
    } else {
      // Set to null if not provided
      invoiceData.processingErrors = null;
    }

    // Check for duplicate invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        vendorName: invoiceData.vendorName,
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount,
      },
    });

    if (existingInvoice && !forceSave) {
      console.log('Duplicate invoice detected:', existingInvoice.id);
      return new Response(
        JSON.stringify({
          message: 'Duplicate invoice detected',
          duplicateId: existingInvoice.id,
          duplicateDate: existingInvoice.createdAt,
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Create new invoice
    try {
      const invoice = await prisma.invoice.create({
        data: {
          ...invoiceData,
          status: invoiceData.status || 'processed',
        },
      });
      
      console.log('Invoice created successfully:', invoice.id);
      
      return new Response(JSON.stringify(invoice), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (dbError) {
      console.error('Database error creating invoice:', dbError);
      return new Response(
        JSON.stringify({
          message: 'Database error creating invoice',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error creating invoice:', error);
    return new Response(
      JSON.stringify({
        message: 'Failed to create invoice',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 