import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import AdminPanel from '@components/features/admin/AdminPanel';
import FactoryOwnerControls from '@components/features/admin/FactoryOwnerControls';
import FactoryOwnerControls_v2 from '@components/features/admin/FactoryOwnerControls_v2';
import Head from 'next/head';
import { useAccount } from 'wagmi';

export default function AdminPage() {
  const { chainId } = useNetwork();
  const { isConnected } = useAccount();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Head>
        <title>TokenHub.dev - Admin</title>
        <meta name="description" content="Factory Owner Administration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
            <p className="text-gray-400">Manage factory settings and fees</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FactoryOwnerControls version="v1" isConnected={isConnected} />
            <FactoryOwnerControls_v2 isConnected={isConnected} />
          </div>
        </div>
      </main>
    </div>
  );
} 