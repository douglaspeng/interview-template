import * as React from 'react';
import { useState, useCallback } from 'react';
import { Toast, ToastTitle, ToastDescription } from './toast';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface UseToastReturn {
  toast: (options: ToastOptions) => void;
  ToastContainer: () => JSX.Element;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 3000 }: ToastOptions) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: ToastItem = {
        id,
        title,
        description,
        variant,
      };

      setToasts((currentToasts) => [...currentToasts, newToast]);

      setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.filter((toast) => toast.id !== id)
        );
      }, duration);
    },
    []
  );

  const ToastContainer = useCallback(() => {
    return (
      <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} variant={toast.variant}>
            <ToastTitle>{toast.title}</ToastTitle>
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
          </Toast>
        ))}
      </div>
    );
  }, [toasts]);

  return { toast, ToastContainer };
} 