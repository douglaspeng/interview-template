'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Invoice } from '@/lib/db/schema';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { EditInvoiceDialog } from './EditInvoiceDialog';
import { useInvoice } from '@/lib/context/InvoiceContext';
import { TokenUsageCards } from './TokenUsageCards';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InvoiceTableHeader } from './InvoiceTableHeader';
import { InvoiceTableRow } from './InvoiceTableRow';

type SortField = 'invoiceDate' | 'amount' | 'vendorName' | 'customerName' | 'dueDate' | 'createdAt' | 'totalTokens' | 'cost' | 'invoiceNumber';
type SortOrder = 'asc' | 'desc';

type InvoiceStatus = 'pending' | 'processed' | 'error';

interface InvoiceListProps {
  invoices: Invoice[];
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function InvoiceList({ invoices: initialInvoices }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const { refreshTrigger, triggerRefresh } = useInvoice();
  const [sortField, setSortField] = useState<SortField>('invoiceDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 0,
  });
  const router = useRouter();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch(`/api/invoices?page=${currentPage}&limit=30`);
        if (!response.ok) throw new Error('Failed to fetch invoices');
        const data = await response.json();
        setInvoices(data.invoices);
        setPagination(data.pagination);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast.error("Failed to fetch invoices");
      }
    };

    fetchInvoices();
  }, [currentPage, refreshTrigger]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredInvoices = invoices.filter(invoice => {
    if (!debouncedSearchQuery) return true;
    
    const searchLower = debouncedSearchQuery.toLowerCase();
    return (
      invoice.vendorName.toLowerCase().includes(searchLower) ||
      invoice.customerName.toLowerCase().includes(searchLower) ||
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      (invoice.amount && invoice.amount.toString().includes(searchLower))
    );
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const modifier = sortOrder === 'asc' ? 1 : -1;
    
    if (sortField === 'amount') {
      return (a.amount - b.amount) * modifier;
    }
    
    if (sortField === 'invoiceDate' || sortField === 'dueDate' || sortField === 'createdAt') {
      const dateA = typeof a[sortField] === 'string' ? new Date(a[sortField]) : a[sortField];
      const dateB = typeof b[sortField] === 'string' ? new Date(b[sortField]) : b[sortField];
      
      // Handle null/undefined dates
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return (dateA.getTime() - dateB.getTime()) * modifier;
    }
    
    if (sortField === 'totalTokens') {
      const tokensA = a.tokenUsage?.totalTokens || 0;
      const tokensB = b.tokenUsage?.totalTokens || 0;
      return (tokensA - tokensB) * modifier;
    }
    
    if (sortField === 'cost') {
      const costA = a.tokenUsage?.cost || 0;
      const costB = b.tokenUsage?.cost || 0;
      return (costA - costB) * modifier;
    }
    
    return a[sortField].localeCompare(b[sortField]) * modifier;
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
  };

  const handleDelete = async (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;

    setDeletingId(invoiceToDelete.id);
    try {
      const response = await fetch(`/api/invoices/${invoiceToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }

      toast.success('Invoice deleted successfully');
      setInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== invoiceToDelete.id));
      triggerRefresh();
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete invoice');
      console.error(error);
    } finally {
      setDeletingId(null);
      setInvoiceToDelete(null);
    }
  };

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(true);
  };

  const deleteAllInvoices = async () => {
    setIsDeletingAll(true);
    try {
      // First delete all token usage records
      const tokenUsageResponse = await fetch('/api/token-usage/delete-all', {
        method: 'DELETE',
      });
      
      if (!tokenUsageResponse.ok) {
        throw new Error('Failed to delete token usage records');
      }
      
      // Then delete all invoice line items
      const lineItemsResponse = await fetch('/api/invoice-line-items/delete-all', {
        method: 'DELETE',
      });
      
      if (!lineItemsResponse.ok) {
        throw new Error('Failed to delete invoice line items');
      }
      
      // Finally delete all invoices
      const invoicesResponse = await fetch('/api/invoices/delete-all', {
        method: 'DELETE',
      });
      
      if (!invoicesResponse.ok) {
        throw new Error('Failed to delete invoices');
      }
      
      toast.success('All invoices deleted successfully');
      setInvoices([]);
      triggerRefresh();
      router.refresh();
    } catch (error) {
      console.error('Error deleting all invoices:', error);
      toast.error('Failed to delete all invoices');
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllConfirm(false);
    }
  };

  const confirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllInvoices();
    } catch (error) {
      console.error('Error confirming delete all invoices:', error);
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllConfirm(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      processed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    } as const;

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants] || ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatField = (value: string | number | Date | null | undefined, field: string, invoice?: Invoice): React.ReactNode => {
    if (field === 'amount') {
      if (value === 0 || value === undefined || value === null) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-muted-foreground italic">Not extracted</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>This field could not be extracted from the document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      
      // Get the currency symbol based on the currency code
      const currencySymbol = getCurrencySymbol(invoice?.currency || 'USD');
      return `${currencySymbol}${(Number(value) / 100).toFixed(2)}`;
    }

    if (field === 'dueDate') {
      if (value === null || value === undefined) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-muted-foreground italic">Not specified</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>No due date was found on the invoice</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return formatDate(value as Date);
    }

    if (!value || value === '') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className="text-muted-foreground italic">Not extracted</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>This field could not be extracted from the document</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (field === 'invoiceDate' || field === 'createdAt') {
      return formatDate(value as Date);
    }

    return String(value);
  };

  // Helper function to get currency symbol
  const getCurrencySymbol = (currencyCode: string): string => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'INR': '₹',
      'AUD': 'A$',
      'CAD': 'C$',
      'CHF': 'Fr',
      'NZD': 'NZ$',
      'BRL': 'R$',
      'RUB': '₽',
      'KRW': '₩',
      'SGD': 'S$',
      'NOK': 'kr',
      'MXN': 'Mex$',
      'SEK': 'kr',
      'ZAR': 'R',
      'TRY': '₺',
      'PLN': 'zł',
      'THB': '฿',
      'IDR': 'Rp',
      'HKD': 'HK$',
      'MYR': 'RM',
      'PHP': '₱',
      'TWD': 'NT$',
      'DKK': 'kr',
      'HUF': 'Ft',
      'CZK': 'Kč',
      'ILS': '₪',
      'CLP': 'CLP$',
      'PKR': '₨',
      'EGP': 'E£',
      'COP': 'CO$',
      'SAR': '﷼',
      'AED': 'د.إ',
      'RON': 'lei',
      'VND': '₫',
      'HRK': 'kn',
      'BGN': 'лв',
      'ISK': 'kr',
      'UAH': '₴',
      'JMD': 'J$',
      'ARS': 'AR$',
      'BDT': '৳',
      'LKR': '₨',
      'MMK': 'K',
      'UYU': '$U',
      'OMR': '﷼',
      'BHD': 'BD',
      'QAR': '﷼',
      'KWD': 'د.ك',
      'JOD': 'JD',
      'LBP': 'ل.ل',
      'MAD': 'د.م.',
      'DZD': 'د.ج',
      'TND': 'د.ت',
      'LYD': 'ل.د',
      'SDG': 'ج.س.',
      'IQD': 'ع.د',
      'AFN': '؋',
      'ALL': 'L',
      'AMD': '֏',
      'AZN': '₼',
      'BAM': 'KM',
      'BYN': 'Br',
      'GEL': '₾',
      'KGS': 'с',
      'MDL': 'L',
      'MNT': '₮',
      'RSD': 'дин.',
      'TJS': 'с.',
      'TMT': 'm',
      'UZS': 'so\'m',
      'XCD': 'EC$',
      'XPF': 'CFP',
      'XAF': 'FCFA',
      'XOF': 'CFA',
      'XRE': 'RINET',
      'XAU': 'XAU',
      'XAG': 'XAG',
      'XPT': 'XPT',
      'XPD': 'XPD',
    };
    
    return symbols[currencyCode] || currencyCode;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-4">
      <TokenUsageCards invoices={invoices} />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Invoices</CardTitle>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search invoices..."
              className="px-3 py-1 border rounded-md text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAll}
              disabled={isDeletingAll || filteredInvoices.length === 0}
            >
              {isDeletingAll ? 'Deleting...' : 'Delete All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <InvoiceTableHeader
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.map((invoice) => (
                    <InvoiceTableRow
                      key={invoice.id}
                      invoice={invoice}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * 30) + 1} to {Math.min(currentPage * 30, pagination.total)} of {pagination.total} results
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice
              {invoiceToDelete && ` #${invoiceToDelete.invoiceNumber}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllConfirm} onOpenChange={() => setShowDeleteAllConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Invoices?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all invoices in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditInvoiceDialog
        invoice={invoiceToEdit}
        onClose={() => setInvoiceToEdit(null)}
        onSave={() => {
          router.refresh();
          setInvoiceToEdit(null);
        }}
      />
    </div>
  );
} 