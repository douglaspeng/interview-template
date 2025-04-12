import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export function Toast({ className, variant = 'default', ...props }: ToastProps) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex w-full max-w-sm items-center rounded-lg border p-4 shadow-lg',
        {
          'bg-white text-gray-900': variant === 'default',
          'bg-red-50 text-red-900': variant === 'destructive',
        },
        className
      )}
      {...props}
    />
  );
}

interface ToastTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function ToastTitle({ className, ...props }: ToastTitleProps) {
  return (
    <h3
      className={cn('text-sm font-semibold', className)}
      {...props}
    />
  );
}

interface ToastDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function ToastDescription({ className, ...props }: ToastDescriptionProps) {
  return (
    <p
      className={cn('text-sm opacity-90', className)}
      {...props}
    />
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return <>{children}</>;
} 