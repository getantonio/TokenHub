import React, { useState, useEffect, ReactNode } from 'react';
import { BrowserProvider } from 'ethers';
import { SUPPORTED_NETWORKS, ChainId } from '../config/networks';

export const NetworkContext = React.createContext<{
  chainId: number | null;
  isConnected: boolean;
  provider: BrowserProvider | null;
  connectWallet: () => Promise<void>;
  switchNetwork: (targetChainId: number) => Promise<void>;
}>({
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

  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) return;

      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex as string, 16);
        setChainId(chainId);

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        setIsConnected(Array.isArray(accounts) && accounts.length > 0);

        if (window.ethereum) {
          setProvider(new BrowserProvider(window.ethereum));
        }
      } catch (error) {
        console.error('Error checking network:', error);
      }
    };

    checkNetwork();

    if (window.ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16));
      };

      const handleAccountsChanged = (accounts: unknown) => {
        setIsConnected(Array.isArray(accounts) && accounts.length > 0);
      };

      window.ethereum.on('chainChanged', handleChainChanged as (...args: unknown[]) => void);
      window.ethereum.on('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('chainChanged', handleChainChanged as (...args: unknown[]) => void);
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);
        }
      };
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this feature');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      setIsConnected(true);
      setProvider(new BrowserProvider(window.ethereum));
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return;

    const network = SUPPORTED_NETWORKS[targetChainId as ChainId];
    if (!network) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: network.currency,
                  symbol: network.currency,
                  decimals: 18,
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.explorerUrl],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
        }
      }
    }
  };

  return (
    <NetworkContext.Provider value={{
      chainId,
      isConnected,
      provider,
      connectWallet,
      switchNetwork
    }}>
      {children}
    </NetworkContext.Provider>
  );
} 