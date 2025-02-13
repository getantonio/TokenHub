import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import DirectListingForm from '@/components/features/token/DirectListingForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConnectWallet } from '@/components/common/ConnectWallet';

export default function DirectListingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  
  const handleSuccess = () => {
    router.push('/dashboard');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Direct DEX Listing"
        description="Create and list your token directly on your preferred DEX with advanced trading controls."
      />
      
      {!isConnected ? (
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to create and list a token</p>
          <ConnectWallet />
        </div>
      ) : (
        <DirectListingForm
          isConnected={isConnected}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
} 