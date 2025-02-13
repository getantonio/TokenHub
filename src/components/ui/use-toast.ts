interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    console.log(`Toast: ${options.title} - ${options.description}`);
    // TODO: Implement proper toast notifications
  };

  return { toast };
} 