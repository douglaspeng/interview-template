import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
};

export function sanitizeUIMessages(messages: any[]): any[] {
  return messages.map(msg => ({
    ...msg,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
  }));
}

export function convertToUIMessages(messages: any[]): any[] {
  return messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    createdAt: msg.createdAt
  }));
}

export function getDocumentTimestampByIndex(index: number, documents: any[]): Date {
  if (index < 0 || index >= documents.length) {
    throw new Error('Invalid document index');
  }
  return documents[index].createdAt;
}

export function formatCurrency(amount: number, currency: string | null): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount / 100);
}

export function getMostRecentUserMessage(messages: any[]): any {
  if (!messages || messages.length === 0) return null;
  
  // Find the most recent user message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i];
    }
  }
  
  return null;
}

export function sanitizeResponseMessages(messages: any[]): any[] {
  return messages.map(msg => {
    // Create a new object without the 'id' property
    const { id, ...rest } = msg;
    return rest;
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

export function formatPercentage(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100);
} 