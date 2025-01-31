import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SUPPORTED_NETWORKS, getNetworkConfig } from '../config/networks';
import { BrowserProvider } from 'ethers';

export interface NetworkContextType {
  chainId: number | null;
  isConnected: boolean;
  provider: BrowserProvider | null;
  connectWallet: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
  chainId: null,
  isConnected: false,
  provider: null,
  connectWallet: async () => {},
  switchNetwork: async () => {}
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) {
        setNetworkError('Please install MetaMask');
        return;
      }

      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex as string, 16);
        setChainId(chainId);
        setNetworkError(null);
      } catch (error) {
        console.error('Error checking network:', error);
        setNetworkError('Failed to get network');
      }
    };

    checkNetwork();

    if (window.ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16));
      };

      window.ethereum.on('chainChanged', handleChainChanged as (...args: unknown[]) => void);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('chainChanged', handleChainChanged as (...args: unknown[]) => void);
        }
      };
    }
  }, []);

  const isSupported = chainId !== null && Object.values(SUPPORTED_NETWORKS).some(
    network => network.chainId === chainId
  );

  return (
    <NetworkContext.Provider value={{
      chainId,
      isConnected,
      provider,
      connectWallet: async () => {
        // Implementation of connectWallet
      },
      switchNetwork: async (id: number) => {
        // Implementation of switchNetwork
      }
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}