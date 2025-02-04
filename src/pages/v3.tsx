import React from 'react';
import { TokenForm_V3 } from '@/components/TokenForm_V3';
import { Toaster } from '@/components/ui/toast/toast';
import { ToastProvider } from '@/components/ui/toast/use-toast';

export default function V3Page() {
  return (
    <ToastProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Create Token (v3)</h1>
        <p className="text-gray-600 mb-8">
          Create a new token with vesting schedules and multi-wallet distribution.
        </p>
        <TokenForm_V3 />
        <Toaster />
      </div>
    </ToastProvider>
  );
} 