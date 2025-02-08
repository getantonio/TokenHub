import * as React from 'react';
import { cn } from '@/lib/utils';
import { type Toast as ToastType } from './types';
import { useToast } from './use-toast';

interface ToastProps extends ToastType {
  onDismiss: () => void;
}

export function Toast({
  title,
  description,
  variant = 'default',
  onDismiss,
}: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-3 shadow-lg transition-all',
        {
          'bg-gray-800/90 border-gray-700 text-white': variant === 'default',
          'bg-red-900/90 border-red-800 text-white': variant === 'destructive',
        }
      )}
    >
      <div className="grid gap-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && (
          <div className="text-sm opacity-90">{description}</div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="rounded-md p-1 text-white/70 hover:text-white focus:outline-none focus:ring-1 ring-white/20"
      >
        <span className="sr-only">Close</span>
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <div key={toast.id} className="relative">
          <Toast {...toast} onDismiss={() => dismiss(toast.id)} />
        </div>
      ))}
    </div>
  );
} 