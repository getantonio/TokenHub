import { useEffect } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import FactoryOwnerControls_v1 from '@components/features/admin/FactoryOwnerControls_v1';
import FactoryOwnerControls_v2 from '@components/features/admin/FactoryOwnerControls_v2';
import Head from 'next/head';
import { useAccount } from 'wagmi';

export default function AdminPage() {
  const { chainId } = useNetwork();
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>TokenHub.dev - Admin</title>
        <meta name="description" content="Factory Owner Administration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-3">
            <h1 className="text-base font-bold text-text-primary mb-1">Admin Dashboard</h1>
            <p className="text-xs text-text-secondary">Manage factory settings and fees</p>
          </div>

          {/* Factory Controls */}
          <div className="form-container form-compact">
            <div className="form-grid">
              <div className="space-y-2">
                <h3 className="form-section-header">V1 Factory Controls</h3>
                <FactoryOwnerControls_v1 version="v1" isConnected={isConnected} />
              </div>
              <div className="space-y-2">
                <h3 className="form-section-header">V2 Factory Controls</h3>
                <FactoryOwnerControls_v2 isConnected={isConnected} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 