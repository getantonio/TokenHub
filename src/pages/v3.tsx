import TokenForm_v3 from '../components/features/token/TokenForm_v3';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';

export default function V3() {
  const { isConnected } = useAccount();
  const router = useRouter();

  const handleSuccess = (address: string) => {
    router.push(`/v3/${address}`);
  };

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-3xl font-bold text-white mb-8">Create Token V3</h1>
      <div className="space-y-8">
        <TokenForm_v3 
          isConnected={isConnected} 
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
} 