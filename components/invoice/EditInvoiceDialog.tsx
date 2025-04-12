import { useState, useEffect } from 'react';
import { Invoice } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useInvoice } from '@/lib/context/InvoiceContext';

interface EditInvoiceDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  customerName: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  originalFileUrl: string;
}

export function EditInvoiceDialog({ invoice, onClose, onSave }: EditInvoiceDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { triggerRefresh } = useInvoice();
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    vendorName: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    amount: 0,
    currency: 'USD',
    originalFileUrl: '',
  });

  // Update form data when invoice changes
  useEffect(() => {
    if (invoice) {
        console.log(invoice);
      setFormData({
        customerName: invoice.customerName || '',
        vendorName: invoice.vendorName || '',
        invoiceNumber: invoice.invoiceNumber || '',
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        amount: invoice.amount || 0,
        currency: invoice.currency || 'USD',
        originalFileUrl: invoice.originalFileUrl || '',
      });
    }
  }, [invoice]);

  // Helper function to format date consistently
  const formatDateConsistently = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    // Parse the date parts directly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create a date string in the format "MMM DD, YYYY"
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[month - 1]} ${day}, ${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          invoiceDate: new Date(formData.invoiceDate),
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update invoice');
      }

      toast.success('Invoice updated successfully');
      triggerRefresh();
      onSave();
    } catch (error) {
      toast.error('Failed to update invoice');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <Dialog open={!!invoice} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customerName" className="text-right">
                Customer
              </Label>
              <Input
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendorName" className="text-right">
                Vendor
              </Label>
              <Input
                id="vendorName"
                name="vendorName"
                value={formData.vendorName}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invoiceNumber" className="text-right">
                Invoice #
              </Label>
              <Input
                id="invoiceNumber"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invoiceDate" className="text-right">
                Date
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="invoiceDate"
                  name="invoiceDate"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={handleChange}
                  className="flex-1"
                />
                <div className="text-sm text-gray-500 min-w-[100px]">
                  {formData.invoiceDate ? formatDateConsistently(formData.invoiceDate) : 'N/A'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="flex-1"
                />
                <div className="text-sm text-gray-500 min-w-[100px]">
                  {formData.dueDate ? formatDateConsistently(formData.dueDate) : 'N/A'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3">
                <div className="text-sm font-medium">
                  {formatCurrency(formData.amount, formData.currency)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Currency
              </Label>
              <Input
                id="currency"
                name="currency"
                value={formData.currency}
                disabled
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="originalFileUrl" className="text-right">
                Original File
              </Label>
              <div className="col-span-3">
                {formData.originalFileUrl ? (
                  <a 
                    href={formData.originalFileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View Original File
                  </a>
                ) : (
                  <span className="text-gray-500">No file available</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 