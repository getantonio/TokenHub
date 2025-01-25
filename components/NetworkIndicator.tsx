import { useState } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { isNetworkConfigured } from '../config/contracts';
import { Toast } from './ui/Toast';

export default function NetworkIndicator() {
  const { chainId, isSupported, networkName, switchNetwork } = useNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwitchToSepolia = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await switchNetwork(11155111); // Sepolia chainId
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      setError(error.message || 'Failed to switch network');
    } finally {
      setIsLoading(false);
    }
  };

  if (!chainId) return null;

  const isDeployed = isNetworkConfigured(chainId);
  const showSwitchButton = !isSupported || !isDeployed;
  const statusColor = isSupported 
    ? (isDeployed ? 'bg-green-500' : 'bg-yellow-500')
    : 'bg-red-500';
  const textColor = isSupported
    ? (isDeployed ? 'text-text-primary' : 'text-yellow-500')
    : 'text-red-500';

  return (
    <div className="flex items-center gap-2">
      {error && <Toast type="error" message={error} />}
      <div className={`h-2 w-2 rounded-full ${statusColor}`} />
      <span className={`text-sm ${textColor}`}>
        {networkName}
        {isSupported && !isDeployed && ' (Not Deployed)'}
      </span>
      {showSwitchButton && (
        <button
          onClick={handleSwitchToSepolia}
          disabled={isLoading}
          className={`text-sm px-2 py-1 bg-text-accent text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⟳</span>
              Switching...
            </>
          ) : (
            'Switch to Sepolia'
          )}
        </button>
      )}
    </div>
  );
} 