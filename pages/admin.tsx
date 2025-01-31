import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import Head from 'next/head';
import { BrowserProvider } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenVersionSwitcher from '../components/TokenVersionSwitcher';

export default function AdminPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const { chainId } = useNetwork();
  const [factoryAddresses, setFactoryAddresses] = useState<{v1?: string, v2?: string}>({});

  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          const isConnected = Array.isArray(accounts) && accounts.length > 0;
          setIsConnected(isConnected);

          if (isConnected) {
            const provider = new BrowserProvider(window.ethereum);
            setProvider(provider);
          }

          window.ethereum.on('accountsChanged', handleAccountsChanged);
          return () => {
            window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
          };
        } catch (error) {
          console.error('Error initializing provider:', error);
        }
      }
    };

    initProvider();
  }, []);

  const handleAccountsChanged = (accounts: unknown) => {
    const isConnected = Array.isArray(accounts) && accounts.length > 0;
    setIsConnected(isConnected);
    if (!isConnected) {
      setProvider(null);
    }
  };

  useEffect(() => {
    if (isConnected && window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);
    }
  }, [isConnected]);

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Admin Panel</title>
        <meta name="description" content="TokenHub.dev admin panel for factory management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h1 className="text-xl font-bold text-white mb-4">Token Management</h1>
            <TokenVersionSwitcher 
              isConnected={isConnected} 
              provider={provider}
            />
          </div>

          {/* Factory Management section will be added here in the future */}
        </div>
      </main>
    </div>
  );
} 