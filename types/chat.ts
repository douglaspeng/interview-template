export interface Message {
  role: 'user' | 'assistant';
  content: string;
  file?: File;
  invoiceData?: any;
  id?: string;
  timestamp?: string;
} 