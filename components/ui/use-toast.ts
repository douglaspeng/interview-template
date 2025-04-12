import { useState, useCallback } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 3000 }: ToastOptions) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = {
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

  return { toast, toasts };
} 