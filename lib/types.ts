export type SortField = 'invoiceNumber' | 'customerName' | 'vendorName' | 'amount' | 'invoiceDate' | 'dueDate' | 'createdAt' | 'totalTokens' | 'cost';
export type SortOrder = 'asc' | 'desc';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  vendorName: string;
  amount: number;
  currency: string | null;
  invoiceDate: Date;
  dueDate: Date | null;
  status: string;
  originalFileUrl: string;
  createdAt: Date;
  updatedAt: Date;
  confidence: number;
  extractionMethod: string;
  processingErrors: string | null;
} 