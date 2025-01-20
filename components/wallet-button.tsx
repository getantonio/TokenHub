'use client';

import { useWeb3Modal } from '@web3modal/wagmi/react';

export function WalletButton() {
  const { open } = useWeb3Modal();

  return (
    <button
      onClick={() => open()}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
    >
      Connect Wallet
    </button>
  );
} 