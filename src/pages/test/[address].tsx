import { useRouter } from 'next/router';
import TCAP_test from '@/components/features/token/TCAP_test';

export default function TokenTestPage() {
  const router = useRouter();
  const { address } = router.query;

  if (!address || typeof address !== 'string') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-3xl font-bold text-white mb-8">Split Token Test</h1>
      <TCAP_test tokenAddress={address as `0x${string}`} />
    </div>
  );
} 