import { useState, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { SUPPORTED_NETWORKS, NetworkConfig } from '../config/networks';

export default function NetworkIndicator() {
  const { chainId, isSupported } = useNetwork();
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<NetworkConfig | undefined>();

  useEffect(() => {
    setCurrentNetwork(Object.values(SUPPORTED_NETWORKS).find(n => n.chainId === chainId));
  }, [chainId]);

  const switchNetwork = async (network: NetworkConfig) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                nativeCurrency: {
                  name: network.currency,
                  symbol: network.currency,
                  decimals: 18,
                },
                blockExplorerUrls: [network.explorerUrl],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
        }
      }
      console.error('Error switching network:', switchError);
    }
  };

  const getStatusColor = () => {
    if (!chainId) return 'bg-gray-400';
    if (!isSupported) return 'bg-red-500';
    return 'bg-green-500';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowNetworkMenu(!showNetworkMenu)}
        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-background-secondary hover:bg-background-accent transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-text-primary">
          {currentNetwork?.name || 'Unsupported Network'}
        </span>
        <span className="text-text-secondary">▼</span>
      </button>

      {showNetworkMenu && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-background-secondary rounded-lg shadow-lg border border-border z-50">
          <div className="p-2">
            <h3 className="text-sm font-medium text-text-secondary mb-2 px-2">Select Network</h3>
            {Object.values(SUPPORTED_NETWORKS).map((network) => (
              <button
                key={network.chainId}
                onClick={() => {
                  switchNetwork(network);
                  setShowNetworkMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded hover:bg-background-accent transition-colors ${
                  network.chainId === chainId
                    ? 'bg-background-accent text-text-accent'
                    : 'text-text-primary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{network.name}</span>
                  {network.chainId === chainId && (
                    <span className="text-xs bg-text-accent text-white px-2 py-0.5 rounded">
                      Connected
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-secondary">
                  {network.currency} • {network.isTestnet ? 'Testnet' : 'Mainnet'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 