import { useEffect, useState } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const { open } = useWeb3Modal();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors opacity-50"
        disabled
      >
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
    >
      Connect Wallet
    </button>
  );
} 