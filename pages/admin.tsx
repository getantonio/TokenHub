import { useState, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { BrowserProvider, Contract } from 'ethers';
import { Header } from '../components/Header';
import { Card } from '../components/ui/card';
import { Toast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';
import TokenFactoryV1 from '../contracts/abi/TokenFactory_v1.1.0.json';
import TokenFactoryV2 from '../contracts/abi/TokenFactory_v2.1.0.json';
import TokenAdmin from '../components/TokenAdmin';
import TokenAdminV2 from '../components/TokenAdminV2';
import { getNetworkContractAddress } from '../config/contracts';
import Head from 'next/head';

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

export default function AdminPage() {
  const { isConnected, provider, chainId } = useNetwork();
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>();

  useEffect(() => {
    const getWalletAddress = async () => {
      if (isConnected && provider) {
        try {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setWalletAddress(address);
        } catch (error) {
          console.error("Error getting wallet address:", error);
        }
      }
    };

    getWalletAddress();
  }, [isConnected, provider]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Head>
          <title>TokenHub.dev - Admin Panel</title>
          <meta name="description" content="TokenHub.dev admin panel for factory management" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gray-800 border-gray-700">
              <div className="p-6 text-center text-gray-400">
                Please connect your wallet to access the admin panel
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Admin Panel</title>
        <meta name="description" content="Manage token factory settings and configurations" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Factory Admin Panel</h1>
            <p className="text-sm text-gray-400">Manage token factory settings and configurations</p>
          </div>

          {/* Token Management */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Token Management</h2>
            <div className="space-y-4">
              <TokenAdmin isConnected={isConnected} address={walletAddress} />
              <TokenAdminV2 isConnected={isConnected} address={walletAddress} />
            </div>
          </div>
        </div>
      </main>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
} 