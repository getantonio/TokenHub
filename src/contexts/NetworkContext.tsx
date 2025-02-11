import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_NETWORKS, getNetworkConfig } from '../config/networks';

interface NetworkContextType {
  chainId: number | null;
  isSupported: boolean;
  networkError: string | null;
  setChainId: (chainId: number) => void;
}

const NetworkContext = createContext<NetworkContextType>({
  chainId: null,
  isSupported: false,
  networkError: null,
  setChainId: () => {},
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [chainId, setChainId] = useState<number | null>(null);
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
    network => network.id === chainId
  );

  return (
    <NetworkContext.Provider value={{
      chainId,
      isSupported,
      networkError,
      setChainId: (id: number) => setChainId(id),
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}