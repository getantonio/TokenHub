import TokenForm_V3 from '../components/features/token/TokenForm_V3';
import TCAP_v3 from '../components/features/token/TCAP_v3';
import { useAccount } from 'wagmi';
import { useState } from 'react';

export default function V3() {
  const { isConnected } = useAccount();
  const [tokenAddress, setTokenAddress] = useState<`0x${string}` | null>(null);

  const handleSuccess = (address: `0x${string}`) => {
    setTokenAddress(address);
  };

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-3xl font-bold text-white mb-8">Create Token V3</h1>
      <div className="space-y-8">
        <TokenForm_V3 
          isConnected={isConnected} 
          onSuccess={handleSuccess}
        />
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Token Management</h2>
          <TCAP_v3 tokenAddress={tokenAddress || '0x0000000000000000000000000000000000000000'} />
        </div>
      </div>
    </div>
  );
} 