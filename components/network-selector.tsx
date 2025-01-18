'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChainId, useConfig, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { NETWORKS_WITH_COSTS } from '@/app/providers';
import { ChevronDown, Info, ArrowRight } from 'lucide-react';

export function NetworkSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const chainId = useChainId();
  const { connectAsync } = useConnect();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [currentNetwork, setCurrentNetwork] = useState(() => {
    return NETWORKS_WITH_COSTS.find(n => n.name === 'Sepolia (Testnet)');
  });

  useEffect(() => {
    const network = NETWORKS_WITH_COSTS.find(n => n.id === chainId);
    if (network) {
      setCurrentNetwork(network);
      setError(null);
    }
  }, [chainId]);

  const isTestnet = currentNetwork?.name.toLowerCase().includes('sepolia');
  const mainnetVersion = NETWORKS_WITH_COSTS.find(n => n.name === 'Ethereum');

  const handleNetworkSwitch = useCallback(async (networkId: number) => {
    if (isSwitching || isPending) {
      setError('A network switch is already in progress. Please wait.');
      return;
    }

    try {
      setIsSwitching(true);
      setIsPending(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      const targetNetwork = NETWORKS_WITH_COSTS.find(n => n.id === networkId);
      if (!targetNetwork) {
        throw new Error('Unsupported network');
      }

      await connectAsync({
        chainId: networkId,
        connector: injected(),
      });

    } catch (error: any) {
      if (error?.code === 4902) {
        setError('Network not added to MetaMask. Please add it first.');
      } else if (error?.code === -32002) {
        setError('A MetaMask request is pending. Please check your wallet.');
      } else if (error?.message) {
        setError(error.message);
      } else {
        setError('Failed to switch network. Please try again.');
      }
      console.error('Network switch error:', error);
    } finally {
      setTimeout(() => {
        setIsSwitching(false);
        setIsPending(false);
        setIsOpen(false);
        setShowInfo(false);
      }, 1000);
    }
  }, [connectAsync, isSwitching, isPending]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isSwitching || isPending}
          className={`flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-sm font-medium
            ${(isSwitching || isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSwitching ? (
            <span>Switching...</span>
          ) : (
            <>
              {currentNetwork ? (
                <>
                  <span>{currentNetwork.name}</span>
                  <span className="text-xs text-gray-400">(${currentNetwork.costs.total})</span>
                </>
              ) : (
                <span>Select Network</span>
              )}
            </>
          )}
          <ChevronDown className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 hover:bg-gray-700 rounded-lg"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-700 z-50">
          {error}
        </div>
      )}

      {showInfo && (
        <div className="absolute top-full right-0 mt-2 w-[500px] p-4 bg-gray-800 rounded-lg border border-gray-700 shadow-lg z-50">
          <h3 className="font-medium mb-3">Network Deployment Costs</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-400 pb-2 border-b border-gray-700">
              <span>Network</span>
              <span>Token</span>
              <span>Vesting</span>
              <span>Total</span>
            </div>
            {NETWORKS_WITH_COSTS.map((network) => (
              <div 
                key={network.id} 
                className={`grid grid-cols-4 gap-4 text-sm ${network.id === chainId ? 'text-blue-400' : ''}`}
              >
                <span className="font-medium">{network.name}</span>
                <span>${network.costs.tokenDeployment}</span>
                <span>${network.costs.vestingDeployment}</span>
                <span className="font-medium">${network.costs.total}</span>
              </div>
            ))}
          </div>
          
          {isTestnet && mainnetVersion && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Ready for Mainnet?</h4>
                <button
                  onClick={() => handleNetworkSwitch(mainnetVersion.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
                >
                  Deploy to Mainnet
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">Migration Checklist:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  <li>Verify your token contract on testnet</li>
                  <li>Test vesting schedules and token distribution</li>
                  <li>Ensure you have enough ETH for deployment (${mainnetVersion.costs.total})</li>
                  <li>Back up your deployment parameters</li>
                </ul>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4">* Costs are estimates and may vary based on network conditions</p>
        </div>
      )}

      {isOpen && !isSwitching && !isPending && (
        <div className="absolute top-full mt-2 w-64 py-1 bg-gray-800 rounded-lg border border-gray-700 shadow-lg z-50">
          {NETWORKS_WITH_COSTS.map((network) => (
            <button
              key={network.id}
              onClick={() => handleNetworkSwitch(network.id)}
              disabled={network.id === chainId}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center justify-between ${
                network.id === chainId ? 'bg-blue-600' : ''
              }`}
            >
              <span>{network.name}</span>
              <span className="text-xs text-gray-400">${network.costs.total}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 