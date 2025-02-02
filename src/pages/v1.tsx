import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import TokenForm_v1 from '@components/features/token/TokenForm_v1';
import Head from 'next/head';
import type { MetaMaskInpageProvider } from '@metamask/providers';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export default function V1Page() {
  const [isConnected, setIsConnected] = useState(false);
  const { chainId } = useNetwork();

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request<string[]>({ 
            method: 'eth_accounts' 
          });
          setIsConnected(Array.isArray(accounts) && accounts.length > 0);

          // Listen for account changes
          const handleAccountsChanged = (accounts: unknown) => {
            setIsConnected(Array.isArray(accounts) && accounts.length > 0);
          };

          window.ethereum.on('accountsChanged', handleAccountsChanged);

          return () => {
            window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
          };
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Token Factory v1</title>
        <meta name="description" content="Create your own token with TokenHub.dev v1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Token Factory v1</h1>
            <p className="text-gray-400">Create your own token with essential features like blacklisting and time locks.</p>
          </div>

          <TokenForm_v1 isConnected={isConnected} />
        </div>
      </main>
    </div>
  );
}