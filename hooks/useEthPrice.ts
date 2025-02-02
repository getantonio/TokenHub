import { useQuery } from '@tanstack/react-query';

interface EthPriceResponse {
  price: number;
}

async function fetchEthPrice(): Promise<EthPriceResponse> {
  const response = await fetch('/api/eth-price');
  if (!response.ok) {
    throw new Error('Failed to fetch ETH price');
  }
  return response.json();
}

export function useEthPrice() {
  return useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
} 