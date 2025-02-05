import React, { useState, useEffect } from 'react';
import { TokenForm_V3 } from '@/components/features/token/TokenForm_v3';
import { Toaster } from '@/components/ui/toast/toast';
import { ToastProvider } from '@/components/ui/toast/use-toast';
import type { MetaMaskInpageProvider } from '@metamask/providers';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export default function V3Page() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const checkConnection = async () => {
        try {
          const accounts = await window.ethereum?.request<string[]>({ 
            method: 'eth_accounts' 
          });
          setIsConnected(Array.isArray(accounts) && accounts.length > 0);
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      };

      checkConnection();

      // Listen for account changes
      const handleAccountsChanged = (accounts: unknown) => {
        setIsConnected(Array.isArray(accounts) && accounts.length > 0);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  return (
    <ToastProvider>
      <div className="container mx-auto px-4 py-2">
        <h1 className="text-3xl font-bold mb-3 text-white">Token Factory v3</h1>
        <p className="text-white mb-2">
          Create a new token with vesting schedules and multi-wallet distribution.
        </p>
        <TokenForm_V3 isConnected={isConnected} />
        <Toaster />
      </div>
    </ToastProvider>
  );
} 