import { Suspense } from 'react';
import { InvoiceList } from '@/components/invoice/InvoiceList';
import { InvoiceUpload } from '@/components/invoice/InvoiceUpload';
import { InvoiceChat } from '@/components/invoice/InvoiceChat';
import { InvoiceProvider } from '@/lib/context/InvoiceContext';
import { db } from '@/lib/db';
import { invoice } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// This is a Server Component
async function getInvoices() {
  try {
    const invoices = await db.select().from(invoice).orderBy(desc(invoice.createdAt));
    return invoices;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  
  return (
    <InvoiceProvider>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-4">Invoice Management</h1>
          
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list">Invoice List</TabsTrigger>
              <TabsTrigger value="chat">AI Assistant</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list">
              {/* Upload Invoice Card - Always visible at the top */}
              {/* <div className="mb-6">
                <InvoiceUpload />
              </div> */}
              
              <Suspense fallback={<div>Loading invoices...</div>}>
                <InvoiceList invoices={invoices} />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="chat">
              <InvoiceChat />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </InvoiceProvider>
  );
} 