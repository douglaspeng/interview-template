import { TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

type SortField = 'invoiceDate' | 'amount' | 'vendorName' | 'customerName' | 'dueDate' | 'createdAt' | 'totalTokens' | 'cost' | 'invoiceNumber';
type SortOrder = 'asc' | 'desc';

interface InvoiceTableHeaderProps {
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export function InvoiceTableHeader({ sortField, sortOrder, onSort }: InvoiceTableHeaderProps) {
  return (
    <>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => onSort('invoiceNumber')}
          className="flex items-center gap-1"
        >
          Invoice #
          {sortField === 'invoiceNumber' && (
            <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          )}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => onSort('vendorName')}
          className="flex items-center gap-1"
        >
          Vendor
          {sortField === 'vendorName' && (
            <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          )}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => onSort('customerName')}
          className="flex items-center gap-1"
        >
          Customer
          {sortField === 'customerName' && (
            <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          )}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => onSort('amount')}
          className="flex items-center gap-1"
        >
          Amount
          {sortField === 'amount' && (
            <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          )}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => onSort('invoiceDate')}
          className="flex items-center gap-1"
        >
          Date
          {sortField === 'invoiceDate' && (
            <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          )}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => onSort('dueDate')}
          className="flex items-center gap-1"
        >
          Due Date
          {sortField === 'dueDate' && (
            <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          )}
        </Button>
      </TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </>
  );
} 