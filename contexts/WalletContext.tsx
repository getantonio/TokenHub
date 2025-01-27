import { createContext, useContext, useState, ReactNode } from 'react';
import type { MetaMaskInpageProvider } from '@metamask/providers';

interface WalletContextType {
  isConnected: boolean;
  address: string | undefined;
  connectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>();

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this app');
      return;
    }

    try {
      const accounts = await window.ethereum.request<string[]>({ 
        method: 'eth_requestAccounts' 
      });
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  return (
    <WalletContext.Provider value={{ isConnected, address, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 