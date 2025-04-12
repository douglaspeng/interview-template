import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Invoice } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils";

interface InvoiceTableRowProps {
  invoice: Invoice;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}

// Helper function to format date consistently
const formatDateConsistently = (date: Date | string | null) => {
  if (!date) return 'N/A';
  
  // Convert to YYYY-MM-DD format first
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateStr = dateObj.toISOString().split('T')[0];
  
  // Parse the date parts directly to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create a date string in the format "MMM DD, YYYY"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
};

export function InvoiceTableRow({ invoice, onEdit, onDelete }: InvoiceTableRowProps) {
  return (
    <TableRow>
      <TableCell>{invoice.invoiceNumber}</TableCell>
      <TableCell>{invoice.vendorName}</TableCell>
      <TableCell>{invoice.customerName}</TableCell>
      <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
      <TableCell>{formatDateConsistently(invoice.invoiceDate)}</TableCell>
      <TableCell>{formatDateConsistently(invoice.dueDate)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(invoice)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(invoice)}
              className="text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
} 