import { useState } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button } from '@/components/ui/button';
import { SUPPORTED_NETWORKS } from '@/config/networks';
import { switchNetwork } from '@/utils/network';
import { ChainId } from '@/types/chain';

export function NetworkSwitcher() {
  const { chainId } = useNetwork();
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchNetwork = async (newChainId: number) => {
    if (chainId === newChainId) return;
    
    setIsLoading(true);
    try {
      const success = await switchNetwork(newChainId);
      if (!success) {
        console.error(`Failed to switch to network: ${newChainId}`);
      }
    } catch (error) {
      console.error('Error switching network:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get list of network options
  const networkOptions = Object.values(SUPPORTED_NETWORKS).map(network => ({
    id: network.id,
    name: network.name,
    testnet: network.testnet,
  }));

  return (
    <div className="p-4 bg-gray-800 rounded-md shadow-md">
      <h3 className="text-sm font-medium text-gray-200 mb-2">Select Network</h3>
      <div className="grid grid-cols-1 gap-2">
        {networkOptions.map((network) => (
          <Button
            key={network.id}
            variant={chainId === network.id ? "default" : "secondary"}
            className={`w-full justify-start text-sm ${network.testnet ? 'text-yellow-400' : 'text-blue-400'}`}
            onClick={() => handleSwitchNetwork(network.id)}
            disabled={isLoading || chainId === network.id}
          >
            {network.name}
            {network.testnet && <span className="ml-1 text-xs">(Testnet)</span>}
          </Button>
        ))}
      </div>
    </div>
  );
} 