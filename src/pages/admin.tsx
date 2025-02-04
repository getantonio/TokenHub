import React from 'react';
import { useWallet } from '@contexts/WalletContext';
import FactoryOwnerControls from '@components/features/admin/FactoryOwnerControls_v1';
import { ToastProvider } from '@/components/ui/toast/use-toast';
import { useNetwork } from '@contexts/NetworkContext';
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import FactoryOwnerControls_v2 from '@components/features/admin/FactoryOwnerControls_v2';
import Head from 'next/head';

export default function AdminPage() {
  const { isConnected } = useWallet();
  const { chainId } = useNetwork();

  return (
    <ToastProvider>
      <div className="container mx-auto px-4 py-8">
        <Head>
          <title>TokenHub.dev - Admin</title>
          <meta name="description" content="Factory Owner Administration" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <h1 className="text-3xl font-bold mb-6">Admin Controls</h1>
        <p className="text-gray-600 mb-8">
          Manage token factory settings and configurations.
        </p>

        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-8">
            <div className="space-y-2">
              <h3 className="form-section-header">V1 Factory Controls</h3>
              <FactoryOwnerControls version="v1" isConnected={isConnected} />
            </div>

            <div className="space-y-2">
              <h3 className="form-section-header">V2 Factory Controls</h3>
              <FactoryOwnerControls version="v2" isConnected={isConnected} />
            </div>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
} 