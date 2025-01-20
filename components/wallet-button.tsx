'use client';

import { useWeb3Modal } from '@web3modal/wagmi/react';
import { Wallet } from 'lucide-react';

export function WalletButton() {
  const { open } = useWeb3Modal();

  return (
    <button
      onClick={() => open()}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </button>
  );
} 