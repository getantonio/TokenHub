import { useState } from 'react';
import type { MetaMaskInpageProvider } from '@metamask/providers';
import TokenForm_v1 from '../components/TokenForm_v1';
import TokenAdmin from '../components/TokenAdmin';
import NetworkIndicator from '../components/NetworkIndicator';
import { useNetwork } from '../contexts/NetworkContext';
import Head from 'next/head';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>();
  const { isSupported } = useNetwork();

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this app');
      return;
    }

    try {
      const accounts = await window.ethereum.request<string[]>({ 
        method: 'eth_requestAccounts' 
      });
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  return (
    <main className="min-h-screen bg-background-primary p-8">
      <Head>
        <title>Token Factory Deploy v1</title>
        <meta name="description" content="Create and manage your own tokens with Token Factory" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-text-primary">Token Factory</h1>
            <NetworkIndicator />
          </div>
          <button
            onClick={connectWallet}
            className={`px-4 py-2 rounded font-medium ${
              isConnected 
                ? 'bg-green-600 text-white cursor-default'
                : 'bg-text-accent text-white hover:bg-blue-700'
            }`}
          >
            {isConnected ? 'Connected' : 'Connect Wallet'}
          </button>
        </div>

        {isSupported ? (
          <>
            <TokenForm_v1 isConnected={isConnected} />
            <TokenAdmin isConnected={isConnected} address={address} />
          </>
        ) : (
          <div className="p-6 bg-background-accent rounded-lg shadow-lg">
            <p className="text-text-primary">Please switch to a supported network to use the app.</p>
          </div>
        )}
      </div>
    </main>
  );
} 