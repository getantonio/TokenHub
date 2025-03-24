"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBrowserProvider, initEthersCompat } from '@/lib/ethers-compat';

// Use a type instead of importing BrowserProvider directly
type BrowserProvider = any;

interface WalletContextType {
  provider: BrowserProvider | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType>({
  provider: null,
  isConnected: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
});

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [ethersInitialized, setEthersInitialized] = useState(false);

  // Initialize ethers compatibility layer
  useEffect(() => {
    const init = async () => {
      const initialized = await initEthersCompat();
      setEthersInitialized(initialized);
    };
    
    init();
  }, []);

  // Check if wallet is already connected on load
  useEffect(() => {
    if (!ethersInitialized) return;

    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          // Check if already connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            const BrowserProviderClass = (getBrowserProvider() as any).implementation;
            if (BrowserProviderClass) {
              const newProvider = new BrowserProviderClass(window.ethereum);
              setProvider(newProvider);
              setIsConnected(true);
            }
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      }
    };
    
    checkConnection();
  }, [ethersInitialized]);

  // Handle account changes
  useEffect(() => {
    if (!ethersInitialized) return;
    
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setIsConnected(false);
          setProvider(null);
        } else {
          // Account changed but still connected
          setIsConnected(true);
        }
      };

      const handleChainChanged = () => {
        // Refresh provider on chain change
        if (window.ethereum) {
          const BrowserProviderClass = (getBrowserProvider() as any).implementation;
          if (BrowserProviderClass) {
            const newProvider = new BrowserProviderClass(window.ethereum);
            setProvider(newProvider);
          }
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [ethersInitialized]);

  // Connect wallet function
  const connectWallet = async () => {
    if (!ethersInitialized) {
      console.error("Ethers not initialized yet");
      return;
    }
    
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const BrowserProviderClass = (getBrowserProvider() as any).implementation;
        if (BrowserProviderClass) {
          const newProvider = new BrowserProviderClass(window.ethereum);
          setProvider(newProvider);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      alert("Please install MetaMask or another compatible wallet");
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    // Note: There's no standard way to disconnect in Web3
    // We can only clear our state
    setProvider(null);
    setIsConnected(false);
  };

  return (
    <WalletContext.Provider value={{ provider, isConnected, connectWallet, disconnectWallet }}>
      {children}
    </WalletContext.Provider>
  );
} 