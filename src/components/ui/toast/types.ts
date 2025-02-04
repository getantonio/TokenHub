import { ReactNode } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: ReactNode;
  variant?: 'default' | 'destructive';
}

export interface ToastContext {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
} 