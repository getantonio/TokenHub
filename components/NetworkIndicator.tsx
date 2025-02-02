import { useEffect, useState } from 'react';
import { SUPPORTED_NETWORKS, ChainId } from '../config/networks';

interface NetworkIndicatorProps {
  chainId: number;
}

export function NetworkIndicator({ chainId }: NetworkIndicatorProps) {
  const [networkName, setNetworkName] = useState<string>('');

  useEffect(() => {
    const network = SUPPORTED_NETWORKS[chainId as ChainId];
    setNetworkName(network?.name || 'Unknown Network');
  }, [chainId]);

  return (
    <div className="flex items-center space-x-2">
      <div className="h-2 w-2 rounded-full bg-green-500"></div>
      <span className="text-sm text-gray-300">{networkName}</span>
    </div>
  );
}