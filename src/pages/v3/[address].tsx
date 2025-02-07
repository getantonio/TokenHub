import { useRouter } from 'next/router';
import TCAP_v3 from '../../components/features/token/TCAP_v3';

export default function TokenPage() {
  const router = useRouter();
  const { address } = router.query;

  if (!address || typeof address !== 'string') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-3xl font-bold text-white mb-8">Token Details</h1>
      <TCAP_v3 tokenAddress={address as `0x${string}`} />
    </div>
  );
} 