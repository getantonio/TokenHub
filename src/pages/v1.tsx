import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import TokenForm_v1 from '@/components/features/token/TokenForm_v1';
import TCAP_v1 from '@/components/features/token/TCAP_v1';
import { BrowserProvider } from 'ethers';
import { FACTORY_ADDRESSES } from '@/config/contracts';
import Head from 'next/head';
import type { MetaMaskInpageProvider } from '@metamask/providers';

export default function V1Page() {
  const [isConnected, setIsConnected] = useState(false);
  const { chainId } = useNetwork();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          }) as string[];
          setIsConnected(Array.isArray(accounts) && accounts.length > 0);
          setProvider(new BrowserProvider(window.ethereum));

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

  const factoryAddress = chainId ? FACTORY_ADDRESSES.v1[chainId] : undefined;

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Token Factory v1</title>
        <meta name="description" content="Create your own token with TokenHub.dev v1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-white mb-2">Token Factory v1</h1>
            <p className="text-white">Create your own token with essential features like blacklisting and time locks.</p>
          </div>

          <div className="space-y-4">
            <TokenForm_v1 isConnected={isConnected} />
            
            <TCAP_v1 
              isConnected={isConnected}
              address={factoryAddress}
              provider={provider}
            />
          </div>
        </div>
      </main>
    </div>
  );
}