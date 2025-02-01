import { useEffect, useState } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { Header } from '../components/Header';
import Head from 'next/head';
import { BrowserProvider, Contract } from 'ethers';
import FactoryOwnerControls from '../components/FactoryOwnerControls';

export default function AdminPage() {
  const { chainId } = useNetwork();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request<string[]>({
            method: 'eth_accounts'
          });
          setIsConnected(Array.isArray(accounts) && accounts.length > 0);
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };
    
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>TokenHub.dev - Admin</title>
        <meta name="description" content="Factory Owner Administration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Factory Administration</h1>
            <p className="text-gray-400">Manage factory settings and fees</p>
          </div>

          <div className="space-y-6">
            <div className="bg-background-secondary rounded-lg p-6 border border-border">
              <h2 className="text-xl font-bold text-white mb-6">V1 Factory Controls</h2>
              <FactoryOwnerControls version="v1" isConnected={isConnected} />
            </div>

            <div className="bg-background-secondary rounded-lg p-6 border border-border">
              <h2 className="text-xl font-bold text-white mb-6">V2 Factory Controls</h2>
              <FactoryOwnerControls version="v2" isConnected={isConnected} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 