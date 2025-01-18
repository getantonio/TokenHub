'use client';

import { CreateTokenForm } from '@/components/token/CreateTokenForm';
import { WalletConnect } from '@/components/wallet-connect';
import { NetworkSelector } from '@/components/network-selector';
import Link from 'next/link';

export default function CreateTokenPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 p-4 mb-8">
        <div className="container mx-auto flex items-center justify-between">
          <Link 
            href="/"
            className="text-2xl font-bold text-white hover:text-gray-300"
          >
            TokenHub
          </Link>
          <div className="flex items-center gap-4">
            <NetworkSelector />
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <CreateTokenForm />
      </div>
    </div>
  );
} 