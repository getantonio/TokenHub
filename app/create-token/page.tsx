'use client';

import { CreateTokenForm } from '@/components/token/CreateTokenForm';
import { WalletConnect } from '@/components/wallet-connect';
import { NetworkSelector } from '@/components/network-selector';

export default function CreateTokenPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-8 gap-4">
          <NetworkSelector />
          <WalletConnect />
        </div>
        <CreateTokenForm />
      </div>
    </div>
  );
} 