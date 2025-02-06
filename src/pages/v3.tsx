import { useAccount } from 'wagmi';
import TokenForm_V3 from '../components/features/token/TokenForm_V3';
import TCAP_v3 from '../components/features/token/TCAP_v3';
import { useRouter } from 'next/router';
import { BrowserProvider } from 'ethers';
import { useState, useEffect } from 'react';

export default function V3() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    if (window.ethereum) {
      setProvider(new BrowserProvider(window.ethereum));
    }
  }, []);

  const handleSuccess = (address: string) => {
    router.push(`/v3/${address}`);
  };

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-3xl font-bold text-white mb-8">Create Token V3</h1>
      <div className="space-y-8">
        {router.query.address ? (
          <TCAP_v3 
            address={router.query.address as string}
            isConnected={isConnected}
            provider={provider}
          />
        ) : (
          <TokenForm_V3 
            isConnected={isConnected} 
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
} 