import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { MetaMaskInpageProvider } from '@metamask/providers';
import { SUPPORTED_NETWORKS } from '../config/contracts';

interface NetworkContextType {
  chainId: number | null;
  isSupported: boolean;
  networkName: string;
  switchNetwork: (targetChainId: number) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
  chainId: null,
  isSupported: false,
  networkName: 'Unknown Network',
  switchNetwork: async () => {}
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const updateChainId = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainIdHex as string, 16));
      } catch (error) {
        console.error('Error getting chainId:', error);
      }
    }
  };

  const switchNetwork = async (targetChainId: number) => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      console.error('Error switching network:', error);
      throw error;
    }
  };

  useEffect(() => {
    setMounted(true);
    updateChainId();

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', (chainIdHex: unknown) => {
        if (typeof chainIdHex === 'string') {
          setChainId(parseInt(chainIdHex, 16));
        }
      });
    }

    return () => {
      if (typeof window !== 'undefined' && window.ethereum?.removeListener) {
        window.ethereum.removeListener('chainChanged', updateChainId);
      }
    };
  }, []);

  // Prevent hydration mismatch
  if (!mounted) return <>{children}</>;

  const value = {
    chainId,
    isSupported: chainId ? chainId in SUPPORTED_NETWORKS : false,
    networkName: chainId ? SUPPORTED_NETWORKS[chainId as keyof typeof SUPPORTED_NETWORKS] || 'Unsupported Network' : 'Not Connected',
    switchNetwork
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext); 