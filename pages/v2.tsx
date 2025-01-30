import { useEffect, useState } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { TokenFormV2 } from '../components/TokenFormV2';
import Head from 'next/head';
import { Header } from '../components/Header';
import type { MetaMaskInpageProvider } from '@metamask/providers';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export default function V2Page() {
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
        <title>TokenHub.dev - Token Factory v2</title>
        <meta name="description" content="Create your own token with TokenHub.dev v2" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Token Factory v2</h1>
            <p className="text-gray-400">Create your own token with advanced features like presale and vesting.</p>
          </div>

          <TokenFormV2 isConnected={isConnected} />
        </div>
      </main>
    </div>
  );
}