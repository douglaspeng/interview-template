'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface InvoiceContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <InvoiceContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoice() {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
} 